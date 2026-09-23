// UI layer — wires the screens to conversion + storage. No network usage.

import { CURRENCIES, formatAmount, getCurrency } from './currencies.js';
import {
  ConversionError,
  MESSAGES,
  convert,
  normalizeDigits,
  parseAmount,
  validateRates,
} from './conversion.js';
import {
  clearHistory,
  formatTimestamp,
  loadHistory,
  loadRates,
  pushHistory,
  saveRates,
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

const els = {
  screenSetup: $('#screen-setup'),
  screenMain: $('#screen-main'),
  screenRates: $('#screen-rates'),
  setupForm: $('#setup-form'),
  setupIqd: $('#setup-iqd'),
  setupToman: $('#setup-toman'),
  setupIqdError: $('#setup-iqd-error'),
  setupTomanError: $('#setup-toman-error'),
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
  ratesToman: $('#rates-toman'),
  ratesIqdError: $('#rates-iqd-error'),
  ratesTomanError: $('#rates-toman-error'),
  ratesToast: $('#rates-toast'),
  lastUpdate: $('#last-update'),
  historySection: $('#history-section'),
  historyList: $('#history-list'),
  clearHistory: $('#btn-clear-history'),
};

let rates = null; // { IQD, TOMAN } against 1 USD
let lastResult = null; // { from, amount, targets }

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

function fillCurrencySelects() {
  const options = CURRENCIES.map(
    (c) => `<option value="${c.code}">${c.shortAr}</option>`
  ).join('');
  els.fromCurrency.innerHTML = options;
  els.toCurrency.innerHTML = options;
  els.fromCurrency.value = 'TOMAN';
  els.toCurrency.value = 'IQD';
}

/** Keep only digits / separators while typing; show grouped thousands. */
function sanitizeAmountInput(raw) {
  let text = normalizeDigits(raw); // Arabic/Persian digits → 0-9
  text = text.replace(/[^\d.]/g, ''); // allow digits + one decimal point
  const firstDot = text.indexOf('.');
  if (firstDot !== -1) {
    text = text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, '');
  }
  return text;
}

function groupIntegerPart(text) {
  if (text === '' || text === '.') return text;
  const [intPart, ...rest] = text.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return rest.length ? `${grouped}.${rest.join('')}` : grouped;
}

/* ─────────────── results rendering ─────────────── */

function renderResults(fromCode, amount) {
  const targets = CURRENCIES.filter((c) => c.code !== fromCode).map((c) => ({
    code: c.code,
    value: convert(amount, fromCode, c.code, rates),
  }));

  // primary = selected "to" currency if valid, otherwise first target
  const toCode = els.toCurrency.value;
  const primary =
    targets.find((t) => t.code === toCode) ||
    targets.find((t) => t.code !== fromCode) ||
    targets[0];

  const primaryCur = getCurrency(primary.code);
  els.primaryValue.textContent = formatAmount(primary.value, primary.code);
  els.primaryCode.textContent = `${primaryCur.nameAr}`;

  els.others.innerHTML = targets
    .filter((t) => t.code !== primary.code)
    .map((t) => {
      const cur = getCurrency(t.code);
      return `
        <article class="result-row">
          <span class="rr-name">${cur.nameAr}</span>
          <span class="rr-value">${formatAmount(t.value, t.code)}</span>
        </article>`;
    })
    .join('');

  els.results.hidden = false;
  lastResult = { from: fromCode, amount, primary };

  // history: only record the visible conversion (from → primary),
  // skip if identical to the most recent entry (auto re-render on currency change)
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

/* ─────────────── events ─────────────── */

function bindSetup() {
  els.setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = { IQD: els.setupIqd.value, TOMAN: els.setupToman.value };
    const { ok, rates: next, errors } = validateRates(raw);

    setError(els.setupIqd, els.setupIqdError, errors.IQD);
    setError(els.setupToman, els.setupTomanError, errors.TOMAN);
    if (!ok) return;

    const saved = saveRates(next);
    rates = saved.usdRates;
    enterMain();
  });
}

function bindConverter() {
  els.amount.addEventListener('input', () => {
    const caretEnd = els.amount.selectionStart === els.amount.value.length;
    const sanitized = sanitizeAmountInput(els.amount.value);
    const grouped = groupIntegerPart(sanitized);
    if (grouped !== els.amount.value) {
      els.amount.value = grouped;
      if (caretEnd) {
        const pos = grouped.length;
        els.amount.setSelectionRange(pos, pos);
      }
    }
    setError(els.amount, els.amountError, null);
  });

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

    const fromCode = els.fromCurrency.value;
    const toCode = els.toCurrency.value;
    if (fromCode === toCode) {
      // still valid: show identity + the other currency
      renderResults(fromCode, amount);
      return;
    }

    try {
      renderResults(fromCode, amount);
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

    // re-run conversion with the kept amount, if there is one
    if (rates && els.amount.value.trim() !== '') {
      submitForm(els.convertForm);
    }
  });

  els.fromCurrency.addEventListener('change', () => {
    if (els.fromCurrency.value === els.toCurrency.value) {
      const other = CURRENCIES.find((c) => c.code !== els.fromCurrency.value);
      els.toCurrency.value = other.code;
    }
    if (rates && els.amount.value.trim() !== '') {
      submitForm(els.convertForm);
    }
  });

  els.toCurrency.addEventListener('change', () => {
    // prevent from === to
    if (els.toCurrency.value === els.fromCurrency.value) {
      const other = CURRENCIES.find((c) => c.code !== els.toCurrency.value);
      els.fromCurrency.value = other.code;
    }
    if (rates && els.amount.value.trim() !== '') {
      submitForm(els.convertForm);
    }
  });

  els.clearHistory.addEventListener('click', () => {
    clearHistory();
    renderHistory();
  });
}

function bindRates() {
  els.openRates.addEventListener('click', () => {
    els.ratesIqd.value = rates?.IQD ?? '';
    els.ratesToman.value = rates?.TOMAN ?? '';
    setError(els.ratesIqd, els.ratesIqdError, null);
    setError(els.ratesToman, els.ratesTomanError, null);
    show(els.screenRates);
  });

  els.closeRates.addEventListener('click', () => {
    if (rates) show(els.screenMain);
    else show(els.screenSetup);
  });

  els.ratesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = { IQD: els.ratesIqd.value, TOMAN: els.ratesToman.value };
    const { ok, rates: next, errors } = validateRates(raw);

    setError(els.ratesIqd, els.ratesIqdError, errors.IQD);
    setError(els.ratesToman, els.ratesTomanError, errors.TOMAN);
    if (!ok) return;

    const saved = saveRates(next);
    rates = saved.usdRates;

    const stamp = formatTimestamp(saved.updatedAt);
    els.lastUpdate.textContent = `آخر تحديث يدوي:\n${stamp ?? ''}`;
    els.lastUpdate.hidden = false;

    // toast
    els.ratesToast.textContent = 'تم حفظ أسعار الصرف';
    els.ratesToast.hidden = false;
    clearTimeout(bindRates._t);
    bindRates._t = setTimeout(() => {
      els.ratesToast.hidden = true;
    }, 2200);

    // refresh a live conversion if one is on screen
    if (lastResult && els.amount.value.trim() !== '') {
      try {
        const amount = parseAmount(els.amount.value);
        renderResults(lastResult.from, amount);
      } catch {
        /* keep old results */
      }
    }
  });
}

/* ─────────────── boot ─────────────── */

function enterMain() {
  show(els.screenMain);
  renderHistory();
}

function init() {
  fillCurrencySelects();
  bindSetup();
  bindConverter();
  bindRates();

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
