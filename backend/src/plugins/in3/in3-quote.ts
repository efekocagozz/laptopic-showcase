/**
 * in3 rules that don't depend on Vendure, so they can be unit tested directly.
 * All amounts are integer cents including VAT.
 */

/** in3 always splits a payment into three installments. */
export const IN3_INSTALLMENT_COUNT = 3;

/** The order range in3 typically allows (EUR 50 - 3,000); the shop can narrow it in the plugin options. */
export const DEFAULT_IN3_MIN_AMOUNT = 50_00;
export const DEFAULT_IN3_MAX_AMOUNT = 3_000_00;

/** in3 is only available in the Netherlands, in euros. */
export const IN3_COUNTRY_CODE = 'NL';
export const IN3_CURRENCY_CODE = 'EUR';

export type In3IneligibleReason = 'AMOUNT_TOO_LOW' | 'AMOUNT_TOO_HIGH' | 'CURRENCY_NOT_SUPPORTED' | 'COUNTRY_NOT_SUPPORTED';

export interface In3AmountRange {
    minAmount: number;
    maxAmount: number;
}

export interface In3QuoteInput {
    amountWithTax: number;
    currencyCode: string;
    /** Country of the customer's billing (or shipping) address; `undefined` while it isn't known yet. */
    countryCode?: string;
}

export interface In3Quote {
    eligible: boolean;
    reason?: In3IneligibleReason;
    installmentCount: number;
    /**
     * An indication for "3 x EUR X": the amount rounded up to whole cents. Mollie/in3 decide the exact split,
     * and the customer never pays more than the order total.
     */
    installmentAmount: number;
}

export function quoteIn3(input: In3QuoteInput, range: In3AmountRange): In3Quote {
    const installmentAmount = Math.ceil(input.amountWithTax / IN3_INSTALLMENT_COUNT);
    const ineligible = (reason: In3IneligibleReason): In3Quote => ({
        eligible: false,
        reason,
        installmentCount: IN3_INSTALLMENT_COUNT,
        installmentAmount,
    });

    if (input.currencyCode !== IN3_CURRENCY_CODE) return ineligible('CURRENCY_NOT_SUPPORTED');
    if (input.countryCode && input.countryCode !== IN3_COUNTRY_CODE) return ineligible('COUNTRY_NOT_SUPPORTED');
    if (input.amountWithTax < range.minAmount) return ineligible('AMOUNT_TOO_LOW');
    if (input.amountWithTax > range.maxAmount) return ineligible('AMOUNT_TOO_HIGH');
    return { eligible: true, installmentCount: IN3_INSTALLMENT_COUNT, installmentAmount };
}
