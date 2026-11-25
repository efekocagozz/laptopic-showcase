import { EventBus, HistoryService, Order, OrderService, RequestContext } from '@vendure/core';
import { describe, expect, it, vi } from 'vitest';

import { RETURN_WINDOW_DAYS } from './constants';
import { ReturnRequestService } from './return-request.service';

const DAY_MS = 24 * 60 * 60 * 1000;

function serviceWithOrder(orderPlacedAt: Date) {
    const order = {
        id: 1,
        code: 'ABC123',
        state: 'Delivered',
        orderPlacedAt,
        customer: { emailAddress: 'klant@example.com' },
    } as unknown as Order;
    const orderService = { findOneByCode: vi.fn().mockResolvedValue(order) } as unknown as OrderService;
    const historyService = { createHistoryEntryForOrder: vi.fn() } as unknown as HistoryService;
    const eventBus = { publish: vi.fn() } as unknown as EventBus;
    return new ReturnRequestService(orderService, historyService, eventBus);
}

const input = { orderCode: 'abc123', emailAddress: 'klant@example.com', reason: 'WITHDRAWAL' as const };
const ctx = {} as RequestContext;

describe('ReturnRequestService return window', () => {
    it(`accepts a request on day ${RETURN_WINDOW_DAYS}`, async () => {
        const service = serviceWithOrder(new Date(Date.now() - RETURN_WINDOW_DAYS * DAY_MS + 60_000));
        await expect(service.requestReturn(ctx, input)).resolves.toMatchObject({
            __typename: 'ReturnRequestReceived',
        });
    });

    it(`refuses a request after ${RETURN_WINDOW_DAYS} days`, async () => {
        const service = serviceWithOrder(new Date(Date.now() - RETURN_WINDOW_DAYS * DAY_MS - 60_000));
        await expect(service.requestReturn(ctx, input)).resolves.toMatchObject({
            errorCode: 'RETURN_PERIOD_EXPIRED',
        });
    });
});
