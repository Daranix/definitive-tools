import { test, expect } from '@playwright/test';

test.describe('QR Code Generator Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/qr-generator');
    await page.waitForTimeout(1000);
  });

  test('should load with default Text content type and allow generation', async ({ page }) => {
    await expect(page.locator('h2').first()).toContainText('QR Code Configuration');

    const textInput = page.locator('#text-input');
    await expect(textInput).toBeVisible();
    await expect(textInput).toHaveValue('Hello World');

    await expect(page.locator('#qr-code-container')).toContainText('Your QR code will appear here');

    await page.locator('#generate-qr').click();
    await expect(page.locator('#qr-code-container img')).toBeVisible();
    await expect(page.locator('#download-container button')).toHaveCount(4);
  });

  test('should validate inputs for required fields', async ({ page }) => {
    await page.getByTestId('content-type-url').click();

    const urlInput = page.locator('#url');
    await expect(urlInput).toBeVisible();

    // Fill with an invalid value and blur to trigger dirty/touched validation state
    await urlInput.fill('invalid-url-value');
    await urlInput.blur();

    // Click generate to force form submit, change detection, and validation update
    await page.locator('#generate-qr').click();

    // Use Playwright getByText with a regex pattern, matching the actual 'Please enter a valid URL' message
    await expect(page.getByText(/Please enter a valid (URL|url)/)).toBeVisible();
    await expect(page.locator('#qr-code-container img')).not.toBeVisible();
  });

  test('should generate QR code for WiFi configuration', async ({ page }) => {
    await page.getByTestId('content-type-wifi').click();

    const ssidInput = page.locator('#wifi-ssid');
    await expect(ssidInput).toBeVisible();
    await ssidInput.fill('MyTestWiFi');

    // Select encryption WPA/WPA2 to make the password input field visible
    await page.locator('label:has-text("WPA/WPA2")').click();

    const pwdInput = page.locator('#wifi-password');
    await expect(pwdInput).toBeVisible();
    await pwdInput.fill('secretpwd123');

    await page.locator('#generate-qr').click();
    await expect(page.locator('#qr-code-container img')).toBeVisible();
  });

  test('should mock geolocation and populate location fields', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 37.7749, longitude: -122.4194 });

    await page.getByTestId('content-type-geo').click();

    const latInput = page.locator('#geo-latitude');
    const lonInput = page.locator('#geo-longitude');
    await expect(latInput).toBeVisible();
    await expect(lonInput).toBeVisible();

    await page.locator('#get-current-location').click();

    await expect(latInput).toHaveValue('37.7749');
    await expect(lonInput).toHaveValue('-122.4194');

    await page.locator('#generate-qr').click();
    await expect(page.locator('#qr-code-container img')).toBeVisible();
  });

  test('should respect styling customization in the configuration', async ({ page }) => {
    const textInput = page.locator('#text-input');
    await textInput.fill('Custom Style QR');

    // Fill both text inputs and color picker inputs to avoid dual-binding race conditions in browser
    const fgColorHex = page.locator('#fg-color-hex');
    await fgColorHex.fill('#E11D48');
    await page.locator('#fg-color').fill('#E11D48');
    await fgColorHex.blur();
    
    const bgColorHex = page.locator('#bg-color-hex');
    await bgColorHex.fill('#F0FDF4');
    await page.locator('#bg-color').fill('#F0FDF4');
    await bgColorHex.blur();

    await page.locator('label:has-text("Dots")').first().click();

    await page.locator('#generate-qr').click();

    // Timing fix: Wait for the generated QR image to be visible first, ensuring styles are updated in DOM
    await expect(page.locator('#qr-code-container img')).toBeVisible();
    await expect(page.locator('#qr-code-container')).toHaveCSS('background-color', 'rgb(240, 253, 244)');
  });
});
