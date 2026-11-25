import { RequestContextService } from '@vendure/core';
import { SimpleGraphQLClient } from '@vendure/testing';
import gql from 'graphql-tag';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SupplierSyncService } from '../src/plugins/supplier-sync/supplier-sync.service';
import { configureDutchChannel, createLaptopicTestEnvironment, TEST_CHANNEL_TOKEN, testInitOptions } from './test-environment';

describe('supplier sync', () => {
    const { server, adminClient } = createLaptopicTestEnvironment();
    let service: SupplierSyncService;

    beforeAll(async () => {
        await server.init(testInitOptions);
        await adminClient.asSuperAdmin();
        await configureDutchChannel(adminClient);
        service = server.app.get(SupplierSyncService);
    });

    afterAll(async () => {
        await server.destroy();
    });

    async function sync(csv: string) {
        const ctx = await server.app.get(RequestContextService).create({ apiType: 'admin', channelOrToken: TEST_CHANNEL_TOKEN });
        return service.syncFromCsv(ctx, csv);
    }

    it('updates stock and prices of known SKUs and reports the rest', async () => {
        const report = await sync(
            [
                'sku,stock,price',
                'TP-T14G3-16-256,3,529.00', // stock 8 -> 3, price 549 -> 529
                'TP-T490-8-256,15,249.00', // unchanged
                'NOT-IN-SHOP,4,100.00',
                'HP-840G8-8-256,7,999.00', // stock 9 -> 7; 399 -> 999 is more than +50%: price skipped, stock updated
                'BROKEN,x,1.00',
            ].join('\n'),
        );

        expect(report).toEqual({
            updated: ['TP-T14G3-16-256', 'HP-840G8-8-256'],
            unchanged: 1,
            unknownSkus: ['NOT-IN-SHOP'],
            suspiciousPrices: [{ sku: 'HP-840G8-8-256', currentPrice: 399_00, feedPrice: 999_00 }],
            invalidRows: [{ line: 6, message: 'Invalid stock "x"' }],
        });
        expect(await getVariant(adminClient, 'TP-T14G3-16-256')).toEqual({ priceWithTax: 529_00, stockOnHand: 3 });
        expect(await getVariant(adminClient, 'HP-840G8-8-256')).toEqual({ priceWithTax: 399_00, stockOnHand: 7 });
    });

    it('reports nothing to do when the shop already matches the feed', async () => {
        const report = await sync('sku,stock,price\nTP-T14G3-16-256,3,529.00');
        expect(report.updated).toEqual([]);
        expect(report.unchanged).toBe(1);
    });

    it('reads the sample feed from disk', async () => {
        const ctx = await server.app.get(RequestContextService).create({ apiType: 'admin', channelOrToken: TEST_CHANNEL_TOKEN });
        const report = await service.syncFromFile(ctx, path.join(__dirname, '../supplier-feed/sample.csv'));
        expect(report.invalidRows).toEqual([]);
        expect(report.unknownSkus).toEqual([]);
    });
});

async function getVariant(adminClient: SimpleGraphQLClient, sku: string) {
    const { productVariants } = await adminClient.query(
        gql`
            query ($sku: String!) {
                productVariants(options: { filter: { sku: { eq: $sku } } }) {
                    items {
                        priceWithTax
                        stockOnHand
                    }
                }
            }
        `,
        { sku },
    );
    return productVariants.items[0];
}

