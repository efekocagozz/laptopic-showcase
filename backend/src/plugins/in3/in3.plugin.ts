import { APP_INTERCEPTOR } from '@nestjs/core';
import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { In3PaymentInterceptor } from './api/in3-payment.interceptor';
import { OrderIn3Resolver, ProductVariantIn3Resolver } from './api/in3-quote.resolver';
import { shopApiExtensions } from './api/api-extensions';
import { IN3_PLUGIN_OPTIONS } from './constants';
import { In3EligibilityService } from './in3-eligibility.service';
import { In3PluginOptions } from './types';

/**
 * in3 ("pay in 3 installments") support on top of the Mollie plugin:
 * - `in3Quote` on ProductVariant and Order in the Shop API, for "3 x EUR X" in the storefront;
 * - refuses in3 payments for orders that are not eligible.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        { provide: IN3_PLUGIN_OPTIONS, useFactory: () => In3Plugin.options },
        In3EligibilityService,
        { provide: APP_INTERCEPTOR, useClass: In3PaymentInterceptor },
    ],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [ProductVariantIn3Resolver, OrderIn3Resolver],
    },
    compatibility: '^3.0.0',
})
export class In3Plugin {
    static options: In3PluginOptions = {};

    static init(options: In3PluginOptions = {}) {
        this.options = options;
        return In3Plugin;
    }
}
