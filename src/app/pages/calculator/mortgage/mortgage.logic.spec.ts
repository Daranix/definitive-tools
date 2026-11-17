import { calculateMortgage } from './mortgage.logic';

describe('Mortgage Logic', () => {
  it('computes French amortization monthly payment and zero ending balance', () => {
    const res = calculateMortgage({
      propertyPrice: 250000,
      downPayment: 50000,
      years: 30,
      tinAnnual: 3,
      additionalInitialFees: 0,
      annualRecurringCost: 0,
      purchaseTaxPercent: 8,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.loanAmount).toBe(200000);
      expect(res.data.ltvPercent).toBe(80);
      expect(res.data.monthlyPayment).toBeCloseTo(843.21, 2);
      expect(res.data.schedule.length).toBe(360);
      expect(res.data.yearlySummary.length).toBe(30);
      expect(res.data.schedule[res.data.schedule.length - 1].remainingBalance).toBe(0);
      expect(res.data.estimatedPurchaseExpenses).toBe(20000);
      expect(res.data.totalCashNeeded).toBe(70000);
      // With 0 fees and 3% TIN monthly compounding, TAE = (1 + 0.03/12)^12 - 1 ≈ 3.04%
      expect(res.data.effectiveTae).toBeCloseTo(3.04, 2);
    }
  });

  it('reflects initial fees and recurring costs in effective TAE', () => {
    const base = calculateMortgage({
      propertyPrice: 200000,
      downPayment: 40000,
      years: 25,
      tinAnnual: 3.2,
    });
    const withFees = calculateMortgage({
      propertyPrice: 200000,
      downPayment: 40000,
      years: 25,
      tinAnnual: 3.2,
      additionalInitialFees: 2500,
      annualRecurringCost: 600,
    });

    expect(base.ok && withFees.ok).toBe(true);
    if (base.ok && withFees.ok) {
      expect(withFees.data.effectiveTae).not.toBeNull();
      expect(base.data.effectiveTae).not.toBeNull();
      if (withFees.data.effectiveTae !== null && base.data.effectiveTae !== null) {
        expect(withFees.data.effectiveTae).toBeGreaterThan(base.data.effectiveTae);
      }
    }
  });

  it('returns null effectiveTae when initial fees equal or exceed loan amount', () => {
    const res = calculateMortgage({
      propertyPrice: 100000,
      downPayment: 80000,
      years: 10,
      tinAnnual: 3,
      additionalInitialFees: 20000,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.effectiveTae).toBeNull();
    }
  });

  it('handles 0% TIN cleanly', () => {
    const res = calculateMortgage({
      propertyPrice: 120000,
      downPayment: 0,
      years: 10,
      tinAnnual: 0,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.monthlyPayment).toBe(1000);
      expect(res.data.totalInterest).toBe(0);
      expect(res.data.effectiveTae).toBe(0);
    }
  });
});
