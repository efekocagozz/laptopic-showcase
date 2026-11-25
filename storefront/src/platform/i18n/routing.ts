import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
    // Dutch is the shop's language and is served without a prefix (/product/...);
    // English is available under /en.
    locales: ['nl', 'en'],
    defaultLocale: 'nl',
    localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];

export const localeNames: Record<Locale, string> = {
    nl: 'Nederlands',
    en: 'English',
};
