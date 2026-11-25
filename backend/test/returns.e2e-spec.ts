import { dummyPaymentHandler, EventBus } from '@vendure/core';
import { SimpleGraphQLClient } from '@vendure/testing';
import gql from 'graphql-tag';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ReturnRequestedEvent } from '../src/plugins/returns/return-requested.event';
import {
    configureDutchChannel,
    createLaptopicTestEnvironment,
    createReadyToPayOrder,
    testInitOptions,
} from './test-environment';

/** The ReturnsPlugin's `requestReturn` mutation. */
describe('return requests', () => {
    const { server, adminClient, shopClient } = createLaptopicTestEnvironment({
        paymentOptions: { paymentMethodHandlers: [dummyPaymentHandler] },
    });
    let paidOrder: { id: string; code: string };
    const events: ReturnRequestedEvent[] = [];

    beforeAll(async () => {
        await server.init(testInitOptions);
        await adminClient.asSuperAdmin();
        await configureDutchChannel(adminClient);
        await createTestPaymentMethod(adminClient);
        server.app.get(EventBus).ofType(ReturnRequestedEvent).subscribe(event => events.push(event));

        await shopClient.asAnonymousUser();
        paidOrder = await createReadyToPayOrder(adminClient, shopClient, ['DL-5420-8-256']);
        await payWithTestPayment(shopClient);
    });

    afterAll(async () => {
        await server.destroy();
    });

    it('records a return request as a private order note and publishes an event', async () => {
        const result = await requestReturn(shopClient, {
            orderCode: paidOrder.code,
            emailAddress: 'KLANT@example.com ',
            reason: 'WITHDRAWAL',
            comment: 'Toch te zwaar voor mij.',
        });

        expect(result).toEqual({ __typename: 'ReturnRequestReceived', orderCode: paidOrder.code });
        const notes = await getOrderNotes(adminClient, paidOrder.id);
        expect(notes).toContainEqual({
            isPublic: false,
            note: 'Retouraanvraag via de webshop — reden: Herroeping (bedenktijd)\nToelichting klant: Toch te zwaar voor mij.',
        });
        await waitFor(() => events.length === 1);
        expect(events[0]).toMatchObject({ reason: 'WITHDRAWAL', comment: 'Toch te zwaar voor mij.' });
        expect(events[0].order.code).toBe(paidOrder.code);
    });

    it('gives the same answer for a wrong email address as for an unknown order', async () => {
        const wrongEmail = await requestReturn(shopClient, {
            orderCode: paidOrder.code,
            emailAddress: 'iemand-anders@example.com',
            reason: 'DEFECT',
        });
        const unknownOrder = await requestReturn(shopClient, {
            orderCode: 'DOESNOTEXIST',
            emailAddress: 'klant@example.com',
            reason: 'DEFECT',
        });
        expect(wrongEmail).toMatchObject({ __typename: 'ReturnRequestError', errorCode: 'ORDER_NOT_FOUND' });
        expect(unknownOrder).toEqual(wrongEmail);
    });

    it('refuses orders that have not been paid', async () => {
        await shopClient.asAnonymousUser();
        const activeOrder = await createReadyToPayOrder(adminClient, shopClient, ['ACC-SLEEVE-14']);
        const result = await requestReturn(shopClient, {
            orderCode: activeOrder.code,
            emailAddress: 'klant@example.com',
            reason: 'OTHER',
        });
        expect(result).toMatchObject({ errorCode: 'NOT_RETURNABLE' });
    });

    it('refuses comments longer than 1000 characters', async () => {
        const result = await requestReturn(shopClient, {
            orderCode: paidOrder.code,
            emailAddress: 'klant@example.com',
            reason: 'OTHER',
            comment: 'x'.repeat(1001),
        });
        expect(result).toMatchObject({ errorCode: 'INVALID_INPUT' });
    });
});

async function createTestPaymentMethod(adminClient: SimpleGraphQLClient) {
    await adminClient.query(
        gql`
            mutation ($input: CreatePaymentMethodInput!) {
                createPaymentMethod(input: $input) {
                    id
                }
            }
        `,
        {
            input: {
                code: 'test-payment',
                enabled: true,
                handler: {
                    code: dummyPaymentHandler.code,
                    arguments: [{ name: 'automaticSettle', value: 'true' }],
                },
                translations: [{ languageCode: 'nl', name: 'Testbetaling' }],
            },
        },
    );
}

async function payWithTestPayment(shopClient: SimpleGraphQLClient) {
    await shopClient.query(gql`
        mutation {
            transitionOrderToState(state: "ArrangingPayment") {
                ... on Order {
                    id
                }
            }
        }
    `);
    const { addPaymentToOrder } = await shopClient.query(gql`
        mutation {
            addPaymentToOrder(input: { method: "test-payment", metadata: {} }) {
                ... on Order {
                    state
                }
                ... on ErrorResult {
                    message
                }
            }
        }
    `);
    expect(addPaymentToOrder.state).toBe('PaymentSettled');
}

async function requestReturn(shopClient: SimpleGraphQLClient, input: Record<string, unknown>) {
    const { requestReturn: result } = await shopClient.query(
        gql`
            mutation ($input: ReturnRequestInput!) {
                requestReturn(input: $input) {
                    __typename
                    ... on ReturnRequestReceived {
                        orderCode
                    }
                    ... on ReturnRequestError {
                        errorCode
                        message
                    }
                }
            }
        `,
        { input },
    );
    return result;
}

async function getOrderNotes(adminClient: SimpleGraphQLClient, orderId: string) {
    const { order } = await adminClient.query(
        gql`
            query ($id: ID!) {
                order(id: $id) {
                    history(options: { filter: { type: { eq: "ORDER_NOTE" } } }) {
                        items {
                            isPublic
                            data
                        }
                    }
                }
            }
        `,
        { id: orderId },
    );
    return order.history.items.map((item: { isPublic: boolean; data: { note: string } }) => ({
        isPublic: item.isPublic,
        note: item.data.note,
    }));
}

async function waitFor(condition: () => boolean, timeoutMs = 2000) {
    const start = Date.now();
    while (!condition()) {
        if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for condition');
        await new Promise(resolve => setTimeout(resolve, 20));
    }
}
