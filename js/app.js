// UI layer — wires the screens to conversion + storage. No network usage.
// Supports core currencies (USD/IQD/TOMAN) + world currencies added by the user.

import {
  BASE_CURRENCY,
  CATALOG_ORDER,
  CORE_CURRENCIES,
  getAvailableWorldCurrencies,
  getCurrency,
  formatAmount,
} from './currencies.js';
import {
  ConversionError,
  MESSAGES,
  convert,
  normalizeDigits,
  parseAmount,
  parseRate,
  validateRates,
} from './conversion.js';
import {
  clearHistory,
  formatTimestamp,
  loadHistory,
  loadRates,
  loadTheme,
  pushHistory,
  saveRates,
  saveTheme,
} from './storage.js';

const $ = (sel) => document.querySelector(sel);

/** Cross-browser form submit (requestSubmit is missing in some engines). */
function submitForm(form) {
  if (typeof form.requestSubmit === 'function') {
    form.requestSubmit();
  } else {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
}

const CORE_CODES = CORE_CURRENCIES.map((c) => c.code);

const els = {
  screenSetup: $('#screen-setup'),
  screenMain: $('#screen-main'),
  screenRates: $('#screen-rates'),
  setupForm: $('#setup-form'),
  setupIqd: $('#setup-iqd'),
  setupIqdError: $('#setup-iqd-error'),
  themeBtn: $('#btn-theme'),
  convertForm: $('#convert-form'),
  fromCurrency: $('#from-currency'),
  toCurrency: $('#to-currency'),
  swap: $('#btn-swap'),
  amount: $('#amount-input'),
  amountError: $('#amount-error'),
  results: $('#results'),
  primaryValue: $('#result-primary-value'),
  primaryCode: $('#result-primary-code'),
  others: $('#result-others'),
  openRates: $('#btn-open-rates'),
  closeRates: $('#btn-close-rates'),
  ratesForm: $('#rates-form'),
  ratesIqd: $('#rates-iqd'),
  ratesIqdError: $('#rates-iqd-error'),
  ratesToast: $('#rates-toast'),
  lastUpdate: $('#last-update'),
  worldList: $('#world-rates-list'),
  worldEmpty: $('#world-empty'),
  addSelect: $('#add-currency-select'),
  addRate: $('#add-currency-rate'),
  addBtn: $('#btn-add-currency'),
  addError: $('#add-currency-error'),
  historySection: $('#history-section'),
  historyList: $('#history-list'),
  clearHistory: $('#btn-clear-history'),
};

let rates = null; // saved: { USD:1, IQD, TOMAN, ...world }
let ratesDraft = null; // working copy while the rates screen is open
let lastResult = null; // { from, amount }

/* ─────────────── helpers ─────────────── */

function show(screen) {
  for (const s of [els.screenSetup, els.screenMain, els.screenRates]) {
    s.hidden = s !== screen;
  }
}

function setError(input, errorEl, message) {
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    if (input) input.classList.add('invalid');
  } else {
    errorEl.hidden = true;
    errorEl.textContent = '';
    if (input) input.classList.remove('invalid');
  }
}

/** Active currency codes in display order (core always + added world). */
function activeCodes() {
  if (!rates) return [...CORE_CODES]; // before first save: core only
  const saved = new Set(Object.keys(rates));
  for (const code of [...CORE_CODES, BASE_CURRENCY]) saved.add(code);
  return CATALOG_ORDER.filter((code) => saved.has(code));
}

function activeCurrencies() {
  return activeCodes().map(getCurrency).filter(Boolean);
}

function worldCodesOf(ratesMap) {
  return Object.keys(ratesMap || {})
    .filter((code) => code !== BASE_CURRENCY && !CORE_CODES.includes(code))
    .sort((a, b) => CATALOG_ORDER.indexOf(a) - CATALOG_ORDER.indexOf(b));
}

/** Keep only digits + one decimal point; group thousands while typing. */
function sanitizeNumeric(raw) {
  let text = normalizeDigits(raw);
  text = text.replace(/[^\d.]/g, '');
  const firstDot = text.indexOf('.');
  if (firstDot !== -1) {
    text = text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, '');
  }
  return text;
}

function groupNumeric(text) {
  if (text === '' || text === '.') return text;
  const [intPart, ...rest] = text.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return rest.length ? `${grouped}.${rest.join('')}` : grouped;
}

