import { z } from 'zod';

export const CompoundConditionSchema = z.object({
  id: z.string(),
  label: z.string(),
  knownValue: z.number({ error: 'Introduce un valor numérico válido.' }).nullable(),
  targetValue: z.number({ error: 'Introduce un valor numérico válido.' }).nullable(),
  relation: z.enum(['direct', 'inverse'], {
    error: 'Selecciona una relación válida.',
  }),
});

export const RuleOfThreeSchema = z
  .object({
    mode: z.enum(['simple-direct', 'simple-inverse', 'compound']),
    simpleLabelKnown: z.string(),
    simpleLabelResult: z.string(),
    a: z.number({ error: 'Introduce un número válido.' }).nullable(),
    b: z.number({ error: 'Introduce un número válido.' }).nullable(),
    c: z.number({ error: 'Introduce un número válido.' }).nullable(),
    compoundTargetLabel: z.string(),
    baseResult: z.number({ error: 'Introduce un número válido.' }).nullable(),
    decimals: z.number().int().min(0).max(15),
    compoundConditions: z.array(CompoundConditionSchema),
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
            message: 'Introduce un valor numérico válido.',
            path: [field.key],
          });
        }
      }

      if (data.mode === 'simple-direct' && data.a === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'El valor A no puede ser cero en una regla de tres directa.',
          path: ['a'],
        });
      }

      if (data.mode === 'simple-inverse' && data.c === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'El valor C no puede ser cero en una regla de tres inversa.',
          path: ['c'],
        });
      }
      return;
    }

    if (data.baseResult === null || !Number.isFinite(data.baseResult)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Introduce un valor base válido para la magnitud objetivo.',
        path: ['baseResult'],
      });
    }

    if (data.compoundConditions.length < 2 || data.compoundConditions.length > 6) {
      ctx.addIssue({
        code: 'custom',
        message: 'La regla de tres compuesta requiere entre 2 y 6 magnitudes.',
        path: ['compoundConditions'],
      });
    }

    data.compoundConditions.forEach((row, index) => {
      const rowName = row.label.trim() || `Magnitud ${index + 1}`;
      if (row.knownValue === null || !Number.isFinite(row.knownValue)) {
        ctx.addIssue({
          code: 'custom',
          message: `Introduce un valor base válido para "${rowName}".`,
          path: ['compoundConditions', index, 'knownValue'],
        });
      } else if (row.relation === 'direct' && row.knownValue === 0) {
        ctx.addIssue({
          code: 'custom',
          message: `El valor conocido de "${rowName}" no puede ser cero en relación directa.`,
          path: ['compoundConditions', index, 'knownValue'],
        });
      }

      if (row.targetValue === null || !Number.isFinite(row.targetValue)) {
        ctx.addIssue({
          code: 'custom',
          message: `Introduce un nuevo valor válido para "${rowName}".`,
          path: ['compoundConditions', index, 'targetValue'],
        });
      } else if (row.relation === 'inverse' && row.targetValue === 0) {
        ctx.addIssue({
          code: 'custom',
          message: `El valor objetivo de "${rowName}" no puede ser cero en relación inversa.`,
          path: ['compoundConditions', index, 'targetValue'],
        });
      }
    });
  });

export type RuleOfThreeFormModel = z.infer<typeof RuleOfThreeSchema>;
