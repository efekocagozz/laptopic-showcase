import { describe, expect, it } from 'vitest';

import { DEFAULT_IN3_MAX_AMOUNT, DEFAULT_IN3_MIN_AMOUNT, quoteIn3 } from './in3-quote';

const range = { minAmount: DEFAULT_IN3_MIN_AMOUNT, maxAmount: DEFAULT_IN3_MAX_AMOUNT };
const quote = (amountWithTax: number, overrides: { currencyCode?: string; countryCode?: string } = {}) =>
    quoteIn3({ amountWithTax, currencyCode: 'EUR', ...overrides }, range);

describe('quoteIn3', () => {
    it('is eligible exactly at the minimum and maximum amount', () => {
        expect(quote(50_00).eligible).toBe(true);
        expect(quote(3_000_00).eligible).toBe(true);
    });

    it('is not eligible one cent outside the range', () => {
        expect(quote(49_99)).toMatchObject({ eligible: false, reason: 'AMOUNT_TOO_LOW' });
        expect(quote(3_000_01)).toMatchObject({ eligible: false, reason: 'AMOUNT_TOO_HIGH' });
    });

    it('splits into three installments, rounding up to whole cents', () => {
        expect(quote(549_00)).toEqual({ eligible: true, installmentCount: 3, installmentAmount: 183_00 });
        // 100.00 / 3 = 33.333... -> 33.34, so three installments always cover the total.
        expect(quote(100_00).installmentAmount).toBe(33_34);
    });

    it('only allows euros', () => {
        expect(quote(549_00, { currencyCode: 'USD' })).toMatchObject({
            eligible: false,
            reason: 'CURRENCY_NOT_SUPPORTED',
        });
    });

    it('only allows Dutch addresses, but does not block while the address is unknown', () => {
        expect(quote(549_00, { countryCode: 'BE' })).toMatchObject({
            eligible: false,
            reason: 'COUNTRY_NOT_SUPPORTED',
        });
        expect(quote(549_00, { countryCode: 'NL' }).eligible).toBe(true);
        expect(quote(549_00, { countryCode: undefined }).eligible).toBe(true);
    });

    it('respects a narrower shop range', () => {
        const narrow = { minAmount: 100_00, maxAmount: 1_000_00 };
        expect(quoteIn3({ amountWithTax: 99_99, currencyCode: 'EUR' }, narrow).eligible).toBe(false);
        expect(quoteIn3({ amountWithTax: 1_000_01, currencyCode: 'EUR' }, narrow).eligible).toBe(false);
    });
});
