import { test, expect } from '@playwright/test';

test.describe('Image Base64 Converter Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/image-base64-converter');
  });

  test('should load and show correct title and layout', async ({ page }) => {
    await expect(page.getByTestId('tool-title')).toContainText('Image Base64 Converter');
    await expect(page.getByTestId('toggle-encode-btn')).toBeVisible();
    await expect(page.getByTestId('toggle-decode-btn')).toBeVisible();
  });

  test('should decode valid base64 string and display preview and metadata', async ({ page }) => {
    // Switch to decode mode
    await page.getByTestId('toggle-decode-btn').click();

    const textarea = page.getByTestId('base64-textarea');
    await expect(textarea).toBeVisible();

    // 1x1 transparent PNG pixel base64
    const validBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await textarea.fill(validBase64);

    // Decode
    await page.getByTestId('decode-btn').click();

    // Verify preview image is visible
    await expect(page.getByTestId('decoded-image-preview')).toBeVisible();

    // Verify metadata
    await expect(page.getByTestId('metadata-panel')).toBeVisible();
    await expect(page.getByTestId('inferred-format')).toContainText('png');
    await expect(page.getByTestId('mime-type')).toContainText('image/png');
    await expect(page.getByTestId('image-dimensions')).toContainText('1 × 1 px');
  });

  test('should show error alert when decoding invalid base64 data', async ({ page }) => {
    // Switch to decode mode
    await page.getByTestId('toggle-decode-btn').click();

    const textarea = page.getByTestId('base64-textarea');
    await textarea.fill('invalid-base64-string-that-fails-decoding');

    // Decode
    await page.getByTestId('decode-btn').click();

    // Check error alert
    await expect(page.getByTestId('decode-error')).toBeVisible();
    await expect(page.getByTestId('decode-error')).toContainText('Decoding Failed');
  });
});
