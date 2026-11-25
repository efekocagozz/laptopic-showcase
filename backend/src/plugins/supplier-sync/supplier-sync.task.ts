import { Logger, ScheduledTask } from '@vendure/core';

import { DEFAULT_SCHEDULE, loggerCtx } from './constants';
import { SupplierSyncService } from './supplier-sync.service';

/** Runs the supplier import on the worker, on the configured schedule. */
export function createSupplierSyncTask(schedule = DEFAULT_SCHEDULE) {
    return new ScheduledTask({
        id: 'supplier-sync',
        description: 'Updates stock and prices from the supplier CSV feed',
        schedule,
        timeout: '5m',
        async execute({ injector, scheduledContext }) {
            const report = await injector.get(SupplierSyncService).syncFromFile(scheduledContext);
            if (report.unknownSkus.length || report.suspiciousPrices.length || report.invalidRows.length) {
                Logger.warn(`Supplier sync needs attention: ${JSON.stringify(report)}`, loggerCtx);
            }
            // The returned value is stored as the task's last result and shown in the Dashboard.
            return report;
        },
    });
}
