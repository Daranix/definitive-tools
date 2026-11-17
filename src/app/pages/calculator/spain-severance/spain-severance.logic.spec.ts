import { calculateSpainSeverance } from './spain-severance.logic';

describe('Spain Severance Logic', () => {
  it('computes post-2012 unfair dismissal (33 days/year)', () => {
    const res = calculateSpainSeverance({
      startDate: '2020-01-01',
      endDate: '2021-12-31',
      salaryMode: 'annual',
      salaryAmount: 36500,
      extraPayments: 0,
      dismissalType: 'unfair',
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.dailySalary).toBe(100);
      expect(res.data.computableMonthsTotal).toBe(24);
      expect(res.data.computableMonthsPre).toBe(0);
      expect(res.data.computableMonthsPost).toBe(24);
      expect(res.data.totalDaysFinal).toBe(66);
      expect(res.data.severanceAmount).toBe(6600);
      expect(res.data.capApplied).toBeNull();
    }
  });

  it('computes monthly mode with extraPayments (0, 2, 3 extra -> 12, 14, 15 total payments)', () => {
    const base12 = calculateSpainSeverance({
      startDate: '2020-01-01',
      endDate: '2021-12-31',
      salaryMode: 'monthly',
      salaryAmount: 2000,
      extraPayments: 0,
      dismissalType: 'unfair',
    });
    const extra2 = calculateSpainSeverance({
      startDate: '2020-01-01',
      endDate: '2021-12-31',
      salaryMode: 'monthly',
      salaryAmount: 2000,
      extraPayments: 2,
      dismissalType: 'unfair',
    });
    const extra3 = calculateSpainSeverance({
      startDate: '2020-01-01',
      endDate: '2021-12-31',
      salaryMode: 'monthly',
      salaryAmount: 2000,
      extraPayments: 3,
      dismissalType: 'unfair',
    });

    expect(base12.ok && extra2.ok && extra3.ok).toBe(true);
    if (base12.ok && extra2.ok && extra3.ok) {
      expect(base12.data.grossAnnual).toBe(24000);
      expect(extra2.data.grossAnnual).toBe(28000);
      expect(extra3.data.grossAnnual).toBe(30000);
    }
  });

  it('computes pre-2012 mixed 45/33 unfair dismissal', () => {
    const res = calculateSpainSeverance({
      startDate: '2010-02-12',
      endDate: '2014-02-11',
      salaryMode: 'annual',
      salaryAmount: 36500,
      extraPayments: 0,
      dismissalType: 'unfair',
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.computableMonthsPre).toBe(24);
      expect(res.data.computableMonthsPost).toBe(24);
      expect(res.data.daysPre).toBe(90);
      expect(res.data.daysPost).toBe(66);
      expect(res.data.totalDaysFinal).toBe(156);
      expect(res.data.severanceAmount).toBe(15600);
    }
  });

  it('preserves pre-2012 accrued days above 720 up to 1260 and zeroes post-reform', () => {
    const res = calculateSpainSeverance({
      startDate: '1994-02-12',
      endDate: '2020-02-11',
      salaryMode: 'annual',
      salaryAmount: 36500,
      extraPayments: 0,
      dismissalType: 'unfair',
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.daysPre).toBe(810);
      expect(res.data.daysPost).toBe(0);
      expect(res.data.totalDaysFinal).toBe(810);
      expect(res.data.capApplied).not.toBeNull();
    }
  });

  it('caps objective dismissal at 20 days/year and 360 days', () => {
    const res = calculateSpainSeverance({
      startDate: '2000-01-01',
      endDate: '2024-12-31',
      salaryMode: 'monthly',
      salaryAmount: 3000,
      extraPayments: 0,
      dismissalType: 'objective',
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.grossAnnual).toBe(36000);
      expect(res.data.totalDaysUncapped).toBe(500);
      expect(res.data.totalDaysFinal).toBe(360);
      expect(res.data.capApplied).toContain('360');
    }
  });

  it('returns 0 EUR for disciplinary dismissal and non-exempt IRPF for temporary_end', () => {
    const disc = calculateSpainSeverance({
      startDate: '2018-05-01',
      endDate: '2024-05-01',
      salaryMode: 'annual',
      salaryAmount: 40000,
      extraPayments: 2,
      dismissalType: 'disciplinary',
    });

    expect(disc.ok).toBe(true);
    if (disc.ok) {
      expect(disc.data.totalDaysFinal).toBe(0);
      expect(disc.data.severanceAmount).toBe(0);
      expect(disc.data.irpfExemptLimit).toBe(0);
      expect(disc.data.irpfTaxableExcess).toBe(0);
    }

    const temp = calculateSpainSeverance({
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      salaryMode: 'annual',
      salaryAmount: 36500,
      extraPayments: 0,
      dismissalType: 'temporary_end',
    });

    expect(temp.ok).toBe(true);
    if (temp.ok) {
      expect(temp.data.severanceAmount).toBe(1200);
      expect(temp.data.irpfExemptLimit).toBe(0);
      expect(temp.data.irpfTaxableExcess).toBe(1200);
    }
  });
});
