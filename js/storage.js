// Local storage service — everything stays on the device. No network, no accounts.

import { validateRates } from './conversion.js';

const KEY_RATES = 'currency_converter.rates.v1';
const KEY_HISTORY = 'currency_converter.history.v1';
const HISTORY_LIMIT = 10;

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Load saved rates.
 * @returns {{usdRates: {IQD:number,TOMAN:number}|null, updatedAt: string|null}}
 */
export function loadRates() {
  const raw = safeGet(KEY_RATES);
  if (!raw) return { usdRates: null, updatedAt: null };
  try {
    const parsed = JSON.parse(raw);
    const check = validateRates({
      IQD: parsed?.rates?.IQD,
      TOMAN: parsed?.rates?.TOMAN,
    });
    if (!check.ok) return { usdRates: null, updatedAt: null };
    return {
      usdRates: check.rates,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    };
  } catch {
    return { usdRates: null, updatedAt: null };
  }
}

/** Persist rates; returns the saved object (with ISO timestamp). */
export function saveRates(usdRates) {
  const check = validateRates(usdRates);
  if (!check.ok) {
    const err = new Error('invalid rates');
    err.fields = check.errors;
    throw err;
  }
  const payload = {
    rates: check.rates,
    updatedAt: new Date().toISOString(),
  };
  safeSet(KEY_RATES, JSON.stringify(payload));
  return { usdRates: payload.rates, updatedAt: payload.updatedAt };
}

export function hasRates() {
  return loadRates().usdRates !== null;
}

// --- conversion history (last 10, local only) ---

export function loadHistory() {
  const raw = safeGet(KEY_HISTORY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

export function pushHistory(entry) {
  const list = loadHistory();
  const next = [{ ...entry, at: new Date().toISOString() }, ...list].slice(0, HISTORY_LIMIT);
  safeSet(KEY_HISTORY, JSON.stringify(next));
  return next;
}

export function clearHistory() {
  safeRemove(KEY_HISTORY);
  return [];
}

/** Format an ISO timestamp for display: 23/09/2026 - 11:30 PM */
export function formatTimestamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return `${date} - ${time}`;
}
