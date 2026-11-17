import Decimal from 'decimal.js';
import {
  computeTotalPayments,
  round2,
  type CalculatorTranslate,
} from '../shared/calculator-format';

export type AgeBracket = 'under65' | '65to74' | '75plus';
export type FamilySituation = 'single' | 'married_low_income' | 'other';
export type ContractType = 'indefinite' | 'temporary';
export type RegionCode =
  | 'general'
  | 'madrid'
  | 'cataluna'
  | 'andalucia'
  | 'valencia'
  | 'galicia';
export type DisabilityLevel = 'none' | '33to64' | '65plus';

export interface SpainNetSalaryInput {
  grossAnnual: number;
  extraPayments: number;
  ageBracket: AgeBracket;
  familySituation: FamilySituation;
  contractType: ContractType;
  region: RegionCode;
  childrenTotal: number;
  childrenUnder3: number;
  sharedCustody: boolean;
  disability: DisabilityLevel;
  geographicMobility: boolean;
}

export interface SocialSecurityBreakdown {
  contributionBase: number;
  commonContingencies: number;
  unemployment: number;
  training: number;
  mei: number;
  solidarity: number;
}

export interface SpainNetSalarySummary {
  grossAnnual: number;
  totalPayments: number;
  netAnnual: number;
  netMonthly: number;
  extraPayment: number;
  irpfAnnual: number;
  irpfMonthly: number;
  effectiveIrpfPercent: number;
  ssAnnual: number;
  ssMonthly: number;
  solidarityAnnual: number;
  ssBreakdown: SocialSecurityBreakdown;
  deductibleExpenses: number;
  art20Reduction: number;
  familyReduction: number;
  taxableBase: number;
  personalMinimum: number;
  netPercent: number;
  irpfPercentOfGross: number;
  ssPercentOfGross: number;
}

export type SpainNetSalaryResult =
  | { ok: true; data: SpainNetSalarySummary }
  | { ok: false; error: string };

/**
 * Presentation options: the UI passes the active translator so validation
 * messages follow the current language. Pure logic callers may omit it.
 */
export interface SpainNetSalaryOptions {
  translate?: CalculatorTranslate;
}

interface TaxBracket {
  limit: number | null;
  rate: number;
}

const SS_MAX_BASE_ANNUAL = new Decimal('5101.20').mul(12); // 61214.40 EUR
const SOLIDARITY_BAND1_LIMIT = new Decimal('67335.84'); // +10%
const SOLIDARITY_BAND2_LIMIT = new Decimal('91821.60'); // +50%

const REGIONAL_BRACKETS: Record<RegionCode, readonly TaxBracket[]> = {
  general: [
    { limit: 12450, rate: 0.19 },
    { limit: 20200, rate: 0.24 },
    { limit: 35200, rate: 0.30 },
    { limit: 60000, rate: 0.37 },
    { limit: 300000, rate: 0.45 },
    { limit: null, rate: 0.47 },
  ],
  madrid: [
    { limit: 13362, rate: 0.18 },
    { limit: 19004, rate: 0.227 },
    { limit: 35425, rate: 0.278 },
    { limit: 57320, rate: 0.359 },
    { limit: 300000, rate: 0.43 },
    { limit: null, rate: 0.45 },
  ],
  cataluna: [
    { limit: 12450, rate: 0.20 },
    { limit: 17707, rate: 0.24 },
    { limit: 21000, rate: 0.26 },
    { limit: 33007, rate: 0.30 },
    { limit: 53407, rate: 0.373 },
    { limit: 90000, rate: 0.44 },
    { limit: 120000, rate: 0.465 },
    { limit: 175000, rate: 0.48 },
    { limit: null, rate: 0.50 },
  ],
  andalucia: [
    { limit: 13000, rate: 0.19 },
    { limit: 21100, rate: 0.24 },
    { limit: 35200, rate: 0.30 },
    { limit: 60000, rate: 0.37 },
    { limit: 300000, rate: 0.45 },
    { limit: null, rate: 0.47 },
  ],
  valencia: [
    { limit: 12000, rate: 0.185 },
    { limit: 22000, rate: 0.24 },
    { limit: 32000, rate: 0.295 },
    { limit: 42000, rate: 0.36 },
    { limit: 52000, rate: 0.405 },
    { limit: 65000, rate: 0.445 },
    { limit: 80000, rate: 0.475 },
    { limit: 120000, rate: 0.495 },
    { limit: null, rate: 0.54 },
  ],
  galicia: [
    { limit: 12450, rate: 0.185 },
    { limit: 20200, rate: 0.237 },
    { limit: 35200, rate: 0.299 },
    { limit: 60000, rate: 0.369 },
    { limit: 300000, rate: 0.45 },
    { limit: null, rate: 0.47 },
  ],
};

