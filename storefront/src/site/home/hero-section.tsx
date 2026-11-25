import {Button} from "@/components/ui/button";
import { Link } from '@/platform/i18n/navigation';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {Check} from 'lucide-react';

const sellingPoints = ['pointTested', 'pointWarranty', 'pointDelivery'] as const;
const installmentSteps = ['in3Step1', 'in3Step2', 'in3Step3'] as const;

export async function HeroSection() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Hero'});
    return (
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-accent/60 via-background to-background">
            <div className="container relative mx-auto grid items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-7">
                    <h1 className="text-4xl font-extrabold leading-[1.05] md:text-6xl">
                        {t('title')}{" "}
                        <span className="text-primary">{t('titleHighlight')}</span>
                    </h1>
                    <p className="max-w-xl text-lg text-muted-foreground md:text-xl">
                        {t('subtitle')}
                    </p>
                    <ul className="space-y-2">
                        {sellingPoints.map(key => (
                            <li key={key} className="flex items-center gap-2 text-sm font-medium">
                                <Check className="size-4 text-primary" aria-hidden="true" />
                                {t(key)}
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                        <Button render={<Link href="/collection/laptops" />} nativeButton={false} size="lg" className="text-base">
                            {t('shopNow')}
                        </Button>
                        <Button render={<Link href="/search" />} nativeButton={false} variant="outline" size="lg" className="text-base">
                            {t('viewCollections')}
                        </Button>
                    </div>
                </div>

                <aside className="rounded-2xl border bg-card p-6 shadow-sm md:p-8" aria-labelledby="in3-explainer">
                    <span className="inline-flex rounded-full bg-highlight px-3 py-1 text-xs font-bold text-highlight-foreground">
                        {t('in3Badge')}
                    </span>
                    <h2 id="in3-explainer" className="mt-4 text-2xl font-bold">{t('in3Title')}</h2>
                    <ol className="mt-6 space-y-4">
                        {installmentSteps.map((key, index) => (
                            <li key={key} className="flex gap-4">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                    {index + 1}
                                </span>
                                <span className="pt-1 text-sm leading-relaxed">{t(key)}</span>
                            </li>
                        ))}
                    </ol>
                    <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">{t('in3Note')}</p>
                </aside>
            </div>
        </section>
    );
}
