import Decimal from 'decimal.js';
import { formatNumberEs } from '../shared/calculator-format';

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

function isValidFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Computes a simple direct or simple inverse rule of three using Decimal precision.
 */
export function calculateSimpleRuleOfThree(input: SimpleRuleInput): RuleOfThreeResult {
  const { mode, a, b, c, decimals = 4 } = input;

  if (!isValidFiniteNumber(a) || !isValidFiniteNumber(b) || !isValidFiniteNumber(c)) {
    return {
      ok: false,
      error: 'Introduce todos los valores numéricos (A, B y C) para calcular el resultado.',
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
        ? 'El valor A no puede ser cero en una regla de tres directa.'
        : 'El valor C no puede ser cero en una regla de tres inversa.',
    };
  }

  const numerator = factorLeft.mul(factorRight);
  const result = numerator.div(denominator);
  const formatted = formatNumberEs(result, decimals);

  const fmtA = formatNumberEs(decA, decimals);
  const fmtB = formatNumberEs(decB, decimals);
  const fmtC = formatNumberEs(decC, decimals);
  const fmtLeft = formatNumberEs(factorLeft, decimals);
  const fmtRight = formatNumberEs(factorRight, decimals);
  const fmtDenom = formatNumberEs(denominator, decimals);

  return {
    ok: true,
    value: result,
    formattedValue: formatted,
    formulaText: `X = (${fmtLeft} × ${fmtRight}) / ${fmtDenom}`,
    steps: [
      `Planteamiento ${isDirect ? 'directo' : 'inverso'}: si ${fmtA} → ${fmtB}, entonces ${fmtC} → X.`,
      `${isDirect ? 'Multiplicación en cruz' : 'Producto constante'}: X = (${fmtLeft} × ${fmtRight}) / ${fmtDenom}.`,
      `Operación intermedia: ${formatNumberEs(numerator, decimals)} / ${fmtDenom} = ${formatted}.`,
    ],
  };
}

/**
 * Computes a compound rule of three (direct, inverse, or mixed) with 2 to 6 conditions.
 */
export function calculateCompoundRuleOfThree(input: CompoundRuleInput): RuleOfThreeResult {
  const { targetLabel, baseKnownValue, conditions, decimals = 4 } = input;

  if (conditions.length < 2 || conditions.length > 6) {
    return {
      ok: false,
      error: 'La regla de tres compuesta requiere entre 2 y 6 magnitudes.',
    };
  }

  if (!isValidFiniteNumber(baseKnownValue)) {
    return {
      ok: false,
      error: 'Introduce un valor base válido para la magnitud objetivo.',
    };
  }

  const baseDec = new Decimal(baseKnownValue);
  const factors: CompoundFactorDetail[] = [];
  const steps: string[] = [];
  let runningValue = baseDec;

  for (let i = 0; i < conditions.length; i += 1) {
    const row = conditions[i];
    const rowName = row.label.trim() || `Magnitud ${i + 1}`;

    if (!isValidFiniteNumber(row.knownValue) || !isValidFiniteNumber(row.targetValue)) {
      return {
        ok: false,
        error: `Revisa los valores numéricos de "${rowName}".`,
      };
    }

    const knownDec = new Decimal(row.knownValue);
    const targetDec = new Decimal(row.targetValue);

    if (row.relation === 'direct') {
      if (knownDec.isZero()) {
        return {
          ok: false,
          error: `El valor conocido de "${rowName}" no puede ser cero en relación directa.`,
        };
      }
      const factor = targetDec.div(knownDec);
      const expression = `${formatNumberEs(targetDec, decimals)} / ${formatNumberEs(knownDec, decimals)}`;
      factors.push({ label: rowName, relation: 'direct', factor, expression });
      steps.push(
        `${rowName} (directa): factor = ${expression} = ${formatNumberEs(factor, 6)}.`,
      );
      runningValue = runningValue.mul(factor);
    } else {
      if (targetDec.isZero()) {
        return {
          ok: false,
          error: `El valor objetivo de "${rowName}" no puede ser cero en relación inversa.`,
        };
      }
      const factor = knownDec.div(targetDec);
      const expression = `${formatNumberEs(knownDec, decimals)} / ${formatNumberEs(targetDec, decimals)}`;
      factors.push({ label: rowName, relation: 'inverse', factor, expression });
      steps.push(
        `${rowName} (inversa): factor = ${expression} = ${formatNumberEs(factor, 6)}.`,
      );
      runningValue = runningValue.mul(factor);
    }
  }

  const formatted = formatNumberEs(runningValue, decimals);
  const factorExpressions = factors.map((f) => `(${f.expression})`).join(' × ');
  const cleanTarget = targetLabel.trim() || 'X';

  steps.push(
    `Resultado (${cleanTarget}): ${formatNumberEs(baseDec, decimals)} × ${factorExpressions} = ${formatted}.`,
  );

  return {
    ok: true,
    value: runningValue,
    formattedValue: formatted,
    formulaText: `${cleanTarget} = ${formatNumberEs(baseDec, decimals)} × ${factorExpressions}`,
    steps,
    factors,
  };
}
