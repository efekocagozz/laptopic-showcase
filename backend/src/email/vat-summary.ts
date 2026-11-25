/** One line of Vendure's `Order.taxSummary`. */
interface TaxSummaryLine {
    taxRate: number;
    taxBase: number;
    taxTotal: number;
}

export interface VatSummaryLine {
    taxRate: number;
    /** Amount excluding VAT, in cents. */
    taxBase: number;
    taxTotal: number;
}

/**
 * Vendure lists products and shipping as separate tax lines even when the rate is the same.
 * An invoice shows one line per VAT rate, highest rate first.
 */
export function groupVatByRate(taxSummary: TaxSummaryLine[]): VatSummaryLine[] {
    const byRate = new Map<number, VatSummaryLine>();
    for (const line of taxSummary) {
        const existing = byRate.get(line.taxRate) ?? { taxRate: line.taxRate, taxBase: 0, taxTotal: 0 };
        existing.taxBase += line.taxBase;
        existing.taxTotal += line.taxTotal;
        byRate.set(line.taxRate, existing);
    }
    return [...byRate.values()].sort((a, b) => b.taxRate - a.taxRate);
}
