/**
 * Company details that Dutch law requires on the website (BW 3:15d, 6:230m): name, address, email, KVK and
 * BTW number. Placeholders: this is a portfolio project. Keep in sync with backend/src/email/company.ts,
 * which shows the same details in emails.
 */
export const COMPANY = {
    name: 'Laptopic',
    legalForm: 'eenmanszaak',
    address: 'Voorbeeldstraat 1, 1234 AB Amsterdam',
    email: 'service@laptopic.example',
    phone: '020 000 0000',
    kvkNumber: '00000000',
    btwNumber: 'NL000000000B01',
    /** Shown on every page while the shop is a demo. */
    isDemo: true,
} as const;

/** Days a consumer may withdraw from the purchase after receiving it (BW 6:230o). */
export const WITHDRAWAL_PERIOD_DAYS = 14;
