import { bootstrapWorker, Logger } from '@vendure/core';

import { config } from '../vendure-config';
import { describeError } from './describe-error';
import { upsertMolliePaymentMethod } from './mollie-payment-method';

const loggerCtx = 'SetupMollie';

/**
 * Creates or updates the Mollie payment method from MOLLIE_API_KEY and STOREFRONT_URL in .env.
 * Run with `npm run setup:mollie` after changing the key.
 */
async function setupMollie() {
    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey) {
        throw new Error('Set MOLLIE_API_KEY in backend/.env first.');
    }
    const { app } = await bootstrapWorker(config);
    try {
        const method = await upsertMolliePaymentMethod(app, apiKey);
        Logger.info(`Mollie payment method "${method.code}" is ready`, loggerCtx);
    } finally {
        await app.close();
    }
}

setupMollie()
    .then(() => process.exit(0))
    .catch(err => {
        Logger.error(describeError(err), loggerCtx);
        process.exit(1);
    });
