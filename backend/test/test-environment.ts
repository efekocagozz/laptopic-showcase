import { CurrencyCode, LanguageCode, mergeConfig, VendureConfig } from '@vendure/core';
import { MolliePlugin } from '@vendure-community/mollie-plugin';
import {
    createTestEnvironment,
    E2E_DEFAULT_CHANNEL_TOKEN,
    registerInitializer,
    SimpleGraphQLClient,
    SqljsInitializer,
    testConfig,
} from '@vendure/testing';
import gql from 'graphql-tag';
import path from 'path';

import { In3Plugin } from '../src/plugins/in3/in3.plugin';
import { ReturnsPlugin } from '../src/plugins/returns/returns.plugin';
import { SupplierSyncPlugin } from '../src/plugins/supplier-sync/supplier-sync.plugin';
import { initialData } from '../src/seed/initial-data';

registerInitializer('sqljs', new SqljsInitializer(path.join(__dirname, '__data__')));

export const TEST_PORT = 3050;
export const TEST_SERVER_URL = `http://localhost:${TEST_PORT}`;
export const TEST_CHANNEL_TOKEN = E2E_DEFAULT_CHANNEL_TOKEN;
export const MOLLIE_TEST_API_KEY = 'test_e2e_not_a_real_key';

/**
 * A Vendure test server with the same Dutch store setup and catalogue as `npm run seed`,
 * running on an in-memory SQLite database. Pass extra plugins/config per test file.
 */
export function createLaptopicTestEnvironment(extraConfig: Partial<VendureConfig> = {}) {
    const config = mergeConfig(testConfig, {
        defaultLanguageCode: LanguageCode.nl,
        apiOptions: { port: TEST_PORT },
        importExportOptions: { importAssetsDir: path.join(__dirname, '../src/seed/assets') },
        plugins: [
            MolliePlugin.init({ vendureHost: TEST_SERVER_URL }),
            In3Plugin.init(),
            ReturnsPlugin,
            SupplierSyncPlugin.init({ feedPath: path.join(__dirname, '../supplier-feed/sample.csv') }),
        ],
        ...extraConfig,
    });
    return createTestEnvironment(config);
}

/** Server options for `server.init()`: our seed data, without the dev-only dummy payment method. */
export const testInitOptions = {
    initialData: { ...initialData, paymentMethods: [] },
    productsCsvPath: path.join(__dirname, '../src/seed/products.csv'),
    customerCount: 1,
};

/** Matches the seed: EUR with prices including VAT. Call once after `server.init()`. */
export async function configureDutchChannel(adminClient: SimpleGraphQLClient) {
    const { activeChannel } = await adminClient.query(gql`
        query {
            activeChannel {
                id
            }
        }
    `);
    await adminClient.query(
        gql`
            mutation ($input: UpdateChannelInput!) {
                updateChannel(input: $input) {
                    ... on Channel {
                        id
                    }
                }
            }
        `,
        {
            input: {
                id: activeChannel.id,
                defaultCurrencyCode: CurrencyCode.EUR,
                availableCurrencyCodes: [CurrencyCode.EUR],
                pricesIncludeTax: true,
            },
        },
    );
}

export async function createMolliePaymentMethod(adminClient: SimpleGraphQLClient) {
    const { createPaymentMethod } = await adminClient.query(
        gql`
            mutation ($input: CreatePaymentMethodInput!) {
                createPaymentMethod(input: $input) {
                    id
                    code
                }
            }
        `,
        {
            input: {
                code: 'mollie',
                enabled: true,
                handler: {
                    code: 'mollie-payment-handler',
                    arguments: [
                        { name: 'apiKey', value: MOLLIE_TEST_API_KEY },
                        { name: 'redirectUrl', value: 'http://localhost:3001/order-confirmation' },
                    ],
                },
                translations: [{ languageCode: LanguageCode.nl, name: 'Mollie' }],
            },
        },
    );
    return createPaymentMethod as { id: string; code: string };
}

/**
 * Builds an active guest order for the given SKUs, with customer, address and shipping set:
 * everything the checkout does before payment.
 */
export async function createReadyToPayOrder(
    adminClient: SimpleGraphQLClient,
    shopClient: SimpleGraphQLClient,
    skus: string[],
) {
    for (const sku of skus) {
        const { productVariants } = await adminClient.query(
            gql`
                query ($sku: String!) {
                    productVariants(options: { filter: { sku: { eq: $sku } } }) {
                        items {
                            id
                        }
                    }
                }
            `,
            { sku },
        );
        const variant = productVariants.items[0];
        if (!variant) throw new Error(`No variant with SKU ${sku}`);
        await shopClient.query(
            gql`
                mutation ($id: ID!) {
                    addItemToOrder(productVariantId: $id, quantity: 1) {
                        ... on Order {
                            id
                        }
                        ... on ErrorResult {
                            message
                        }
                    }
                }
            `,
            { id: variant.id },
        );
    }
    await shopClient.query(gql`
        mutation {
            setCustomerForOrder(
                input: { emailAddress: "klant@example.com", firstName: "Test", lastName: "Klant" }
            ) {
                ... on Order {
                    id
                }
            }
            setOrderShippingAddress(
                input: {
                    fullName: "Test Klant"
                    streetLine1: "Damrak 1"
                    city: "Amsterdam"
                    postalCode: "1012 LG"
                    countryCode: "NL"
                }
            ) {
                ... on Order {
                    id
                }
            }
        }
    `);
    const { eligibleShippingMethods } = await shopClient.query(gql`
        query {
            eligibleShippingMethods {
                id
            }
        }
    `);
    const { setOrderShippingMethod } = await shopClient.query(
        gql`
            mutation ($id: [ID!]!) {
                setOrderShippingMethod(shippingMethodId: $id) {
                    ... on Order {
                        id
                        code
                        state
                        totalWithTax
                    }
                }
            }
        `,
        { id: [eligibleShippingMethods[0].id] },
    );
    return setOrderShippingMethod as { id: string; code: string; state: string; totalWithTax: number };
}

/** Euro amount string in Mollie's format, e.g. 12395 -> "123.95". */
export function toMollieValue(cents: number) {
    return (cents / 100).toFixed(2);
}
