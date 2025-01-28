// src/services/magento.ts
import { Env } from '../types/Env';
import { NormalizedOrder, MagentoOrder } from '../types';


export class MagentoService {
    private baseUrl: string;
    private token: string;

    constructor(private readonly env: Env) {
        this.baseUrl = env.MAGENTO_API_URL;
        this.token = env.MAGENTO_API_TOKEN;
    }

    private async makeRequest(path: string) {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Magento API error: ${response.status} - ${error}`);
        }

        return response.json();
    }

    async getOrderByOrderNumber(orderNumber: string, email: string): Promise<NormalizedOrder | null> {
        try {
            // Ensure it's a 9-digit number
            if (!/^\d{9}$/.test(orderNumber)) {
                throw new Error(`Invalid Magento order number format: ${orderNumber}`);
            }

            const response: any = await this.makeRequest(
                `/rest/V1/orders?searchCriteria[filter_groups][0][filters][0][field]=increment_id&` +
                `searchCriteria[filter_groups][0][filters][0][value]=${orderNumber}&` +
                `searchCriteria[filter_groups][0][filters][0][condition_type]=eq`
            );

            if (!response.items || response.items.length === 0) {
                console.warn(`No Magento order found for order number: ${orderNumber}`);
                return null;
            }

            const magentoOrder = response.items[0];
            return this.normalizeOrder(magentoOrder);

        } catch (error) {
            console.error(`Error fetching Magento order ${orderNumber}:`, error);
            throw error;
        }
    }

    async getPastOrders(email: string): Promise<NormalizedOrder[] | null> {
        try {

            const response: any = await this.makeRequest(
                `/rest/V1/orders?searchCriteria[filter_groups][0][filters][0][field]=customer_email&` +
                `searchCriteria[filter_groups][0][filters][0][value]=${email}&` +
                `searchCriteria[filter_groups][0][filters][0][condition_type]=eq`
            );

            if (!response.items || response.items.length === 0) {
                console.warn(`No Magento order found for : ${email}`);
                return null;
            }

            const magentoOrders = response.items.map((order: MagentoOrder) => this.normalizeOrder(order));
            return magentoOrders
        } catch (error) {
            console.error(`Error fetching Magento order ${email}:`, error);
            throw error;
        }
    }

    private normalizeOrder(order: MagentoOrder): NormalizedOrder {
        const payment = order.payment;
        // Extract payment method and card info from additional_information array
        // [payment_method, trans_id, card_type, avs, cvv, masked_cc]
        const [paymentMethod, , cardType, avsStatus, cvvStatus, maskedCC] = payment.additional_information || [];

        return {
            id: order.entity_id,
            platform_id: order.entity_id,
            platform_type: 'magento',
            order_number: order.increment_id,
            created_at: order.created_at,
            status: this.normalizeStatus(order.status),
            customer_data: {
                email: order.customer_email,
                phone: order.billing_address.telephone || null,
                first_name: order.customer_firstname,
                last_name: order.customer_lastname,
                orders_count: 0,
                total_spent: '0',
            },
            shipping_address: {
                first_name: order.extension_attributes.shipping_assignments[0].shipping.address.firstname,
                last_name: order.extension_attributes.shipping_assignments[0].shipping.address.lastname,
                address1: order.extension_attributes.shipping_assignments[0].shipping.address.street[0],
                address2: order.extension_attributes.shipping_assignments[0].shipping.address.street[1] || null,
                city: order.extension_attributes.shipping_assignments[0].shipping.address.city,
                province: order.extension_attributes.shipping_assignments[0].shipping.address.region_code,
                country: order.extension_attributes.shipping_assignments[0].shipping.address.country_id,
                zip: order.extension_attributes.shipping_assignments[0].shipping.address.postcode,
                phone: order.extension_attributes.shipping_assignments[0].shipping.address.telephone || null
            },
            billing_address: {
                first_name: order.billing_address.firstname,
                last_name: order.billing_address.lastname,
                address1: order.billing_address.street[0],
                address2: order.billing_address.street[1] || null,
                city: order.billing_address.city,
                province: order.billing_address.region_code,
                country: order.billing_address.country_id,
                zip: order.billing_address.postcode,
                phone: order.billing_address.telephone || null
            },
            payment_data: {
                method: paymentMethod || payment.method,
                card_company: cardType || payment.cc_type,
                card_last4: payment.cc_last4,
                avs_result: avsStatus || payment.cc_avs_status,
                cvv_result: cvvStatus || payment.cc_cid_status,
            },
            items: order.items.map(item => ({
                id: item.item_id.toString(),
                product_id: item.product_id.toString(),
                title: item.name,
                quantity: item.qty_ordered,
                sku: item.sku,
                price: item.price,
                total_discount: item.discount_amount
            })),
            total_amount: order.grand_total,
            client_ip: order.remote_ip || order.x_forwarded_for
        };
    }

    private normalizeStatus(status: string): string {
        // Map Magento-specific statuses to our normalized statuses
        const statusMap: { [key: string]: string } = {
            'pending': 'pending',
            'processing': 'processing',
            'complete': 'completed',
            'canceled': 'cancelled',
            'closed': 'closed',
            'fraud': 'fraud',
            'payment_review': 'review',
            'pending_payment': 'pending_payment',
            'holded': 'on_hold'
        };

        return statusMap[status.toLowerCase()] || status.toLowerCase();
    }
}
