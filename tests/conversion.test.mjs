// Tests for conversion logic + validation + formatting.
// Run: node tests/conversion.test.mjs

import assert from 'node:assert/strict';
import {
  ConversionError,
  convert,
  convertToAll,
  parseAmount,
  validateRates,
  MESSAGES,
} from '../js/conversion.js';
import { CURRENCIES, formatAmount, formatNumber } from '../js/currencies.js';

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

const RATES = { IQD: 1500, TOMAN: 100000 }; // 1 USD = 1500 IQD = 100000 Toman

console.log('\n— سيناريو الاختبار الأساسي —');

test('2,000,000 TOMAN → 20 USD', () => {
  assert.equal(convert(2_000_000, 'TOMAN', 'USD', RATES), 20);
});

test('2,000,000 TOMAN → 30,000 IQD', () => {
  assert.equal(convert(2_000_000, 'TOMAN', 'IQD', RATES), 30_000);
});

test('30,000 IQD → 20 USD', () => {
  assert.equal(convert(30_000, 'IQD', 'USD', RATES), 20);
});

test('30,000 IQD → 2,000,000 TOMAN', () => {
  assert.equal(convert(30_000, 'IQD', 'TOMAN', RATES), 2_000_000);
});

test('20 USD → 30,000 IQD', () => {
  assert.equal(convert(20, 'USD', 'IQD', RATES), 30_000);
});

test('20 USD → 2,000,000 TOMAN', () => {
  assert.equal(convert(20, 'USD', 'TOMAN', RATES), 2_000_000);
});

console.log('\n— كل الاتجاهات الستة —');

test('all 6 directions round-trip consistently', () => {
  const codes = CURRENCIES.map((c) => c.code);
  const amount = 1234.56;
  for (const from of codes) {
    for (const to of codes) {
      const direct = convert(amount, from, to, RATES);
      if (from === to) {
        assert.equal(direct, amount, `${from}→${to}`);
        continue;
      }
      const back = convert(direct, to, from, RATES);
      assert.ok(
        Math.abs(back - amount) < 1e-6,
        `${from}→${to}→${from}: ${back} !== ${amount}`
      );
    }
  }
});

test('cross rate: 1 TOMAN = 0.015 IQD', () => {
  assert.ok(Math.abs(convert(1, 'TOMAN', 'IQD', RATES) - 0.015) < 1e-9);
});

test('convertToAll returns every currency', () => {
  const out = convertToAll(2_000_000, 'TOMAN', RATES, ['USD', 'IQD', 'TOMAN']);
  assert.equal(out.length, 3);
  assert.equal(out.find((x) => x.code === 'USD').value, 20);
  assert.equal(out.find((x) => x.code === 'IQD').value, 30_000);
});

console.log('\n— التحقق من المدخلات —');

test('missing amount throws', () => {
  assert.throws(() => parseAmount(''), (e) => e.message === MESSAGES.emptyAmount);
  assert.throws(() => parseAmount('   '), (e) => e.message === MESSAGES.emptyAmount);
  assert.throws(() => parseAmount(null), (e) => e.message === MESSAGES.emptyAmount);
});

test('invalid amount throws', () => {
  assert.throws(() => parseAmount('abc'), (e) => e instanceof ConversionError);
  assert.throws(() => parseAmount('-5'), (e) => e instanceof ConversionError);
  assert.throws(() => parseAmount('0'), (e) => e.message === MESSAGES.invalidAmount);
});

test('grouped input parses: 2,000,000', () => {
  assert.equal(parseAmount('2,000,000'), 2_000_000);
  assert.equal(parseAmount('2000000'), 2_000_000);
  assert.equal(parseAmount('1 500 000'), 1_500_000);
});

test('decimal input parses: 25.5', () => {
  assert.equal(parseAmount('25.5'), 25.5);
  assert.equal(parseAmount('۲۵٫۵'), 25.5); // Persian digits + Arabic decimal sep
  assert.equal(parseAmount('٢٥.٥'), 25.5); // Arabic-Indic digits
});

test('direct parse rejects double decimal dots', () => {
  assert.throws(() => parseAmount('25.5.5'), (e) => e instanceof ConversionError);
});

test('missing rates → error message', () => {
  const { ok, errors } = validateRates({ IQD: '', TOMAN: '' });
  assert.equal(ok, false);
  assert.equal(errors.IQD, MESSAGES.missingRates);
  assert.equal(errors.TOMAN, MESSAGES.missingRates);
});

test('zero or negative rates → invalid message', () => {
  const zero = validateRates({ IQD: '0', TOMAN: '100000' });
  assert.equal(zero.ok, false);
  assert.equal(zero.errors.IQD, MESSAGES.invalidRate);

  const neg = validateRates({ IQD: '-10', TOMAN: '100000' });
  assert.equal(neg.ok, false);
  assert.equal(neg.errors.IQD, MESSAGES.invalidRate);
});

test('valid rates accepted', () => {
  const { ok, rates } = validateRates({ IQD: '1500', TOMAN: '100000' });
  assert.equal(ok, true);
  assert.deepEqual(rates, { USD: 1, IQD: 1500, TOMAN: 100000 });
});

test('convert without rates throws missingRates', () => {
  assert.throws(
    () => convert(100, 'USD', 'IQD', null),
    (e) => e.message === MESSAGES.missingRates
  );
});

console.log('\n— دقة وتنسيق الأرقام —');

test('fractional result displayed cleanly (25.5 USD)', () => {
  const usd = convert(38_250, 'IQD', 'USD', RATES); // 25.5
  assert.equal(usd, 25.5);
  assert.equal(formatAmount(usd, 'USD'), '25.5 USD');
});

test('integer result no decimals (38,250 IQD)', () => {
  assert.equal(formatAmount(38250, 'IQD'), '38,250 IQD');
  assert.equal(formatAmount(2_000_000, 'TOMAN'), '2,000,000 TOMAN');
});

test('formatNumber groups thousands', () => {
  assert.equal(formatNumber(2000000), '2,000,000');
  assert.equal(formatNumber(0.5), '0.5');
});

test('tiny values are not rounded to zero', () => {
  const tiny = convert(1, 'IQD', 'USD', RATES); // 0.000666...
  assert.ok(tiny > 0);
  assert.equal(formatAmount(tiny, 'USD'), '0.000667 USD');
});

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) process.exit(1);
