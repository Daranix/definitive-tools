import {
  calculateCompoundRuleOfThree,
  calculateSimpleRuleOfThree,
} from './rule-of-three.logic';

describe('Rule of Three Logic', () => {
  it('calculates simple direct rule of three accurately', () => {
    const res = calculateSimpleRuleOfThree({
      mode: 'simple-direct',
      a: 4,
      b: 12,
      c: 10,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.toNumber()).toBe(30);
    }
  });

  it('calculates simple inverse rule of three accurately', () => {
    const res = calculateSimpleRuleOfThree({
      mode: 'simple-inverse',
      a: 6,
      b: 8,
      c: 12,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.toNumber()).toBe(4);
    }
  });

  it('returns error on zero denominator in simple mode', () => {
    const directZero = calculateSimpleRuleOfThree({
      mode: 'simple-direct',
      a: 0,
      b: 10,
      c: 5,
    });
    expect(directZero.ok).toBe(false);

    const inverseZero = calculateSimpleRuleOfThree({
      mode: 'simple-inverse',
      a: 10,
      b: 5,
      c: 0,
    });
    expect(inverseZero.ok).toBe(false);
  });

  it('calculates mixed compound rule of three accurately', () => {
    // 6 workers * 8 h/day * 12 days -> 120m.
    // 9 workers * 6 h/day * X days -> 180m.
    // X = 12 * (6/9) * (8/6) * (180/120) = 12 * (2/3) * (4/3) * (3/2) = 16
    const res = calculateCompoundRuleOfThree({
      targetLabel: 'Días',
      baseKnownValue: 12,
      conditions: [
        { id: '1', label: 'Trabajadores', knownValue: 6, targetValue: 9, relation: 'inverse' },
        { id: '2', label: 'Horas', knownValue: 8, targetValue: 6, relation: 'inverse' },
        { id: '3', label: 'Metros', knownValue: 120, targetValue: 180, relation: 'direct' },
      ],
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.toNumber()).toBe(16);
      expect(res.steps.length).toBe(4);
    }
  });
});
