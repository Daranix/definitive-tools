import { z } from 'zod';
import { requiredNumberField } from '../shared/calculator-format';

export const SpainNetSalarySchema = z
  .object({
    grossAnnual: requiredNumberField({
      requiredMessage: 'Introduce el salario bruto anual.',
      min: { value: 0, message: 'El salario bruto anual no puede ser negativo.' },
      max: { value: 2000000, message: 'El salario bruto anual no puede superar 2.000.000 €.' },
    }),
    extraPayments: requiredNumberField({
      requiredMessage: 'Introduce el número de pagas extra.',
      integer: { message: 'El número de pagas extra debe ser un número entero.' },
      min: { value: 0, message: 'El mínimo de pagas extra es 0.' },
      max: { value: 12, message: 'El máximo de pagas extra es 12.' },
    }),
    region: z.enum(['general', 'madrid', 'cataluna', 'andalucia', 'valencia', 'galicia'], {
      error: 'Selecciona una comunidad autónoma válida.',
    }),
    ageBracket: z.enum(['under65', '65to74', '75plus'], {
      error: 'Selecciona un tramo de edad válido.',
    }),
    contractType: z.enum(['indefinite', 'temporary'], {
      error: 'Selecciona un tipo de contrato válido.',
    }),
    familySituation: z.enum(['single', 'married_low_income', 'other'], {
      error: 'Selecciona una situación familiar válida.',
    }),
    childrenTotal: requiredNumberField({
      requiredMessage: 'Introduce el número de hijos a cargo.',
      integer: { message: 'El número de hijos debe ser un entero.' },
      min: { value: 0, message: 'No puede ser negativo.' },
      max: { value: 10, message: 'El máximo admitido es 10 hijos.' },
    }),
    childrenUnder3: requiredNumberField({
      requiredMessage: 'Introduce los hijos menores de 3 años.',
      integer: { message: 'Debe ser un número entero.' },
      min: { value: 0, message: 'No puede ser negativo.' },
      max: { value: 10, message: 'El máximo admitido es 10.' },
    }),
    sharedCustody: z.boolean(),
    disability: z.enum(['none', '33to64', '65plus'], {
      error: 'Selecciona un grado de discapacidad válido.',
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
      error: 'Los hijos menores de 3 años no pueden superar el total de hijos.',
      path: ['childrenUnder3'],
    },
  );

export type SpainNetSalaryFormModel = z.infer<typeof SpainNetSalarySchema>;
