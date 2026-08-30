import { test, expect } from '@playwright/test';

test.describe('Image Converter Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/image-converter');
  });

  test('should load options and accept file upload', async ({ page }) => {
    // Fix strict mode violation by targeting the unique title specifically
    await expect(page.getByRole('heading', { name: 'Client-Side Image Converter' })).toBeVisible();
    await expect(page.locator('app-drag-and-drop-file')).toBeVisible();

    await expect(page.locator('text=Target Format')).toBeVisible();
    await expect(page.locator('text=Resize Dimensions')).toBeVisible();

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

    // Check workspace title shows file name
    await expect(page.locator('h2')).toContainText('test-image.png');
    await expect(page.locator('button:has-text("webp")')).toBeVisible();
  });
});
