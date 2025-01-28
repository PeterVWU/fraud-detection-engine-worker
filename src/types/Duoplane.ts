
export interface DuoplanePurchaseOrder {
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
        email: string;
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