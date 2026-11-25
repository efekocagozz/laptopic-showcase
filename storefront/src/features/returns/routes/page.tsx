import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {buildCanonicalUrl} from '@/config/metadata';
import {ReturnForm} from './return-form';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Returns'});
    return {
        title: t('pageTitle'),
        alternates: {canonical: buildCanonicalUrl('/returns')},
    };
}

export default async function ReturnsPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Returns'});
    return (
        <div className="container mx-auto max-w-xl px-4 py-12 md:py-16">
            <h1 className="text-3xl font-bold">{t('pageTitle')}</h1>
            <p className="mt-3 mb-8 text-muted-foreground">{t('intro')}</p>
            <ReturnForm />
        </div>
    );
}
