import {expect, test} from '@playwright/test';

test('the footer links to the withdrawal page with the model form', async ({page}) => {
    await page.goto('/');
    await page.getByRole('contentinfo').getByRole('link', {name: 'Herroepingsrecht'}).click();
    await expect(page.getByRole('heading', {level: 1, name: 'Herroepingsrecht'})).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Modelformulier voor herroeping'})).toBeVisible();
});

test('the return form validates input and reports unknown orders', async ({page}) => {
    await page.goto('/returns');
    await page.getByRole('button', {name: 'Retour aanmelden'}).click();
    await expect(page.getByText('Vul je bestelnummer in')).toBeVisible();
    await expect(page.getByText('Vul een geldig e-mailadres in')).toBeVisible();

    await page.getByLabel('Bestelnummer').fill('BESTAATNIET');
    await page.getByLabel('E-mailadres waarmee je hebt besteld').fill('klant@example.com');
    await page.getByLabel('Reden').selectOption('DEFECT');
    await page.getByRole('button', {name: 'Retour aanmelden'}).click();
    await expect(page.getByRole('alert').filter({hasText: 'We konden geen bestelling vinden'})).toBeVisible();
});

test('every page shows the company details, and the privacy and contact pages exist', async ({page}) => {
    await page.goto('/');
    await expect(page.getByRole('contentinfo').getByText(/KVK 00000000 · btw NL000000000B01/)).toBeVisible();

    await page.getByRole('contentinfo').getByRole('link', {name: 'Privacy en cookies'}).click();
    await expect(page.getByRole('heading', {level: 1, name: 'Privacybeleid en cookies'})).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Cookies', exact: true})).toBeVisible();

    await page.goto('/info/contact');
    await expect(page.getByRole('heading', {level: 1, name: 'Contact en bedrijfsgegevens'})).toBeVisible();
});

test('a refurbished product shows its condition', async ({page}) => {
    await page.goto('/product/lenovo-thinkpad-t490');
    await expect(page.getByText('Refurbished · conditie: Goed')).toBeVisible();
});
