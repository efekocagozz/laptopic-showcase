import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
    ActiveOrderService,
    internal_getRequestContext,
    Logger,
    OrderService,
    UserInputError,
} from '@vendure/core';
import { Observable } from 'rxjs';

import { loggerCtx, MOLLIE_IN3_METHOD_CODE } from '../constants';
import { In3EligibilityService } from '../in3-eligibility.service';

/**
 * Server-side enforcement of the in3 rules: refuses `createMolliePaymentIntent` for an order that is not
 * eligible for in3 when the payment could end up as in3 — in3 named explicitly, or no method named (Mollie's
 * hosted picker could then offer in3). The Mollie plugin owns that mutation, so we check it on the way in rather
 * than by changing the plugin. Every other request passes straight through.
 */
@Injectable()
export class In3PaymentInterceptor implements NestInterceptor {
    constructor(
        private in3EligibilityService: In3EligibilityService,
        private activeOrderService: ActiveOrderService,
        private orderService: OrderService,
    ) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
        if (context.getType<string>() !== 'graphql') return next.handle();
        const gqlContext = GqlExecutionContext.create(context);
        if (gqlContext.getInfo()?.fieldName !== 'createMolliePaymentIntent') return next.handle();

        const input = gqlContext.getArgs().input as { molliePaymentMethodCode?: string; orderId?: string } | undefined;
        const method = input?.molliePaymentMethodCode;
        // Another named method (e.g. iDEAL) can't become in3. Without a method, Mollie shows its own picker,
        // which may offer in3, so that case is checked too.
        if (method && method !== MOLLIE_IN3_METHOD_CODE) return next.handle();

        // Vendure's own way to get the RequestContext outside a resolver (it is set by Vendure's AuthGuard).
        const ctx = internal_getRequestContext(gqlContext.getContext().req, context);
        const order = input?.orderId
            ? await this.orderService.findOne(ctx, input.orderId)
            : await this.activeOrderService.getActiveOrder(ctx, undefined);
        // Without an order the Mollie plugin returns its own error; nothing to check here.
        if (!order) return next.handle();

        // At payment time the country must be known (on product pages an unknown country is fine).
        const quote = this.in3EligibilityService.quoteForOrder(order, { requireCountry: true });
        if (!quote.eligible) {
            Logger.info(`Refused in3-capable payment for order ${order.code}: ${String(quote.reason)}`, loggerCtx);
            throw new UserInputError(
                method
                    ? `in3 is not available for this order (${String(quote.reason)})`
                    : `Choose a payment method: in3 is not available for this order (${String(quote.reason)})`,
            );
        }
        return next.handle();
    }
}
