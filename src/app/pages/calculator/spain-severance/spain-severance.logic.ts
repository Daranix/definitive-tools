import Decimal from 'decimal.js';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInMonths,
  isAfter,
  isBefore,
  isValid,
  parse,
} from 'date-fns';
import { computeTotalPayments, round2 } from '../shared/calculator-format';

export type SalaryInputMode = 'annual' | 'monthly';
export type DismissalType =
  | 'unfair'
  | 'objective'
  | 'disciplinary'
  | 'temporary_end'
  | 'modification';

export interface SpainSeveranceInput {
  startDate: string;
  endDate: string;
  salaryMode: SalaryInputMode;
  salaryAmount: number;
  extraPayments: number;
  dismissalType: DismissalType;
}

export interface SpainSeveranceSummary {
  grossAnnual: number;
  dailySalary: number;
  tenureYears: number;
  tenureMonths: number;
  tenureDays: number;
  computableMonthsTotal: number;
  computableMonthsPre: number;
  computableMonthsPost: number;
  daysPre: number;
  daysPost: number;
  totalDaysUncapped: number;
  totalDaysFinal: number;
  capApplied: string | null;
  severanceAmount: number;
  irpfExemptLimit: number;
  irpfTaxableExcess: number;
}

export type SpainSeveranceResult =
  | { ok: true; data: SpainSeveranceSummary }
  | { ok: false; error: string };

const ISO_DATE_FORMAT = 'yyyy-MM-dd';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PARSE_REFERENCE = new Date(2000, 0, 1);

export function parseIsoDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!ISO_DATE_PATTERN.test(trimmed)) {
    return null;
  }
  const parsed = parse(trimmed, ISO_DATE_FORMAT, PARSE_REFERENCE);
  return isValid(parsed) ? parsed : null;
}

const REFORM_CUTOFF = parse('2012-02-12', ISO_DATE_FORMAT, PARSE_REFERENCE);
const REFORM_PRE_END = parse('2012-02-11', ISO_DATE_FORMAT, PARSE_REFERENCE);
const IRPF_EXEMPT_LIMIT = 180000;

/**
 * Computes inclusive calendar tenure and Supreme Court prorated months (any fraction >= 1 day counts as +1 month).
 */
function calculateInclusiveTenure(
  start: Date,
  end: Date,
): { years: number; months: number; days: number; computableMonths: number } {
  const endExclusive = addDays(end, 1);
  const totalMonths = differenceInMonths(endExclusive, start);
  const anchor = addMonths(start, totalMonths);
  const remainingDays = Math.max(0, differenceInCalendarDays(endExclusive, anchor));

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: remainingDays,
    computableMonths: totalMonths + (remainingDays > 0 ? 1 : 0),
  };
}

/**
 * Calculates Spanish labor severance pay with 2012 reform 45/33 split and statutory caps.
 */
