export {};

// Here we declare the members of the process.env object, so that we
// can use them in our application code in a type-safe manner.
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            APP_ENV: string;
            VENDURE_SERVER_PORT: string;
            PORT: string;
            COOKIE_SECRET: string;
            SUPERADMIN_USERNAME: string;
            SUPERADMIN_PASSWORD: string;
            CORS_ORIGINS?: string;
            DB_HOST: string;
            DB_PORT: number;
            DB_NAME: string;
            DB_USERNAME: string;
            DB_PASSWORD: string;
            DB_SCHEMA: string;
            STOREFRONT_URL?: string;
            ASSET_URL_PREFIX?: string;
            VENDURE_PUBLIC_URL?: string;
            MOLLIE_API_KEY?: string;
            SUPPLIER_FEED_PATH?: string;
            SMTP_HOST?: string;
            SMTP_PORT?: string;
            SMTP_USER?: string;
            SMTP_PASSWORD?: string;
            EMAIL_FROM?: string;
        }
    }
}
