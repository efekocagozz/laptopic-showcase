import { Inject, Injectable } from '@nestjs/common';
import { Order, ProductPriceApplicator, ProductVariant, RequestContext } from '@vendure/core';

import { IN3_PLUGIN_OPTIONS } from './constants';
import { DEFAULT_IN3_MAX_AMOUNT, DEFAULT_IN3_MIN_AMOUNT, In3AmountRange, In3Quote, quoteIn3 } from './in3-quote';
import { In3PluginOptions } from './types';

/**
 * Decides whether in3 can be used and what each installment would be. This is the single source of truth:
 * the storefront only displays these quotes, and in3 payments for ineligible orders are refused.
 */
@Injectable()
export class In3EligibilityService {
    private readonly range: In3AmountRange;

    constructor(
        @Inject(IN3_PLUGIN_OPTIONS) options: In3PluginOptions,
        private productPriceApplicator: ProductPriceApplicator,
    ) {
        this.range = {
            minAmount: options.minAmount ?? DEFAULT_IN3_MIN_AMOUNT,
            maxAmount: options.maxAmount ?? DEFAULT_IN3_MAX_AMOUNT,
        };
    }

    async quoteForVariant(ctx: RequestContext, variant: ProductVariant): Promise<In3Quote> {
        // Variants loaded through Vendure's services already have their channel price applied.
        const priced = variant.taxRateApplied
            ? variant
            : await this.productPriceApplicator.applyChannelPriceAndTax(variant, ctx);
        return quoteIn3({ amountWithTax: priced.priceWithTax, currencyCode: ctx.currencyCode }, this.range);
    }

    /**
     * @param options.requireCountry when paying, an order without an address country is not eligible;
     *   for display (cart, checkout) an unknown country is not held against it yet.
     */
    quoteForOrder(order: Order, options: { requireCountry?: boolean } = {}): In3Quote {
        const countryCode = order.billingAddress?.countryCode || order.shippingAddress?.countryCode || undefined;
        const quote = quoteIn3(
            { amountWithTax: order.totalWithTax, currencyCode: order.currencyCode, countryCode },
            this.range,
        );
        if (quote.eligible && options.requireCountry && !countryCode) {
            return { ...quote, eligible: false, reason: 'COUNTRY_NOT_SUPPORTED' };
        }
        return quote;
    }
}
