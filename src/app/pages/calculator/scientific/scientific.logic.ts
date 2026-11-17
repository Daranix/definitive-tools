import Decimal from 'decimal.js';
import type { CalculatorTranslate } from '../shared/calculator-format';

export type AngleMode = 'DEG' | 'RAD' | 'GRAD';
export type PrecisionDigits = 15 | 30 | 50;

export interface EvaluateOptions {
  angleMode: AngleMode;
  precision: PrecisionDigits;
  ans?: string | Decimal;
  maxFactorial?: number;
  /** Locale-aware translator for the produced error messages. */
  translate?: CalculatorTranslate;
}

export type ScientificResult =
  | { ok: true; value: Decimal; formatted: string }
  | { ok: false; error: string };

type TokenType =
  | 'number'
  | 'ident'
  | 'op'
  | 'unary'
  | 'postfix'
  | 'lparen'
  | 'rparen';

interface Token {
  type: TokenType;
  value: string;
}

const CONSTANTS = new Set(['pi', 'e', 'ans']);
const FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'sinh',
  'cosh',
  'tanh',
  'ln',
  'log',
  'log2',
  'sqrt',
  'cbrt',
  'abs',
  'exp',
  'inv',
  'sq',
  'cube',
]);

const BINARY_PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '%': 2,
  '^': 4,
};

const RIGHT_ASSOCIATIVE = new Set(['^']);

function normalizeExpression(raw: string): string {
  return raw
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/,/g, '.');
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch);
}

function canEndOperand(token: Token | undefined): boolean {
  if (!token) return false;
  if (token.type === 'number' || token.type === 'rparen' || token.type === 'postfix') {
    return true;
  }
  return token.type === 'ident' && CONSTANTS.has(token.value);
}

function needsImplicitMultiply(prev: Token | undefined, next: Token): boolean {
  if (!canEndOperand(prev)) {
    return false;
  }
  if (next.type === 'lparen' || next.type === 'ident') {
    return true;
  }
  return (
    next.type === 'number' &&
    prev !== undefined &&
    (prev.type === 'rparen' || prev.type === 'postfix' || prev.type === 'ident')
  );
}

function tokenize(expression: string, t: CalculatorTranslate): Token[] {
  const input = normalizeExpression(expression);
  const rawTokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    // Number literal (including optional scientific notation e.g. 1.5e-3)
    if (isDigit(ch) || (ch === '.' && i + 1 < input.length && isDigit(input[i + 1]))) {
      const start = i;
      while (i < input.length && isDigit(input[i])) {
        i += 1;
      }
      if (i < input.length && input[i] === '.') {
        i += 1;
        while (i < input.length && isDigit(input[i])) {
          i += 1;
        }
      }
      if (i < input.length && (input[i] === 'e' || input[i] === 'E')) {
        const expSign = input[i + 1];
        const hasSignedExp =
          (expSign === '+' || expSign === '-') &&
          i + 2 < input.length &&
          isDigit(input[i + 2]);
        const hasUnsignedExp = i + 1 < input.length && isDigit(input[i + 1]);

        if (hasSignedExp || hasUnsignedExp) {
          i += 1;
          if (hasSignedExp) {
            i += 1;
          }
          while (i < input.length && isDigit(input[i])) {
            i += 1;
          }
        }
      }
      rawTokens.push({ type: 'number', value: input.slice(start, i) });
      continue;
    }

    if (isIdentStart(ch)) {
      const start = i;
      while (i < input.length && isIdentPart(input[i])) {
        i += 1;
      }
      const ident = input.slice(start, i).toLowerCase();
      if (!CONSTANTS.has(ident) && !FUNCTIONS.has(ident)) {
        throw new Error(t('calculators.scientific.errors.unknownSymbol', { symbol: ident }));
      }
      rawTokens.push({ type: 'ident', value: ident });
      continue;
    }

    if (ch === '(') {
      rawTokens.push({ type: 'lparen', value: '(' });
      i += 1;
      continue;
    }

    if (ch === ')') {
      rawTokens.push({ type: 'rparen', value: ')' });
      i += 1;
      continue;
    }

    if (ch === '!') {
      rawTokens.push({ type: 'postfix', value: '!' });
      i += 1;
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' || ch === '^') {
      rawTokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }

    throw new Error(t('calculators.scientific.errors.invalidCharacter', { char: ch }));
  }

  // Insert implicit multiplication and distinguish unary +/-
  const tokens: Token[] = [];
  for (const tok of rawTokens) {
    const prev = tokens[tokens.length - 1];

    if (tok.type === 'op' && (tok.value === '+' || tok.value === '-') && !canEndOperand(prev)) {
      tokens.push({ type: 'unary', value: tok.value === '-' ? 'u-' : 'u+' });
      continue;
    }

    if (needsImplicitMultiply(prev, tok)) {
      tokens.push({ type: 'op', value: '*' });
    }

    tokens.push(tok);
  }

  return tokens;
}

