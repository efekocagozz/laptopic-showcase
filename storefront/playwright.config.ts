import {defineConfig, devices} from '@playwright/test';

/**
 * Browser tests against a running storefront (default http://localhost:3001) and backend.
 * Start both first; see README.md. Not part of `npm test`, run with `npm run test:e2e`.
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    retries: 0,
    use: {
        baseURL: process.env.STOREFRONT_URL || 'http://localhost:3001',
        locale: 'nl-NL',
        trace: 'retain-on-failure',
    },
    projects: [
        {name: 'desktop', use: {...devices['Desktop Chrome']}},
        {name: 'mobile', use: {...devices['Pixel 7']}},
    ],
});
