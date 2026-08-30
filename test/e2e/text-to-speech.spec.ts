import { test, expect } from '@playwright/test';

test.describe('Text to Speech (TTS) Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/text-to-speech');
  });

  test('should load and show correct title and layout', async ({ page }) => {
    await expect(page.getByTestId('tool-title')).toContainText('Text to Speech');
    await expect(page.getByTestId('text-input-textarea')).toBeVisible();
    await expect(page.getByTestId('voice-select')).toBeVisible();
    await expect(page.getByTestId('generate-speech-btn')).toBeVisible();
  });

  test('should load voices and transition to generating/downloading state on click', async ({ page }) => {
    const dropdown = page.getByTestId('voice-select');
    await expect(dropdown).toBeVisible();

    // Wait until the worker returns the list of voices, populates the options, and Angular binds the value
    await page.waitForFunction(() => {
      const select = document.querySelector('[data-testid="voice-select"]') as HTMLSelectElement;
      return select && select.options.length > 1 && select.value !== '' && !select.options[0].text.includes('Loading');
    });

    // Click generate speech button
    await page.getByTestId('generate-speech-btn').click();

    // Verify it transitions to either downloading the model or generating speech state
    const progress = page.getByTestId('download-progress-container');
    const generating = page.getByTestId('generating-status');
    
    // At least one of these states should become visible
    await expect(progress.or(generating).first()).toBeVisible({ timeout: 10000 });
  });
});
