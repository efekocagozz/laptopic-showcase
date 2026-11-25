import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/site/i18n/request.ts');

const isProduction = process.env.NODE_ENV === 'production';

// Hostname that serves product images in production (Vendure's ASSET_URL_PREFIX), e.g. api.laptopic.nl.
// next/image only loads images from hosts listed here, and this is read at build time.
const assetHostname = process.env.ASSET_HOSTNAME;
// Loading images from localhost/private addresses is only allowed in development, or explicitly for a local
// production build (ASSET_HOSTNAME=localhost, as in CI). A real deployment never fetches private addresses.
const allowLocalImages = !isProduction || assetHostname === 'localhost';

/** Basic browser security headers for every page. */
const securityHeaders = [
    // Browsers only use HTTPS for this site from now on (ignored over plain http, e.g. locally).
    {key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains'},
    {key: 'X-Content-Type-Options', value: 'nosniff'},
    {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
    // The shop must not be shown inside another site's frame (clickjacking).
    {key: 'X-Frame-Options', value: 'DENY'},
    {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()'},
];

const nextConfig: NextConfig = {
    cacheComponents: true,
    poweredByHeader: false,
    images: {
        dangerouslyAllowLocalIP: allowLocalImages,
        remotePatterns: [
            ...(allowLocalImages ? [{hostname: 'localhost'}] : []),
            ...(assetHostname && assetHostname !== 'localhost' ? [{hostname: assetHostname}] : []),
        ],
    },
    async headers() {
        return [{source: '/:path*', headers: securityHeaders}];
    },
};

export default withNextIntl(nextConfig);
