import { Env, DuoplanePurchaseOrder } from '../types';


export class DuoplaneService {
    private baseUrl: string;
    private auth: string;

    constructor(private readonly env: Env) {
        this.baseUrl = env.DUOPLANE_API_URL;
        this.auth = btoa(`${env.DUOPLANE_USERNAME}:${env.DUOPLANE_PASSWORD}`);
    }

    private async makeRequest(path: string, method: string = "GET", params: Record<string, any> = {}, body: any = null): Promise<any> {
        const searchParams = new URLSearchParams();
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (Array.isArray(value)) {
                    value.forEach(v => searchParams.append(`search[${key}][]`, v.toString()));
                } else {
                    searchParams.append(`search[${key}]`, value.toString());
                }
            }
        }

        const url = `${this.baseUrl}${path}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Basic ${this.auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
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

            const response: any = await this.makeRequest('/purchase_orders.json', "GET", params);
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
        } else {
            return 'shopify';
        }
    }

    async markOrderOnHold(orderId: string): Promise<void> {
        // this function need duoplane orderid
        try {
            const holdUntil = new Date();
            holdUntil.setDate(holdUntil.getDate() + 30); // Hold for 30 day

            await this.makeRequest(`/purchase_orders/${orderId}.json`, "PUT", undefined, {
                purchase_order: {
                    confirmed: 0,
                    vendor_reference: 'FRAUD_CHECK_HOLD',
                    hold_purchase_order_until: holdUntil.toISOString()
                }
            });
            console.log('Order marked as on hold:', orderId);
        } catch (error) {
            console.error(`Error marking order ${orderId} as on hold:`, error);
            throw error;
        }
    }
}