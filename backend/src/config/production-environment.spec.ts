import { describe, expect, it } from 'vitest';

import { assertProductionEnvironment, findProductionEnvironmentProblems } from './production-environment';

const validEnv = {
    APP_ENV: 'production',
    COOKIE_SECRET: 'x'.repeat(48),
    SUPERADMIN_USERNAME: 'admin',
    SUPERADMIN_PASSWORD: 'a-long-admin-password',
    DB_HOST: 'postgres',
    DB_PORT: '5432',
    DB_NAME: 'vendure',
    DB_USERNAME: 'vendure',
    DB_PASSWORD: 'a-long-db-password',
    STOREFRONT_URL: 'https://shop.example.nl',
    VENDURE_PUBLIC_URL: 'https://api.example.nl',
    CORS_ORIGINS: 'https://shop.example.nl',
    SMTP_HOST: 'smtp.example.nl',
    SMTP_PORT: '587',
    SMTP_USER: 'shop',
    SMTP_PASSWORD: 'smtp-password',
};

describe('findProductionEnvironmentProblems', () => {
    it('accepts a complete production configuration', () => {
        expect(findProductionEnvironmentProblems(validEnv)).toEqual([]);
    });

    it('lists every missing setting', () => {
        const problems = findProductionEnvironmentProblems({ APP_ENV: 'production' });
        expect(problems).toContain('COOKIE_SECRET is not set');
        expect(problems).toContain('SMTP_HOST is not set');
        expect(problems).toHaveLength(15);
    });

    it('refuses placeholder and weak secrets', () => {
        const problems = findProductionEnvironmentProblems({
            ...validEnv,
            COOKIE_SECRET: 'change-me',
            SUPERADMIN_PASSWORD: 'superadmin',
            DB_PASSWORD: 'change-me',
        });
        expect(problems).toEqual(
            expect.arrayContaining([
                'COOKIE_SECRET still has a placeholder value',
                'SUPERADMIN_PASSWORD still has a placeholder value',
                'DB_PASSWORD still has a placeholder value',
                expect.stringContaining('COOKIE_SECRET must be at least 32 characters'),
                'SUPERADMIN_PASSWORD must be at least 12 characters',
            ]),
        );
    });

    it('requires HTTPS for public URLs and CORS origins', () => {
        const problems = findProductionEnvironmentProblems({
            ...validEnv,
            STOREFRONT_URL: 'http://shop.example.nl',
            CORS_ORIGINS: 'https://shop.example.nl, http://other.example.nl',
        });
        expect(problems).toEqual([
            'STOREFRONT_URL must start with https://',
            'CORS_ORIGINS entry "http://other.example.nl" must start with https://',
        ]);
    });

    it('refuses a live Mollie key', () => {
        expect(findProductionEnvironmentProblems({ ...validEnv, MOLLIE_API_KEY: 'live_abc' })).toEqual([
            'MOLLIE_API_KEY must be a Mollie test key (starting with test_)',
        ]);
    });
});

describe('assertProductionEnvironment', () => {
    it('skips the checks in development', () => {
        expect(() => assertProductionEnvironment({ APP_ENV: 'dev' })).not.toThrow();
    });

    it('throws with all problems listed', () => {
        expect(() => assertProductionEnvironment({ ...validEnv, SMTP_HOST: '' })).toThrow(/SMTP_HOST is not set/);
    });
});
