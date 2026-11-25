'use client';

import {useLocale, useTranslations} from 'next-intl';
import {formatMoney} from './format-money';

/** The backend's in3 quote (Shop API `in3Quote`). The storefront only displays it, it never decides eligibility. */
export interface In3QuoteView {
    eligible: boolean;
    installmentCount: number;
    installmentAmount: number;
}

interface In3InstallmentsProps {
    quote: In3QuoteView | null | undefined;
    currencyCode: string;
    className?: string;
}

/** "of 3 × € 183,00 met in3 · 0% rente", shown only when the backend says in3 is available. */
export function In3Installments({quote, currencyCode, className}: In3InstallmentsProps) {
    const t = useTranslations('In3');
    const locale = useLocale();
    if (!quote?.eligible) return null;

    const amount = formatMoney(quote.installmentAmount, currencyCode, locale);
    return (
        <p className={`inline-flex flex-wrap items-center gap-2 text-sm ${className ?? ''}`}>
            <span>{t('installments', {count: quote.installmentCount, amount})}</span>
            <span className="rounded-full bg-highlight px-2 py-0.5 text-xs font-bold text-highlight-foreground">
                {t('noInterest')}
            </span>
        </p>
    );
}