/** Sanitize + group an input in place (keeps caret at end). */
function formatNumericInput(input) {
  const caretEnd = input.selectionStart === input.value.length;
  const grouped = groupNumeric(sanitizeNumeric(input.value));
  if (grouped !== input.value) {
    input.value = grouped;
    if (caretEnd) {
      const pos = grouped.length;
      try {
        input.setSelectionRange(pos, pos);
      } catch {
        /* some inputs don't support selection */
      }
    }
  }
  return grouped;
}

function bindNumericInput(input, onErrorClear) {
  input.addEventListener('input', () => {
    formatNumericInput(input);
    if (onErrorClear) onErrorClear();
  });
}

/* ─────────────── currency selects ─────────────── */

function rebuildCurrencySelects() {
  const prevFrom = els.fromCurrency.value;
  const prevTo = els.toCurrency.value;
  const currencies = activeCurrencies();
  const codes = currencies.map((c) => c.code);

  const html = currencies
    .map((c) => `<option value="${c.code}">${c.shortAr}</option>`)
    .join('');
  els.fromCurrency.innerHTML = html;
  els.toCurrency.innerHTML = html;

  els.fromCurrency.value = codes.includes(prevFrom) ? prevFrom : codes[0];

  const preferredTo = codes.includes('IQD') && els.fromCurrency.value !== 'IQD' ? 'IQD' : null;
  const fallbackTo =
    preferredTo || codes.find((c) => c !== els.fromCurrency.value) || codes[0];
  els.toCurrency.value =
    codes.includes(prevTo) && prevTo !== els.fromCurrency.value ? prevTo : fallbackTo;
}

/* ─────────────── results rendering ─────────────── */

function renderResults(fromCode, amount) {
  const targets = activeCurrencies()
    .filter((c) => c.code !== fromCode)
    .map((c) => ({
      code: c.code,
      value: convert(amount, fromCode, c.code, rates),
    }));

  if (!targets.length) return;

  const toCode = els.toCurrency.value;
  const primary =
    targets.find((t) => t.code === toCode) ||
    targets.find((t) => t.code !== fromCode) ||
    targets[0];

  const primaryCur = getCurrency(primary.code);
  els.primaryValue.textContent = formatAmount(primary.value, primary.code);
  els.primaryCode.textContent = primaryCur.nameAr;

  els.others.innerHTML = targets
    .filter((t) => t.code !== primary.code)
    .map((t) => {
      const cur = getCurrency(t.code);
      return `
        <article class="result-row" data-code="${t.code}">
          <span class="rr-avatar">${t.code}</span>
          <span class="rr-info">
            <span class="rr-name">${cur.nameAr}</span>
            <span class="rr-value">${formatAmount(t.value, t.code)}</span>
          </span>
        </article>`;
    })
    .join('');

  els.results.hidden = false;
  lastResult = { from: fromCode, amount };

  // history: record the visible conversion (from → primary), skip exact duplicates
  const entry = {
    from: { code: fromCode, value: amount },
    to: { code: primary.code, value: primary.value },
  };
  const [latest] = loadHistory();
  const isDuplicate =
    latest &&
    latest.from.code === entry.from.code &&
    latest.to.code === entry.to.code &&
    latest.from.value === entry.from.value &&
    latest.to.value === entry.to.value;
  if (!isDuplicate) pushHistory(entry);
  renderHistory();
}

function renderHistory() {
  const items = loadHistory();
  if (!items.length) {
    els.historyList.innerHTML = '';
    els.historySection.hidden = true;
    return;
  }
  els.historySection.hidden = false;
  els.historyList.innerHTML = items
    .map((item) => {
      const fromLabel = formatAmount(item.from.value, item.from.code);
      const toLabel = formatAmount(item.to.value, item.to.code);
      return `<li>
        <span class="h-from">${fromLabel}</span>
        <span class="h-arrow">←</span>
        <span class="h-to">${toLabel}</span>
      </li>`;
    })
    .join('');
}

/** Re-run the last conversion with current rates (if results are on screen). */
function refreshLiveResult() {
  if (!lastResult || els.amount.value.trim() === '') return;
  if (!activeCodes().includes(lastResult.from)) {
    els.results.hidden = true;
    lastResult = null;
    return;
  }
  try {
    const amount = parseAmount(els.amount.value);
    renderResults(lastResult.from, amount);
  } catch {
    /* keep previous results */
  }
}

/* ─────────────── setup screen ─────────────── */

