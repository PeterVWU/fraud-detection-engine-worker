// src/services/order.ts
import { Env } from '../types/Env';
import { NormalizedOrder } from '../types';
import { DuoplaneService } from './DuoplaneService';
import { ShopifyService } from './ShopifyService';
import { MagentoService } from './MagentoService';

interface OrderIngestionResult {
    success: boolean;
    orderId?: string;
    error?: string;
}

export class OrderService {
    private duoplaneService: DuoplaneService;
    private shopifyService: ShopifyService;
    private magentoService: MagentoService;

    constructor(private readonly env: Env) {
        this.duoplaneService = new DuoplaneService(env);
        this.shopifyService = new ShopifyService(env);
        this.magentoService = new MagentoService(env);
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

    private async processOrder(duoplaneOrder: any): Promise<OrderIngestionResult> {
        const orderNumber = duoplaneOrder.order_public_reference;
        let normalizedOrder: NormalizedOrder | null = null;

        try {
            // 1. Get detailed order information based on platform type
            if (duoplaneOrder.platform_type === 'shopify') {
                normalizedOrder = await this.shopifyService.getOrderByNumber(orderNumber);
            } else if (duoplaneOrder.platform_type === 'magento') {
                normalizedOrder = await this.magentoService.getOrderByNumber(orderNumber);
            } else {
                throw new Error(`Unknown platform type: ${duoplaneOrder.platform_type}`);
            }

            if (!normalizedOrder) {
                throw new Error(`Order not found in ${duoplaneOrder.platform_type}`);
            }

            // 2. Enrich the normalized order with any additional Duoplane data
            normalizedOrder = this.enrichOrderWithDuoplaneData(normalizedOrder, duoplaneOrder);
            console.log('Normalized order:', normalizedOrder);
            // 3. Save to database
            // await this.saveOrder(normalizedOrder);

            // 4. Check for fraud if needed
            // const requiresFraudCheck = await this.checkIfRequiresFraudCheck(normalizedOrder);
            // if (requiresFraudCheck) {
            //     await this.duoplaneService.markOrderOnHold(duoplaneOrder.id);
            // }

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

    private async saveOrder(order: NormalizedOrder): Promise<void> {
        try {
            const { billing_address, shipping_address, customer_data, payment_data, items, ...orderData } = order;

            // Insert into orders table
            const query = `
                INSERT INTO orders (
                    id,
                    platform_id,
                    platform_type,
                    order_number,
                    created_at,
                    status,
                    customer_data,
                    shipping_address,
                    billing_address,
                    payment_data,
                    items,
                    total_amount,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;

            const params = [
                order.id,
                order.platform_id,
                order.platform_type,
                order.order_number,
                order.created_at,
                order.status,
                JSON.stringify(customer_data),
                JSON.stringify(shipping_address),
                JSON.stringify(billing_address),
                JSON.stringify(payment_data),
                JSON.stringify(items),
                order.total_amount
            ];

            await this.env.DB.prepare(query).bind(...params).run();

        } catch (error) {
            console.error('Error saving order to database:', error);
            throw error;
        }
    }

    private async checkIfRequiresFraudCheck(order: NormalizedOrder): Promise<boolean> {
        // Implement basic checks that would trigger fraud review
        const triggers = [
            this.isHighValueOrder(order),
            this.hasMultipleOrdersFromIP(order),
            this.hasShippingBillingMismatch(order),
            // Add more fraud check triggers as needed
        ];

        return triggers.some(trigger => trigger);
    }

    private isHighValueOrder(order: NormalizedOrder): boolean {
        const HIGH_VALUE_THRESHOLD = 1000; // Example threshold
        return order.total_amount > HIGH_VALUE_THRESHOLD;
    }

    private async hasMultipleOrdersFromIP(order: NormalizedOrder): Promise<boolean> {
        if (!order.client_ip) return false;

        const query = `
            SELECT COUNT(*) as count
            FROM orders
            WHERE JSON_EXTRACT(metadata, '$.client_ip') = ?
            AND created_at >= datetime('now', '-1 day')
        `;

        const result: any = await this.env.DB.prepare(query)
            .bind(order.client_ip)
            .first();

        return (result?.count || 0) > 3; // Flag if more than 3 orders from same IP in 24h
    }

    private hasShippingBillingMismatch(order: NormalizedOrder): boolean {
        const shipping = order.shipping_address;
        const billing = order.billing_address;

        return shipping.country !== billing.country ||
            shipping.zip !== billing.zip ||
            shipping.city !== billing.city;
    }
}

// Example usage:
/*
const orderService = new OrderService(env);
const results = await orderService.processRecentOrders();
console.log('Processing results:', results);
*/