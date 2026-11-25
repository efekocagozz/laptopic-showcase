import { Injectable } from '@nestjs/common';
import { HistoryEntryType } from '@vendure/common/lib/generated-types';
import { EventBus, HistoryService, Logger, Order, OrderService, RequestContext } from '@vendure/core';

import { loggerCtx, MAX_RETURN_COMMENT_LENGTH, RETURN_WINDOW_DAYS } from './constants';
import { ReturnRequestedEvent } from './return-requested.event';
import { ReturnReason, ReturnRequestErrorCode, ReturnRequestInput, ReturnRequestResult } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Order states in which goods may have been paid or shipped, and so can be returned. */
const RETURNABLE_STATES = ['PaymentSettled', 'PartiallyShipped', 'Shipped', 'PartiallyDelivered', 'Delivered'];

/** Dutch labels, used in the order note and the confirmation email. */
export const REASON_LABELS: Record<ReturnReason, string> = {
    WITHDRAWAL: 'Herroeping (bedenktijd)',
    DEFECT: 'Defect',
    WRONG_ITEM: 'Verkeerd artikel ontvangen',
    OTHER: 'Anders',
};

/**
 * Records a customer's return request on the order and announces it. Refunds and the actual return
 * are handled by staff in the Dashboard with Vendure's built-in cancel/refund.
 */
@Injectable()
export class ReturnRequestService {
    constructor(
        private orderService: OrderService,
        private historyService: HistoryService,
        private eventBus: EventBus,
    ) {}

    async requestReturn(ctx: RequestContext, input: ReturnRequestInput): Promise<ReturnRequestResult> {
        const comment = input.comment?.trim() || undefined;
        if (comment && comment.length > MAX_RETURN_COMMENT_LENGTH) {
            return error('INVALID_INPUT', `Comment can be at most ${MAX_RETURN_COMMENT_LENGTH} characters`);
        }

        const order = await this.orderService.findOneByCode(ctx, input.orderCode.trim().toUpperCase(), ['customer']);
        // The same answer for "no such order" and "wrong email address", so order codes can't be probed.
        if (!order || !this.belongsTo(order, input.emailAddress)) {
            return error('ORDER_NOT_FOUND', 'No order found with this order code and email address');
        }
        if (!RETURNABLE_STATES.includes(order.state) || !order.orderPlacedAt) {
            return error('NOT_RETURNABLE', `Order in state ${order.state} cannot be returned`);
        }
        if (Date.now() - order.orderPlacedAt.getTime() > RETURN_WINDOW_DAYS * DAY_MS) {
            return error('RETURN_PERIOD_EXPIRED', `Returns can be requested up to ${RETURN_WINDOW_DAYS} days after ordering`);
        }

        await this.historyService.createHistoryEntryForOrder(
            {
                ctx,
                orderId: order.id,
                type: HistoryEntryType.ORDER_NOTE,
                data: { note: this.formatNote(input.reason, comment) },
            },
            false,
        );
        await this.eventBus.publish(new ReturnRequestedEvent(ctx, order, input.reason, comment));
        Logger.info(`Return requested for order ${order.code} (${input.reason})`, loggerCtx);
        return { __typename: 'ReturnRequestReceived', orderCode: order.code };
    }

    private belongsTo(order: Order, emailAddress: string) {
        return order.customer?.emailAddress.toLowerCase() === emailAddress.trim().toLowerCase();
    }

    private formatNote(reason: ReturnReason, comment: string | undefined) {
        const lines = [`Retouraanvraag via de webshop — reden: ${REASON_LABELS[reason]}`];
        if (comment) lines.push(`Toelichting klant: ${comment}`);
        return lines.join('\n');
    }
}

function error(errorCode: ReturnRequestErrorCode, message: string): ReturnRequestResult {
    return { __typename: 'ReturnRequestError', errorCode, message };
}

