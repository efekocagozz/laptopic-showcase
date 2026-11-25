import { bootstrap, runMigrations } from '@vendure/core';

import { assertProductionEnvironment } from './config/production-environment';
import { config } from './vendure-config';

async function start() {
    assertProductionEnvironment();
    await runMigrations(config);
    await bootstrap(config);
}

start().catch(err => {
    console.error(err);
    // Exit so the process manager (Docker, the host) restarts or reports it, instead of a half-started server.
    process.exit(1);
});
