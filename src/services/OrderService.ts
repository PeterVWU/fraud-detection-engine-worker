// src/services/order.ts
import { Env } from '../types/Env';
import { NormalizedOrder, DuoplanePurchaseOrder, FraudCheckResult } from '../types';
import { DuoplaneService } from './DuoplaneService';
import { ShopifyService } from './ShopifyService';
import { MagentoService } from './MagentoService';
import { FraudDetectionService } from './FraudDetectionService';
import { DatabaseService } from "./DatabaseService";

interface OrderIngestionResult {
    success: boolean;
    orderId?: string;
    error?: string;
}

export class OrderService {
    private duoplaneService: DuoplaneService;
    private shopifyService: ShopifyService;
    private magentoService: MagentoService;
    private fraudDetectionService: FraudDetectionService;
    private databaseService: DatabaseService;

    constructor(private readonly env: Env) {
        this.duoplaneService = new DuoplaneService(env);
        this.shopifyService = new ShopifyService(env);
        this.magentoService = new MagentoService(env);
        this.fraudDetectionService = new FraudDetectionService(env);
        this.databaseService = new DatabaseService(env);
    }

    async processRecentOrders(): Promise<OrderIngestionResult[]> {
        const results: OrderIngestionResult[] = [];

        try {
            // 1. Get recent orders from Duoplane
            const recentOrders = await this.duoplaneService.getRecentOrders(5);
            console.log(`Found ${recentOrders.length} recent orders from Duoplane`);

            // 2. Process each order
            for (const duoplaneOrder of recentOrders) {
                try {
                    console.log(`Processing order ${duoplaneOrder.order_public_reference}...`);
                    const result = await this.processOrder(duoplaneOrder);
                    results.push(result);
                } catch (error) {
                    console.error(`Error processing order ${duoplaneOrder.order_public_reference}:`, error);
                    results.push({
                        success: false,
                        orderId: duoplaneOrder.order_public_reference,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

        } catch (error) {
            console.error('Error fetching recent orders:', error);
            throw error;
        }

        return results;
    }

    private async processOrder(duoplaneOrder: DuoplanePurchaseOrder): Promise<OrderIngestionResult> {
        const orderNumber = duoplaneOrder.order_public_reference;
        let normalizedOrder: NormalizedOrder | null = null;

        try {
            // 1. Get detailed order information based on platform type
            if (duoplaneOrder.platform_type === 'shopify') {
                normalizedOrder = await this.shopifyService.getOrder(orderNumber);
            } else if (duoplaneOrder.platform_type === 'magento') {
                normalizedOrder = await this.magentoService.getOrderByOrderNumber(orderNumber, duoplaneOrder.shipping_address.email);
            } else {
                throw new Error(`Unknown platform type: ${duoplaneOrder.platform_type}`);
            }

            if (!normalizedOrder) {
                throw new Error(`Order not found in ${duoplaneOrder.platform_type}`);
            }

            // 2. Enrich the normalized order with any additional Duoplane data
            normalizedOrder = this.enrichOrderWithDuoplaneData(normalizedOrder, duoplaneOrder);
            console.log('order:', normalizedOrder.order_number);
            console.log('order shipping province:', normalizedOrder.shipping_address.province);
            console.log('order shipping address line:', normalizedOrder.shipping_address.address1);
            console.log('order billing province:', normalizedOrder.billing_address.province);

            let fraudCheckResult: FraudCheckResult = {
                details: '',
                passed: true
            }
            // check if location all matches. all match = 3, no match = 0
            const locationCorrelationScore = await this.fraudDetectionService.checkLocationCorrelation(normalizedOrder);
            if (locationCorrelationScore === 0) {
                fraudCheckResult = {
                    passed: false,
                    details: 'Billing, Shipping, Ip location mismatch'
                }
            } else if (locationCorrelationScore < 3) {
                // check pass order if not all location matches
                const customerOrder = normalizedOrder.customer_data
                const pastOrders = normalizedOrder.platform_type === 'shopify' ?
                    await this.shopifyService.getPastOrders(normalizedOrder.order_number, customerOrder.email) :
                    await this.magentoService.getPastOrders(customerOrder.email);
                // find oldest order from pastOrders and check if it is older than today
                if (!pastOrders) {
                    fraudCheckResult = {
                        passed: false,
                        details: 'Billing, Shipping, Ip location mismatch, no past orders'
                    }
                } else {
                    const oldestOrder = pastOrders.reduce((oldest, order) => {
                        return new Date(order.created_at) < new Date(oldest.created_at) ? order : oldest;
                    }, pastOrders[0]);
                    const today = new Date();
                    const oldestOrderDate = new Date(oldestOrder.created_at);
                    const timeDifferenceMs = today.getTime() - oldestOrderDate.getTime();
                    const daysDifference = timeDifferenceMs / (1000 * 60 * 60 * 24);
                    console.log('today:', today);
                    console.log('oldestOrderDate:', oldestOrderDate);
                    console.log('daysDifference:', daysDifference);

                    fraudCheckResult = {
                        passed: daysDifference >= 2,
                        details: daysDifference <= 2 ? `Billing, Shipping, Ip location mismatch, has no past orders older than 1 day` : ''
                    }
                }
            }

            if (!fraudCheckResult.passed) {
                await this.databaseService.saveFraudulentOrder(normalizedOrder, fraudCheckResult, null);
                await this.duoplaneService.markOrderOnHold(duoplaneOrder.id);
            }
            console.log('fraudcheck result:', fraudCheckResult);

            return {
                success: true,
                orderId: orderNumber
            };

        } catch (error) {
            console.error(`Error processing order ${orderNumber}:`, error);
            return {
                success: false,
                orderId: orderNumber,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private enrichOrderWithDuoplaneData(normalizedOrder: NormalizedOrder, duoplaneOrder: any): NormalizedOrder {
        return {
            ...normalizedOrder,
            // Add any additional fields from Duoplane that might be useful
            metadata: {
                duoplane_id: duoplaneOrder.id,
                duoplane_status: duoplaneOrder.status,
                // Add any other relevant Duoplane metadata
            }
        };
    }

}
