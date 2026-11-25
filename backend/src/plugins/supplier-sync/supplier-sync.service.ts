import { Inject, Injectable } from '@nestjs/common';
import { UpdateProductVariantInput } from '@vendure/common/lib/generated-types';
import { Logger, ProductVariantService, RequestContext, StockLevelService } from '@vendure/core';
import { readFile } from 'fs/promises';

import { DEFAULT_MAX_PRICE_CHANGE_PERCENT, loggerCtx, SUPPLIER_SYNC_PLUGIN_OPTIONS } from './constants';
import { isSuspiciousPriceChange, parseSupplierFeed } from './supplier-feed';
import { SupplierSyncPluginOptions, SupplierSyncReport } from './types';

/** Fetching variants by SKU in batches keeps queries small for large feeds. */
const SKU_BATCH_SIZE = 100;

/**
 * Updates stock and prices of existing variants from the supplier feed. It never creates or deletes
 * products: unknown SKUs are reported for someone to look at.
 */
@Injectable()
export class SupplierSyncService {
    constructor(
        @Inject(SUPPLIER_SYNC_PLUGIN_OPTIONS) private options: SupplierSyncPluginOptions,
        private productVariantService: ProductVariantService,
        private stockLevelService: StockLevelService,
    ) {}

    async syncFromFile(ctx: RequestContext, feedPath = this.options.feedPath): Promise<SupplierSyncReport> {
        return this.syncFromCsv(ctx, await readFile(feedPath, 'utf-8'));
    }

    async syncFromCsv(ctx: RequestContext, csv: string): Promise<SupplierSyncReport> {
        const feed = parseSupplierFeed(csv);
        const maxChange = this.options.maxPriceChangePercent ?? DEFAULT_MAX_PRICE_CHANGE_PERCENT;
        const report: SupplierSyncReport = {
            updated: [],
            unchanged: 0,
            unknownSkus: [],
            suspiciousPrices: [],
            invalidRows: feed.errors,
        };

        for (let i = 0; i < feed.rows.length; i += SKU_BATCH_SIZE) {
            const batch = feed.rows.slice(i, i + SKU_BATCH_SIZE);
            const variants = await this.productVariantService.findAll(ctx, {
                filter: { sku: { in: batch.map(row => row.sku) } },
                take: SKU_BATCH_SIZE,
            });
            const bySku = new Map(variants.items.map(variant => [variant.sku, variant]));
            const updates: UpdateProductVariantInput[] = [];

            for (const row of batch) {
                const variant = bySku.get(row.sku);
                if (!variant) {
                    report.unknownSkus.push(row.sku);
                    continue;
                }
                const update: UpdateProductVariantInput = { id: variant.id };
                // One query per row; fine for feeds of a few thousand SKUs within the task's 5-minute timeout.
                const { stockOnHand } = await this.stockLevelService.getAvailableStock(ctx, variant.id);
                if (stockOnHand !== row.stockOnHand) update.stockOnHand = row.stockOnHand;
                if (variant.priceWithTax !== row.priceWithTax) {
                    if (isSuspiciousPriceChange(variant.priceWithTax, row.priceWithTax, maxChange)) {
                        report.suspiciousPrices.push({
                            sku: row.sku,
                            currentPrice: variant.priceWithTax,
                            feedPrice: row.priceWithTax,
                        });
                    } else {
                        // The channel has pricesIncludeTax, so `price` is the price including VAT.
                        update.price = row.priceWithTax;
                    }
                }
                const priceHeldBack = report.suspiciousPrices.some(entry => entry.sku === row.sku);
                if (Object.keys(update).length > 1) {
                    updates.push(update);
                    report.updated.push(row.sku);
                } else if (!priceHeldBack) {
                    report.unchanged++;
                }
            }
            if (updates.length) await this.productVariantService.update(ctx, updates);
        }

        Logger.info(
            `Supplier sync: ${report.updated.length} updated, ${report.unchanged} unchanged, ` +
                `${report.unknownSkus.length} unknown SKUs, ${report.suspiciousPrices.length} suspicious prices, ` +
                `${report.invalidRows.length} invalid rows`,
            loggerCtx,
        );
        return report;
    }
}
