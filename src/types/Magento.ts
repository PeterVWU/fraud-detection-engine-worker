// src/types/Magento.ts

export interface MagentoAddress {
    address_type: string;
    city: string;
    country_id: string;
    customer_address_id?: number;
    email: string;
    entity_id: number;
    firstname: string;
    lastname: string;
    parent_id: number;
    postcode: string;
    region: string;
    region_code: string;
    region_id: number;
    street: string[];
    telephone: string;
}

export interface MagentoPayment {
    method: string;
    additional_information: string[];
    cc_avs_status: string;
    cc_cid_status: string;
    cc_last4: string;
    cc_type: string;
    cc_trans_id: string;
    amount_ordered: number;
    amount_paid: number;
}

export interface MagentoOrderItem {
    item_id: number;
    name: string;
    sku: string;
    product_id: number;
    product_type: string;
    price: number;
    price_incl_tax: number;
    qty_ordered: number;
    qty_invoiced: number;
    qty_shipped: number;
    qty_refunded: number;
    qty_canceled: number;
    discount_amount: number;
    row_total: number;
    row_total_incl_tax: number;
    tax_amount: number;
    created_at: string;
    updated_at: string;
}

export interface MagentoOrder {
    entity_id: string;
    increment_id: string;
    created_at: string;
    updated_at: string;
    customer_email: string;
    customer_firstname: string;
    customer_lastname: string;
    customer_id: number;
    customer_group_id: number;
    customer_is_guest: number;
    remote_ip: string;
    x_forwarded_for?: string;
    store_id: number;
    store_name: string;
    status: string;
    state: string;
    grand_total: number;
    subtotal: number;
    base_subtotal: number;
    total_item_count: number;
    total_qty_ordered: number;
    extension_attributes: {
        shipping_assignments: shipping_assignments[]
    }
    billing_address: MagentoAddress;
    shipping_address: MagentoAddress;
    payment: MagentoPayment;
    items: MagentoOrderItem[];
    shipping_amount: number;
    shipping_description: string;
    status_histories: Array<{
        comment: string;
        created_at: string;
        status: string;
        entity_id: number;
        entity_name: string;
    }>;
}
interface shipping_assignments {
    shipping: {
        address: MagentoAddress;
    }
}