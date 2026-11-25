import {
    bootstrapWorker,
    ChannelService,
    CurrencyCode,
    Logger,
    mergeConfig,
    ProductService,
    RequestContextService,
    runMigrations,
} from '@vendure/core';
import { importProductsFromCsv, populateCollections, populateInitialData } from '@vendure/core/cli';
import path from 'path';

import { config } from '../vendure-config';
import { initialData } from './initial-data';
import { describeError } from './describe-error';
import { upsertMolliePaymentMethod } from './mollie-payment-method';

const loggerCtx = 'Seed';

/**
 * Fills an empty database with the Dutch store setup and the demo catalogue.
 * Run with `npm run seed` after `npm run db:up`. Refuses to run twice; use
 * `npm run db:reset` first to start over.
 */
async function seed() {
    const seedConfig = mergeConfig(config, {
        importExportOptions: { importAssetsDir: path.join(__dirname, 'assets') },
    });
    await runMigrations(seedConfig);
    // The worker context gives us all Vendure services without starting the HTTP server,
    // so this also works while `npm run dev` is running.
    const { app } = await bootstrapWorker(seedConfig);

    try {
        const ctx = await app.get(RequestContextService).create({ apiType: 'admin' });
        const existing = await app.get(ProductService).findAll(ctx, { take: 1 });
        if (existing.totalItems > 0) {
            throw new Error('Database already contains products. Run `npm run db:reset` first.');
        }

        // Must happen before importing products: CSV prices are read as euros including VAT.
        const channelService = app.get(ChannelService);
        const channel = await channelService.getDefaultChannel();
        await channelService.update(ctx, {
            id: channel.id,
            defaultCurrencyCode: CurrencyCode.EUR,
            availableCurrencyCodes: [CurrencyCode.EUR],
            pricesIncludeTax: true,
        });

        // The dummy "Testbetaling" handler only exists in development (see vendure-config.ts).
        const paymentMethods = process.env.APP_ENV === 'dev' ? initialData.paymentMethods : [];
        await populateInitialData(app, { ...initialData, paymentMethods });
        const result = await importProductsFromCsv(
            app,
            path.join(__dirname, 'products.csv'),
            initialData.defaultLanguage,
        );
        const importErrors = result.errors ?? [];
        if (importErrors.length) {
            throw new Error(`Product import failed:\n${importErrors.join('\n')}`);
        }
        await populateCollections(app, initialData);
        Logger.info(`Imported ${result.imported} products`, loggerCtx);

        if (process.env.MOLLIE_API_KEY) {
            await upsertMolliePaymentMethod(app, process.env.MOLLIE_API_KEY);
            Logger.info('Created the Mollie payment method', loggerCtx);
        } else {
            Logger.warn('MOLLIE_API_KEY is not set; run `npm run setup:mollie` later to add Mollie', loggerCtx);
        }
    } finally {
        await app.close();
    }
}

seed()
    .then(() => process.exit(0))
    .catch(err => {
        Logger.error(describeError(err), loggerCtx);
        process.exit(1);
    });
