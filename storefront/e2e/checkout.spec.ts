import {expect, test} from '@playwright/test';

// Guest checkout with the dev-only "Testbetaling" method. Each run uses a fresh email address
// so the guest customer never clashes with an existing account.
test('guest can buy a product and sees the order confirmation', async ({page}) => {
    await page.goto('/product/usb-c-dockingstation');
    await expect(page.getByRole('heading', {name: 'USB-C dockingstation'})).toBeVisible();
    await expect(page.getByText('€ 119,00').first()).toBeVisible();

    await page.getByRole('button', {name: 'In winkelwagen'}).click();
    await expect(page.getByText('Toegevoegd aan winkelwagen')).toBeVisible();

    await page.goto('/cart');
    await expect(page.getByRole('heading', {name: 'Winkelwagen'})).toBeVisible();
    await page.getByText('Verder naar afrekenen').click();

    await page.getByLabel('E-mailadres').fill(`e2e-${Date.now()}@example.com`);
    await page.getByLabel('Voornaam').fill('Test');
    await page.getByLabel('Achternaam').fill('Klant');
    await page.getByRole('button', {name: 'Doorgaan'}).click();

    await page.getByLabel('Volledige naam').fill('Test Klant');
    await page.getByLabel('Straat en huisnummer').fill('Damrak 1');
    await page.getByLabel('Plaats').fill('Amsterdam');
    await page.getByLabel('Postcode').fill('1012 LG');
    await page.getByLabel('Telefoonnummer').fill('0612345678');
    await page.getByRole('button', {name: 'Doorgaan'}).click();

    await page.getByText('PostNL standaard').click();
    await page.getByRole('button', {name: 'Verder naar betalen'}).click();

    await page.getByText('Testbetaling').click();
    await page.getByRole('button', {name: 'Verder naar controleren'}).click();

    // Legal requirements before ordering: the terms are linked and the button says that ordering means paying.
    await expect(page.getByRole('link', {name: 'algemene voorwaarden', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Bestellen en betalen'}).click();
    await expect(page.getByRole('heading', {name: 'Bedankt voor je bestelling!'})).toBeVisible({timeout: 20_000});
    await expect(page).toHaveURL(/\/order-confirmation\/[A-Z0-9]+/);
});