export function calculateSpainSeverance(input: SpainSeveranceInput): SpainSeveranceResult {
  const start = parseIsoDate(input.startDate);
  const end = parseIsoDate(input.endDate);

  if (!start || !end) {
    return {
      ok: false,
      error: 'Introduce fechas de inicio y fin válidas (AAAA-MM-DD).',
    };
  }

  if (isBefore(end, start)) {
    return {
      ok: false,
      error: 'La fecha de despido o fin debe ser igual o posterior a la fecha de inicio.',
    };
  }

  if (!Number.isFinite(input.salaryAmount) || input.salaryAmount < 0) {
    return {
      ok: false,
      error: 'El salario bruto debe ser un importe mayor o igual a 0 €.',
    };
  }

  if (input.salaryMode === 'monthly') {
    if (
      !Number.isFinite(input.extraPayments) ||
      !Number.isInteger(input.extraPayments) ||
      input.extraPayments < 0 ||
      input.extraPayments > 12
    ) {
      return {
        ok: false,
        error: 'El número de pagas extra debe ser un entero entre 0 y 12.',
      };
    }
  }

  const totalPayments = computeTotalPayments(input.extraPayments);
  const grossAnnualDec =
    input.salaryMode === 'annual'
      ? new Decimal(input.salaryAmount)
      : new Decimal(input.salaryAmount).mul(totalPayments);

  const dailySalaryExact = grossAnnualDec.div(365);
  const fullTenure = calculateInclusiveTenure(start, end);

  let computableMonthsPre = 0;
  let computableMonthsPost = 0;

  if (isBefore(start, REFORM_CUTOFF)) {
    const preEnd = isAfter(end, REFORM_PRE_END) ? REFORM_PRE_END : end;
    computableMonthsPre = calculateInclusiveTenure(start, preEnd).computableMonths;
  }

  if (!isBefore(end, REFORM_CUTOFF)) {
    const postStart = isBefore(start, REFORM_CUTOFF) ? REFORM_CUTOFF : start;
    computableMonthsPost = calculateInclusiveTenure(postStart, end).computableMonths;
  }

  let daysPreDec = new Decimal(0);
  let daysPostDec = new Decimal(0);
  let totalDaysUncappedDec = new Decimal(0);
  let totalDaysFinalDec = new Decimal(0);
  let capApplied: string | null = null;

  switch (input.dismissalType) {
    case 'unfair': {
      daysPreDec = new Decimal(computableMonthsPre).mul(45).div(12);
      daysPostDec = new Decimal(computableMonthsPost).mul(33).div(12);
      totalDaysUncappedDec = daysPreDec.plus(daysPostDec);

      if (daysPreDec.gt(720)) {
        if (daysPreDec.gt(1260)) {
          totalDaysFinalDec = new Decimal(1260);
          capApplied =
            'Tope máximo de 42 mensualidades (1.260 días) sobre el tramo anterior al 12/02/2012.';
        } else {
          totalDaysFinalDec = daysPreDec;
          capApplied =
            'Tramo previo al 12/02/2012 superior a 720 días: se consolidan los días devengados antes de la reforma sin añadir días posteriores.';
        }
        daysPostDec = new Decimal(0);
      } else if (totalDaysUncappedDec.gt(720)) {
        totalDaysFinalDec = new Decimal(720);
        capApplied = 'Tope máximo legal de 24 mensualidades (720 días).';
      } else {
        totalDaysFinalDec = totalDaysUncappedDec;
      }
      break;
    }

    case 'objective': {
      totalDaysUncappedDec = new Decimal(fullTenure.computableMonths).mul(20).div(12);
      if (totalDaysUncappedDec.gt(360)) {
        totalDaysFinalDec = new Decimal(360);
        capApplied = 'Tope máximo legal de 12 mensualidades (360 días).';
      } else {
        totalDaysFinalDec = totalDaysUncappedDec;
      }
      break;
    }

    case 'modification': {
      totalDaysUncappedDec = new Decimal(fullTenure.computableMonths).mul(20).div(12);
      if (totalDaysUncappedDec.gt(270)) {
        totalDaysFinalDec = new Decimal(270);
        capApplied = 'Tope máximo legal de 9 mensualidades (270 días).';
      } else {
        totalDaysFinalDec = totalDaysUncappedDec;
      }
      break;
    }

    case 'temporary_end': {
      totalDaysUncappedDec = new Decimal(fullTenure.computableMonths).mul(12).div(12);
      totalDaysFinalDec = totalDaysUncappedDec;
      break;
    }

    case 'disciplinary': {
      totalDaysUncappedDec = new Decimal(0);
      totalDaysFinalDec = new Decimal(0);
      break;
    }
  }

  const severanceAmount = round2(dailySalaryExact.mul(totalDaysFinalDec));
  const isIrpfExempt =
    input.dismissalType !== 'temporary_end' && input.dismissalType !== 'disciplinary';
  const irpfExemptLimit = isIrpfExempt ? IRPF_EXEMPT_LIMIT : 0;
  const irpfTaxableExcess = round2(Decimal.max(0, severanceAmount.minus(irpfExemptLimit)));

  return {
    ok: true,
    data: {
      grossAnnual: round2(grossAnnualDec).toNumber(),
      dailySalary: round2(dailySalaryExact).toNumber(),
      tenureYears: fullTenure.years,
      tenureMonths: fullTenure.months,
      tenureDays: fullTenure.days,
      computableMonthsTotal: fullTenure.computableMonths,
      computableMonthsPre,
      computableMonthsPost,
      daysPre: round2(daysPreDec).toNumber(),
      daysPost: round2(daysPostDec).toNumber(),
      totalDaysUncapped: round2(totalDaysUncappedDec).toNumber(),
      totalDaysFinal: round2(totalDaysFinalDec).toNumber(),
      capApplied,
      severanceAmount: severanceAmount.toNumber(),
      irpfExemptLimit,
      irpfTaxableExcess: irpfTaxableExcess.toNumber(),
    },
  };
}
