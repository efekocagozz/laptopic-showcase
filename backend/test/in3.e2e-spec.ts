import { SimpleGraphQLClient } from '@vendure/testing';
import gql from 'graphql-tag';
import nock from 'nock';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
    configureDutchChannel,
    createLaptopicTestEnvironment,
    createMolliePaymentMethod,
    createReadyToPayOrder,
    testInitOptions,
} from './test-environment';

/** The In3Plugin: quotes in the Shop API and refusing in3 payments for ineligible orders. */
describe('in3', () => {
    const { server, adminClient, shopClient } = createLaptopicTestEnvironment();

    beforeAll(async () => {
        await server.init(testInitOptions);
        await adminClient.asSuperAdmin();
        await configureDutchChannel(adminClient);
        await createMolliePaymentMethod(adminClient);
        nock.disableNetConnect();
        nock.enableNetConnect('localhost');
    });

    afterAll(async () => {
        nock.cleanAll();
        nock.enableNetConnect();
        await server.destroy();
    });

    describe('in3Quote on product variants', () => {
        it('quotes three installments for a laptop', async () => {
            const variant = await getVariantQuote(shopClient, 'lenovo-thinkpad-t14-gen-3', 'TP-T14G3-16-256');
            expect(variant.priceWithTax).toBe(549_00);
            expect(variant.in3Quote).toEqual({
                eligible: true,
                reason: null,
                installmentCount: 3,
                installmentAmount: 183_00,
            });
        });

        it('is not available below the minimum amount', async () => {
            const variant = await getVariantQuote(shopClient, 'usb-c-oplader-65w', 'ACC-CHARGER-65W');
            expect(variant.in3Quote).toMatchObject({ eligible: false, reason: 'AMOUNT_TOO_LOW' });
        });
    });

    describe('in3Quote on the order', () => {
        it('uses the order total including shipping', async () => {
            await shopClient.asAnonymousUser();
            const order = await createReadyToPayOrder(adminClient, shopClient, ['ACC-CHARGER-65W']);
            // EUR 29 + 4.95 shipping is still below the minimum.
            const quote = await getActiveOrderQuote(shopClient);
            expect(order.totalWithTax).toBe(33_95);
            expect(quote).toMatchObject({ eligible: false, reason: 'AMOUNT_TOO_LOW' });
        });
    });

    describe('paying with in3', () => {
        it('refuses an in3 payment for an ineligible order without contacting Mollie', async () => {
            await shopClient.asAnonymousUser();
            await createReadyToPayOrder(adminClient, shopClient, ['ACC-CHARGER-65W']);

            await expect(createIntent(shopClient, 'in3')).rejects.toThrow('in3 is not available for this order');
            expect(nock.pendingMocks()).toEqual([]);
        });

        it("refuses a payment without a method for an ineligible order, since Mollie's picker could offer in3", async () => {
            await expect(createIntent(shopClient, undefined)).rejects.toThrow('Choose a payment method');
            expect(nock.pendingMocks()).toEqual([]);
        });

        it('allows other Mollie methods for the same order', async () => {
            const scope = nock('https://api.mollie.com').post('/v2/payments').query(true).reply(201, checkoutPayment());
            const result = await createIntent(shopClient, 'ideal');
            expect(result.url).toBe('https://www.mollie.com/checkout/in3-e2e');
            expect(scope.isDone()).toBe(true);
        });

        it('passes an eligible in3 payment on to Mollie', async () => {
            await shopClient.asAnonymousUser();
            await createReadyToPayOrder(adminClient, shopClient, ['TP-T14G3-16-256']);
            let method: string | undefined;
            nock('https://api.mollie.com')
                .post('/v2/payments', body => {
                    method = body.method;
                    return true;
                })
                .query(true)
                .reply(201, checkoutPayment());

            const result = await createIntent(shopClient, 'in3');
            expect(result.url).toBe('https://www.mollie.com/checkout/in3-e2e');
            expect(method).toBe('in3');
        });

        it('lets an eligible order use Mollie\'s own method picker', async () => {
            nock('https://api.mollie.com').post('/v2/payments').query(true).reply(201, checkoutPayment());
            const result = await createIntent(shopClient, undefined);
            expect(result.url).toBe('https://www.mollie.com/checkout/in3-e2e');
        });
    });
});

async function getVariantQuote(shopClient: SimpleGraphQLClient, slug: string, sku: string) {
    const { product } = await shopClient.query(
        gql`
            query ($slug: String!) {
                product(slug: $slug) {
                    variants {
                        sku
                        priceWithTax
                        in3Quote {
                            eligible
                            reason
                            installmentCount
                            installmentAmount
                        }
                    }
                }
            }
        `,
        { slug },
    );
    return product.variants.find((v: { sku: string }) => v.sku === sku);
}

async function getActiveOrderQuote(shopClient: SimpleGraphQLClient) {
    const { activeOrder } = await shopClient.query(gql`
        query {
            activeOrder {
                in3Quote {
                    eligible
                    reason
                    installmentAmount
                }
            }
        }
    `);
    return activeOrder.in3Quote;
}

async function createIntent(shopClient: SimpleGraphQLClient, molliePaymentMethodCode: string | undefined) {
    const { createMolliePaymentIntent } = await shopClient.query(
        gql`
            mutation ($input: MolliePaymentIntentInput!) {
                createMolliePaymentIntent(input: $input) {
                    ... on MolliePaymentIntent {
                        url
                    }
                    ... on MolliePaymentIntentError {
                        message
                    }
                }
            }
        `,
        {
            input: {
                paymentMethodCode: 'mollie',
                molliePaymentMethodCode,
                redirectUrl: 'http://localhost:3001/order-confirmation/X',
            },
        },
    );
    return createMolliePaymentIntent;
}

function checkoutPayment() {
    return {
        resource: 'payment',
        id: 'tr_in3e2e',
        status: 'open',
        amount: { value: '0.00', currency: 'EUR' },
        description: 'test',
        _links: { checkout: { href: 'https://www.mollie.com/checkout/in3-e2e', type: 'text/html' } },
    };
}
