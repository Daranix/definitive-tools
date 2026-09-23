import { test, expect } from '@playwright/test';

test.describe('Markdown to HTML Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/markdown-to-html');
  });

  test('should load editor workspace, render preview and allow styling toggle', async ({ page }) => {
    // Select first Monaco Editor to bypass strict mode violation (the page has multiple)
    await expect(page.locator('app-monaco-editor').first()).toBeVisible();

    const previewTab = page.getByTestId('md-html-preview-tab');
    const codeTab = page.getByTestId('md-html-code-tab');
    await expect(previewTab).toBeVisible();
    await expect(codeTab).toBeVisible();

    const stylesBtn = page.getByTestId('md-html-styles-btn');
    await expect(stylesBtn).toBeVisible();

    await codeTab.click();

    const copyBtn = page.getByTestId('md-html-copy-btn');
    await expect(copyBtn).toBeVisible();

    // Copy button starts enabled because welcome.md preset text is loaded initially
    await expect(copyBtn).toBeEnabled();

    // Clear content using the newly added md-html-clear-btn data-testid
    await page.getByTestId('md-html-clear-btn').click();
    await expect(copyBtn).toBeDisabled();
  });

  test('should render mermaid diagram card with SVG and action toolbar in preview', async ({ page }) => {
    await expect(page.locator('app-monaco-editor').first()).toBeVisible();

    // Click on Preview tab to make app-markdown-preview visible
    const previewTab = page.getByTestId('md-html-preview-tab');
    await previewTab.click();

    // Verify that the preview contains the rendered card container
    const previewContainer = page.locator('app-markdown-preview');
    await expect(previewContainer).toBeVisible();

    // Check for mermaid diagram card and SVG
    const card = previewContainer.locator('.mermaid-diagram-card');
    await expect(card.first()).toBeVisible({ timeout: 15000 });

    const mermaidSvg = card.locator('.mermaid-svg-viewport svg');
    await expect(mermaidSvg.first()).toBeVisible();

    // Verify diagram action buttons exist in the DOM (revealed on hover via CSS)
    await expect(card.locator('button[title="Zoom In"]').first()).toBeAttached();
    await expect(card.locator('button[title="Download SVG"]').first()).toBeAttached();
    await expect(card.locator('button[title="Download PNG"]').first()).toBeAttached();
  });

  test('should toggle between markdown editor and output on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const toOutputBtn = page.getByTestId('md-html-mobile-to-output-btn');
    await expect(toOutputBtn).toBeVisible();

    const leftEditor = page.locator('app-monaco-editor').first();
    await expect(leftEditor).toBeVisible();

    // Switch to output panel
    await toOutputBtn.click();
    await expect(leftEditor).toBeHidden();

    const toEditorBtn = page.getByTestId('md-html-mobile-to-editor-btn');
    await expect(toEditorBtn).toBeVisible();

    // Switch back to editor panel
    await toEditorBtn.click();
    await expect(leftEditor).toBeVisible();
  });
});