function toRpn(tokens: Token[], t: CalculatorTranslate): Token[] {
  const output: Token[] = [];
  const stack: Token[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token.type === 'number') {
      output.push(token);
      continue;
    }

    if (token.type === 'ident') {
      if (CONSTANTS.has(token.value)) {
        output.push(token);
      } else {
        stack.push(token);
      }
      continue;
    }

    if (token.type === 'postfix') {
      if (!canEndOperand(tokens[i - 1])) {
        throw new Error(t('calculators.scientific.errors.factorialUsage'));
      }
      output.push(token);
      continue;
    }

    if (token.type === 'unary') {
      stack.push(token);
      continue;
    }

    if (token.type === 'lparen') {
      stack.push(token);
      continue;
    }

    if (token.type === 'rparen') {
      let foundLeftParen = false;
      while (stack.length > 0) {
        const top = stack.pop()!;
        if (top.type === 'lparen') {
          foundLeftParen = true;
          break;
        }
        output.push(top);
      }
      if (!foundLeftParen) {
        throw new Error(t('calculators.scientific.errors.unbalancedParens'));
      }
      if (stack.length > 0 && stack[stack.length - 1].type === 'ident') {
        output.push(stack.pop()!);
      }
      continue;
    }

    if (token.type === 'op') {
      const prec = BINARY_PRECEDENCE[token.value];
      const isRight = RIGHT_ASSOCIATIVE.has(token.value);

      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.type === 'lparen') {
          break;
        }
        const topPrec =
          top.type === 'ident'
            ? 6
            : top.type === 'unary'
              ? 3
              : BINARY_PRECEDENCE[top.value];

        if (topPrec > prec || (topPrec === prec && !isRight)) {
          output.push(stack.pop()!);
        } else {
          break;
        }
      }

      stack.push(token);
    }
  }

  while (stack.length > 0) {
    const top = stack.pop()!;
    if (top.type === 'lparen' || top.type === 'rparen') {
      throw new Error(t('calculators.scientific.errors.unbalancedParens'));
    }
    output.push(top);
  }

  return output;
}

function toRadians(
  value: Decimal,
  angleMode: AngleMode,
  pi: Decimal,
): Decimal {
  if (angleMode === 'DEG') {
    return value.mul(pi).div(180);
  }
  if (angleMode === 'GRAD') {
    return value.mul(pi).div(200);
  }
  return value;
}

function fromRadians(
  radians: Decimal,
  angleMode: AngleMode,
  pi: Decimal,
): Decimal {
  if (angleMode === 'DEG') {
    return radians.mul(180).div(pi);
  }
  if (angleMode === 'GRAD') {
    return radians.mul(200).div(pi);
  }
  return radians;
}

function computeFactorial(
  n: Decimal,
  WorkingDecimal: Decimal.Constructor,
  maxFactorial: number,
  t: CalculatorTranslate,
): Decimal {
  if (!n.isInteger() || n.isNegative()) {
    throw new Error(t('calculators.scientific.errors.factorialInteger'));
  }
  const intN = n.toNumber();
  if (intN > maxFactorial) {
    throw new Error(
      t('calculators.scientific.errors.factorialMax', { max: maxFactorial }),
    );
  }
  let acc = new WorkingDecimal(1);
  for (let k = 2; k <= intN; k += 1) {
    acc = acc.mul(k);
  }
  return acc;
}

