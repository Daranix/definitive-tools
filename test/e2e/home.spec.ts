import { test, expect } from '@playwright/test';

test.describe('Home Page & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the home page correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Your Ultimate Digital Toolkit');
    await expect(page.locator('nav').first()).toContainText('Definitive Tools');
  });

  test('should display the lists of tools', async ({ page }) => {
    const toolCards = page.locator('[data-testid^="tool-card-"]');
    await expect(toolCards.first()).toBeVisible();
    
    const count = await toolCards.count();
    expect(count).toBeGreaterThan(5);
  });

  test('should filter tools by search query', async ({ page }) => {
    const searchInput = page.getByTestId('search-input');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('QR Code');
    
    const toolCards = page.locator('[data-testid^="tool-card-"]');
    
    // WebKit debounce timing fix: wait for the filtered count to reduce to exactly 1 matching card
    await expect(toolCards).toHaveCount(1);
    await expect(toolCards.first()).toContainText('QR');

    await searchInput.fill('xyzabc123nonexistent');
    await expect(page.getByTestId('no-tools-found')).toBeVisible();
  });

  test('should filter tools by category buttons', async ({ page }) => {
    await page.getByTestId('category-filter-Image Tools').click();

    const toolCards = page.locator('[data-testid^="tool-card-"]');
    const count = await toolCards.count();
    expect(count).toBeGreaterThan(0);
    
    for (let i = 0; i < count; i++) {
      await expect(toolCards.nth(i)).toContainText('Image Tools');
    }
  });

  test('should navigate to a tool from dashboard', async ({ page }) => {
    await page.getByTestId('tool-card-qr-generator').click();
    await expect(page).toHaveURL(/\/tool\/qr-generator/);
    await expect(page.locator('app-sidemenu')).toBeVisible();
  });
});
