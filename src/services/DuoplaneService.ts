import { Env } from '../types/Env';

interface DuoplanePurchaseOrder {
    id: string;
    public_reference: string;
    order_public_reference: string;
    created_at: string;
    updated_at: string;
    ordered_at: string;
    status: string;
    store_name: string;
    shipping_address: {
        first_name: string;
        last_name: string;
        company_name?: string;
        address_1: string;
        address_2?: string;
        city: string;
        province: string;
        post_code: string;
        country: string;
        phone?: string;
        email?: string;
    };
    order_items: Array<{
        id: string;
        name: string;
        retailer_sku: string;
        quantity: number;
        price: number;
        cost: number;
    }>;
    total_shipping_revenue: number;
    total_tax: number;
    platform_type?: string;
}

export class DuoplaneService {
    private baseUrl: string;
    private auth: string;

    constructor(private readonly env: Env) {
        this.baseUrl = env.DUOPLANE_API_URL;
        this.auth = btoa(`${env.DUOPLANE_USERNAME}:${env.DUOPLANE_PASSWORD}`);
    }

    private async makeRequest(path: string, params: Record<string, any> = {}) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (Array.isArray(value)) {
                value.forEach(v => searchParams.append(`search[${key}][]`, v.toString()));
            } else {
                searchParams.append(`search[${key}]`, value.toString());
            }
        }

        const url = `${this.baseUrl}${path}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
        console.log('url', url)
        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${this.auth}`,
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Duoplane API error: ${response.status} - ${error}`);
        }

        return response.json();
    }

    async getRecentOrders(minutes: number = 5): Promise<DuoplanePurchaseOrder[]> {
        const now = new Date();
        const twoMinutesAgo = new Date(now.getTime() - (minutes * 60 * 1000));

        try {
            const params = {
                created_at_min: twoMinutesAgo.toISOString(),
                created_at_max: now.toISOString(),
                per_page: 250 // Maximum allowed by API
            };

            const response: any = await this.makeRequest('/purchase_orders.json', params);
            console.log('response', response)
            // Add platform type based on store_name if possible
            return response.map((order: DuoplanePurchaseOrder) => ({
                ...order,
                platform_type: this.determinePlatformType(order)
            }));

        } catch (error) {
            console.error('Error fetching recent orders from Duoplane:', error);
            throw error;
        }
    }

    private determinePlatformType(order: DuoplanePurchaseOrder): string {
        const orderNumber = order.order_public_reference;

        // Magento orders have 9 digits
        if (/^\d{9}(-1)?$/.test(orderNumber)) {
            return 'magento';
        }

        // Shopify orders start with EJC
        if (orderNumber.startsWith('EJC')) {
            return 'shopify';
        }

        return 'unknown';
    }

    async markOrderOnHold(orderId: string): Promise<void> {
        try {
            await this.makeRequest(`/purchase_orders/${orderId}.json`, {
                confirmed: false,
                status: 'on_hold'
            });
        } catch (error) {
            console.error(`Error marking order ${orderId} as on hold:`, error);
            throw error;
        }
    }
}