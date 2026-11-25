'use client';

import {useLocale} from 'next-intl';
import {formatMoney} from './format-money';

interface PriceProps {
    value: number;
    currencyCode?: string;
}

export function Price({value, currencyCode = 'EUR'}: PriceProps) {
    const locale = useLocale();
    return <>{formatMoney(value, currencyCode, locale)}</>;
}
