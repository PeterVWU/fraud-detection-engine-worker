//src/types/Env.ts
export interface Env {
    DB: D1Database;

    MAGENTO_API_URL: string;
    MAGENTO_API_TOKEN: string;

    DUOPLANE_API_URL: string;
    DUOPLANE_USERNAME: string;
    DUOPLANE_PASSWORD: string;

    SHOPIFY_STORE_URL: string;
    SHOPIFY_ACCESS_TOKEN: string;
}