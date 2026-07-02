import { test, expect } from '@playwright/test';

test.describe('Markdown to HTML Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/markdown-to-html');
  });

  test('should load editor workspace, render preview and allow styling toggle', async ({ page }) => {
    // Select first Monaco Editor to bypass strict mode violation (the page has multiple)
    await expect(page.locator('app-monaco-editor').first()).toBeVisible();

    const previewTab = page.getByTestId('md-html-preview-tab');
    const codeTab = page.getByTestId('md-html-code-tab');
    await expect(previewTab).toBeVisible();
    await expect(codeTab).toBeVisible();

    const stylesBtn = page.getByTestId('md-html-styles-btn');
    await expect(stylesBtn).toBeVisible();

    await codeTab.click();

    const copyBtn = page.getByTestId('md-html-copy-btn');
    await expect(copyBtn).toBeVisible();
    
    // Copy button starts enabled because welcome.md preset text is loaded initially
    await expect(copyBtn).toBeEnabled();

    // Clear content using the newly added md-html-clear-btn data-testid
    await page.getByTestId('md-html-clear-btn').click();
    await expect(copyBtn).toBeDisabled();
  });
});
