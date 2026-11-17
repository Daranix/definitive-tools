import { z } from 'zod';
import type { CalculatorTranslate } from '../shared/calculator-format';

/**
 * Builds the compound-condition schema with messages resolved through `t`, so
 * validation errors follow the active language.
 */
export function createCompoundConditionSchema(t: CalculatorTranslate) {
  return z.object({
    id: z.string(),
    label: z.string(),
    knownValue: z
      .number({ error: t('calculators.ruleOfThree.validation.value') })
      .nullable(),
    targetValue: z
      .number({ error: t('calculators.ruleOfThree.validation.value') })
      .nullable(),
    relation: z.enum(['direct', 'inverse'], {
      error: t('calculators.ruleOfThree.validation.relation'),
    }),
  });
}

/**
 * Builds the rule-of-three form schema. The caller passes a locale-aware
 * translator, so the schema must be rebuilt whenever the language changes.
 */
export function createRuleOfThreeSchema(t: CalculatorTranslate) {
  const compoundConditionSchema = createCompoundConditionSchema(t);

  return z
    .object({
      mode: z.enum(['simple-direct', 'simple-inverse', 'compound']),
      simpleLabelKnown: z.string(),
      simpleLabelResult: z.string(),
      a: z.number({ error: t('calculators.ruleOfThree.validation.number') }).nullable(),
      b: z.number({ error: t('calculators.ruleOfThree.validation.number') }).nullable(),
      c: z.number({ error: t('calculators.ruleOfThree.validation.number') }).nullable(),
      compoundTargetLabel: z.string(),
      baseResult: z
        .number({ error: t('calculators.ruleOfThree.validation.number') })
        .nullable(),
      decimals: z.number().int().min(0).max(15),
      compoundConditions: z.array(compoundConditionSchema),
    })
    .superRefine((data, ctx) => {
      if (data.mode === 'simple-direct' || data.mode === 'simple-inverse') {
        const simpleFields: { key: 'a' | 'b' | 'c'; value: number | null }[] = [
          { key: 'a', value: data.a },
          { key: 'b', value: data.b },
          { key: 'c', value: data.c },
        ];
        for (const field of simpleFields) {
          if (field.value === null || !Number.isFinite(field.value)) {
            ctx.addIssue({
              code: 'custom',
              message: t('calculators.ruleOfThree.validation.value'),
              path: [field.key],
            });
          }
        }

        if (data.mode === 'simple-direct' && data.a === 0) {
          ctx.addIssue({
            code: 'custom',
            message: t('calculators.ruleOfThree.validation.directZeroField'),
            path: ['a'],
          });
        }

        if (data.mode === 'simple-inverse' && data.c === 0) {
          ctx.addIssue({
            code: 'custom',
            message: t('calculators.ruleOfThree.validation.inverseZeroField'),
            path: ['c'],
          });
        }
        return;
      }

      if (data.baseResult === null || !Number.isFinite(data.baseResult)) {
        ctx.addIssue({
          code: 'custom',
          message: t('calculators.ruleOfThree.validation.baseValue'),
          path: ['baseResult'],
        });
      }

      if (data.compoundConditions.length < 2 || data.compoundConditions.length > 6) {
        ctx.addIssue({
          code: 'custom',
          message: t('calculators.ruleOfThree.validation.compoundRange'),
          path: ['compoundConditions'],
        });
      }

      data.compoundConditions.forEach((row, index) => {
        const rowName =
          row.label.trim() ||
          t('calculators.ruleOfThree.defaults.magnitudeIndexed', { index: index + 1 });
        if (row.knownValue === null || !Number.isFinite(row.knownValue)) {
          ctx.addIssue({
            code: 'custom',
            message: t('calculators.ruleOfThree.validation.baseFor', { name: rowName }),
            path: ['compoundConditions', index, 'knownValue'],
          });
        } else if (row.relation === 'direct' && row.knownValue === 0) {
          ctx.addIssue({
            code: 'custom',
            message: t('calculators.ruleOfThree.validation.directZeroFor', { name: rowName }),
            path: ['compoundConditions', index, 'knownValue'],
          });
        }

        if (row.targetValue === null || !Number.isFinite(row.targetValue)) {
          ctx.addIssue({
            code: 'custom',
            message: t('calculators.ruleOfThree.validation.targetFor', { name: rowName }),
            path: ['compoundConditions', index, 'targetValue'],
          });
        } else if (row.relation === 'inverse' && row.targetValue === 0) {
          ctx.addIssue({
            code: 'custom',
            message: t('calculators.ruleOfThree.validation.inverseZeroFor', { name: rowName }),
            path: ['compoundConditions', index, 'targetValue'],
          });
        }
      });
    });
}

export type RuleOfThreeFormModel = z.infer<ReturnType<typeof createRuleOfThreeSchema>>;
