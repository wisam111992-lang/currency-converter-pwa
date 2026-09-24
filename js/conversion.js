// Conversion logic — pure functions, no DOM, no storage, no network.
// Rates are expressed against USD: 1 USD = rates.X X for every active currency.

import { BASE_CURRENCY, isKnownCurrency, roundTo } from './currencies.js';

/** Rates required at all times (only the Dinar; Dollar is the base). */
export const REQUIRED_RATE_KEYS = Object.freeze(['IQD']);

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
  missingCurrencyRate: 'لم تحفظ سعر صرف لهذه العملة بعد',
};

/** Normalize digits + strip grouping so "1,500" / "١٥٠٠" / "1 500" all work. */
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

/** Parse a user-typed rate ("1500" / "1,500" / "0.92" / "١٥٠٠"). */
export function parseRate(input) {
  if (input === null || input === undefined) return null;
  let text = normalizeDigits(String(input).trim());
  if (text === '') return null;
  text = text.replace(/[٬,\s\u00a0]/g, '').replace(/[٫]/g, '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Parse a user-typed amount string ("2,000,000" / "2.5" / "۲۰۰۰"). */
export function parseAmount(input) {
  if (input === null || input === undefined) {
    throw new ConversionError(MESSAGES.emptyAmount);
  }
  let text = String(input).trim();
  if (text === '') throw new ConversionError(MESSAGES.emptyAmount);

  text = normalizeDigits(text);
  text = text.replace(/[٬,\s\u00a0]/g, '');
  text = text.replace(/[٫]/g, '.');

  if (!/^-?\d*(\.\d+)?$/.test(text) || text === '' || text === '.' || text === '-') {
    throw new ConversionError(MESSAGES.invalidAmount);
  }

  const value = Number(text);
  if (!Number.isFinite(value)) throw new ConversionError(MESSAGES.invalidAmount);
  if (value < 0) throw new ConversionError(MESSAGES.invalidAmount);
  if (value === 0) throw new ConversionError(MESSAGES.invalidAmount);
  return value;
}

/**
 * Validate rates coming from the settings form / storage.
 * - IQD is required (USD is the implicit base)
 * - any known currency present in `raw` (TOMAN, EUR, …) is optional but must be > 0
 * - unknown codes are ignored (keeps old/corrupt data loadable)
 * @param {Record<string, string|number>} raw
 * @returns {{ok: boolean, rates: Record<string, number>|null, errors: Record<string, string>}}
 */
export function validateRates(raw) {
  const errors = {};
  const rates = { [BASE_CURRENCY]: 1 };
  const input = raw && typeof raw === 'object' ? raw : {};

  const keys = new Set([...REQUIRED_RATE_KEYS, ...Object.keys(input)]);

  for (const key of keys) {
    if (key === BASE_CURRENCY) continue;
    if (!isKnownCurrency(key)) continue;

    const required = REQUIRED_RATE_KEYS.includes(key);
    const rawValue = input[key];
    const missing =
      rawValue === undefined || rawValue === null || String(rawValue).trim() === '';

    if (missing) {
      if (required) errors[key] = MESSAGES.missingRates;
      continue;
    }

    const value = parseRate(rawValue);
    if (value === null) {
      errors[key] = MESSAGES.invalidRate;
      continue;
    }
    rates[key] = value;
  }

  const ok = Object.keys(errors).length === 0;
  return { ok, rates: ok ? rates : null, errors };
}

/** Rates required for conversion must be present and positive. */
export function assertRates(rates) {
  if (!rates) throw new ConversionError(MESSAGES.missingRates);
  for (const key of REQUIRED_RATE_KEYS) {
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

  if (!fromRate || !Number.isFinite(fromRate) || fromRate <= 0) {
    throw new ConversionError(
      from === BASE_CURRENCY ? MESSAGES.missingRates : MESSAGES.missingCurrencyRate
    );
  }
  if (!toRate || !Number.isFinite(toRate) || toRate <= 0) {
    throw new ConversionError(
      to === BASE_CURRENCY ? MESSAGES.missingRates : MESSAGES.missingCurrencyRate
    );
  }

  const inBase = amount / fromRate;
  return roundTo(inBase * toRate, 8);
}

/** Convert one amount to every provided currency code. */
export function convertToAll(amount, from, rates, codes) {
  return codes.map((code) => ({
    code,
    value: convert(amount, from, code, rates),
  }));
}
