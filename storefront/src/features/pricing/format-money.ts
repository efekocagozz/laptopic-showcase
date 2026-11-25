import {toIntlLocale} from '@/platform/i18n/locale-utils';

/** Formats integer cents for display, e.g. 54900 -> "€ 549,00" in Dutch. */
export function formatMoney(cents: number, currencyCode: string, locale: string) {
    return new Intl.NumberFormat(toIntlLocale(locale), {style: 'currency', currency: currencyCode}).format(cents / 100);
}