function bindSetup() {
  bindNumericInput(els.setupIqd, () => setError(els.setupIqd, els.setupIqdError, null));

  els.setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = { IQD: els.setupIqd.value };
    const { ok, rates: next, errors } = validateRates(raw);

    setError(els.setupIqd, els.setupIqdError, errors.IQD);
    if (!ok) return;

    const saved = saveRates(next);
    rates = saved.usdRates;
    rebuildCurrencySelects();
    enterMain();
  });
}

/* ─────────────── converter screen ─────────────── */

function bindConverter() {
  bindNumericInput(els.amount, () => setError(els.amount, els.amountError, null));

  els.convertForm.addEventListener('submit', (e) => {
    e.preventDefault();
    setError(els.amount, els.amountError, null);

    if (!rates) {
      setError(els.amount, els.amountError, MESSAGES.missingRates);
      return;
    }

    let amount;
    try {
      amount = parseAmount(els.amount.value);
    } catch (err) {
      setError(
        els.amount,
        els.amountError,
        err instanceof ConversionError ? err.message : MESSAGES.invalidAmount
      );
      return;
    }

    try {
      renderResults(els.fromCurrency.value, amount);
    } catch (err) {
      setError(
        els.amount,
        els.amountError,
        err instanceof ConversionError ? err.message : MESSAGES.invalidRate
      );
    }
  });

  // ⇅ swap — keep the amount, exchange the two currencies
  els.swap.addEventListener('click', () => {
    const from = els.fromCurrency.value;
    const to = els.toCurrency.value;
    els.fromCurrency.value = to;
    els.toCurrency.value = from;
    if (rates && els.amount.value.trim() !== '') submitForm(els.convertForm);
  });

  const onCurrencyChange = () => {
    if (els.fromCurrency.value === els.toCurrency.value) {
      const other = activeCodes().find((c) => c !== els.fromCurrency.value);
      if (other) els.toCurrency.value = other;
    } else if (els.toCurrency.value === els.fromCurrency.value) {
      const other = activeCodes().find((c) => c !== els.toCurrency.value);
      if (other) els.fromCurrency.value = other;
    }
    if (rates && els.amount.value.trim() !== '') submitForm(els.convertForm);
  };

  els.fromCurrency.addEventListener('change', onCurrencyChange);
  els.toCurrency.addEventListener('change', onCurrencyChange);

  els.clearHistory.addEventListener('click', () => {
    clearHistory();
    renderHistory();
  });
}

/* ─────────────── rates settings screen ─────────────── */

function renderWorldRows() {
  const codes = worldCodesOf(ratesDraft);
  els.worldEmpty.hidden = codes.length > 0;

  els.worldList.innerHTML = codes
    .map((code) => {
      const cur = getCurrency(code);
      const value = ratesDraft[code] ?? '';
      return `
        <div class="world-row" data-code="${code}">
          <div class="world-row-top">
            <span class="world-name">${cur.nameAr} <span class="world-code">${code}</span></span>
            <button type="button" class="btn btn-text" data-del="${code}">حذف</button>
          </div>
          <div class="rate-row">
            <label class="rate-label" for="rate-${code}">1 USD =</label>
            <input
              id="rate-${code}"
              class="rate-input"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              data-rate="${code}"
              value="${groupNumeric(String(value))}"
            />
            <span class="rate-suffix">${code}</span>
          </div>
          <p class="field-error" data-error="${code}" hidden></p>
        </div>`;
    })
    .join('');
}

function fillAddSelect() {
  const available = getAvailableWorldCurrencies(Object.keys(ratesDraft || {}));
  const html = available
    .map((c) => `<option value="${c.code}">${c.nameAr} (${c.code})</option>`)
    .join('');
  els.addSelect.innerHTML =
    html || '<option value="" disabled selected>تمت إضافة كل العملات</option>';
  els.addSelect.disabled = available.length === 0;
  els.addBtn.disabled = available.length === 0;
}

function openRatesScreen() {
  ratesDraft = { ...(rates || {}) };
  els.ratesIqd.value = ratesDraft.IQD ? groupNumeric(String(ratesDraft.IQD)) : '';
  setError(els.ratesIqd, els.ratesIqdError, null);
  setError(null, els.addError, null);
  els.addRate.value = '';
  els.addRate.classList.remove('invalid');
  renderWorldRows();
  fillAddSelect();
  show(els.screenRates);
}

