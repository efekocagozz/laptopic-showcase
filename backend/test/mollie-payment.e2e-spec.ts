import { SimpleGraphQLClient, TestServer } from '@vendure/testing';
import gql from 'graphql-tag';
import nock from 'nock';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
    configureDutchChannel,
    createLaptopicTestEnvironment,
    createMolliePaymentMethod,
    createReadyToPayOrder,
    TEST_CHANNEL_TOKEN,
    TEST_SERVER_URL,
    testInitOptions,
    toMollieValue,
} from './test-environment';

const MOLLIE_API = 'https://api.mollie.com';
const MOLLIE_PAYMENT_ID = 'tr_e2eTest';

/**
 * The checkout payment flow through the community Mollie plugin, with Mollie's API mocked by nock:
 * creating a payment, the webhook, duplicate webhooks, failed payments and (partial) refunds.
 */
describe('Mollie payments', () => {
    const { server, adminClient, shopClient } = createLaptopicTestEnvironment();
    let molliePaymentMethodId: string;

    beforeAll(async () => {
        await server.init(testInitOptions);
        await adminClient.asSuperAdmin();
        await configureDutchChannel(adminClient);
        // The test server prefixes IDs in the API with "T_"; webhook URLs use the database ID.
        molliePaymentMethodId = (await createMolliePaymentMethod(adminClient)).id.replace(/^T_/, '');
        nock.disableNetConnect();
        nock.enableNetConnect('localhost');
    });

    afterAll(async () => {
        nock.enableNetConnect();
        await server.destroy();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('a paid iDEAL order', () => {
        let order: Awaited<ReturnType<typeof createReadyToPayOrder>>;
        let paymentRequestBody: Record<string, any>;

        beforeAll(async () => {
            await shopClient.asAnonymousUser();
            order = await createReadyToPayOrder(adminClient, shopClient, ['ACC-DOCK-USBC']);
        });

        it('creates a Mollie payment for the full order and returns the checkout URL', async () => {
            nock(MOLLIE_API)
                .post('/v2/payments', body => {
                    paymentRequestBody = body;
                    return true;
                })
                .query(true)
                .reply(201, molliePayment({ status: 'open', order }));

            const { createMolliePaymentIntent } = await shopClient.query(CREATE_PAYMENT_INTENT, {
                input: {
                    paymentMethodCode: 'mollie',
                    molliePaymentMethodCode: 'ideal',
                    redirectUrl: 'http://localhost:3001/order-confirmation',
                },
            });

            expect(createMolliePaymentIntent.url).toBe('https://www.mollie.com/checkout/e2e');
            expect(paymentRequestBody.amount).toEqual({ value: toMollieValue(order.totalWithTax), currency: 'EUR' });
            expect(paymentRequestBody.method).toBe('ideal');
            expect(paymentRequestBody.description).toBe(order.code);
            expect(paymentRequestBody.webhookUrl).toBe(
                `${TEST_SERVER_URL}/payments/mollie/${TEST_CHANNEL_TOKEN}/${molliePaymentMethodId}`,
            );
            // Order lines are sent so pay-later methods such as in3 can be used.
            expect(paymentRequestBody.lines.map((l: { description: string }) => l.description)).toContain(
                'USB-C dockingstation',
            );
            expect(paymentRequestBody.billingAddress).toMatchObject({ city: 'Amsterdam', country: 'NL' });
        });

        it('settles the order when the webhook reports the payment as paid', async () => {
            // The webhook body only carries the payment ID; the plugin fetches the real status from Mollie.
            nock(MOLLIE_API)
                .get(`/v2/payments/${MOLLIE_PAYMENT_ID}`)
                .query(true)
                .reply(200, molliePayment({ status: 'paid', order }));

            await sendWebhook(molliePaymentMethodId);

            const placedOrder = await getOrder(adminClient, order.id);
            expect(placedOrder.state).toBe('PaymentSettled');
            expect(placedOrder.payments).toHaveLength(1);
            expect(placedOrder.payments[0]).toMatchObject({
                method: 'mollie',
                state: 'Settled',
                amount: order.totalWithTax,
                transactionId: MOLLIE_PAYMENT_ID,
            });
        });

        it('ignores a repeated webhook for the same payment', async () => {
            nock(MOLLIE_API)
                .get(`/v2/payments/${MOLLIE_PAYMENT_ID}`)
                .query(true)
                .reply(200, molliePayment({ status: 'paid', order }));

            await sendWebhook(molliePaymentMethodId);

            const placedOrder = await getOrder(adminClient, order.id);
            expect(placedOrder.state).toBe('PaymentSettled');
            expect(placedOrder.payments).toHaveLength(1);
        });

        it('refunds part of the payment through Mollie', async () => {
            const placedOrder = await getOrder(adminClient, order.id);
            const partialAmount = 2000;
            let refundBody: Record<string, any> | undefined;
            nock(MOLLIE_API)
                .get(`/v2/payments/${MOLLIE_PAYMENT_ID}`)
                .query(true)
                .reply(200, molliePayment({ status: 'paid', order }))
                .post(`/v2/payments/${MOLLIE_PAYMENT_ID}/refunds`, body => {
                    refundBody = body;
                    return true;
                })
                .query(true)
                .reply(201, mollieRefund(partialAmount));

            const { refundOrder } = await adminClient.query(REFUND_ORDER, {
                input: { paymentId: placedOrder.payments[0].id, amount: partialAmount, reason: 'Kras op behuizing' },
            });

            expect(refundOrder).toMatchObject({ state: 'Settled', total: partialAmount });
            expect(refundBody).toMatchObject({
                amount: { value: toMollieValue(partialAmount), currency: 'EUR' },
                description: 'Kras op behuizing',
            });
        });

        it('refunds the remaining amount through Mollie', async () => {
            const placedOrder = await getOrder(adminClient, order.id);
            const remaining = order.totalWithTax - 2000;
            nock(MOLLIE_API)
                .get(`/v2/payments/${MOLLIE_PAYMENT_ID}`)
                .query(true)
                .reply(200, molliePayment({ status: 'paid', order }))
                .post(`/v2/payments/${MOLLIE_PAYMENT_ID}/refunds`)
                .query(true)
                .reply(201, mollieRefund(remaining));

            const { refundOrder } = await adminClient.query(REFUND_ORDER, {
                input: { paymentId: placedOrder.payments[0].id, amount: remaining, reason: 'Retour' },
            });

            expect(refundOrder).toMatchObject({ state: 'Settled', total: remaining });
        });
    });

    describe('a failed payment', () => {
        it('leaves the order active so the customer can try again', async () => {
            await shopClient.asAnonymousUser();
            const order = await createReadyToPayOrder(adminClient, shopClient, ['TP-T490-8-256']);
            nock(MOLLIE_API)
                .get(`/v2/payments/${MOLLIE_PAYMENT_ID}`)
                .query(true)
                .reply(200, molliePayment({ status: 'failed', order }));

            await sendWebhook(molliePaymentMethodId);

            const { activeOrder } = await shopClient.query(gql`
                query {
                    activeOrder {
                        code
                        state
                        payments {
                            id
                        }
                    }
                }
            `);
            expect(activeOrder).toEqual({ code: order.code, state: 'AddingItems', payments: [] });
        });
    });

    describe('webhook input', () => {
        it('ignores webhooks for unknown payment methods without calling Mollie', async () => {
            const response = await sendWebhook('99999');
            expect(response.status).toBeLessThan(300);
            expect(nock.pendingMocks()).toEqual([]);
        });
    });
});

async function sendWebhook(paymentMethodId: string) {
    return fetch(`${TEST_SERVER_URL}/payments/mollie/${TEST_CHANNEL_TOKEN}/${paymentMethodId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id: MOLLIE_PAYMENT_ID }),
    });
}

async function getOrder(adminClient: SimpleGraphQLClient, id: string) {
    const { order } = await adminClient.query(
        gql`
            query ($id: ID!) {
                order(id: $id) {
                    id
                    state
                    payments {
                        id
                        method
                        state
                        amount
                        transactionId
                    }
                }
            }
        `,
        { id },
    );
    return order;
}

function molliePayment({ status, order }: { status: string; order: { code: string; totalWithTax: number } }) {
    return {
        resource: 'payment',
        id: MOLLIE_PAYMENT_ID,
        mode: 'test',
        status,
        amount: { value: toMollieValue(order.totalWithTax), currency: 'EUR' },
        description: order.code,
        method: 'ideal',
        metadata: { languageCode: 'nl' },
        profileId: 'pfl_e2e',
        createdAt: new Date().toISOString(),
        paidAt: status === 'paid' ? new Date().toISOString() : undefined,
        _links: {
            self: { href: `${MOLLIE_API}/v2/payments/${MOLLIE_PAYMENT_ID}`, type: 'application/hal+json' },
            checkout: { href: 'https://www.mollie.com/checkout/e2e', type: 'text/html' },
        },
    };
}

function mollieRefund(amount: number) {
    return {
        resource: 'refund',
        id: `re_e2e${amount}`,
        status: 'pending',
        amount: { value: toMollieValue(amount), currency: 'EUR' },
        paymentId: MOLLIE_PAYMENT_ID,
        createdAt: new Date().toISOString(),
        _links: { self: { href: `${MOLLIE_API}/v2/refunds/re_e2e`, type: 'application/hal+json' } },
    };
}

const CREATE_PAYMENT_INTENT = gql`
    mutation ($input: MolliePaymentIntentInput!) {
        createMolliePaymentIntent(input: $input) {
            ... on MolliePaymentIntent {
                url
            }
            ... on MolliePaymentIntentError {
                errorCode
                message
            }
        }
    }
`;

const REFUND_ORDER = gql`
    mutation ($input: RefundOrderInput!) {
        refundOrder(input: $input) {
            ... on Refund {
                id
                state
                total
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;
