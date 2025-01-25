// src/services/shopify.ts
import { Env, ShopifyAddress, ShopifyLineItem, ShopifyOrder, NormalizedOrder } from '../types';


export class ShopifyService {
    private baseUrl: string;

    constructor(private readonly env: Env) {
        this.baseUrl = `${env.SHOPIFY_STORE_URL}/admin/api/2024-01`;
    }

    private async makeRequest(path: string) {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
            headers: {
                'X-Shopify-Access-Token': this.env.SHOPIFY_ACCESS_TOKEN,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Shopify API error: ${response.status} - ${error}`);
        }

        return response.json();
    }

    async getOrderByNumber(orderNumber: string): Promise<NormalizedOrder | null> {
        try {
            // Remove 'EJC' prefix if present
            const cleanOrderNumber = orderNumber.replace('EJC', '');

            // Query by name which includes the #EJC prefix
            const response: any = await this.makeRequest(
                `/orders.json?name=%23${orderNumber}&status=any`
            );

            if (!response.orders || response.orders.length === 0) {
                console.warn(`No Shopify order found for order number: ${orderNumber}`);
                return null;
            }

            const shopifyOrder = response.orders[0];
            return this.normalizeOrder(shopifyOrder);

        } catch (error) {
            console.error(`Error fetching Shopify order ${orderNumber}:`, error);
            throw error;
        }
    }

    private normalizeOrder(order: ShopifyOrder): NormalizedOrder {
        return {
            id: order.id.toString(),
            platform_id: order.id.toString(),
            platform_type: 'shopify',
            order_number: order.name.replace('#', ''),
            created_at: order.created_at,
            status: 'processing',
            customer_data: {
                email: order.customer.email,
                phone: order.customer.phone,
                first_name: order.customer.first_name,
                last_name: order.customer.last_name,
                orders_count: order.customer.orders_count,
                total_spent: order.customer.total_spent
            },
            shipping_address: {
                first_name: order.shipping_address.first_name,
                last_name: order.shipping_address.last_name,
                address1: order.shipping_address.address1,
                address2: order.shipping_address.address2,
                city: order.shipping_address.city,
                province: order.shipping_address.province,
                country: order.shipping_address.country,
                zip: order.shipping_address.zip,
                phone: order.shipping_address.phone,
                latitude: order.shipping_address.latitude,
                longitude: order.shipping_address.longitude
            },
            billing_address: {
                first_name: order.billing_address.first_name,
                last_name: order.billing_address.last_name,
                address1: order.billing_address.address1,
                address2: order.billing_address.address2,
                city: order.billing_address.city,
                province: order.billing_address.province,
                country: order.billing_address.country,
                zip: order.billing_address.zip,
                phone: order.billing_address.phone
            },
            payment_data: {
                method: order.payment_details.credit_card_company ? 'credit_card' : 'other',
                card_bin: order.payment_details.credit_card_bin || undefined,
                card_last4: order.payment_details.credit_card_number || undefined,
                card_company: order.payment_details.credit_card_company || undefined,
                avs_result: order.payment_details.avs_result_code || undefined,
                cvv_result: order.payment_details.cvv_result_code || undefined
            },
            items: order.line_items.map(item => ({
                id: item.id.toString(),
                product_id: item.product_id.toString(),
                title: item.title,
                quantity: item.quantity,
                sku: item.sku,
                price: parseFloat(item.price),
                total_discount: parseFloat(item.total_discount)
            })),
            total_amount: parseFloat(order.total_price),
            client_ip: order.client_details.browser_ip || undefined,
            user_agent: order.client_details.user_agent || undefined
        };
    }
}