function calculateSolidarityFee(gross: Decimal): Decimal {
  if (gross.lte(SS_MAX_BASE_ANNUAL)) {
    return new Decimal(0);
  }

  let total = new Decimal(0);

  const band1Top = Decimal.min(gross, SOLIDARITY_BAND1_LIMIT);
  if (band1Top.gt(SS_MAX_BASE_ANNUAL)) {
    total = total.plus(band1Top.minus(SS_MAX_BASE_ANNUAL).mul('0.0019'));
  }

  if (gross.gt(SOLIDARITY_BAND1_LIMIT)) {
    const band2Top = Decimal.min(gross, SOLIDARITY_BAND2_LIMIT);
    total = total.plus(band2Top.minus(SOLIDARITY_BAND1_LIMIT).mul('0.0021'));
  }

  if (gross.gt(SOLIDARITY_BAND2_LIMIT)) {
    total = total.plus(gross.minus(SOLIDARITY_BAND2_LIMIT).mul('0.0024'));
  }

  return round2(total);
}

function calculateArt20Reduction(rntAfterExpenses: Decimal): Decimal {
  const threshold1 = new Decimal(14852);
  const threshold2 = new Decimal('17673.52');
  const threshold3 = new Decimal('19747.50');

  if (rntAfterExpenses.lte(0)) {
    return new Decimal(0);
  }
  let rawReduction: Decimal;
  if (rntAfterExpenses.lte(threshold1)) {
    rawReduction = new Decimal(7302);
  } else if (rntAfterExpenses.lte(threshold2)) {
    rawReduction = new Decimal(7302).minus(rntAfterExpenses.minus(threshold1).mul('1.75'));
  } else if (rntAfterExpenses.lte(threshold3)) {
    rawReduction = Decimal.max(
      0,
      new Decimal('2364.34').minus(rntAfterExpenses.minus(threshold2).mul('1.14')),
    );
  } else {
    rawReduction = new Decimal(0);
  }

  return Decimal.min(rawReduction, rntAfterExpenses);
}

function calculatePersonalAndFamilyMinimum(
  ageBracket: AgeBracket,
  clampedChildren: number,
  clampedUnder3: number,
  sharedCustody: boolean,
  disability: DisabilityLevel,
): Decimal {
  let minimum = new Decimal(5550);
  if (ageBracket === '65to74') {
    minimum = minimum.plus(1150);
  } else if (ageBracket === '75plus') {
    minimum = minimum.plus(2550);
  }

  const perChildAmounts = [2400, 2700, 4000];
  let childrenMinimum = new Decimal(0);
  for (let i = 0; i < clampedChildren; i += 1) {
    childrenMinimum = childrenMinimum.plus(i < 3 ? perChildAmounts[i] : 4500);
  }
  childrenMinimum = childrenMinimum.plus(new Decimal(clampedUnder3).mul(2800));

  if (sharedCustody) {
    childrenMinimum = childrenMinimum.mul('0.5');
  }

  minimum = minimum.plus(childrenMinimum);

  if (disability === '33to64') {
    minimum = minimum.plus(3000);
  } else if (disability === '65plus') {
    minimum = minimum.plus(12000);
  }

  return minimum;
}

function applyTaxScale(amount: Decimal, brackets: readonly TaxBracket[]): Decimal {
  if (amount.lte(0)) {
    return new Decimal(0);
  }

  let tax = new Decimal(0);
  let previousLimit = new Decimal(0);

  for (const bracket of brackets) {
    if (amount.lte(previousLimit)) {
      break;
    }

    const upper = bracket.limit === null ? amount : Decimal.min(amount, bracket.limit);
    const slice = upper.minus(previousLimit);
    if (slice.gt(0)) {
      tax = tax.plus(slice.mul(bracket.rate));
    }

    if (bracket.limit === null) {
      break;
    }
    previousLimit = new Decimal(bracket.limit);
  }

  return tax;
}

/**
 * Estimates Spain 2026 net salary, Social Security (including 2026 solidarity quota), and IRPF.
 */
