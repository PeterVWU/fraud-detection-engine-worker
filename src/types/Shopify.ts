// src/types/Shopify.ts

export interface ShopifyAddress {
    first_name: string;
    last_name: string;
    company: string | null;
    address1: string;
    address2: string | null;
    city: string;
    province: string;
    province_code: string;
    country: string;
    country_code: string;
    zip: string;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
}

export interface ShopifyLineItem {
    id: number;
    product_id: number;
    variant_id: number;
    title: string;
    quantity: number;
    sku: string;
    price: string;
    total_discount: string;
    tax_lines: Array<{
        price: string;
        rate: number;
        title: string;
    }>;
}

export interface ShopifyOrder {
    id: number;
    order_number: string;
    name: string; // Format: #EJC1234
    created_at: string;
    updated_at: string;
    processed_at: string;
    customer: {
        id: number;
        email: string;
        phone: string | null;
        first_name: string;
        last_name: string;
        orders_count: number;
        state: string;
        total_spent: string;
        note: string | null;
    };
    shipping_address: ShopifyAddress;
    billing_address: ShopifyAddress;
    line_items: ShopifyLineItem[];
    payment_details: {
        credit_card_bin: string | null;
        avs_result_code: string | null;
        cvv_result_code: string | null;
        credit_card_number: string | null;
        credit_card_company: string | null;
    };
    total_price: string;
    subtotal_price: string;
    total_tax: string;
    total_discounts: string;
    total_shipping_price_set: {
        shop_money: {
            amount: string;
            currency_code: string;
        };
    };
    client_details: {
        browser_ip: string | null;
        user_agent: string | null;
    };
}