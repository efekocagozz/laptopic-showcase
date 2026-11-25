import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { shopApiExtensions } from './api/api-extensions';
import { ReturnRequestResolver } from './api/return-request.resolver';
import { ReturnRequestService } from './return-request.service';

/**
 * Lets customers request a return (e.g. within the 14-day withdrawal period) from the storefront.
 * The request is stored as an order note for staff and confirmed by email (see src/email).
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [ReturnRequestService],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [ReturnRequestResolver],
    },
    compatibility: '^3.0.0',
})
export class ReturnsPlugin {}