function applyFunction(
  name: string,
  arg: Decimal,
  WorkingDecimal: Decimal.Constructor,
  angleMode: AngleMode,
  pi: Decimal,
  trigZeroThreshold: Decimal,
  t: CalculatorTranslate,
): Decimal {
  switch (name) {
    case 'sin': {
      if (arg.isZero()) {
        return new WorkingDecimal(0);
      }
      const rad = toRadians(arg, angleMode, pi);
      const res = WorkingDecimal.sin(rad);
      const k = rad.div(pi).round();
      return !k.isZero() && res.abs().lt(trigZeroThreshold) ? new WorkingDecimal(0) : res;
    }
    case 'cos': {
      const res = WorkingDecimal.cos(toRadians(arg, angleMode, pi));
      return res.abs().lt(trigZeroThreshold) ? new WorkingDecimal(0) : res;
    }
    case 'tan': {
      if (arg.isZero()) {
        return new WorkingDecimal(0);
      }
      const rad = toRadians(arg, angleMode, pi);
      const cosVal = WorkingDecimal.cos(rad);
      if (cosVal.abs().lt(trigZeroThreshold)) {
        throw new Error(t('calculators.scientific.errors.tanUndefined'));
      }
      const res = WorkingDecimal.sin(rad).div(cosVal);
      const k = rad.div(pi).round();
      return !k.isZero() && res.abs().lt(trigZeroThreshold) ? new WorkingDecimal(0) : res;
    }
    case 'asin': {
      if (arg.lt(-1) || arg.gt(1)) {
        throw new Error(t('calculators.scientific.errors.asinRange'));
      }
      return fromRadians(WorkingDecimal.asin(arg), angleMode, pi);
    }
    case 'acos': {
      if (arg.lt(-1) || arg.gt(1)) {
        throw new Error(t('calculators.scientific.errors.acosRange'));
      }
      return fromRadians(WorkingDecimal.acos(arg), angleMode, pi);
    }
    case 'atan':
      return fromRadians(WorkingDecimal.atan(arg), angleMode, pi);
    case 'sinh':
      return WorkingDecimal.sinh(arg);
    case 'cosh':
      return WorkingDecimal.cosh(arg);
    case 'tanh':
      return WorkingDecimal.tanh(arg);
    case 'ln':
      if (arg.lte(0)) {
        throw new Error(t('calculators.scientific.errors.lnPositive'));
      }
      return WorkingDecimal.ln(arg);
    case 'log':
      if (arg.lte(0)) {
        throw new Error(t('calculators.scientific.errors.logPositive'));
      }
      return WorkingDecimal.log10(arg);
    case 'log2':
      if (arg.lte(0)) {
        throw new Error(t('calculators.scientific.errors.log2Positive'));
      }
      return WorkingDecimal.log2(arg);
    case 'sqrt':
      if (arg.isNegative()) {
        throw new Error(t('calculators.scientific.errors.sqrtNegative'));
      }
      return WorkingDecimal.sqrt(arg);
    case 'cbrt':
      return WorkingDecimal.cbrt(arg);
    case 'abs':
      return arg.abs();
    case 'exp':
      return WorkingDecimal.exp(arg);
    case 'inv':
      if (arg.isZero()) {
        throw new Error(t('calculators.scientific.errors.invZero'));
      }
      return new WorkingDecimal(1).div(arg);
    case 'sq':
      return arg.mul(arg);
    case 'cube':
      return arg.mul(arg).mul(arg);
    default:
      throw new Error(t('calculators.scientific.errors.unsupportedFunction', { name }));
  }
}

function formatScientificDecimal(value: Decimal, precision: PrecisionDigits): string {
  const rounded = value.toSignificantDigits(precision);
  if (rounded.isZero()) {
    return '0';
  }
  return rounded.toString();
}

/**
 * Evaluates a mathematical expression using Decimal.js arbitrary-precision arithmetic.
 */
