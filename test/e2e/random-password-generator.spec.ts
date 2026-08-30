import { test, expect } from '@playwright/test';

test.describe('Random Password Generator Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/random-password-generator');
  });

  test('should generate password when clicking buttons', async ({ page }) => {
    await expect(page.locator('h2').first()).toContainText('Generate Secure Passwords');

    const pwdOutput = page.getByTestId('password-output');
    // Initially, it should show default placeholder
    await expect(pwdOutput).toHaveText('Your password will appear here');

    // Click generate top button
    await page.getByTestId('generate-top-btn').click();
    
    // Asynchronously expect the text to update to ensure change detection runs
    await expect(pwdOutput).not.toHaveText('Your password will appear here');
    
    const nextText = await pwdOutput.innerText();
    expect(nextText.length).toBeGreaterThan(0);

    // Wait a brief moment to ensure separate tick
    await page.waitForTimeout(100);

    // Click big generate button
    await page.getByTestId('generate-btn').click();
    
    // Expect output to eventually change using auto-retry matcher
    await expect(pwdOutput).not.toHaveText(nextText);
  });

  test('should respect password criteria checks', async ({ page }) => {
    const uppercaseCheckbox = page.getByTestId('uppercase-checkbox');
    const lowercaseCheckbox = page.getByTestId('lowercase-checkbox');
    const numbersCheckbox = page.getByTestId('numbers-checkbox');
    const symbolsCheckbox = page.getByTestId('symbols-checkbox');

    // Deselect numbers and symbols
    await numbersCheckbox.uncheck();
    await symbolsCheckbox.uncheck();

    // Generate password
    await page.getByTestId('generate-btn').click();

    const pwdText = await page.getByTestId('password-output').innerText();
    expect(pwdText).not.toMatch(/[0-9]/);
    expect(pwdText).not.toMatch(/[!@#$%&]/);
  });
});
