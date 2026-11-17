import { test, expect } from '@playwright/test';

test.describe('Internationalisation', () => {
  test('serves English by default on unprefixed URLs', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toContainText('Your Ultimate Digital Toolkit');
    await expect(page).toHaveURL(/\/$/);
  });

  test('serves Spanish under the /es prefix', async ({ page }) => {
    await page.goto('/es');

    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('h1')).toContainText('Tu kit definitivo de herramientas digitales');
  });

  test('switches language from the home page and rewrites the URL', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('language-switcher').first().click();
    await page.getByTestId('language-option-es').click();

    await expect(page).toHaveURL(/\/es$/);
    await expect(page.locator('h1')).toContainText('Tu kit definitivo de herramientas digitales');

    // The choice survives a reload.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('localises every internal link of the Spanish home page', async ({ page }) => {
    await page.goto('/es');

    await expect(page.getByTestId('tool-card-qr-generator')).toHaveAttribute(
      'href',
      '/es/tool/qr-generator',
    );
  });

  test('keeps English tool links unprefixed', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('tool-card-qr-generator')).toHaveAttribute(
      'href',
      '/tool/qr-generator',
    );
  });

  test('translates a tool page and its navigation shell', async ({ page }) => {
    await page.goto('/es/tool/qr-generator');

    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('app-sidemenu')).toContainText('Herramientas de imagen');
    await expect(page.locator('app-top-navbar')).toContainText('Generador de códigos QR');
  });

  test('updates document metadata for the active language', async ({ page }) => {
    await page.goto('/es');

    await expect(page).toHaveTitle(/Utilidades digitales gratuitas/);
    await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute(
      'href',
      /\/es$/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/es$/);
  });

  test('honours a saved language choice when landing on the home page', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('language-switcher').first().click();
    await page.getByTestId('language-option-es').click();
    await expect(page).toHaveURL(/\/es$/);

    // The bare home URL reopens in the saved language.
    await page.goto('/');
    await expect(page).toHaveURL(/\/es$/);
  });

  test('navigation between languages keeps the user on the same tool', async ({ page }) => {
    await page.goto('/tool/base64-encoder-decoder');

    await page.getByTestId('language-switcher').last().click();
    await page.getByTestId('language-option-es').click();

    await expect(page).toHaveURL(/\/es\/tool\/base64-encoder-decoder$/);
    await expect(page.locator('app-top-navbar')).toContainText('Codificador / Decodificador Base64');
  });
});
