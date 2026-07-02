import { test, expect } from '@playwright/test';

test.describe('JWT Decoder / Encoder & Validator Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/jwt-decode-encode');
    await page.waitForTimeout(1000);
  });

  test('should decode valid JWT and show header and payload', async ({ page }) => {
    await page.getByTestId('generate-example-btn').click();

    await expect(page.getByTestId('jwt-status-box')).toContainText('Valid JWT');
    await expect(page.getByTestId('decoded-header-output')).toContainText('"alg": "HS256"');
    
    // Assert on correct properties present in the default example payload
    await expect(page.getByTestId('decoded-payload-output')).toContainText('"name": "John Doe"');
    await expect(page.getByTestId('decoded-payload-output')).toContainText('"admin": true');
  });

  test('should show error for invalid JWT', async ({ page }) => {
    const inputArea = page.getByTestId('jwt-input-textarea');
    await inputArea.fill('completely-invalid-garbage-token');
    await inputArea.blur();

    const statusBox = page.getByTestId('jwt-status-box');
    await expect(statusBox).toBeVisible();
    await expect(statusBox).toContainText('Invalid JWT format');
  });


  test('should encode header and payload to JWT', async ({ page }) => {
    // Click the mode selection button using the newly added test id
    await page.getByTestId('select-btn-encode').click();
    
    // Wait for the new view/textarea to render and settle before clicking generate
    await expect(page.getByTestId('encoder-header-textarea')).toBeVisible();
    await page.getByTestId('encoder-generate-example-btn').click();

    // Use toHaveValue for textarea input elements
    await expect(page.getByTestId('encoder-header-textarea')).toHaveValue(/"alg": "HS256"/);
    
    // Assert on correct example payload properties from generateExample()
    await expect(page.getByTestId('encoder-payload-textarea')).toHaveValue(/"name": "John Doe"/);

    await expect(page.getByTestId('encoder-jwt-output')).toBeVisible();
    const tokenText = await page.getByTestId('encoder-jwt-output').innerText();
    expect(tokenText.split('.').length).toBe(3);
  });
});
