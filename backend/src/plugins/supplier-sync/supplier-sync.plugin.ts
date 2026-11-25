import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { SUPPLIER_SYNC_PLUGIN_OPTIONS } from './constants';
import { SupplierSyncService } from './supplier-sync.service';
import { createSupplierSyncTask } from './supplier-sync.task';
import { SupplierSyncPluginOptions } from './types';

/**
 * Nightly import of stock and prices from the supplier's CSV feed (see supplier-feed.ts for the format).
 * The task can also be started manually from the Dashboard's scheduled tasks page.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: SUPPLIER_SYNC_PLUGIN_OPTIONS, useFactory: () => SupplierSyncPlugin.options }, SupplierSyncService],
    configuration: config => {
        config.schedulerOptions.tasks = [
            ...(config.schedulerOptions.tasks ?? []),
            createSupplierSyncTask(SupplierSyncPlugin.options.schedule),
        ];
        return config;
    },
    compatibility: '^3.3.0',
})
export class SupplierSyncPlugin {
    static options: SupplierSyncPluginOptions;

    static init(options: SupplierSyncPluginOptions) {
        this.options = options;
        return SupplierSyncPlugin;
    }
}
