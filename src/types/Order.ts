// src/types/Order.ts
export interface NormalizedOrder {
    id: string;
    platform_id: string;
    platform_type: string;
    order_number: string;
    created_at: string;
    status: string;
    customer_data: {
        email: string;
        phone: string | null;
        first_name: string;
        last_name: string;
        orders_count: number;
        total_spent: string;
    };
    shipping_address: {
        first_name: string;
        last_name: string;
        address1: string;
        address2: string | null;
        city: string;
        province: string;
        country: string;
        zip: string;
        phone: string | null;
        latitude?: number | null;
        longitude?: number | null;
    };
    billing_address: {
        first_name: string;
        last_name: string;
        address1: string;
        address2: string | null;
        city: string;
        province: string;
        country: string;
        zip: string;
        phone: string | null;
    };
    payment_data: {
        method: string;
        card_bin?: string;
        card_last4?: string;
        card_company?: string;
        avs_result?: string;
        cvv_result?: string;
    };
    items: Array<{
        id: string;
        product_id: string;
        title: string;
        quantity: number;
        sku: string;
        price: number;
        total_discount: number;
    }>;
    total_amount: number;
    client_ip?: string;
    user_agent?: string;
    metadata?: Record<string, any>;
}
