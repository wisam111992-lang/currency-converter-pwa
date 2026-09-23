// Currency model — the only currencies the app understands.
// Codes are stable identifiers used in storage and conversion.

export const BASE_CURRENCY = 'USD';

export const CURRENCIES = Object.freeze([
  {
    code: 'USD',
    nameAr: 'الدولار الأمريكي',
    shortAr: 'دولار',
    symbol: 'USD',
    // how many fraction digits look natural for this currency
    maxDecimals: 2,
  },
  {
    code: 'IQD',
    nameAr: 'الدينار العراقي',
    shortAr: 'دينار عراقي',
    symbol: 'IQD',
    maxDecimals: 2,
  },
  {
    code: 'TOMAN',
    nameAr: 'التومان الإيراني',
    shortAr: 'تومان',
    symbol: 'TOMAN',
    maxDecimals: 2,
  },
]);

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code) {
  return BY_CODE.get(code) || null;
}

export function isKnownCurrency(code) {
  return BY_CODE.has(code);
}

/**
 * Format a number for display: thousands separators, no excessive rounding.
 * - integers show no decimals
 * - values smaller than 0.01 keep up to 6 decimals so tiny results stay visible
 * - everything else keeps up to 2 decimals (trailing zeros trimmed)
 */
export function formatAmount(value, code) {
  const currency = getCurrency(code);
  const symbol = currency ? currency.symbol : code;

  if (!Number.isFinite(value)) return `— ${symbol}`;

  const abs = Math.abs(value);
  let maxFractionDigits = currency ? currency.maxDecimals : 2;
  if (abs !== 0 && abs < 0.01) maxFractionDigits = 6;

  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
    useGrouping: true,
  });

  return `${formatter.format(roundTo(value, maxFractionDigits))} ${symbol}`;
}

export function roundTo(value, decimals) {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Format a number only (no symbol) — used by the amount input. */
export function formatNumber(value) {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  const maxFractionDigits = abs !== 0 && abs < 0.01 ? 6 : 2;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  }).format(roundTo(value, maxFractionDigits));
}
