// Conversion logic — pure functions, no DOM, no storage, no network.
// Rates are expressed against USD: 1 USD = rates.IQD IQD, 1 USD = rates.TOMAN TOMAN.

import { BASE_CURRENCY, isKnownCurrency, roundTo } from './currencies.js';

export const RATE_KEYS = Object.freeze(['IQD', 'TOMAN']);

export class ConversionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConversionError';
  }
}

export const MESSAGES = {
  missingRates: 'يرجى إدخال أسعار الصرف أولاً',
  invalidRate: 'يرجى إدخال سعر صرف صحيح',
  emptyAmount: 'أدخل المبلغ المراد تحويله',
  invalidAmount: 'أدخل مبلغاً صحيحاً',
  unknownCurrency: 'عملة غير مدعومة',
};

/** Validate raw rates coming from the settings form. */
export function validateRates(raw) {
  const errors = {};
  const rates = { [BASE_CURRENCY]: 1 };

  for (const key of RATE_KEYS) {
    const value = Number(raw[key]);
    if (raw[key] === undefined || raw[key] === null || String(raw[key]).trim() === '') {
      errors[key] = MESSAGES.missingRates;
      continue;
    }
    if (!Number.isFinite(value) || value <= 0) {
      errors[key] = MESSAGES.invalidRate;
      continue;
    }
    rates[key] = value;
  }

  const ok = Object.keys(errors).length === 0;
  return { ok, rates: ok ? rates : null, errors };
}

/** Parse a user-typed amount string ("2,000,000" / "2.5" / "۲۰۰۰"). */
export function parseAmount(input) {
  if (input === null || input === undefined) {
    throw new ConversionError(MESSAGES.emptyAmount);
  }
  let text = String(input).trim();
  if (text === '') throw new ConversionError(MESSAGES.emptyAmount);

  // normalize Arabic-Indic digits and Persian/Arabic separators
  text = normalizeDigits(text);
  text = text.replace(/[٬,\s\u00a0]/g, ''); // thousands separators + spaces
  text = text.replace(/[٫]/g, '.');         // Arabic decimal separator

  if (!/^-?\d*(\.\d+)?$/.test(text) || text === '' || text === '.' || text === '-') {
    throw new ConversionError(MESSAGES.invalidAmount);
  }

  const value = Number(text);
  if (!Number.isFinite(value)) throw new ConversionError(MESSAGES.invalidAmount);
  if (value < 0) throw new ConversionError(MESSAGES.invalidAmount);
  if (value === 0) throw new ConversionError(MESSAGES.invalidAmount);
  return value;
}

export function normalizeDigits(text) {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  return String(text).replace(/[٠-٩۰-۹]/g, (d) => {
    const i = arabic.indexOf(d);
    if (i > -1) return String(i);
    const j = persian.indexOf(d);
    return j > -1 ? String(j) : d;
  });
}

/** Rates required for conversion must be present and positive. */
export function assertRates(rates) {
  if (!rates) throw new ConversionError(MESSAGES.missingRates);
  for (const key of RATE_KEYS) {
    const value = Number(rates[key]);
    if (!Number.isFinite(value) || value <= 0) {
      throw new ConversionError(MESSAGES.invalidRate);
    }
  }
  return rates;
}

/** Convert amount between two currencies using USD-based rates. */
export function convert(amount, from, to, rates) {
  if (!isKnownCurrency(from) || !isKnownCurrency(to)) {
    throw new ConversionError(MESSAGES.unknownCurrency);
  }
  assertRates(rates);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ConversionError(MESSAGES.invalidAmount);
  }
  if (from === to) return amount;

  const fromRate = from === BASE_CURRENCY ? 1 : Number(rates[from]);
  const toRate = to === BASE_CURRENCY ? 1 : Number(rates[to]);
  if (!fromRate || !toRate) throw new ConversionError(MESSAGES.missingRates);

  const inBase = amount / fromRate;
  return roundTo(inBase * toRate, 8);
}

/** Convert one amount to every supported currency. */
export function convertToAll(amount, from, rates, codes) {
  return codes.map((code) => ({
    code,
    value: convert(amount, from, code, rates),
  }));
}