function bindRates() {
  bindNumericInput(els.ratesIqd, () => setError(els.ratesIqd, els.ratesIqdError, null));
  bindNumericInput(els.addRate, () => setError(els.addRate, els.addError, null));

  els.openRates.addEventListener('click', openRatesScreen);

  els.closeRates.addEventListener('click', () => {
    if (rates) show(els.screenMain);
    else show(els.screenSetup);
  });

  // world rows: live edit + delete (delegated)
  els.worldList.addEventListener('input', (e) => {
    const input = e.target.closest('[data-rate]');
    if (!input) return;
    formatNumericInput(input);
    const code = input.dataset.rate;
    ratesDraft[code] = input.value;
    const err = els.worldList.querySelector(`[data-error="${code}"]`);
    setError(input, err, null);
  });

  els.worldList.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (!del) return;
    delete ratesDraft[del.dataset.del];
    renderWorldRows();
    fillAddSelect();
  });

  // add a world currency to the draft
  els.addBtn.addEventListener('click', () => {
    setError(null, els.addError, null);
    els.addRate.classList.remove('invalid');

    const code = els.addSelect.value;
    if (!code) {
      setError(null, els.addError, 'اختر عملة أولاً');
      return;
    }
    const value = parseRate(els.addRate.value);
    if (value === null) {
      setError(els.addRate, els.addError, MESSAGES.invalidRate);
      return;
    }
    ratesDraft[code] = value;
    els.addRate.value = '';
    renderWorldRows();
    fillAddSelect();
  });

  // save everything (core + world draft)
  els.ratesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    ratesDraft = ratesDraft || { ...(rates || {}) };
    ratesDraft.IQD = els.ratesIqd.value;

    const { ok, rates: next, errors } = validateRates(ratesDraft);

    setError(els.ratesIqd, els.ratesIqdError, errors.IQD);

    // world row errors
    for (const row of els.worldList.querySelectorAll('.world-row')) {
      const code = row.dataset.code;
      const input = row.querySelector('[data-rate]');
      const err = row.querySelector('[data-error]');
      setError(input, err, errors[code]);
    }

    if (!ok) return;

    const saved = saveRates(next);
    rates = saved.usdRates;
    ratesDraft = { ...rates };
    rebuildCurrencySelects();

    const stamp = formatTimestamp(saved.updatedAt);
    if (stamp) {
      els.lastUpdate.textContent = `آخر تحديث يدوي:\n${stamp}`;
      els.lastUpdate.hidden = false;
    }

    els.ratesToast.textContent = 'تم حفظ أسعار الصرف';
    els.ratesToast.hidden = false;
    clearTimeout(bindRates._t);
    bindRates._t = setTimeout(() => {
      els.ratesToast.hidden = true;
    }, 2200);

    refreshLiveResult();
    renderWorldRows();
    fillAddSelect();
  });
}

/* ─────────────── theme (light / dark) ─────────────── */

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function renderThemeButton() {
  if (!els.themeBtn) return;
  const dark = currentTheme() === 'dark';
  els.themeBtn.textContent = dark ? '☀️' : '🌙';
  els.themeBtn.setAttribute(
    'aria-label',
    dark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'
  );
  els.themeBtn.setAttribute('title', dark ? 'الوضع النهاري' : 'الوضع الليلي');
}

function bindTheme() {
  // ensure an explicit theme is present (system preference may apply otherwise)
  if (!document.documentElement.getAttribute('data-theme')) {
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }

  els.themeBtn?.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    saveTheme(next);
    renderThemeButton();
  });

  // honor a stored choice even if the inline head script was bypassed
  const stored = loadTheme();
  if (stored) document.documentElement.setAttribute('data-theme', stored);
  renderThemeButton();
}

/* ─────────────── boot ─────────────── */

function enterMain() {
  rebuildCurrencySelects();
  show(els.screenMain);
  renderHistory();
}

function init() {
  bindSetup();
  bindConverter();
  bindRates();
  bindTheme();

  const loaded = loadRates();
  if (loaded.usdRates) {
    rates = loaded.usdRates;
    const stamp = formatTimestamp(loaded.updatedAt);
    if (stamp) {
      els.lastUpdate.textContent = `آخر تحديث يدوي:\n${stamp}`;
      els.lastUpdate.hidden = false;
    }
    enterMain();
  } else {
    rebuildCurrencySelects();
    show(els.screenSetup);
  }

  // PWA: register service worker (offline after first load)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        /* offline support unavailable (e.g. insecure context) */
      });
    });
  }
}

init();

// expose pure logic for quick manual checks in the console
export { convert, parseAmount, validateRates, formatAmount };
