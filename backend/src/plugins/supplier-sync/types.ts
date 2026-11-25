export interface SupplierSyncPluginOptions {
    /** Path to the supplier's CSV feed. */
    feedPath: string;
    /** Cron expression for the scheduled import. Defaults to every night at 03:00. */
    schedule?: string;
    /** Price changes larger than this percentage are skipped and reported, as a guard against feed errors. Defaults to 50. */
    maxPriceChangePercent?: number;
}

export interface SupplierSyncReport {
    updated: string[];
    /** Rows with nothing to change (rows with a held-back price are not counted here). */
    unchanged: number;
    /** SKUs in the feed that don't exist in the shop. */
    unknownSkus: string[];
    /** Rows whose price change exceeded the limit; their stock is still updated. */
    suspiciousPrices: Array<{ sku: string; currentPrice: number; feedPrice: number }>;
    /** Rows the parser rejected, by line number. */
    invalidRows: Array<{ line: number; message: string }>;
}
