import { describe, expect, it } from 'vitest';

import { isSuspiciousPriceChange, parseSupplierFeed } from './supplier-feed';

describe('parseSupplierFeed', () => {
    it('parses stock and converts euro prices to cents', () => {
        const feed = parseSupplierFeed('sku,stock,price\nTP-1,8,549.00\nTP-2,0,329.5\nTP-3,12,99\n');
        expect(feed.errors).toEqual([]);
        expect(feed.rows).toEqual([
            { sku: 'TP-1', stockOnHand: 8, priceWithTax: 549_00 },
            { sku: 'TP-2', stockOnHand: 0, priceWithTax: 329_50 },
            { sku: 'TP-3', stockOnHand: 12, priceWithTax: 99_00 },
        ]);
    });

    it('accepts columns in any order, Windows line endings and extra columns', () => {
        const feed = parseSupplierFeed('price,ean,SKU,stock\r\n549.00,123,TP-1,3\r\n');
        expect(feed.rows).toEqual([{ sku: 'TP-1', stockOnHand: 3, priceWithTax: 549_00 }]);
    });

    it('reports invalid rows with their line number and keeps the valid ones', () => {
        const feed = parseSupplierFeed(
            ['sku,stock,price', 'OK-1,1,10.00', ',1,10.00', 'BAD-STOCK,-1,10.00', 'BAD-PRICE,1,10,00', 'ZERO,1,0', 'OK-1,2,11.00'].join('\n'),
        );
        expect(feed.rows.map(row => row.sku)).toEqual(['OK-1']);
        expect(feed.errors).toEqual([
            { line: 3, message: 'Missing SKU' },
            { line: 4, message: 'Invalid stock "-1"' },
            // A decimal comma adds a column instead of being read as EUR 10.
            { line: 5, message: 'Expected 3 columns, found 4' },
            { line: 6, message: 'Invalid price "0"' },
            { line: 7, message: 'Duplicate SKU OK-1' },
        ]);
    });

    it('refuses a feed without the required columns', () => {
        expect(parseSupplierFeed('sku,price\nTP-1,10.00').errors).toEqual([
            { line: 1, message: 'Missing column(s): stock' },
        ]);
    });
});

describe('isSuspiciousPriceChange', () => {
    it('flags changes larger than the limit in either direction', () => {
        expect(isSuspiciousPriceChange(100_00, 151_00, 50)).toBe(true);
        expect(isSuspiciousPriceChange(100_00, 49_00, 50)).toBe(true);
        expect(isSuspiciousPriceChange(100_00, 150_00, 50)).toBe(false);
        expect(isSuspiciousPriceChange(100_00, 50_00, 50)).toBe(false);
    });
});
