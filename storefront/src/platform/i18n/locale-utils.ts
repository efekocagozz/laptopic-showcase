import type {Locale} from './routing';

const OG_LOCALE_MAP: Record<Locale, string> = { nl: 'nl_NL', en: 'en_GB' };
const INTL_LOCALE_MAP: Record<Locale, string> = { nl: 'nl-NL', en: 'en-GB' };

export function toOgLocale(locale: string): string {
    return OG_LOCALE_MAP[locale as Locale] || 'nl_NL';
}

export function toIntlLocale(locale: string): string {
    return INTL_LOCALE_MAP[locale as Locale] || 'nl-NL';
}
