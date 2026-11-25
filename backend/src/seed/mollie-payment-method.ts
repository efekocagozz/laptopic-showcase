import { INestApplicationContext } from '@nestjs/common';
import { LanguageCode, PaymentMethodService, RequestContextService } from '@vendure/core';

/** The storefront refers to the Mollie payment method by this code. */
export const MOLLIE_PAYMENT_METHOD_CODE = 'mollie';

// Code of the plugin's PaymentMethodHandler (not exported by the package).
const MOLLIE_HANDLER_CODE = 'mollie-payment-handler';

/**
 * Creates the Mollie payment method, or updates its API key and redirect URL if it already exists.
 * Safe to run repeatedly, e.g. after rotating the API key.
 */
export async function upsertMolliePaymentMethod(app: INestApplicationContext, apiKey: string) {
    if (!apiKey.startsWith('test_')) {
        // This project only ever runs Mollie in test mode (see PROJECT.md).
        throw new Error('MOLLIE_API_KEY must be a Mollie test key (starting with "test_").');
    }
    const ctx = await app.get(RequestContextService).create({ apiType: 'admin' });
    const paymentMethodService = app.get(PaymentMethodService);
    const handler = {
        code: MOLLIE_HANDLER_CODE,
        arguments: [
            { name: 'apiKey', value: apiKey },
            // Fallback for where Mollie sends the customer back to; the plugin appends the order code.
            // The storefront normally passes its own (locale-aware) redirect URL per payment.
            { name: 'redirectUrl', value: `${process.env.STOREFRONT_URL || 'http://localhost:3001'}/order-confirmation` },
        ],
    };

    const existing = await paymentMethodService.findAll(ctx, {
        filter: { code: { eq: MOLLIE_PAYMENT_METHOD_CODE } },
    });
    if (existing.items.length) {
        return paymentMethodService.update(ctx, { id: existing.items[0].id, enabled: true, handler });
    }
    return paymentMethodService.create(ctx, {
        code: MOLLIE_PAYMENT_METHOD_CODE,
        enabled: true,
        handler,
        translations: [
            {
                languageCode: LanguageCode.nl,
                name: 'iDEAL en in3 via Mollie',
                description: 'Betaal veilig via Mollie.',
            },
        ],
    });
}
