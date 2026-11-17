import { evaluateScientificExpression } from './scientific.logic';

describe('Scientific Calculator Logic', () => {
  it('avoids floating point error on 0.1 + 0.2', () => {
    const res = evaluateScientificExpression('0.1 + 0.2', {
      angleMode: 'DEG',
      precision: 15,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.formatted).toBe('0.3');
    }
  });

  it('evaluates trig functions in DEG, RAD, and GRAD accurately', () => {
    const degSin = evaluateScientificExpression('sin(30)', {
      angleMode: 'DEG',
      precision: 30,
    });
    expect(degSin.ok).toBe(true);
    if (degSin.ok) {
      expect(degSin.formatted).toBe('0.5');
    }

    const gradCos = evaluateScientificExpression('cos(100)', {
      angleMode: 'GRAD',
      precision: 15,
    });
    expect(gradCos.ok).toBe(true);
    if (gradCos.ok) {
      expect(gradCos.formatted).toBe('0');
    }

    const radSin = evaluateScientificExpression('sin(pi / 6)', {
      angleMode: 'RAD',
      precision: 15,
    });
    expect(radSin.ok).toBe(true);
    if (radSin.ok) {
      expect(radSin.formatted).toBe('0.5');
    }

    const tinyRadSin = evaluateScientificExpression('sin(1e-18)', {
      angleMode: 'RAD',
      precision: 30,
    });
    expect(tinyRadSin.ok).toBe(true);
    if (tinyRadSin.ok) {
      expect(tinyRadSin.formatted).not.toBe('0');
      expect(tinyRadSin.formatted).toContain('e-18');
    }
  });

  it('evaluates powers, unary operators, factorials, and constants', () => {
    const powRes = evaluateScientificExpression('2^0.5', {
      angleMode: 'DEG',
      precision: 30,
    });
    expect(powRes.ok).toBe(true);
    if (powRes.ok) {
      expect(powRes.formatted.startsWith('1.4142135623730950488')).toBe(true);
    }

    const fact100 = evaluateScientificExpression('100!', {
      angleMode: 'DEG',
      precision: 15,
    });
    expect(fact100.ok).toBe(true);
    if (fact100.ok) {
      expect(fact100.formatted).toContain('9.33262154439442e+157');
    }

    const unaryPow = evaluateScientificExpression('-2^2 + 2^-3', {
      angleMode: 'DEG',
      precision: 15,
    });
    expect(unaryPow.ok).toBe(true);
    if (unaryPow.ok) {
      expect(unaryPow.formatted).toBe('-3.875');
    }

    const implicitMul = evaluateScientificExpression('2(3+4) + ans', {
      angleMode: 'DEG',
      precision: 15,
      ans: '6',
    });
    expect(implicitMul.ok).toBe(true);
    if (implicitMul.ok) {
      expect(implicitMul.formatted).toBe('20');
    }
  });

  it('reports domain and syntax errors cleanly', () => {
    const divZero = evaluateScientificExpression('5 / 0', {
      angleMode: 'DEG',
      precision: 15,
    });
    expect(divZero.ok).toBe(false);

    const tanRight = evaluateScientificExpression('tan(90)', {
      angleMode: 'DEG',
      precision: 15,
    });
    expect(tanRight.ok).toBe(false);

    const badParens = evaluateScientificExpression('(1 + 2', {
      angleMode: 'DEG',
      precision: 15,
    });
    expect(badParens.ok).toBe(false);
  });
});
