import { z } from 'zod';
import {
  requiredNumberField,
  type CalculatorTranslate,
} from '../shared/calculator-format';

/**
 * Builds the mortgage form schema with messages resolved through `t`, so
 * validation errors follow the active language.
 */
export function createMortgageSchema(t: CalculatorTranslate) {
  return z
    .object({
      propertyPrice: requiredNumberField({
        requiredMessage: t('calculators.mortgage.validation.priceRequired'),
        min: {
          value: 1000,
          message: t('calculators.mortgage.validation.priceMin'),
        },
        max: {
          value: 50000000,
          message: t('calculators.mortgage.validation.priceMax'),
        },
      }),
      downPayment: requiredNumberField({
        requiredMessage: t('calculators.mortgage.validation.downPaymentRequired'),
        min: {
          value: 0,
          message: t('calculators.mortgage.validation.downPaymentMin'),
        },
      }),
      downPaymentPercent: requiredNumberField({
        requiredMessage: t(
          'calculators.mortgage.validation.downPaymentPercentRequired',
        ),
        min: {
          value: 0,
          message: t('calculators.mortgage.validation.downPaymentPercentMin'),
        },
        max: {
          value: 99.9,
          message: t('calculators.mortgage.validation.downPaymentPercentMax'),
        },
      }),
      years: requiredNumberField({
        requiredMessage: t('calculators.mortgage.validation.termRequired'),
        integer: {
          message: t('calculators.mortgage.validation.termInteger'),
        },
        min: { value: 1, message: t('calculators.mortgage.validation.termMin') },
        max: { value: 40, message: t('calculators.mortgage.validation.termMax') },
      }),
      tinAnnual: requiredNumberField({
        requiredMessage: t('calculators.mortgage.validation.tinRequired'),
        min: { value: 0, message: t('calculators.mortgage.validation.tinMin') },
        max: { value: 30, message: t('calculators.mortgage.validation.tinMax') },
      }),
      additionalInitialFees: requiredNumberField({
        requiredMessage: t(
          'calculators.mortgage.validation.initialFeesRequired',
        ),
        min: {
          value: 0,
          message: t('calculators.mortgage.validation.initialFeesMin'),
        },
      }),
      annualRecurringCost: requiredNumberField({
        requiredMessage: t(
          'calculators.mortgage.validation.recurringCostRequired',
        ),
        min: {
          value: 0,
          message: t('calculators.mortgage.validation.recurringCostMin'),
        },
      }),
      purchaseTaxPercent: requiredNumberField({
        requiredMessage: t(
          'calculators.mortgage.validation.purchaseTaxRequired',
        ),
        min: {
          value: 0,
          message: t('calculators.mortgage.validation.purchaseTaxMin'),
        },
        max: {
          value: 25,
          message: t('calculators.mortgage.validation.purchaseTaxMax'),
        },
      }),
    })
    .refine(
      (data) =>
        data.propertyPrice === null ||
        data.downPayment === null ||
        data.downPayment < data.propertyPrice,
      {
        error: t('calculators.mortgage.validation.downPaymentBelowPrice'),
        path: ['downPayment'],
      },
    );
}

export type MortgageFormModel = z.infer<ReturnType<typeof createMortgageSchema>>;
