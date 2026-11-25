import { describe, expect, it } from 'vitest';

import { groupVatByRate } from './vat-summary';

describe('groupVatByRate', () => {
    it('merges product and shipping lines with the same rate', () => {
        expect(
            groupVatByRate([
                { taxRate: 21, taxBase: 98_35, taxTotal: 20_65 },
                { taxRate: 21, taxBase: 4_09, taxTotal: 86 },
            ]),
        ).toEqual([{ taxRate: 21, taxBase: 102_44, taxTotal: 21_51 }]);
    });

    it('keeps different rates apart, highest first', () => {
        const result = groupVatByRate([
            { taxRate: 9, taxBase: 10_00, taxTotal: 90 },
            { taxRate: 21, taxBase: 100_00, taxTotal: 21_00 },
        ]);
        expect(result.map(line => line.taxRate)).toEqual([21, 9]);
    });
});
