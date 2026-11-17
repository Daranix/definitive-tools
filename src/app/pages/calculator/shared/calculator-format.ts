import Decimal from 'decimal.js';
import { z } from 'zod';

export interface NumberFieldRuleOptions {
  requiredMessage: string;
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  integer?: { message: string };
}

/**
 * Builds a Zod v4 schema for Signal Forms numeric inputs that become null when cleared.
 */
export function requiredNumberField(options: NumberFieldRuleOptions) {
  return z
    .number({ error: options.requiredMessage })
    .nullable()
    .superRefine((val, ctx) => {
      if (val === null || !Number.isFinite(val)) {
        ctx.addIssue({ code: 'custom', message: options.requiredMessage });
        return;
      }
      if (options.integer && !Number.isInteger(val)) {
        ctx.addIssue({ code: 'custom', message: options.integer.message });
      }
      if (options.min && val < options.min.value) {
        ctx.addIssue({ code: 'custom', message: options.min.message });
      }
      if (options.max && val > options.max.value) {
        ctx.addIssue({ code: 'custom', message: options.max.message });
      }
    });
}

export interface ToastNotifier {
  success(opts: { message: string }): void;
  error(opts: { message: string }): void;
}

const currencyFormatterCache = new Map<number, Intl.NumberFormat>();
const numberFormatterCache = new Map<number, Intl.NumberFormat>();

function toFiniteNumber(value: number | Decimal): number {
  const numeric = value instanceof Decimal ? value.toNumber() : value;
  return Number.isFinite(numeric) ? numeric : 0;
}

function getCurrencyFormatter(decimals: number): Intl.NumberFormat {
  const normalizedDecimals = Math.max(0, Math.min(6, Math.trunc(decimals)));
  const cached = currencyFormatterCache.get(normalizedDecimals);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: normalizedDecimals,
    maximumFractionDigits: normalizedDecimals,
    useGrouping: true,
  });
  currencyFormatterCache.set(normalizedDecimals, formatter);
  return formatter;
}

function getNumberFormatter(maxDecimals: number): Intl.NumberFormat {
  const normalizedDecimals = Math.max(0, Math.min(12, Math.trunc(maxDecimals)));
  const cached = numberFormatterCache.get(normalizedDecimals);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: normalizedDecimals,
    useGrouping: true,
  });
  numberFormatterCache.set(normalizedDecimals, formatter);
  return formatter;
}

/**
 * Computes annual payment count from extra payments (0..12), defaulting to 12 when empty/invalid.
 */
export function computeTotalPayments(extraPayments: number | null | undefined): number {
  if (extraPayments === null || extraPayments === undefined || !Number.isFinite(extraPayments)) {
    return 12;
  }
  return 12 + Math.max(0, Math.min(12, Math.trunc(extraPayments)));
}

/**
 * Rounds a Decimal value to 2 decimal places using half-up rounding.
 */
export function round2(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Formats a numeric or Decimal value as Euro currency in Spanish locale.
 */
export function formatCurrencyEs(value: number | Decimal, decimals = 2): string {
  return getCurrencyFormatter(decimals).format(toFiniteNumber(value));
}

/**
 * Formats a numeric or Decimal value in Spanish locale up to maxDecimals places.
 */
export function formatNumberEs(value: number | Decimal, maxDecimals = 2): string {
  return getNumberFormatter(maxDecimals).format(toFiniteNumber(value));
}

/**
 * Safely converts an arbitrary input (including Spanish-formatted strings like "1.234,56")
 * into a finite number, returning fallback if invalid.
 */
export function toSafeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (value instanceof Decimal) {
    const numeric = value.toNumber();
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/\s+/g, '');
    if (!trimmed) {
      return fallback;
    }

    let normalized = trimmed;
    const hasComma = trimmed.includes(',');
    const hasDot = trimmed.includes('.');

    if (hasComma && hasDot) {
      if (trimmed.lastIndexOf(',') > trimmed.lastIndexOf('.')) {
        normalized = trimmed.replace(/\./g, '').replace(',', '.');
      } else {
        normalized = trimmed.replace(/,/g, '');
      }
    } else if (hasComma) {
      const commaCount = (trimmed.match(/,/g) ?? []).length;
      normalized = commaCount === 1 ? trimmed.replace(',', '.') : trimmed.replace(/,/g, '');
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

/**
 * Parses a raw form input into a finite number, or returns null when empty/invalid.
 */
export function parseNullableNumber(rawValue: unknown): number | null {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }
  const parsed = toSafeNumber(rawValue, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Copies text to the browser clipboard safely for SSR and reports status via ToastService.
 */
export async function copyTextToClipboard(
  isBrowser: boolean,
  text: string,
  toastService: ToastNotifier,
  successMessage = 'Resultado copiado al portapapeles',
): Promise<boolean> {
  if (!isBrowser || typeof navigator === 'undefined' || !navigator?.clipboard) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    toastService.success({ message: successMessage });
    return true;
  } catch {
    toastService.error({ message: 'No se pudo copiar el resultado' });
    return false;
  }
}

function escapeCsvCell(cell: string | number): string {
  const raw = String(cell);
  if (/[",\r\n;]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/**
 * Triggers a client-side CSV file download in browser environments.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL === 'undefined'
  ) {
    return;
  }

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  const csvContent = `\uFEFF${lines.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
