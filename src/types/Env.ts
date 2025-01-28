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

    SHOPIFY_STORE_EJC_URL: string;
    SHOPIFY_STORE_MH_URL: string;
    SHOPIFY_STORE_EJR_URL: string;
    SHOPIFY_STORE_AL_URL: string;
    SHOPIFY_STORE_EL_URL: string;
    SHOPIFY_STORE_YM_URL: string;
    SHOPIFY_STORE_R_URL: string;

    SHOPIFY_STORE_EJC_TOKEN: string;
    SHOPIFY_STORE_MH_TOKEN: string;
    SHOPIFY_STORE_EJR_TOKEN: string;
    SHOPIFY_STORE_AL_TOKEN: string;
    SHOPIFY_STORE_EL_TOKEN: string;
    SHOPIFY_STORE_YM_TOKEN: string;
    SHOPIFY_STORE_R_TOKEN: string;
}