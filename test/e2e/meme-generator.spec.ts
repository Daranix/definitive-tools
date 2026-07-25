import { test, expect } from '@playwright/test';

test.describe('Meme Generator Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/meme-generator');
  });

  test('should load and show correct title and layout', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Meme Generator');
    await expect(page.locator('h2')).toContainText('Customize Meme');
    await expect(page.locator('img')).toBeVisible();
  });

  test('should allow custom text inputs and adding new caption box', async ({ page }) => {
    // There should be default captions
    const textareas = page.locator('textarea');
    await expect(textareas.first()).toBeVisible();
    
    // Add box button
    const addButton = page.locator('button', { hasText: 'Add Caption Box' });
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Verify a new textarea is added
    const count = await textareas.count();
    expect(count).toBeGreaterThan(2);
  });
});
