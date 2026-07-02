import { test, expect } from '@playwright/test';

test.describe('Opengraph Generator Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/opengraph-generator');
  });

  test('should load and allow entering properties', async ({ page }) => {
    await expect(page.locator('h2:has-text("Choose template")')).toBeVisible();
    await expect(page.locator('h2:has-text("Template Properties")')).toBeVisible();
    await expect(page.locator('h2:has-text("Image Preview")')).toBeVisible();

    // Click basic template button by index (0: image-right, 1: hero, 2: logos, 3: basic)
    await page.locator('app-opengraph-template-selector button').nth(3).click();

    const titleInput = page.getByTestId('og-title-input');
    const descInput = page.getByTestId('og-description-input');
    
    await expect(titleInput).toBeVisible();
    await expect(descInput).toBeVisible();

    await titleInput.fill('My Custom Opengraph Title');
    await descInput.fill('This is a custom generated description for social cards.');

    await expect(page.getByTestId('og-download-btn')).toBeVisible();
  });
});
