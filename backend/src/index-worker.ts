import { bootstrapWorker } from '@vendure/core';

import { assertProductionEnvironment } from './config/production-environment';
import { config } from './vendure-config';

async function start() {
    assertProductionEnvironment();
    const worker = await bootstrapWorker(config);
    await worker.startJobQueue();
}

start().catch(err => {
    console.error(err);
    process.exit(1);
});
