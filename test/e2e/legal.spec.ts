import { test, expect } from '@playwright/test';

test.describe('Legal Pages', () => {
  test('should load about page and render legal content', async ({ page }) => {
    await page.goto('/legal/about');

    await expect(page.getByTestId('legal-title')).toBeVisible();
    await expect(page.getByTestId('legal-content')).toBeVisible();
    await expect(page.getByTestId('legal-content')).toContainText('Definitive Tools');
  });

  test('should show error for non-existent document', async ({ page }) => {
    // Now that the parser bug is fixed, direct navigation is fully supported without SSR loops/crashes
    await page.goto('/legal/non-existent-doc-id-12345');

    // Loader should be hidden and error visible
    await expect(page.getByTestId('legal-error')).toBeVisible();
    await expect(page.getByTestId('legal-error')).toContainText('Document Not Found');
  });
});
