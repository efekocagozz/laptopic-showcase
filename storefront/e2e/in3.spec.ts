import {expect, test} from '@playwright/test';

// The storefront only shows in3 when the backend's in3Quote says it is available.
test('a laptop shows its in3 installments', async ({page}) => {
    await page.goto('/product/lenovo-thinkpad-t14-gen-3');
    await expect(page.getByText('€ 549,00').first()).toBeVisible();
    await expect(page.getByText('of 3 × € 183,00 met in3')).toBeVisible();
});

test('an item below the in3 minimum shows no installments', async ({page}) => {
    await page.goto('/product/usb-c-oplader-65w');
    await expect(page.getByText('€ 29,00').first()).toBeVisible();
    await expect(page.getByText(/met in3/)).toHaveCount(0);
});

test('the cart shows installments for the order total', async ({page}) => {
    await page.goto('/product/dell-latitude-5420');
    await page.getByRole('button', {name: 'In winkelwagen'}).click();
    await expect(page.getByText('Toegevoegd aan winkelwagen')).toBeVisible();
    await page.goto('/cart');
    // EUR 379 (shipping is added at checkout): 379 / 3 = 126.33... -> 126.34
    await expect(page.getByText('of 3 × € 126,34 met in3')).toBeVisible();
});
