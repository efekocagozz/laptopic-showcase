export interface In3PluginOptions {
    /** Smallest order total (cents, incl. VAT) for which in3 is offered. Defaults to EUR 50. */
    minAmount?: number;
    /** Largest order total (cents, incl. VAT) for which in3 is offered. Defaults to EUR 3,000. */
    maxAmount?: number;
}
