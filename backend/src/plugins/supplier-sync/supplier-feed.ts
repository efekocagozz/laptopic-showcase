/**
 * Parsing and validating the supplier's CSV feed. Pure functions, unit tested in supplier-feed.spec.ts.
 *
 * Format (comma-separated, header required, prices in euros incl. VAT with a dot as decimal separator):
 *
 *   sku,stock,price
 *   TP-T14G3-16-256,8,549.00
 */

export interface SupplierFeedRow {
    sku: string;
    stockOnHand: number;
    /** Price including VAT, in cents. */
    priceWithTax: number;
}

export interface SupplierFeedError {
    /** 1-based line number in the file (the header is line 1). */
    line: number;
    message: string;
}

export interface ParsedSupplierFeed {
    rows: SupplierFeedRow[];
    errors: SupplierFeedError[];
}

const REQUIRED_COLUMNS = ['sku', 'stock', 'price'] as const;
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;
const STOCK_PATTERN = /^\d+$/;

export function parseSupplierFeed(csv: string): ParsedSupplierFeed {
    const lines = csv.split(/\r?\n/);
    const header = lines[0]?.split(',').map(column => column.trim().toLowerCase()) ?? [];
    const missing = REQUIRED_COLUMNS.filter(column => !header.includes(column));
    if (missing.length) {
        return { rows: [], errors: [{ line: 1, message: `Missing column(s): ${missing.join(', ')}` }] };
    }
    const index = Object.fromEntries(REQUIRED_COLUMNS.map(column => [column, header.indexOf(column)])) as Record<
        (typeof REQUIRED_COLUMNS)[number],
        number
    >;

    const rows: SupplierFeedRow[] = [];
    const errors: SupplierFeedError[] = [];
    const seenSkus = new Set<string>();

    lines.slice(1).forEach((rawLine, i) => {
        const line = i + 2;
        if (!rawLine.trim()) return;
        const cells = rawLine.split(',').map(cell => cell.trim());
        // Catches e.g. a Dutch decimal comma ("10,00"), which would otherwise shift into the next column.
        if (cells.length !== header.length) {
            return errors.push({ line, message: `Expected ${header.length} columns, found ${cells.length}` });
        }
        const sku = cells[index.sku];
        const stock = cells[index.stock];
        const price = cells[index.price];

        if (!sku) return errors.push({ line, message: 'Missing SKU' });
        if (seenSkus.has(sku)) return errors.push({ line, message: `Duplicate SKU ${sku}` });
        if (!stock || !STOCK_PATTERN.test(stock)) return errors.push({ line, message: `Invalid stock "${stock ?? ''}"` });
        if (!price || !PRICE_PATTERN.test(price) || Number(price) <= 0) {
            return errors.push({ line, message: `Invalid price "${price ?? ''}"` });
        }

        seenSkus.add(sku);
        rows.push({ sku, stockOnHand: Number(stock), priceWithTax: toCents(price) });
    });

    return { rows, errors };
}

/** "549.5" -> 54950, without floating point arithmetic. */
function toCents(price: string): number {
    const [euros, cents = ''] = price.split('.');
    return Number(euros) * 100 + Number(cents.padEnd(2, '0'));
}

/** True when the price change is larger than the allowed percentage, e.g. a supplier feed error. */
export function isSuspiciousPriceChange(currentPrice: number, newPrice: number, maxChangePercent: number): boolean {
    if (currentPrice === 0) return false;
    return (Math.abs(newPrice - currentPrice) / currentPrice) * 100 > maxChangePercent;
}
