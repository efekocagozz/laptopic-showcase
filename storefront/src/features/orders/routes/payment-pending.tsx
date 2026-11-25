'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Link, useRouter} from '@/platform/i18n/navigation';
import {syncPaymentStatus} from '../actions';

const POLL_INTERVAL_MS = 3_000;
/** Mollie gives no delivery guarantee for webhooks; after this long we ask the backend to check Mollie directly. */
const SYNC_AFTER_MS = 10_000;
const GIVE_UP_AFTER_MS = 60_000;

/**
 * Shown when the customer returns from Mollie before the payment webhook has arrived.
 * Refreshes the page until the backend marks the order as paid.
 */
export function PaymentPending({orderCode}: {orderCode: string}) {
    const t = useTranslations('OrderConfirmation');
    const router = useRouter();
    const [gaveUp, setGaveUp] = useState(false);

    useEffect(() => {
        const poll = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
        const sync = setTimeout(() => {
            void syncPaymentStatus(orderCode).then(() => router.refresh());
        }, SYNC_AFTER_MS);
        const stop = setTimeout(() => {
            clearInterval(poll);
            setGaveUp(true);
        }, GIVE_UP_AFTER_MS);
        return () => {
            clearInterval(poll);
            clearTimeout(sync);
            clearTimeout(stop);
        };
    }, [orderCode, router]);

    if (gaveUp) {
        return (
            <div className="container mx-auto max-w-xl px-4 py-16 text-center space-y-4" role="status">
                <h1 className="text-2xl font-bold">{t('paymentNotConfirmedTitle')}</h1>
                <p className="text-muted-foreground">{t('paymentNotConfirmed')}</p>
                <Button render={<Link href="/checkout" />} nativeButton={false}>{t('tryAgain')}</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-xl px-4 py-16 text-center space-y-4" role="status" aria-live="polite">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-bold">{t('paymentPendingTitle')}</h1>
            <p className="text-muted-foreground">{t('paymentPending', {code: orderCode})}</p>
        </div>
    );
}
