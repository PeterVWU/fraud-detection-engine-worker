// src/services/shopify.ts
import { Env, ShopifyOrder, NormalizedOrder, StoreConfig } from '../types';


export class ShopifyService {
    private baseUrl: string;
    private stores: Map<string, StoreConfig>;

    constructor(private readonly env: Env) {
        this.baseUrl = `${env.SHOPIFY_STORE_URL}/admin/api/2024-01`;
        this.stores = new Map();
        this.initializeStores();
    }

    private initializeStores() {
        const storeConfigs = [
            {
                prefix: 'EJC',
                url: this.env.SHOPIFY_STORE_EJC_URL,
                token: this.env.SHOPIFY_STORE_EJC_TOKEN
            },
            {
                prefix: 'MH',
                url: this.env.SHOPIFY_STORE_MH_URL,
                token: this.env.SHOPIFY_STORE_MH_TOKEN
            },
            {
                prefix: 'EJR',
                url: this.env.SHOPIFY_STORE_EJR_URL,
                token: this.env.SHOPIFY_STORE_EJR_TOKEN
            },
            {
                prefix: 'AL',
                url: this.env.SHOPIFY_STORE_AL_URL,
                token: this.env.SHOPIFY_STORE_AL_TOKEN
            }
        ]
        for (const config of storeConfigs) {
            if (config.url && config.token) {
                this.stores.set(config.prefix, {
                    url: config.url,
                    accessToken: config.token
                });
            } else {
                console.warn(`Missing configuration for Shopify store with prefix ${config.prefix}`);
            }
        }
    }

    private getStoreConfigFromOrderNumber(orderNumber: string): StoreConfig | null {
        const prefix = orderNumber.match(/^([A-Z]+)/)?.[1];
        if (!prefix) return null;
        return this.stores.get(prefix) || null;
    }

