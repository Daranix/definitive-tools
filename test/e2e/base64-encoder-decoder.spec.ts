import { test, expect } from '@playwright/test';

test.describe('Base64 Encoder/Decoder Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/base64-encoder-decoder');
  });

  test('should encode text to base64 and decode it back', async ({ page }) => {
    await expect(page.locator('h2').first()).toContainText('Base64 Encoder/Decoder');

    const inputArea = page.locator('#input');
    const outputArea = page.locator('#output');

    await expect(inputArea).toHaveAttribute('placeholder', 'Enter text to encode as Base64...');
    
    await inputArea.fill('Definitive Tools E2E');
    await page.locator('button:has-text("Encode to Base64")').click();

    await expect(outputArea).toHaveValue('RGVmaW5pdGl2ZSBUb29scyBFMkU=');

    await page.getByTestId('mode-decode-btn').click();
    await expect(inputArea).toHaveAttribute('placeholder', 'Enter Base64 to decode...');

    await inputArea.fill('RGVmaW5pdGl2ZSBUb29scyBFMkU=');
    await page.locator('button:has-text("Decode from Base64")').click();

    await expect(outputArea).toHaveValue('Definitive Tools E2E');
  });

  test('should swap input and output when requested', async ({ page }) => {
    const inputArea = page.locator('#input');
    const outputArea = page.locator('#output');
    const swapButton = page.getByTestId('swap-btn');

    await expect(swapButton).toBeDisabled();

    await inputArea.fill('Hello World');
    await page.locator('button:has-text("Encode to Base64")').click();
    await expect(outputArea).toHaveValue('SGVsbG8gV29ybGQ=');

    await expect(swapButton).toBeEnabled();
    await swapButton.click();

    // Swapping only swaps the input and output values; mode remains 'encode'
    await expect(inputArea).toHaveValue('SGVsbG8gV29ybGQ=');
    await expect(outputArea).toHaveValue('Hello World');
  });
});