export function calculateSpainNetSalary(
  input: SpainNetSalaryInput,
  options: SpainNetSalaryOptions = {},
): SpainNetSalaryResult {
  const t: CalculatorTranslate = options.translate ?? ((key) => key);
  const {
    grossAnnual,
    extraPayments,
    ageBracket,
    familySituation,
    contractType,
    region,
    childrenTotal,
    childrenUnder3,
    sharedCustody,
    disability,
    geographicMobility,
  } = input;

  if (!Number.isFinite(grossAnnual) || grossAnnual < 0) {
    return {
      ok: false,
      error: t('calculators.netSalary.errors.grossNegative'),
    };
  }

  if (
    !Number.isFinite(extraPayments) ||
    !Number.isInteger(extraPayments) ||
    extraPayments < 0 ||
    extraPayments > 12
  ) {
    return {
      ok: false,
      error: t('calculators.netSalary.errors.extraPaymentsRange'),
    };
  }

  const totalPayments = computeTotalPayments(extraPayments);

  if (!Number.isFinite(childrenTotal) || !Number.isFinite(childrenUnder3)) {
    return {
      ok: false,
      error: t('calculators.netSalary.errors.childrenInvalid'),
    };
  }

  const clampedChildren = Math.max(0, Math.min(10, Math.trunc(childrenTotal)));
  const clampedUnder3 = Math.max(0, Math.min(clampedChildren, Math.trunc(childrenUnder3)));

  const gross = new Decimal(grossAnnual);

  // 1. Social Security 2026
  const contributionBase = Decimal.min(gross, SS_MAX_BASE_ANNUAL);
  const commonContingencies = round2(contributionBase.mul('0.047'));
  const unemploymentRate = contractType === 'indefinite' ? '0.0155' : '0.016';
  const unemployment = round2(contributionBase.mul(unemploymentRate));
  const training = round2(contributionBase.mul('0.001'));
  const mei = round2(contributionBase.mul('0.0015'));
  const solidarity = calculateSolidarityFee(gross);

  const ssAnnual = round2(
    commonContingencies.plus(unemployment).plus(training).plus(mei).plus(solidarity),
  );

  // 2. IRPF 2026
  const rntPreExpenses = Decimal.max(0, gross.minus(ssAnnual));

  let rawDeductible = new Decimal(2000);
  if (geographicMobility) {
    rawDeductible = rawDeductible.plus(2000);
  }
  if (disability === '33to64') {
    rawDeductible = rawDeductible.plus(3500);
  } else if (disability === '65plus') {
    rawDeductible = rawDeductible.plus(7750);
  }

  const deductibleExpenses = Decimal.min(rawDeductible, rntPreExpenses);
  const rntAfterExpenses = Decimal.max(0, rntPreExpenses.minus(deductibleExpenses));
  const art20Reduction = round2(calculateArt20Reduction(rntAfterExpenses));

  let rawFamilyReduction = new Decimal(0);
  if (familySituation === 'married_low_income') {
    rawFamilyReduction = new Decimal(3400);
  } else if (familySituation === 'single' && clampedChildren > 0) {
    rawFamilyReduction = new Decimal(2150);
  }

  const preFamilyTaxable = Decimal.max(0, rntAfterExpenses.minus(art20Reduction));
  const familyReduction = Decimal.min(rawFamilyReduction, preFamilyTaxable);
  const taxableBase = round2(Decimal.max(0, preFamilyTaxable.minus(familyReduction)));

  const personalMinimum = calculatePersonalAndFamilyMinimum(
    ageBracket,
    clampedChildren,
    clampedUnder3,
    sharedCustody,
    disability,
  );

  const brackets = REGIONAL_BRACKETS[region] ?? REGIONAL_BRACKETS.general;
  const grossTax = applyTaxScale(taxableBase, brackets);
  const minimumTax = applyTaxScale(personalMinimum, brackets);
  const irpfAnnual = round2(Decimal.max(0, grossTax.minus(minimumTax)));

  const netAnnual = round2(Decimal.max(0, gross.minus(ssAnnual).minus(irpfAnnual)));
  const netMonthly = round2(netAnnual.div(totalPayments));
  const extraPayment = extraPayments > 0 ? netMonthly.toNumber() : 0;
  const irpfMonthly = round2(irpfAnnual.div(totalPayments));
  const ssMonthly = round2(ssAnnual.div(totalPayments));

  const effectiveIrpfPercent = gross.gt(0)
    ? irpfAnnual.div(gross).mul(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
    : 0;
  const ssPercentOfGross = gross.gt(0)
    ? ssAnnual.div(gross).mul(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
    : 0;
  const netPercent = gross.gt(0)
    ? netAnnual.div(gross).mul(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
    : 0;

  return {
    ok: true,
    data: {
      grossAnnual: round2(gross).toNumber(),
      totalPayments,
      netAnnual: netAnnual.toNumber(),
      netMonthly: netMonthly.toNumber(),
      extraPayment,
      irpfAnnual: irpfAnnual.toNumber(),
      irpfMonthly: irpfMonthly.toNumber(),
      effectiveIrpfPercent,
      ssAnnual: ssAnnual.toNumber(),
      ssMonthly: ssMonthly.toNumber(),
      solidarityAnnual: solidarity.toNumber(),
      ssBreakdown: {
        contributionBase: round2(contributionBase).toNumber(),
        commonContingencies: commonContingencies.toNumber(),
        unemployment: unemployment.toNumber(),
        training: training.toNumber(),
        mei: mei.toNumber(),
        solidarity: solidarity.toNumber(),
      },
      deductibleExpenses: round2(deductibleExpenses).toNumber(),
      art20Reduction: art20Reduction.toNumber(),
      familyReduction: round2(familyReduction).toNumber(),
      taxableBase: taxableBase.toNumber(),
      personalMinimum: round2(personalMinimum).toNumber(),
      netPercent,
      irpfPercentOfGross: effectiveIrpfPercent,
      ssPercentOfGross,
    },
  };
}
