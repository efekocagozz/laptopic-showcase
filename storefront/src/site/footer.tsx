import {getRouteLocale} from '@/platform/i18n/server';
import {cacheLife, cacheTag} from 'next/cache';
import {getTopCollections} from '@/features/collections/data';
import {Logo} from '@/site/brand/logo';
import {NavigationLink} from '@/site/navigation/navigation-link';
import {getTranslations} from 'next-intl/server';
import {COMPANY} from '@/config/company';


const COPYRIGHT_YEAR = 2026;

// Customer service pages, rendered by the info feature (/info/[slug]).
const serviceLinks = [
    {slug: 'verzending', key: 'shipping'},
    {slug: 'retourneren', key: 'returns'},
    {slug: 'herroepingsrecht', key: 'withdrawal'},
    {slug: 'garantie', key: 'warranty'},
    {slug: 'algemene-voorwaarden', key: 'terms'},
    {slug: 'privacybeleid', key: 'privacy'},
    {slug: 'recycling', key: 'recycling'},
    {slug: 'contact', key: 'contact'},
] as const;

async function Copyright() {
    'use cache'
    cacheLife('days');

    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Footer'});

    return (
        <div>
            <p>&copy; {COPYRIGHT_YEAR} {t('copyright')}</p>
            {/* Dutch law requires the company's identity, address, KVK and VAT number on the website. */}
            <p className="mt-1 text-xs">
                {t('companyDetails', {name: COMPANY.name, address: COMPANY.address, kvk: COMPANY.kvkNumber, btw: COMPANY.btwNumber})}
            </p>
        </div>
    )
}

export async function Footer() {
    'use cache'
    cacheLife('days');

    const locale = await getRouteLocale();
    cacheTag(`footer-${locale}`);

    const t = await getTranslations({locale, namespace: 'Footer'});
    const collections = await getTopCollections(locale);

    return (
        <footer className="border-t border-border mt-auto">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-1">
                        <NavigationLink href="/" className="inline-block mb-4">
                            <Logo />
                        </NavigationLink>
                        <p className="text-sm text-muted-foreground text-balance leading-relaxed">
                            {t('description')}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm font-semibold mb-4">{t('categories')}</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {collections.map((collection) => (
                                <li key={collection.id}>
                                    <NavigationLink
                                        href={`/collection/${collection.slug}`}
                                        className="hover:text-foreground transition-colors"
                                    >
                                        {collection.name}
                                    </NavigationLink>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className="text-sm font-semibold mb-4">{t('customer')}</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <NavigationLink
                                    href="/search"
                                    className="hover:text-foreground transition-colors"
                                >
                                    {t('shopAll')}
                                </NavigationLink>
                            </li>
                            <li>
                                <NavigationLink
                                    href="/account/orders"
                                    className="hover:text-foreground transition-colors"
                                >
                                    {t('orders')}
                                </NavigationLink>
                            </li>
                            <li>
                                <NavigationLink
                                    href="/account/profile"
                                    className="hover:text-foreground transition-colors"
                                >
                                    {t('account')}
                                </NavigationLink>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <p className="text-sm font-semibold mb-4">{t('service')}</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {serviceLinks.map(({slug, key}) => (
                                <li key={slug}>
                                    <NavigationLink
                                        href={`/info/${slug}`}
                                        className="hover:text-foreground transition-colors"
                                    >
                                        {t(key)}
                                    </NavigationLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Section */}
                <div
                    className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <Copyright/>
                    <div className="flex items-center gap-1">
                        <span>{t('poweredBy')}</span>
                        <a href="https://vendure.io" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Vendure</a>
                        <span>&amp;</span>
                        <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Next.js</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
