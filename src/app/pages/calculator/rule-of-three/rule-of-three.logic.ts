import Decimal from 'decimal.js';
import {
  formatNumber,
  type CalculatorTranslate,
} from '../shared/calculator-format';

export type RuleOfThreeMode = 'simple-direct' | 'simple-inverse' | 'compound';
export type RelationType = 'direct' | 'inverse';

export interface SimpleRuleInput {
  mode: 'simple-direct' | 'simple-inverse';
  a: number | null;
  b: number | null;
  c: number | null;
  decimals?: number;
}

export interface CompoundCondition {
  id: string;
  label: string;
  knownValue: number | null;
  targetValue: number | null;
  relation: RelationType;
}

export interface CompoundRuleInput {
  targetLabel: string;
  baseKnownValue: number | null;
  conditions: CompoundCondition[];
  decimals?: number;
}

export interface CompoundFactorDetail {
  label: string;
  relation: RelationType;
  factor: Decimal;
  expression: string;
}

export interface RuleOfThreeSuccess {
  ok: true;
  value: Decimal;
  formattedValue: string;
  formulaText: string;
  steps: string[];
  factors?: CompoundFactorDetail[];
}

export interface RuleOfThreeError {
  ok: false;
  error: string;
}

export type RuleOfThreeResult = RuleOfThreeSuccess | RuleOfThreeError;

/**
 * Presentation options: the UI passes the active locale and translator so the
 * produced messages follow the current language. Pure logic callers may omit
 * them and get the untranslated message keys plus the Spanish number format.
 */
export interface RuleOfThreeOptions {
  locale?: string;
  translate?: CalculatorTranslate;
}

function isValidFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Computes a simple direct or simple inverse rule of three using Decimal precision.
 */
export function calculateSimpleRuleOfThree(
  input: SimpleRuleInput,
  options: RuleOfThreeOptions = {},
): RuleOfThreeResult {
  const { mode, a, b, c, decimals = 4 } = input;
  const locale = options.locale;
  const t: CalculatorTranslate = options.translate ?? ((key) => key);

  if (!isValidFiniteNumber(a) || !isValidFiniteNumber(b) || !isValidFiniteNumber(c)) {
    return {
      ok: false,
      error: t('calculators.ruleOfThree.errors.missingValues'),
    };
  }

  const decA = new Decimal(a);
  const decB = new Decimal(b);
  const decC = new Decimal(c);
  const isDirect = mode === 'simple-direct';

  const factorLeft = isDirect ? decB : decA;
  const factorRight = isDirect ? decC : decB;
  const denominator = isDirect ? decA : decC;

  if (denominator.isZero()) {
    return {
      ok: false,
      error: isDirect
        ? t('calculators.ruleOfThree.errors.directZero')
        : t('calculators.ruleOfThree.errors.inverseZero'),
    };
  }

  const numerator = factorLeft.mul(factorRight);
  const result = numerator.div(denominator);
  const formatted = formatNumber(result, decimals, locale);

  const fmtA = formatNumber(decA, decimals, locale);
  const fmtB = formatNumber(decB, decimals, locale);
  const fmtC = formatNumber(decC, decimals, locale);
  const fmtLeft = formatNumber(factorLeft, decimals, locale);
  const fmtRight = formatNumber(factorRight, decimals, locale);
  const fmtDenom = formatNumber(denominator, decimals, locale);

  return {
    ok: true,
    value: result,
    formattedValue: formatted,
    formulaText: `X = (${fmtLeft} × ${fmtRight}) / ${fmtDenom}`,
    steps: [
      t(
        isDirect
          ? 'calculators.ruleOfThree.steps.simpleDirect'
          : 'calculators.ruleOfThree.steps.simpleInverse',
        { a: fmtA, b: fmtB, c: fmtC },
      ),
      t(
        isDirect
          ? 'calculators.ruleOfThree.steps.crossMultiply'
          : 'calculators.ruleOfThree.steps.constantProduct',
        { left: fmtLeft, right: fmtRight, denominator: fmtDenom },
      ),
      t('calculators.ruleOfThree.steps.intermediate', {
        numerator: formatNumber(numerator, decimals, locale),
        denominator: fmtDenom,
        result: formatted,
      }),
    ],
  };
}

