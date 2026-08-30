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
});
