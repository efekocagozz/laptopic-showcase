import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    LanguageCode,
    VendureConfig,
} from '@vendure/core';
import { EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { MolliePlugin } from '@vendure-community/mollie-plugin';
import { In3Plugin } from './plugins/in3/in3.plugin';
import { ReturnsPlugin } from './plugins/returns/returns.plugin';
import { SupplierSyncPlugin } from './plugins/supplier-sync/supplier-sync.plugin';
import { COMPANY, WITHDRAWAL_PERIOD_DAYS } from './email/company';
import { emailHandlers } from './email/email-handlers';
import 'dotenv/config';
import path from 'path';

const IS_DEV = process.env.APP_ENV === 'dev';
// PORT wins because hosting platforms inject it into the environment at runtime, and that
// must take precedence over any value baked into the .env file at scaffold time.
const serverPort = +process.env.PORT || +process.env.VENDURE_SERVER_PORT || 3000;
const storefrontUrl = process.env.STOREFRONT_URL || 'http://localhost:3001';
// Public URL of this server. Mollie sends payment webhooks to `${publicUrl}/payments/mollie/...`,
// so in development it must be a tunnel URL for webhooks to arrive (see README).
const publicUrl = process.env.VENDURE_PUBLIC_URL || `http://localhost:${serverPort}`;
// Real email sending outside development. Without SMTP_HOST (only possible while building, since a
// production server refuses to start without it), emails are written to disk instead.
const smtpTransport = process.env.SMTP_HOST
    ? {
          type: 'smtp' as const,
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          // Port 465 uses TLS from the start; other ports upgrade the connection with STARTTLS.
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: { user: process.env.SMTP_USER ?? '', pass: process.env.SMTP_PASSWORD ?? '' },
      }
    : undefined;
const supplierFeedPath =
    process.env.SUPPLIER_FEED_PATH || (IS_DEV ? path.join(__dirname, '../supplier-feed/sample.csv') : undefined);

export const config: VendureConfig = {
    // Storefront content is Dutch. Only applies when the database is first created.
    defaultLanguageCode: LanguageCode.nl,
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        // Blocks cross-site form posts (e.g. login CSRF). The storefront sends JSON and the Dashboard sends
        // the Apollo-Require-Preflight header, so both keep working.
        csrfPrevention: !IS_DEV,
        // Which browser origins may make credentialed requests to the Shop and Admin APIs.
        // In dev any origin is reflected, so a storefront on any port works. In production set
        // CORS_ORIGINS to a comma-separated list of the origins you serve, for example
        // "https://example.com,https://admin.example.com". An unset value blocks all
        // cross-origin browser requests, which is the safe default.
        cors: {
            origin: IS_DEV ? true : (process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) ?? []),
            credentials: true,
        },
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET,
        },
    },
    dbConnectionOptions: {
        type: 'postgres',
        // See the README.md "Migrations" section for an explanation of
        // the `synchronize` and `migrations` options.
        synchronize: false,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    },
    paymentOptions: {
        // The dummy handler lets us test checkout locally until Mollie is added in Milestone 3.
        // It must never be available outside development.
        paymentMethodHandlers: IS_DEV ? [dummyPaymentHandler] : [],
    },
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {},
    plugins: [
        // The GraphQL playground is a development tool; don't expose it in production.
        ...(IS_DEV ? [GraphiqlPlugin.init()] : []),
        // The Mollie payment method itself (API key, redirect URL) is stored in the database;
        // create it with `npm run setup:mollie` or in the Dashboard.
        MolliePlugin.init({ vendureHost: publicUrl }),
        // Uses in3's usual range (EUR 50 - 3,000); pass minAmount/maxAmount to narrow it.
        In3Plugin.init(),
        ReturnsPlugin,
        // Without a real feed the nightly sync is off. Only development falls back to the sample feed,
        // so production never overwrites real stock and prices with demo data.
        ...(supplierFeedPath ? [SupplierSyncPlugin.init({ feedPath: supplierFeedPath })] : []),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            // In dev the prefix is derived from the request; in production set ASSET_URL_PREFIX,
            // e.g. https://api.example.nl/assets/
            assetUrlPrefix: process.env.ASSET_URL_PREFIX || undefined,
        }),
        DefaultSchedulerPlugin.init(),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        EmailPlugin.init({
            // In dev mode, emails are written to disk instead of being sent, and the dev mailbox
            // at /mailbox lists and serves all of them without authentication.
            ...(IS_DEV ? {
                devMode: true,
                outputPath: path.join(__dirname, '../static/email/test-emails'),
                route: 'mailbox',
            } : {
                transport: smtpTransport ?? {
                    type: 'file',
                    outputPath: path.join(__dirname, '../static/email/test-emails'),
                },
            }),
            handlers: emailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                // The sender must be an address your SMTP provider allows you to send from.
                fromAddress: process.env.EMAIL_FROM || `"${COMPANY.name}" <${COMPANY.email}>`,
                company: COMPANY,
                withdrawalPeriodDays: WITHDRAWAL_PERIOD_DAYS,
                storefrontUrl,
                verifyEmailAddressUrl: `${storefrontUrl}/verify`,
                passwordResetUrl: `${storefrontUrl}/reset-password`,
                changeEmailAddressUrl: `${storefrontUrl}/account/verify-email`,
                // The URL of the password reset page of the Vendure Dashboard.
                adminPasswordResetUrl: `${publicUrl}/dashboard/reset-password`
            },
        }),
        DashboardPlugin.init({
            route: 'dashboard',
            appDir: IS_DEV
                ? path.join(__dirname, '../dist/dashboard')
                : path.join(__dirname, 'dashboard'),
        }),
    ],
};
