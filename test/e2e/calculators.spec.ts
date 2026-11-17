import { Page, test, expect } from '@playwright/test';

async function gotoTool(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
}

test.describe('Calculadora Section & Tools', () => {
  test('filters home dashboard by Calculadora category showing 5 tools', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByTestId('category-filter-Calculators').click();

    const toolCards = page.locator('[data-testid^="tool-card-"]');
    await expect(toolCards).toHaveCount(5);

    await expect(page.getByTestId('tool-card-regla-de-tres')).toBeVisible();
    await expect(page.getByTestId('tool-card-salario-neto-espana')).toBeVisible();
    await expect(page.getByTestId('tool-card-indemnizacion-despido-espana')).toBeVisible();
    await expect(page.getByTestId('tool-card-calculadora-hipoteca')).toBeVisible();
    await expect(page.getByTestId('tool-card-calculadora-cientifica')).toBeVisible();
  });

  test('Regla de 3 computes simple direct, simple inverse, and compound rules', async ({
    page,
  }) => {
    await gotoTool(page, '/tool/regla-de-tres');
    await expect(page.locator('h1').first()).toContainText('Rule of Three');

    await page.getByTestId('rot-input-a').fill('4');
    await page.getByTestId('rot-input-b').fill('12');
    await page.getByTestId('rot-input-c').fill('10');
    await expect(page.getByTestId('rot-result-value')).toHaveText('30');

    await page.getByTestId('tab-simple-inverse').click();
    await page.getByTestId('rot-input-a').fill('6');
    await page.getByTestId('rot-input-b').fill('8');
    await page.getByTestId('rot-input-c').fill('12');
    await expect(page.getByTestId('rot-result-value')).toHaveText('4');

    await page.getByTestId('tab-compound').click();
    await expect(page.getByTestId('rot-result-value')).toHaveText('16');
  });

  test('Net Salary Spain 2026 updates net monthly across extraPayments (0, 2, 3)', async ({
    page,
  }) => {
    await gotoTool(page, '/tool/salario-neto-espana');
    await expect(page.locator('h1').first()).toContainText('Net Salary Spain');

    await page.getByTestId('salary-gross-input').fill('40000');
    const extraInput = page.getByTestId('salary-extra-payments-input');

    await extraInput.fill('0');
    await expect(page.getByTestId('salary-net-annual')).toContainText('€');
    const net0 = await page.getByTestId('salary-net-monthly').innerText();

    await extraInput.fill('2');
    const net2 = await page.getByTestId('salary-net-monthly').innerText();
    expect(net2).not.toBe(net0);

    await extraInput.fill('3');
    const net3 = await page.getByTestId('salary-net-monthly').innerText();
    expect(net3).not.toBe(net2);
  });

  test('Severance Pay Spain computes pre/post-2012, monthly extraPayments, and disciplinary zero', async ({
    page,
  }) => {
    await gotoTool(page, '/tool/indemnizacion-despido-espana');
    await expect(page.locator('h1').first()).toContainText('Severance Pay Spain');

    await page.getByTestId('sev-start-date').fill('2010-02-12');
    await page.getByTestId('sev-end-date').fill('2014-02-11');
    await page.getByTestId('sev-salary-amount').fill('36500');

    await expect(page.getByTestId('sev-reform-breakdown')).toBeVisible();
    await expect(page.getByTestId('sev-total-days')).toContainText('156');
    // English locale formatting for EUR.
    await expect(page.getByTestId('sev-total-amount')).toContainText('15,600.00');

    await page.getByTestId('sev-salary-mode-monthly').click();
    await expect(page.getByTestId('sev-salary-amount')).toHaveValue('3041.67');
    await page.getByTestId('sev-salary-amount').fill('2000');
    await page.getByTestId('sev-extra-payments-input').fill('3');
    await expect(page.getByTestId('sev-total-amount')).toContainText('12,821.92');

    await page.getByTestId('sev-dismissal-select').selectOption('disciplinary');
    await expect(page.getByTestId('sev-total-days')).toContainText('0');
    await expect(page.getByTestId('sev-total-amount')).toContainText('0.00');
  });

  test('Mortgage Calculator updates monthly payment, TAE, and schedule view', async ({
    page,
  }) => {
    await gotoTool(page, '/tool/calculadora-hipoteca');
    await expect(page.locator('h1').first()).toContainText('Mortgage Calculator');

    await page.getByTestId('mortgage-price-input').fill('250000');
    await page.getByTestId('mortgage-down-pct-input').fill('20');
    await page.getByTestId('mortgage-years-input').fill('30');
    await page.getByTestId('mortgage-tin-input').fill('3');

    await expect(page.getByTestId('mortgage-loan-amount')).toContainText('200,000.00');
    await expect(page.getByTestId('mortgage-monthly-payment')).toContainText('843.21');
    await expect(page.getByTestId('mortgage-tae')).toContainText('%');

    await page.getByTestId('mortgage-view-monthly').click();
    await expect(page.locator('tbody tr')).toHaveCount(360);
  });

  test('Scientific Calculator evaluates arbitrary-precision expressions and history', async ({
    page,
  }) => {
    await gotoTool(page, '/tool/calculadora-cientifica');
    await expect(page.locator('h1').first()).toContainText('Scientific Calculator');

    const exprInput = page.getByTestId('sci-expression-input');
    await exprInput.fill('0.1 + 0.2');
    await page.getByTestId('sci-equals-btn').click();
    await expect(page.getByTestId('sci-display-result')).toHaveText('0.3');
    await expect(page.getByTestId('sci-history-list').locator('li')).toHaveCount(1);

    await page.getByTestId('sci-angle-DEG').click();
    await exprInput.fill('sin(30)');
    await page.getByTestId('sci-equals-btn').click();
    await expect(page.getByTestId('sci-display-result')).toHaveText('0.5');

    await expect(page.getByTestId('sci-history-list').locator('li')).toHaveCount(2);
  });
});

test.describe('Calculadora tools in Spanish', () => {
  test('renders the Spanish calculator copy under /es', async ({ page }) => {
    await page.goto('/es/tool/regla-de-tres', { waitUntil: 'networkidle' });

    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('h1').first()).toContainText('Regla de 3');

    await page.getByTestId('rot-input-a').fill('4');
    await page.getByTestId('rot-input-b').fill('12');
    await page.getByTestId('rot-input-c').fill('10');
    // Spanish locale formatting.
    await expect(page.getByTestId('rot-result-value')).toHaveText('30');
  });

  test('formats Spanish currency with the Spanish locale', async ({ page }) => {
    await page.goto('/es/tool/calculadora-hipoteca', { waitUntil: 'networkidle' });

    await page.getByTestId('mortgage-price-input').fill('250000');
    await page.getByTestId('mortgage-down-pct-input').fill('20');
    await page.getByTestId('mortgage-years-input').fill('30');
    await page.getByTestId('mortgage-tin-input').fill('3');

    await expect(page.getByTestId('mortgage-loan-amount')).toContainText('200.000,00');
    await expect(page.getByTestId('mortgage-monthly-payment')).toContainText('843,21');
  });
});
