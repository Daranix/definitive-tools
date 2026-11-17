import { SpainNetSalaryInput, calculateSpainNetSalary } from './spain-net-salary.logic';

function makeDefaultInput(overrides: Partial<SpainNetSalaryInput> = {}): SpainNetSalaryInput {
  return {
    grossAnnual: 30000,
    extraPayments: 0,
    ageBracket: 'under65',
    familySituation: 'single',
    contractType: 'indefinite',
    region: 'general',
    childrenTotal: 0,
    childrenUnder3: 0,
    sharedCustody: false,
    disability: 'none',
    geographicMobility: false,
    ...overrides,
  };
}

describe('Spain Net Salary 2026 Logic', () => {
  it('computes standard 30,000 EUR / 12 payments (0 extra) accurately', () => {
    const res = calculateSpainNetSalary(makeDefaultInput());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.totalPayments).toBe(12);
      expect(res.data.ssAnnual).toBe(1950);
      expect(res.data.solidarityAnnual).toBe(0);
      expect(res.data.extraPayment).toBe(0);
      expect(res.data.irpfAnnual).toBeGreaterThan(4000);
      expect(res.data.netAnnual).toBeCloseTo(
        30000 - res.data.ssAnnual - res.data.irpfAnnual,
        2,
      );
      expect(res.data.netMonthly).toBeCloseTo(res.data.netAnnual / 12, 2);
    }
  });

  it('supports custom extraPayments (e.g. 3 extra -> 15 total payments)', () => {
    const res = calculateSpainNetSalary(makeDefaultInput({ grossAnnual: 30000, extraPayments: 3 }));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.totalPayments).toBe(15);
      expect(res.data.extraPayment).toBe(res.data.netMonthly);
      expect(res.data.netMonthly).toBeCloseTo(res.data.netAnnual / 15, 2);
    }
  });

  it('applies 2026 Social Security cap and solidarity quota for high earners', () => {
    const res = calculateSpainNetSalary(makeDefaultInput({ grossAnnual: 100000, extraPayments: 2 }));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.totalPayments).toBe(14);
      expect(res.data.ssBreakdown.contributionBase).toBe(61214.4);
      expect(res.data.solidarityAnnual).toBeCloseTo(82.68, 2);
      expect(res.data.extraPayment).toBe(res.data.netMonthly);
    }
  });

  it('applies Art. 20 low-income work reduction after deductible expenses and caps at RNT', () => {
    const veryLow = calculateSpainNetSalary(makeDefaultInput({ grossAnnual: 5000 }));
    expect(veryLow.ok).toBe(true);
    if (veryLow.ok) {
      expect(veryLow.data.art20Reduction).toBe(2675);
      expect(veryLow.data.taxableBase).toBe(0);
    }

    const low = calculateSpainNetSalary(makeDefaultInput({ grossAnnual: 15800 }));
    expect(low.ok).toBe(true);
    if (low.ok) {
      expect(low.data.art20Reduction).toBe(7302);
      expect(low.data.irpfAnnual).toBe(0);
    }

    const midLow = calculateSpainNetSalary(makeDefaultInput({ grossAnnual: 21500 }));
    expect(midLow.ok).toBe(true);
    if (midLow.ok) {
      expect(midLow.data.art20Reduction).toBeGreaterThan(0);
      expect(midLow.data.art20Reduction).toBeLessThan(2364.34);
    }
  });

  it('rejects invalid extraPayments and non-finite children counts cleanly', () => {
    expect(calculateSpainNetSalary(makeDefaultInput({ extraPayments: -1 })).ok).toBe(false);
    expect(calculateSpainNetSalary(makeDefaultInput({ extraPayments: 13 })).ok).toBe(false);
    expect(calculateSpainNetSalary(makeDefaultInput({ extraPayments: 1.5 })).ok).toBe(false);
    expect(calculateSpainNetSalary(makeDefaultInput({ childrenTotal: Number.NaN })).ok).toBe(false);
  });

  it('applies children, shared custody, and age minimums', () => {
    const base = calculateSpainNetSalary(makeDefaultInput({ grossAnnual: 35000 }));
    const withKids = calculateSpainNetSalary(
      makeDefaultInput({
        grossAnnual: 35000,
        ageBracket: '65to74',
        childrenTotal: 2,
        childrenUnder3: 1,
        sharedCustody: true,
      }),
    );

    expect(base.ok && withKids.ok).toBe(true);
    if (base.ok && withKids.ok) {
      expect(withKids.data.personalMinimum).toBe(10650);
      expect(withKids.data.irpfAnnual).toBeLessThan(base.data.irpfAnnual);
      expect(withKids.data.netAnnual).toBeGreaterThan(base.data.netAnnual);
    }
  });
});