/**
 * Computes a compound rule of three (direct, inverse, or mixed) with 2 to 6 conditions.
 */
export function calculateCompoundRuleOfThree(
  input: CompoundRuleInput,
  options: RuleOfThreeOptions = {},
): RuleOfThreeResult {
  const { targetLabel, baseKnownValue, conditions, decimals = 4 } = input;
  const locale = options.locale;
  const t: CalculatorTranslate = options.translate ?? ((key) => key);

  if (conditions.length < 2 || conditions.length > 6) {
    return {
      ok: false,
      error: t('calculators.ruleOfThree.errors.compoundRange'),
    };
  }

  if (!isValidFiniteNumber(baseKnownValue)) {
    return {
      ok: false,
      error: t('calculators.ruleOfThree.errors.baseValue'),
    };
  }

  const baseDec = new Decimal(baseKnownValue);
  const factors: CompoundFactorDetail[] = [];
  const steps: string[] = [];
  let runningValue = baseDec;

  for (let i = 0; i < conditions.length; i += 1) {
    const row = conditions[i];
    const rowName =
      row.label.trim() ||
      t('calculators.ruleOfThree.defaults.magnitudeIndexed', { index: i + 1 });

    if (!isValidFiniteNumber(row.knownValue) || !isValidFiniteNumber(row.targetValue)) {
      return {
        ok: false,
        error: t('calculators.ruleOfThree.errors.rowValues', { name: rowName }),
      };
    }

    const knownDec = new Decimal(row.knownValue);
    const targetDec = new Decimal(row.targetValue);

    if (row.relation === 'direct') {
      if (knownDec.isZero()) {
        return {
          ok: false,
          error: t('calculators.ruleOfThree.errors.directKnownZero', {
            name: rowName,
          }),
        };
      }
      const factor = targetDec.div(knownDec);
      const expression = `${formatNumber(targetDec, decimals, locale)} / ${formatNumber(knownDec, decimals, locale)}`;
      factors.push({ label: rowName, relation: 'direct', factor, expression });
      steps.push(
        t('calculators.ruleOfThree.steps.compoundDirect', {
          name: rowName,
          expression,
          factor: formatNumber(factor, 6, locale),
        }),
      );
      runningValue = runningValue.mul(factor);
    } else {
      if (targetDec.isZero()) {
        return {
          ok: false,
          error: t('calculators.ruleOfThree.errors.inverseTargetZero', {
            name: rowName,
          }),
        };
      }
      const factor = knownDec.div(targetDec);
      const expression = `${formatNumber(knownDec, decimals, locale)} / ${formatNumber(targetDec, decimals, locale)}`;
      factors.push({ label: rowName, relation: 'inverse', factor, expression });
      steps.push(
        t('calculators.ruleOfThree.steps.compoundInverse', {
          name: rowName,
          expression,
          factor: formatNumber(factor, 6, locale),
        }),
      );
      runningValue = runningValue.mul(factor);
    }
  }

  const formatted = formatNumber(runningValue, decimals, locale);
  const factorExpressions = factors.map((f) => `(${f.expression})`).join(' × ');
  const cleanTarget = targetLabel.trim() || 'X';

  steps.push(
    t('calculators.ruleOfThree.steps.compoundResult', {
      target: cleanTarget,
      base: formatNumber(baseDec, decimals, locale),
      factors: factorExpressions,
      result: formatted,
    }),
  );

  return {
    ok: true,
    value: runningValue,
    formattedValue: formatted,
    formulaText: `${cleanTarget} = ${formatNumber(baseDec, decimals, locale)} × ${factorExpressions}`,
    steps,
    factors,
  };
}
