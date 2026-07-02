import { test, expect } from '@playwright/test';

test.describe('Background Remover Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/background-remover');
  });

  test('should load with file uploader initially', async ({ page }) => {
    await expect(page.locator('h2').first()).toContainText('Image Upload & Processing');
    await expect(page.locator('app-drag-and-drop-file')).toBeVisible();
    await expect(page.locator('button:has-text("Remove Background")')).not.toBeVisible();
  });

  test('should show preview and action buttons when file is uploaded', async ({ page }) => {
    const mockFileBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Set files directly on the hidden input to avoid file chooser timeouts
    await page.setInputFiles('app-drag-and-drop-file input[type="file"]', {
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: mockFileBuffer,
    });

    // Check that image preview appears
    await expect(page.locator('img.object-contain')).toBeVisible();

    // Check that control buttons appear
    await expect(page.locator('button:has-text("Remove Background")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();

    // Clicking Cancel should reset the state back to upload dropzone
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('app-drag-and-drop-file')).toBeVisible();
    await expect(page.locator('img.object-contain')).not.toBeVisible();
  });
});
