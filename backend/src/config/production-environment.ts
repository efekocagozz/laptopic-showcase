/**
 * Checks the settings a production server needs before it starts, so a misconfigured deployment fails
 * immediately with a clear list instead of running with default passwords or silently not sending emails.
 * Development (APP_ENV=dev) skips these checks.
 */

const MIN_SECRET_LENGTH = 32;
const MIN_PASSWORD_LENGTH = 12;
/** Values from .env.example and the Vendure defaults; never acceptable in production. */
const PLACEHOLDER_VALUES = new Set(['', 'change-me', 'superadmin', 'secret', 'password']);

const REQUIRED = [
    'COOKIE_SECRET',
    'SUPERADMIN_USERNAME',
    'SUPERADMIN_PASSWORD',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USERNAME',
    'DB_PASSWORD',
    'STOREFRONT_URL',
    'VENDURE_PUBLIC_URL',
    'CORS_ORIGINS',
    // Order confirmations carry legally required information, so production must really send email.
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD',
] as const;

type Env = Record<string, string | undefined>;

export function findProductionEnvironmentProblems(env: Env): string[] {
    const problems: string[] = [];
    const value = (name: string) => env[name]?.trim() ?? '';

    for (const name of REQUIRED) {
        if (!value(name)) problems.push(`${name} is not set`);
    }
    for (const name of ['COOKIE_SECRET', 'SUPERADMIN_PASSWORD', 'DB_PASSWORD', 'SMTP_PASSWORD']) {
        if (value(name) && PLACEHOLDER_VALUES.has(value(name).toLowerCase())) {
            problems.push(`${name} still has a placeholder value`);
        }
    }
    if (value('COOKIE_SECRET') && value('COOKIE_SECRET').length < MIN_SECRET_LENGTH) {
        problems.push(`COOKIE_SECRET must be at least ${MIN_SECRET_LENGTH} characters (e.g. \`openssl rand -base64 48\`)`);
    }
    if (value('SUPERADMIN_PASSWORD') && value('SUPERADMIN_PASSWORD').length < MIN_PASSWORD_LENGTH) {
        problems.push(`SUPERADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    for (const name of ['STOREFRONT_URL', 'VENDURE_PUBLIC_URL']) {
        if (value(name) && !value(name).startsWith('https://')) problems.push(`${name} must start with https://`);
    }
    const origins = value('CORS_ORIGINS').split(',').map(origin => origin.trim()).filter(Boolean);
    for (const origin of origins) {
        if (!origin.startsWith('https://')) problems.push(`CORS_ORIGINS entry "${origin}" must start with https://`);
    }
    if (value('SMTP_PORT') && !/^\d+$/.test(value('SMTP_PORT'))) problems.push('SMTP_PORT must be a number');
    if (value('MOLLIE_API_KEY') && !value('MOLLIE_API_KEY').startsWith('test_')) {
        // This project only runs Mollie in test mode (PROJECT.md); going live is a deliberate code change.
        problems.push('MOLLIE_API_KEY must be a Mollie test key (starting with test_)');
    }
    return problems;
}

/** Throws with every problem listed when not in development. */
export function assertProductionEnvironment(env: Env = process.env) {
    if (env.APP_ENV === 'dev') return;
    const problems = findProductionEnvironmentProblems(env);
    if (problems.length) {
        throw new Error(
            `Refusing to start: the production environment is not configured correctly:\n  - ${problems.join('\n  - ')}\n` +
                'See docs/deployment.md.',
        );
    }
}
