import { ConfigService, ImportParser, LanguageCode, ParsedProductWithVariants } from '@vendure/core';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

import { initialData } from './initial-data';

/**
 * Checks the demo catalogue before it reaches the database, using the same parser
 * Vendure's importer uses. A mistake here would otherwise only show up halfway
 * through `npm run seed`.
 */
describe('demo catalogue (products.csv)', () => {
    let products: ParsedProductWithVariants[];

    beforeAll(async () => {
        const csv = readFileSync(path.join(__dirname, 'products.csv'), 'utf-8');
        // The parser only reads the default language from ConfigService, and we pass it explicitly.
        const parser = new ImportParser({} as ConfigService);
        const result = await parser.parseProducts(csv, LanguageCode.nl);
        expect(result.errors).toEqual([]);
        products = result.results;
    });

    const facetValue = (p: ParsedProductWithVariants, facet: string) =>
        p.product.facets.find(f => f.translations[0].facet === facet)?.translations[0].value;
    const allVariants = () => products.flatMap(p => p.variants);

    it('contains 20 laptops and 3 accessories', () => {
        const categories = products.map(p => facetValue(p, 'Categorie'));
        expect(categories.filter(c => c === 'Laptops')).toHaveLength(20);
        expect(categories.filter(c => c === 'Accessoires')).toHaveLength(3);
    });

    it('has unique slugs and SKUs', () => {
        const slugs = products.map(p => p.product.translations[0].slug);
        const skus = allVariants().map(v => v.sku);
        expect(new Set(slugs).size).toBe(slugs.length);
        expect(new Set(skus).size).toBe(skus.length);
    });

    it('gives every laptop a brand, screen size, processor and condition', () => {
        const laptops = products.filter(p => facetValue(p, 'Categorie') === 'Laptops');
        for (const laptop of laptops) {
            for (const facet of ['Merk', 'Schermgrootte', 'Processor', 'Conditie']) {
                expect(facetValue(laptop, facet), `${laptop.product.translations[0].name}: ${facet}`).toBeTruthy();
            }
        }
    });

    it('has a value for every option group on every variant', () => {
        for (const { product, variants } of products) {
            for (const variant of variants) {
                expect(variant.translations[0].optionValues).toHaveLength(product.optionGroups.length);
            }
        }
    });

    it('uses positive euro prices with at most two decimals', () => {
        for (const variant of allVariants()) {
            expect(variant.price, variant.sku).toBeGreaterThan(0);
            expect(Math.round(variant.price * 100) / 100, variant.sku).toBe(variant.price);
        }
    });

    // Milestone 4 needs items on both sides of in3's usual minimum order amount (EUR 50).
    it('includes items below and above EUR 50', () => {
        const prices = allVariants().map(v => v.price);
        expect(prices.some(price => price < 50)).toBe(true);
        expect(prices.some(price => price >= 50)).toBe(true);
    });

    it('only refers to tax categories defined in initial-data', () => {
        const taxCategories = new Set(initialData.taxRates.map(t => t.name));
        for (const variant of allVariants()) {
            expect(taxCategories.has(variant.taxCategory), variant.sku).toBe(true);
        }
    });

    it('only refers to images that exist in seed/assets', () => {
        const assetPaths = products.flatMap(p => [...p.product.assetPaths, ...p.variants.flatMap(v => v.assetPaths)]);
        for (const assetPath of assetPaths) {
            expect(existsSync(path.join(__dirname, 'assets', assetPath)), assetPath).toBe(true);
        }
    });
});
