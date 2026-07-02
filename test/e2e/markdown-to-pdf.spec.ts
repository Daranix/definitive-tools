import { test, expect } from '@playwright/test';

test.describe('Markdown to PDF Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/markdown-to-pdf');
  });

  test('should load editor workspace and preview layout', async ({ page }) => {
    await expect(page.locator('span:has-text("Preview")')).toBeVisible();
    await expect(page.getByTestId('md-pdf-preview-empty')).toBeVisible();

    const generateBtn = page.getByTestId('md-pdf-generate-btn');
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toBeDisabled();

    await expect(page.locator('app-monaco-editor')).toBeVisible();
  });
});
