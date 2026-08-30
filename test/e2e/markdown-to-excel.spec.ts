import { test, expect } from '@playwright/test';

test.describe('Markdown to Excel Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tool/markdown-to-excel');
  });

  test('should load with empty state and render table on valid input', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Markdown to Excel');

    const inputArea = page.getByTestId('md-excel-textarea');
    await expect(inputArea).toBeVisible();
    await expect(page.getByTestId('excel-table-empty')).toBeVisible();
    await expect(page.getByTestId('excel-table')).not.toBeVisible();

    const tableMD = `
| Header 1 | Header 2 |
|----------|----------|
| Val A    | Val B    |
| Val C    | Val D    |
`;
    await inputArea.fill(tableMD);

    await expect(page.getByTestId('excel-table-empty')).not.toBeVisible();
    await expect(page.getByTestId('excel-table')).toBeVisible();

    // Excel column letters are on row index 0. Actual parsed markdown headers are on row index 1.
    // The columns under thead (row 1) start with th index 0 being Header 1, and th index 1 being Header 2.
    const headerRow = page.locator('[data-testid="excel-table"] thead tr').nth(1);
    await expect(headerRow.locator('th').nth(0)).toContainText('Header 1');
    await expect(headerRow.locator('th').nth(1)).toContainText('Header 2');

    await expect(page.locator('[data-testid="excel-table"]')).toContainText('Val A');
    await expect(page.locator('[data-testid="excel-table"]')).toContainText('Val B');
  });
});
