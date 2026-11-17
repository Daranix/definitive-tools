import { z } from 'zod';
import { requiredNumberField } from '../shared/calculator-format';

export const MortgageSchema = z
  .object({
    propertyPrice: requiredNumberField({
      requiredMessage: 'Introduce el precio de la vivienda.',
      min: { value: 1000, message: 'El precio mínimo es de 1.000 €.' },
      max: { value: 50000000, message: 'El precio máximo es de 50.000.000 €.' },
    }),
    downPayment: requiredNumberField({
      requiredMessage: 'Introduce el importe de la entrada.',
      min: { value: 0, message: 'La entrada no puede ser negativa.' },
    }),
    downPaymentPercent: requiredNumberField({
      requiredMessage: 'Introduce el porcentaje de entrada.',
      min: { value: 0, message: 'El porcentaje mínimo es 0 %.' },
      max: { value: 99.9, message: 'El porcentaje máximo de entrada es 99,9 %.' },
    }),
    years: requiredNumberField({
      requiredMessage: 'Introduce el plazo en años.',
      integer: { message: 'El plazo debe ser un número entero de años.' },
      min: { value: 1, message: 'El plazo mínimo es 1 año.' },
      max: { value: 40, message: 'El plazo máximo es 40 años.' },
    }),
    tinAnnual: requiredNumberField({
      requiredMessage: 'Introduce el TIN anual.',
      min: { value: 0, message: 'El TIN no puede ser negativo.' },
      max: { value: 30, message: 'El TIN máximo admitido es 30 %.' },
    }),
    additionalInitialFees: requiredNumberField({
      requiredMessage: 'Introduce los gastos iniciales (0 si no hay).',
      min: { value: 0, message: 'Los gastos iniciales no pueden ser negativos.' },
    }),
    annualRecurringCost: requiredNumberField({
      requiredMessage: 'Introduce el coste anual vinculado (0 si no hay).',
      min: { value: 0, message: 'El coste anual vinculado no puede ser negativo.' },
    }),
    purchaseTaxPercent: requiredNumberField({
      requiredMessage: 'Introduce el porcentaje de impuestos y gastos.',
      min: { value: 0, message: 'El porcentaje no puede ser negativo.' },
      max: { value: 25, message: 'El porcentaje máximo admitido es 25 %.' },
    }),
  })
  .refine(
    (data) =>
      data.propertyPrice === null ||
      data.downPayment === null ||
      data.downPayment < data.propertyPrice,
    {
      error: 'La entrada aportada debe ser inferior al precio de la vivienda.',
      path: ['downPayment'],
    },
  );

export type MortgageFormModel = z.infer<typeof MortgageSchema>;
