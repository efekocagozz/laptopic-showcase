'use server';

import {updateTag} from 'next/cache';
import {z} from 'zod';
import {mutate} from '@/platform/vendure/api';
import {graphql} from '@/platform/vendure/graphql';

const SyncMolliePaymentStatusMutation = graphql(`
    mutation SyncMolliePaymentStatus($orderCode: String!) {
        syncMolliePaymentStatus(orderCode: $orderCode) {
            id
            state
        }
    }
`);

const orderCode = z.string().regex(/^[A-Z0-9]{1,32}$/);

/**
 * Asks the backend to fetch the payment status from Mollie directly. Used as a fallback on the
 * confirmation page when Mollie's webhook is late; the backend re-checks the payment with Mollie itself.
 */
export async function syncPaymentStatus(code: string): Promise<void> {
    const parsed = orderCode.safeParse(code);
    if (!parsed.success) return;
    try {
        await mutate(SyncMolliePaymentStatusMutation, {orderCode: parsed.data}, {useAuthToken: true});
        updateTag('cart');
        updateTag('active-order');
    } catch (error) {
        // Not fatal: the webhook may still arrive, and the page keeps polling.
        console.error('Could not sync Mollie payment status:', error);
    }
}
