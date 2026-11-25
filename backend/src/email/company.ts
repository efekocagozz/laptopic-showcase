/**
 * Company details shown on emails and invoices. Placeholders: this is a portfolio project, not a
 * registered business. Replace them (KVK, BTW number, address) before ever going live, and keep them in sync
 * with storefront/src/config/company.ts.
 */
export const COMPANY = {
    name: 'Laptopic',
    email: 'service@laptopic.example',
    address: 'Voorbeeldstraat 1, 1234 AB Amsterdam',
    kvkNumber: '00000000',
    btwNumber: 'NL000000000B01',
    phone: '020 000 0000',
};

/** Days after delivery in which consumers may withdraw from the purchase (Dutch/EU consumer law). */
export const WITHDRAWAL_PERIOD_DAYS = 14;
