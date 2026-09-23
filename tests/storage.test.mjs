// Tests for the local storage service (rates + history) using a localStorage shim.
// Run: node tests/storage.test.mjs

import assert from 'node:assert/strict';

// --- shim window.localStorage before importing storage.js ---
function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    get length() {
      return map.size;
    },
  };
}

globalThis.window = { localStorage: makeStorage() };

const {
  loadRates,
  saveRates,
  hasRates,
  loadHistory,
  pushHistory,
  clearHistory,
  formatTimestamp,
} = await import('../js/storage.js');

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push({ name, err });
    console.error(`  ✗ ${name}\n    ${err.message}`);
  }
}

console.log('\n— أسعار الصرف —');

test('no rates initially', () => {
  assert.equal(hasRates(), false);
  assert.equal(loadRates().usdRates, null);
});

test('save + load rates round-trip', () => {
  const saved = saveRates({ IQD: 1500, TOMAN: 100000 });
  assert.ok(saved.updatedAt, 'updatedAt must be set');
  assert.deepEqual(saved.usdRates, { USD: 1, IQD: 1500, TOMAN: 100000 });

  const loaded = loadRates();
  assert.deepEqual(loaded.usdRates, { USD: 1, IQD: 1500, TOMAN: 100000 });
  assert.equal(loaded.updatedAt, saved.updatedAt);
  assert.equal(hasRates(), true);
});

test('rates persist across "restarts" (same storage, module re-read)', () => {
  // simulate reload: values survive because they live in localStorage
  const raw = window.localStorage.getItem('currency_converter.rates.v1');
  assert.ok(raw, 'raw rates key must exist in localStorage');
  const parsed = JSON.parse(raw);
  assert.equal(parsed.rates.IQD, 1500);
  assert.equal(parsed.rates.TOMAN, 100000);
});

test('saveRates rejects invalid rates', () => {
  assert.throws(() => saveRates({ IQD: 0, TOMAN: 100000 }), /invalid rates/);
  assert.throws(() => saveRates({ IQD: -5, TOMAN: 100000 }), /invalid rates/);
  // previous good value untouched
  assert.equal(loadRates().usdRates.IQD, 1500);
});

test('corrupted storage returns null instead of crashing', () => {
  window.localStorage.setItem('currency_converter.rates.v1', '{broken');
  assert.equal(loadRates().usdRates, null);
  // restore
  saveRates({ IQD: 1500, TOMAN: 100000 });
});

console.log('\n— سجل التحويلات —');

test('history empty initially', () => {
  clearHistory();
  assert.deepEqual(loadHistory(), []);
});

test('push keeps newest first and caps at 10', () => {
  for (let i = 1; i <= 12; i += 1) {
    pushHistory({
      from: { code: 'TOMAN', value: i * 1000 },
      to: { code: 'IQD', value: i * 15 },
    });
  }
  const list = loadHistory();
  assert.equal(list.length, 10);
  assert.equal(list[0].from.value, 12000); // newest first
  assert.equal(list[9].from.value, 3000); // oldest kept
});

test('clearHistory empties the list', () => {
  clearHistory();
  assert.equal(loadHistory().length, 0);
});

test('corrupted history returns [] instead of crashing', () => {
  window.localStorage.setItem('currency_converter.history.v1', 'not-json');
  assert.deepEqual(loadHistory(), []);
  clearHistory();
});

console.log('\n— طابع الوقت —');

test('formatTimestamp renders DD/MM/YYYY - hh:mm AM/PM', () => {
  const stamp = formatTimestamp('2026-09-23T23:30:00.000Z');
  assert.ok(stamp, 'stamp should exist');
  assert.match(stamp, /^\d{2}\/\d{2}\/\d{4} - \d{2}:\d{2} (AM|PM)$/);
});

test('formatTimestamp(null) → null', () => {
  assert.equal(formatTimestamp(null), null);
  assert.equal(formatTimestamp('not-a-date'), null);
});

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) process.exit(1);
