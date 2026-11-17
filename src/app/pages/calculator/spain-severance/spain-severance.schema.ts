import { isBefore } from 'date-fns';
import { z } from 'zod';
import { requiredNumberField } from '../shared/calculator-format';
import { parseIsoDate } from './spain-severance.logic';

export const SpainSeveranceSchema = z
  .object({
    startDate: z
      .string({ error: 'Introduce la fecha de inicio de contrato.' })
      .refine((val) => parseIsoDate(val) !== null, {
        error: 'Introduce una fecha de inicio válida (AAAA-MM-DD).',
      }),
    endDate: z
      .string({ error: 'Introduce la fecha de despido o fin.' })
      .refine((val) => parseIsoDate(val) !== null, {
        error: 'Introduce una fecha de fin válida (AAAA-MM-DD).',
      }),
    salaryMode: z.enum(['annual', 'monthly'], {
      error: 'Selecciona un modo de salario válido.',
    }),
    salaryAmount: requiredNumberField({
      requiredMessage: 'Introduce el importe del salario bruto.',
      min: { value: 0, message: 'El salario bruto no puede ser negativo.' },
      max: { value: 50000000, message: 'El importe salarial excede el máximo permitido.' },
    }),
    extraPayments: z.number({ error: 'Introduce el número de pagas extra.' }).nullable(),
    dismissalType: z.enum(
      ['unfair', 'objective', 'disciplinary', 'temporary_end', 'modification'],
      {
        error: 'Selecciona un tipo de despido válido.',
      },
    ),
  })
  .superRefine((data, ctx) => {
    const start = parseIsoDate(data.startDate);
    const end = parseIsoDate(data.endDate);
    if (start && end && isBefore(end, start)) {
      ctx.addIssue({
        code: 'custom',
        message: 'La fecha de despido o fin debe ser igual o posterior a la fecha de inicio.',
        path: ['endDate'],
      });
    }

    if (data.salaryMode === 'monthly') {
      const extra = data.extraPayments;
      if (extra === null || !Number.isFinite(extra)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Introduce el número de pagas extra.',
          path: ['extraPayments'],
        });
        return;
      }
      if (!Number.isInteger(extra)) {
        ctx.addIssue({
          code: 'custom',
          message: 'El número de pagas extra debe ser un número entero.',
          path: ['extraPayments'],
        });
      }
      if (extra < 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'El mínimo de pagas extra es 0.',
          path: ['extraPayments'],
        });
      }
      if (extra > 12) {
        ctx.addIssue({
          code: 'custom',
          message: 'El máximo de pagas extra es 12.',
          path: ['extraPayments'],
        });
      }
    }
  });

export type SpainSeveranceFormModel = z.infer<typeof SpainSeveranceSchema>;
