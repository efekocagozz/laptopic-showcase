import { InitialData, LanguageCode } from '@vendure/core';

/**
 * Store setup for the Dutch demo shop: one country and zone, Dutch VAT rates,
 * shipping, a development-only payment method and the catalogue collections.
 * Products themselves come from products.csv.
 */
export const initialData: InitialData = {
    defaultLanguage: LanguageCode.nl,
    defaultZone: 'Nederland',
    countries: [{ code: 'NL', name: 'Nederland', zone: 'Nederland' }],
    // Dutch BTW. The CSV refers to these categories by name ("Standaard").
    taxRates: [
        { name: 'Standaard', percentage: 21 },
        { name: 'Verlaagd', percentage: 9 },
        { name: 'Nul', percentage: 0 },
    ],
    // Prices are in cents and include VAT, because the channel has pricesIncludeTax enabled.
    shippingMethods: [{ name: 'PostNL standaard', price: 495, taxRate: 21 }],
    // Replaced by Mollie in Milestone 3. The dummy handler only exists when APP_ENV=dev.
    paymentMethods: [
        {
            name: 'Testbetaling',
            handler: {
                code: 'dummy-payment-handler',
                arguments: [{ name: 'automaticSettle', value: 'true' }],
            },
        },
    ],
    collections: [
        {
            name: 'Laptops',
            slug: 'laptops',
            filters: [facetFilter('Categorie:Laptops')],
        },
        {
            name: 'Lenovo ThinkPad',
            slug: 'lenovo-thinkpad',
            parentName: 'Laptops',
            filters: [facetFilter('Merk:Lenovo')],
        },
        {
            name: 'Dell Latitude',
            slug: 'dell-latitude',
            parentName: 'Laptops',
            filters: [facetFilter('Merk:Dell')],
        },
        {
            name: 'HP EliteBook',
            slug: 'hp-elitebook',
            parentName: 'Laptops',
            filters: [facetFilter('Merk:HP')],
        },
        {
            name: 'Accessoires',
            slug: 'accessoires',
            filters: [facetFilter('Categorie:Accessoires')],
        },
    ],
};

function facetFilter(facetValueName: string) {
    return {
        code: 'facet-value-filter' as const,
        args: { facetValueNames: [facetValueName], containsAny: false },
    };
}
