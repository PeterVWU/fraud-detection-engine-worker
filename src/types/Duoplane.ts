export interface DuoplaneOrder {
    id: string;
    public_reference: string;
    order_public_reference: string;
    created_at: string;
    ordered_at: string;
    store_name: string;
    status: string;
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
}