    private async makeGraphQLRequest(storeUrl: string, accessToken: string, query: string, variables: any = {}) {
        const url = `${storeUrl}/admin/api/2025-01/graphql.json`;
        console.log('storeUrl', storeUrl)
        console.log('accessToken', accessToken)
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Shopify GraphQL error: ${response.status} - ${error}`);
        }

        const result: any = await response.json();
        if (result.errors) {
            throw new Error(`GraphQL Errors: ${JSON.stringify(result.errors)}`);
        }

        return result.data;
    }

    getGqlQuery(count: number): string {
        return `
                query getOrder($query: String!) {
                    orders(first: ${count}, query: $query) {
                        edges {
                            node {
                                id
                                name
                                createdAt
                                displayFulfillmentStatus
                                totalPriceSet {
                                    shopMoney {
                                        amount
                                        currencyCode
                                    }
                                }
                                customer {
                                    id
                                    email
                                    phone
                                    firstName
                                    lastName
                                    numberOfOrders
                                }
                                shippingAddress {
                                    firstName
                                    lastName
                                    address1
                                    address2
                                    city
                                    province
                                    provinceCode
                                    country
                                    countryCodeV2
                                    zip
                                    phone
                                    latitude
                                    longitude
                                }
                                billingAddress {
                                    firstName
                                    lastName
                                    address1
                                    address2
                                    city
                                    province
                                    provinceCode
                                    country
                                    countryCodeV2
                                    zip
                                    phone
                                }
                                paymentGatewayNames
                                transactions(first: 1) {
                                    gateway
                                    paymentDetails {
                                        ... on CardPaymentDetails {
                                            avsResultCode
                                            cvvResultCode
                                            company
                                            number
                                            expirationMonth
                                            expirationYear
                                        }
                                    }
                                }
                                lineItems(first: 50) {
                                    edges {
                                        node {
                                            id
                                            title
                                            quantity
                                            sku
                                            product {
                                                id
                                            }
                                        }
                                    }
                                }
                                clientIp
                            }
                        }
                    }
                }
            `;
    }

    async getPastOrders(orderNumber: string, email: string): Promise<NormalizedOrder[] | null> {
        try {
            const storeConfig = this.getStoreConfigFromOrderNumber(orderNumber);
            if (!storeConfig) {
                throw new Error(`No Shopify store found for order number: ${orderNumber}`);
            }
            // get few order from customer
            const query = this.getGqlQuery(5)

            // filter by customer email
            const variables = {
                query: `email:${email}`
            };

            const data = await this.makeGraphQLRequest(storeConfig.url, storeConfig.accessToken, query, variables);

            if (!data.orders.edges.length) {
                console.warn(`No Shopify order found for order number: ${orderNumber}`);
                return null;
            }

            const orders = data.orders.edges.map((edge: any) => this.normalizeGraphQLOrder(edge.node));
            return orders;

        } catch (error) {
            console.error(`Error fetching Shopify order ${orderNumber}:`, error);
            throw error;
        }
    }

    async getOrder(orderNumber: string): Promise<NormalizedOrder | null> {
        try {
            const storeConfig = this.getStoreConfigFromOrderNumber(orderNumber);
            if (!storeConfig) {
                throw new Error(`No Shopify store found for order number: ${orderNumber}`);
            }
            const query = this.getGqlQuery(1)
            const variables = {
                query: `name:${orderNumber}`
            };

            const data = await this.makeGraphQLRequest(storeConfig.url, storeConfig.accessToken, query, variables);

            if (!data.orders.edges.length) {
                console.warn(`No Shopify order found for order number: ${orderNumber}`);
                return null;
            }

            const order = data.orders.edges[0].node;
            return this.normalizeGraphQLOrder(order);

        } catch (error) {
            console.error(`Error fetching Shopify order ${orderNumber}:`, error);
            throw error;
        }
    }

    private normalizeGraphQLOrder(order: any): NormalizedOrder {
        const creditCard = order.transactions?.paymentDetails?.creditCard;
        console.log('creditCard', creditCard)
        return {
            id: order.id.split('/').pop(),
            platform_id: order.id,
            platform_type: 'shopify',
            order_number: order.name.replace('#', ''),
            created_at: order.createdAt,
            status: this.normalizeStatus(order.displayFulfillmentStatus),
            customer_data: {
                email: order.customer.email,
                phone: order.customer.phone,
                first_name: order.customer.firstName,
                last_name: order.customer.lastName,
                orders_count: order.customer.numberOfOrders,
                total_spent: ''
            },
            shipping_address: {
                first_name: order.shippingAddress.firstName,
                last_name: order.shippingAddress.lastName,
                address1: order.shippingAddress.address1,
                address2: order.shippingAddress.address2,
                city: order.shippingAddress.city,
                province: order.shippingAddress.provinceCode,
                country: order.shippingAddress.countryCodeV2,
                zip: order.shippingAddress.zip,
                phone: order.shippingAddress.phone,
                latitude: order.shippingAddress.latitude,
                longitude: order.shippingAddress.longitude
            },
            billing_address: {
                first_name: order.billingAddress.firstName,
                last_name: order.billingAddress.lastName,
                address1: order.billingAddress.address1,
                address2: order.billingAddress.address2,
                city: order.billingAddress.city,
                province: order.billingAddress.provinceCode,
                country: order.billingAddress.countryCodeV2,
                zip: order.billingAddress.zip,
                phone: order.billingAddress.phone
            },
            payment_data: {
                method: order.transactions?.gateway || 'unknown',
                card_bin: order.transactions?.paymentDetails?.number,
                card_last4: order.transactions?.paymentDetails?.number,
                card_company: order.transactions?.paymentDetails?.company,
                avs_result: order.transactions?.paymentDetails?.avsResultCode,
                cvv_result: order.transactions?.paymentDetails?.cvvResultCode
            },
            items: order.lineItems.edges.map((edge: any) => ({
                id: edge.node.id.split('/').pop(),
                product_id: edge.node.product?.id?.split('/').pop(),
                title: edge.node.title,
                quantity: edge.node.quantity,
                sku: edge.node.sku,
                price: 0,
                total_discount: 0
            })),
            total_amount: parseFloat(order.totalPriceSet.shopMoney.amount),
            client_ip: order.clientIp,
            user_agent: '',
        };
    }
    private normalizeStatus(status: string): string {
        switch (status.toLowerCase()) {
            case 'unfulfilled':
                return 'pending';
            case 'fulfilled':
                return 'completed';
            case 'partially_fulfilled':
                return 'partially_fulfilled';
            case 'restocked':
                return 'cancelled';
            default:
                return status.toLowerCase();
        }
    }
}
