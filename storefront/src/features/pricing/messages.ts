import type {MessageLoaders} from '@/platform/i18n/messages';

export const pricingMessageLoaders: MessageLoaders = {
    en: () => import('./messages/en.json'),
    nl: () => import('./messages/nl.json'),
};
