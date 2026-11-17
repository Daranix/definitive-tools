import Decimal from 'decimal.js';
import { round2 } from '../shared/calculator-format';

export interface MortgageInput {
  propertyPrice: number;
  downPayment: number;
  years: number;
  tinAnnual: number;
  additionalInitialFees?: number;
  annualRecurringCost?: number;
  purchaseTaxPercent?: number;
}

export interface MortgageInstallment {
  month: number;
  year: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface MortgageYearSummary {
  year: number;
  totalPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  endingBalance: number;
}

export interface MortgageSummary {
  loanAmount: number;
  ltvPercent: number;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  effectiveTae: number | null;
  estimatedPurchaseExpenses: number;
  totalCashNeeded: number;
  schedule: MortgageInstallment[];
  yearlySummary: MortgageYearSummary[];
}

export type MortgageResult =
  | { ok: true; data: MortgageSummary }
  | { ok: false; error: string };

/**
 * Solves monthly IRR using safeguarded Newton-Raphson with bisection fallback
 * for strictly decreasing NPV over positive monthly outflows.
 */
function solveEffectiveTaePercent(
  netLoan: Decimal,
  cashFlows: Decimal[],
  initialGuessMonthly: Decimal,
): number | null {
  if (netLoan.lte(0) || cashFlows.length === 0) {
    return null;
  }

  let totalOutflow = new Decimal(0);
  for (const cf of cashFlows) {
    totalOutflow = totalOutflow.plus(cf);
  }
  if (totalOutflow.lte(netLoan)) {
    return 0;
  }

  const n = cashFlows.length;
  let low = new Decimal(0);
  let high = new Decimal(1);

  const evaluateNpvAndDerivative = (rate: Decimal): { npv: Decimal; deriv: Decimal } => {
    const onePlusR = rate.plus(1);
    const invOnePlusR = new Decimal(1).div(onePlusR);
    let discount = invOnePlusR;
    let npv = netLoan.neg();
    let deriv = new Decimal(0);

    for (let k = 1; k <= n; k += 1) {
      const cf = cashFlows[k - 1];
      const term = cf.mul(discount);
      npv = npv.plus(term);
      deriv = deriv.minus(term.mul(k).mul(invOnePlusR));
      discount = discount.mul(invOnePlusR);
    }

    return { npv, deriv };
  };

  while (evaluateNpvAndDerivative(high).npv.gt(0) && high.lt(1000)) {
    low = high;
    high = high.mul(2);
  }

  let rate =
    initialGuessMonthly.gt(low) && initialGuessMonthly.lt(high)
      ? initialGuessMonthly
      : low.plus(high).div(2);

  const tolerance = new Decimal('1e-9');

  for (let iter = 0; iter < 40; iter += 1) {
    const { npv, deriv } = evaluateNpvAndDerivative(rate);

    if (npv.abs().lte(tolerance)) {
      break;
    }

    if (npv.gt(0)) {
      low = rate;
    } else {
      high = rate;
    }

    let nextRate = deriv.isZero() ? low.plus(high).div(2) : rate.minus(npv.div(deriv));
    if (nextRate.lte(low) || nextRate.gte(high)) {
      nextRate = low.plus(high).div(2);
    }

    if (nextRate.minus(rate).abs().lte(new Decimal('1e-12'))) {
      rate = nextRate;
      break;
    }
    rate = nextRate;
  }

  const tae = rate.plus(1).pow(12).minus(1).mul(100);
  return tae.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Calculates French-system mortgage amortization, TAE via IRR, and upfront cash requirements.
 */
export function calculateMortgage(input: MortgageInput): MortgageResult {
  const {
    propertyPrice,
    downPayment,
    years,
    tinAnnual,
    additionalInitialFees = 0,
    annualRecurringCost = 0,
    purchaseTaxPercent = 0,
  } = input;

  if (!Number.isFinite(propertyPrice) || propertyPrice <= 0) {
    return { ok: false, error: 'El precio de la vivienda debe ser mayor que cero.' };
  }
  if (!Number.isFinite(downPayment) || downPayment < 0 || downPayment >= propertyPrice) {
    return {
      ok: false,
      error: 'La entrada aportada debe ser mayor o igual a 0 y menor que el precio de la vivienda.',
    };
  }
  const intYears = Math.trunc(years);
  if (!Number.isFinite(years) || intYears < 1 || intYears > 40) {
    return { ok: false, error: 'El plazo de la hipoteca debe situarse entre 1 y 40 años.' };
  }
  if (!Number.isFinite(tinAnnual) || tinAnnual < 0 || tinAnnual > 30) {
    return { ok: false, error: 'El TIN anual debe estar comprendido entre 0 % y 30 %.' };
  }
  if (
    !Number.isFinite(additionalInitialFees) ||
    additionalInitialFees < 0 ||
    !Number.isFinite(annualRecurringCost) ||
    annualRecurringCost < 0 ||
    !Number.isFinite(purchaseTaxPercent) ||
    purchaseTaxPercent < 0
  ) {
    return { ok: false, error: 'Los gastos e impuestos adicionales no pueden ser negativos.' };
  }

  const priceDec = new Decimal(propertyPrice);
  const downDec = new Decimal(downPayment);
  const loanDec = priceDec.minus(downDec);
  const ltvPercent = loanDec.div(priceDec).mul(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

  const totalMonths = intYears * 12;
  const monthlyRate = new Decimal(tinAnnual).div(100).div(12);

  let rawMonthlyPayment: Decimal;
  if (monthlyRate.isZero()) {
    rawMonthlyPayment = loanDec.div(totalMonths);
  } else {
    const onePlusRPowN = monthlyRate.plus(1).pow(totalMonths);
    rawMonthlyPayment = loanDec.mul(monthlyRate).mul(onePlusRPowN).div(onePlusRPowN.minus(1));
  }

  const baseMonthlyPayment = round2(rawMonthlyPayment);
  const monthlyRecurring = new Decimal(annualRecurringCost).div(12);

  const schedule: MortgageInstallment[] = [];
  const yearlySummary: MortgageYearSummary[] = [];
  const taeCashFlows: Decimal[] = [];

  let balance = loanDec;
  let totalPaidDec = new Decimal(0);
  let totalInterestDec = new Decimal(0);

  let currentYear = 1;
  let yearPayment = new Decimal(0);
  let yearPrincipal = new Decimal(0);
  let yearInterest = new Decimal(0);

  for (let month = 1; month <= totalMonths; month += 1) {
    const year = Math.ceil(month / 12);
    const interest = round2(balance.mul(monthlyRate));
    let principal =
      month === totalMonths ? round2(balance) : round2(baseMonthlyPayment.minus(interest));

    if (principal.gt(balance)) {
      principal = round2(balance);
    }

    const payment = principal.plus(interest);
    balance = balance.minus(principal);
    if (balance.lt(0)) {
      balance = new Decimal(0);
    }

    const roundedBalance = round2(balance);

    schedule.push({
      month,
      year,
      payment: payment.toNumber(),
      principal: principal.toNumber(),
      interest: interest.toNumber(),
      remainingBalance: roundedBalance.toNumber(),
    });

    taeCashFlows.push(payment.plus(monthlyRecurring));
    totalPaidDec = totalPaidDec.plus(payment);
    totalInterestDec = totalInterestDec.plus(interest);

    yearPayment = yearPayment.plus(payment);
    yearPrincipal = yearPrincipal.plus(principal);
    yearInterest = yearInterest.plus(interest);

    const isYearEnd = month % 12 === 0 || month === totalMonths;
    if (isYearEnd) {
      yearlySummary.push({
        year: currentYear,
        totalPayment: round2(yearPayment).toNumber(),
        totalPrincipal: round2(yearPrincipal).toNumber(),
        totalInterest: round2(yearInterest).toNumber(),
        endingBalance: roundedBalance.toNumber(),
      });
      currentYear += 1;
      yearPayment = new Decimal(0);
      yearPrincipal = new Decimal(0);
      yearInterest = new Decimal(0);
    }
  }

  const feesDec = new Decimal(additionalInitialFees);
  const netLoan = loanDec.minus(feesDec);
  const effectiveTae = solveEffectiveTaePercent(netLoan, taeCashFlows, monthlyRate);

  const estimatedPurchaseExpenses = round2(priceDec.mul(purchaseTaxPercent).div(100));
  const totalCashNeeded = round2(downDec.plus(estimatedPurchaseExpenses).plus(feesDec));

  return {
    ok: true,
    data: {
      loanAmount: round2(loanDec).toNumber(),
      ltvPercent,
      monthlyPayment: baseMonthlyPayment.toNumber(),
      totalPaid: round2(totalPaidDec).toNumber(),
      totalInterest: round2(totalInterestDec).toNumber(),
      effectiveTae,
      estimatedPurchaseExpenses: estimatedPurchaseExpenses.toNumber(),
      totalCashNeeded: totalCashNeeded.toNumber(),
      schedule,
      yearlySummary,
    },
  };
}
