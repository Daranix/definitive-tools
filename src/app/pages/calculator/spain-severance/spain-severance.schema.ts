import { isBefore } from 'date-fns';
import { z } from 'zod';
import {
  requiredNumberField,
  type CalculatorTranslate,
} from '../shared/calculator-format';
import { parseIsoDate } from './spain-severance.logic';

/**
 * Builds the severance form schema with messages resolved through `t`, so
 * validation errors follow the active language.
 */
export function createSpainSeveranceSchema(t: CalculatorTranslate) {
  return z
    .object({
      startDate: z
        .string({ error: t('calculators.severance.validation.startRequired') })
        .refine((val) => parseIsoDate(val) !== null, {
          error: t('calculators.severance.validation.startInvalid'),
        }),
      endDate: z
        .string({ error: t('calculators.severance.validation.endRequired') })
        .refine((val) => parseIsoDate(val) !== null, {
          error: t('calculators.severance.validation.endInvalid'),
        }),
      salaryMode: z.enum(['annual', 'monthly'], {
        error: t('calculators.severance.validation.salaryMode'),
      }),
      salaryAmount: requiredNumberField({
        requiredMessage: t('calculators.severance.validation.salaryRequired'),
        min: {
          value: 0,
          message: t('calculators.severance.validation.salaryNegative'),
        },
        max: {
          value: 50000000,
          message: t('calculators.severance.validation.salaryMax'),
        },
      }),
      extraPayments: z
        .number({ error: t('calculators.severance.validation.extraRequired') })
        .nullable(),
      dismissalType: z.enum(
        ['unfair', 'objective', 'disciplinary', 'temporary_end', 'modification'],
        {
          error: t('calculators.severance.validation.dismissalType'),
        },
      ),
    })
    .superRefine((data, ctx) => {
      const start = parseIsoDate(data.startDate);
      const end = parseIsoDate(data.endDate);
      if (start && end && isBefore(end, start)) {
        ctx.addIssue({
          code: 'custom',
          message: t('calculators.severance.validation.endBeforeStart'),
          path: ['endDate'],
        });
      }

      if (data.salaryMode === 'monthly') {
        const extra = data.extraPayments;
        if (extra === null || !Number.isFinite(extra)) {
          ctx.addIssue({
            code: 'custom',
            message: t('calculators.severance.validation.extraRequired'),
            path: ['extraPayments'],
          });
          return;
        }
        if (!Number.isInteger(extra)) {
          ctx.addIssue({
            code: 'custom',
            message: t('calculators.severance.validation.extraInteger'),
            path: ['extraPayments'],
          });
        }
        if (extra < 0) {
          ctx.addIssue({
            code: 'custom',
            message: t('calculators.severance.validation.extraMin'),
            path: ['extraPayments'],
          });
        }
        if (extra > 12) {
          ctx.addIssue({
            code: 'custom',
            message: t('calculators.severance.validation.extraMax'),
            path: ['extraPayments'],
          });
        }
      }
    });
}

export type SpainSeveranceFormModel = z.infer<
  ReturnType<typeof createSpainSeveranceSchema>
>;
