import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['src/**/*.spec.ts'],
                },
            },
            {
                // Vendure's e2e tests start a real server (with an in-memory SQLite database), which needs
                // decorator metadata for NestJS dependency injection. esbuild doesn't emit it, SWC does.
                plugins: [swc.vite({ jsc: { transform: { useDefineForClassFields: false } } })],
                test: {
                    name: 'e2e',
                    include: ['test/**/*.e2e-spec.ts'],
                    testTimeout: 60_000,
                    hookTimeout: 120_000,
                    fileParallelism: false,
                },
            },
        ],
    },
});