export function evaluateScientificExpression(
  expression: string,
  options: EvaluateOptions,
): ScientificResult {
  const t: CalculatorTranslate = options.translate ?? ((key) => key);
  const trimmed = expression.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: t('calculators.scientific.errors.emptyExpression'),
    };
  }

  const { angleMode, precision, ans = '0', maxFactorial = 170 } = options;

  try {
    const WorkingDecimal = Decimal.clone({
      precision: precision + 12,
      rounding: Decimal.ROUND_HALF_UP,
      toExpPos: precision,
      toExpNeg: -9,
    });

    const pi = WorkingDecimal.acos(-1);
    const euler = WorkingDecimal.exp(1);
    const ansDec = new WorkingDecimal(ans instanceof Decimal ? ans.toString() : ans || '0');
    const trigZeroThreshold = new WorkingDecimal(10).pow(-(precision + 2));

    const tokens = tokenize(trimmed, t);
    const rpn = toRpn(tokens, t);
    const evalStack: Decimal[] = [];

    for (const token of rpn) {
      if (token.type === 'number') {
        evalStack.push(new WorkingDecimal(token.value));
        continue;
      }

      if (token.type === 'ident') {
        if (token.value === 'pi') {
          evalStack.push(pi);
          continue;
        }
        if (token.value === 'e') {
          evalStack.push(euler);
          continue;
        }
        if (token.value === 'ans') {
          evalStack.push(ansDec);
          continue;
        }

        const arg = evalStack.pop();
        if (!arg) {
          throw new Error(
            t('calculators.scientific.errors.missingArgument', {
              name: token.value,
            }),
          );
        }
        evalStack.push(
          applyFunction(
            token.value,
            arg,
            WorkingDecimal,
            angleMode,
            pi,
            trigZeroThreshold,
            t,
          ),
        );
        continue;
      }

      if (token.type === 'unary') {
        const arg = evalStack.pop();
        if (!arg) {
          throw new Error(t('calculators.scientific.errors.incompleteExpression'));
        }
        evalStack.push(token.value === 'u-' ? arg.neg() : arg);
        continue;
      }

      if (token.type === 'postfix') {
        const arg = evalStack.pop();
        if (!arg) {
          throw new Error(t('calculators.scientific.errors.missingFactorialOperand'));
        }
        evalStack.push(computeFactorial(arg, WorkingDecimal, maxFactorial, t));
        continue;
      }

      if (token.type === 'op') {
        const right = evalStack.pop();
        const left = evalStack.pop();
        if (!left || !right) {
          throw new Error(t('calculators.scientific.errors.incompleteOperation'));
        }

        switch (token.value) {
          case '+':
            evalStack.push(left.plus(right));
            break;
          case '-':
            evalStack.push(left.minus(right));
            break;
          case '*':
            evalStack.push(left.mul(right));
            break;
          case '/':
            if (right.isZero()) {
              throw new Error(t('calculators.scientific.errors.divisionByZero'));
            }
            evalStack.push(left.div(right));
            break;
          case '%':
            if (right.isZero()) {
              throw new Error(t('calculators.scientific.errors.moduloByZero'));
            }
            evalStack.push(left.mod(right));
            break;
          case '^':
            if (left.isZero() && right.isNegative()) {
              throw new Error(t('calculators.scientific.errors.powerUndefined'));
            }
            if (left.isNegative() && !right.isInteger()) {
              throw new Error(
                t('calculators.scientific.errors.negativeBaseExponent'),
              );
            }
            evalStack.push(left.pow(right));
            break;
        }
      }
    }

    if (evalStack.length !== 1) {
      throw new Error(t('calculators.scientific.errors.invalidExpression'));
    }

    const rawResult = evalStack[0];
    if (!rawResult.isFinite()) {
      throw new Error(t('calculators.scientific.errors.outOfRange'));
    }

    const finalDecimal = rawResult.toSignificantDigits(precision);
    return {
      ok: true,
      value: finalDecimal,
      formatted: formatScientificDecimal(finalDecimal, precision),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : t('calculators.scientific.errors.evaluation'),
    };
  }
}
