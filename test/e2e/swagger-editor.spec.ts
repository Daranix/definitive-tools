import { test, expect } from '@playwright/test';

test.describe('Swagger Editor Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/swagger-editor');
  });

  test('should load Monaco Editor and allow Swagger UI interaction', async ({ page }) => {
    await expect(page.locator('span:has-text("Swagger Editor")').first()).toBeVisible();
    await expect(page.locator('app-monaco-editor')).toBeVisible();

    await page.getByTestId('swagger-file-menu-btn').hover();
    await page.getByTestId('swagger-load-example-btn').click();

    await expect(page.locator('.swagger-ui')).toBeVisible();

    // Assert on correct example title from the YAML definition
    await expect(page.locator('.swagger-ui .title')).toContainText('OpenAPI Petstore');
  });

  test('should toggle between editor and preview on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const editorBtn = page.getByTestId('swagger-panel-editor-btn');
    const previewBtn = page.getByTestId('swagger-panel-preview-btn');
    await expect(editorBtn).toBeVisible();
    await expect(previewBtn).toBeVisible();

    const editor = page.locator('app-monaco-editor');
    await expect(editor).toBeVisible();

    // Switch to preview panel
    await previewBtn.click();
    await expect(editor).toBeHidden();

    // Switch back to editor panel
    await editorBtn.click();
    await expect(editor).toBeVisible();
  });
});
