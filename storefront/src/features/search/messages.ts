import type {MessageLoaders} from '@/platform/i18n/messages';

export const searchMessageLoaders: MessageLoaders = {
    en: () => import('./messages/en.json'),
    nl: () => import('./messages/nl.json'),
};
