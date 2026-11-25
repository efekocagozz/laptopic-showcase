import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {buildCanonicalUrl} from '@/config/metadata';
import {getInfoPage, INFO_PAGE_SLUGS, isInfoPageSlug} from '../pages';

export function generateStaticParams() {
    return INFO_PAGE_SLUGS.map(slug => ({slug}));
}

export async function generateMetadata({params}: PageProps<'/[locale]/info/[slug]'>): Promise<Metadata> {
    const {slug} = await params;
    if (!isInfoPageSlug(slug)) return {};
    const locale = await getRouteLocale();
    const page = getInfoPage(locale, slug);
    return {
        title: page.title,
        description: page.intro,
        alternates: {canonical: buildCanonicalUrl(`/info/${slug}`)},
    };
}

export default async function InfoPage({params}: PageProps<'/[locale]/info/[slug]'>) {
    const {slug} = await params;
    if (!isInfoPageSlug(slug)) notFound();
    const locale = await getRouteLocale();
    const page = getInfoPage(locale, slug);
    const t = await getTranslations({locale, namespace: 'Info'});

    return (
        <article className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
            <h1 className="text-3xl font-bold md:text-4xl">{page.title}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{page.intro}</p>
            {page.sections.map(section => (
                <section key={section.heading} className="mt-10">
                    <h2 className="text-xl font-bold">{section.heading}</h2>
                    {section.paragraphs.map(paragraph => (
                        <p key={paragraph} className="mt-3 leading-relaxed">{paragraph}</p>
                    ))}
                </section>
            ))}
            {slug === 'retourneren' || slug === 'herroepingsrecht' ? (
                <p className="mt-10">
                    <Link href="/returns" className="font-semibold text-primary underline underline-offset-4">
                        {t('returnFormLink')}
                    </Link>
                </p>
            ) : null}
        </article>
    );
}
