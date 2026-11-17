import { z } from 'zod';
import {
  requiredNumberField,
  type CalculatorTranslate,
} from '../shared/calculator-format';

/**
 * Builds the net salary form schema with messages resolved through `t`, so
 * validation errors follow the active language.
 */
export function createSpainNetSalarySchema(t: CalculatorTranslate) {
  return z
    .object({
      grossAnnual: requiredNumberField({
        requiredMessage: t('calculators.netSalary.validation.grossRequired'),
        min: {
          value: 0,
          message: t('calculators.netSalary.validation.grossNegative'),
        },
        max: {
          value: 2000000,
          message: t('calculators.netSalary.validation.grossMax'),
        },
      }),
      extraPayments: requiredNumberField({
        requiredMessage: t('calculators.netSalary.validation.extraRequired'),
        integer: {
          message: t('calculators.netSalary.validation.extraInteger'),
        },
        min: { value: 0, message: t('calculators.netSalary.validation.extraMin') },
        max: { value: 12, message: t('calculators.netSalary.validation.extraMax') },
      }),
      region: z.enum(['general', 'madrid', 'cataluna', 'andalucia', 'valencia', 'galicia'], {
        error: t('calculators.netSalary.validation.region'),
      }),
      ageBracket: z.enum(['under65', '65to74', '75plus'], {
        error: t('calculators.netSalary.validation.age'),
      }),
      contractType: z.enum(['indefinite', 'temporary'], {
        error: t('calculators.netSalary.validation.contract'),
      }),
      familySituation: z.enum(['single', 'married_low_income', 'other'], {
        error: t('calculators.netSalary.validation.family'),
      }),
      childrenTotal: requiredNumberField({
        requiredMessage: t('calculators.netSalary.validation.childrenRequired'),
        integer: {
          message: t('calculators.netSalary.validation.childrenInteger'),
        },
        min: { value: 0, message: t('calculators.netSalary.validation.childrenMin') },
        max: { value: 10, message: t('calculators.netSalary.validation.childrenMax') },
      }),
      childrenUnder3: requiredNumberField({
        requiredMessage: t('calculators.netSalary.validation.under3Required'),
        integer: {
          message: t('calculators.netSalary.validation.under3Integer'),
        },
        min: { value: 0, message: t('calculators.netSalary.validation.under3Min') },
        max: { value: 10, message: t('calculators.netSalary.validation.under3Max') },
      }),
      sharedCustody: z.boolean(),
      disability: z.enum(['none', '33to64', '65plus'], {
        error: t('calculators.netSalary.validation.disability'),
      }),
      geographicMobility: z.boolean(),
    })
    .refine(
      (data) =>
        data.childrenTotal === null ||
        data.childrenUnder3 === null ||
        data.childrenTotal < 0 ||
        data.childrenUnder3 <= data.childrenTotal,
      {
        error: t('calculators.netSalary.validation.under3Exceeds'),
        path: ['childrenUnder3'],
      },
    );
}

export type SpainNetSalaryFormModel = z.infer<
  ReturnType<typeof createSpainNetSalarySchema>
>;
