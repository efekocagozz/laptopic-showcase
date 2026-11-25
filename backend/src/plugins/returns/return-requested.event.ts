import { Order, RequestContext, VendureEvent } from '@vendure/core';

import { ReturnReason } from './types';

/** Published when a customer requests a return. The email plugin sends the confirmation. */
export class ReturnRequestedEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public order: Order,
        public reason: ReturnReason,
        public comment: string | undefined,
    ) {
        super();
    }
}
