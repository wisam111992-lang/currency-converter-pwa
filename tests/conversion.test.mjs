// Tests for conversion logic + validation + formatting.
// Run: node tests/conversion.test.mjs

import assert from 'node:assert/strict';
import {
  ConversionError,
  convert,
  convertToAll,
  parseAmount,
  parseRate,
  validateRates,
  MESSAGES,
} from '../js/conversion.js';
import {
  CORE_CURRENCIES,
  WORLD_CATALOG,
  formatAmount,
  formatNumber,
} from '../js/currencies.js';

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
  const codes = CORE_CURRENCIES.map((c) => c.code);
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

console.log('\n— عملات العالم —');

const WORLD_RATES = { IQD: 1500, TOMAN: 100000, EUR: 0.92, SAR: 3.75, JPY: 150 };

test('world catalog has no duplicate or reserved codes', () => {
  const codes = WORLD_CATALOG.map((c) => c.code);
  assert.equal(new Set(codes).size, codes.length, 'no duplicates');
  assert.ok(!codes.includes('USD'), 'USD not in world catalog');
  assert.ok(!codes.includes('IQD'), 'IQD not in world catalog');
  assert.ok(!codes.includes('TOMAN'), 'TOMAN not in world catalog');
  assert.ok(codes.length >= 60, 'catalog is substantial');
});

test('world catalog entries have Arabic names', () => {
  for (const c of WORLD_CATALOG) {
    assert.ok(c.nameAr && c.nameAr.length > 1, `${c.code} nameAr`);
    assert.ok(c.shortAr && c.shortAr.length > 1, `${c.code} shortAr`);
    assert.match(c.code, /^[A-Z]{3}$/, `${c.code} is 3 uppercase letters`);
    assert.ok(Number.isInteger(c.maxDecimals) && c.maxDecimals >= 0, `${c.code} decimals`);
  }
});

test('validateRates accepts optional world currencies', () => {
  const { ok, rates } = validateRates({
    IQD: '1500',
    TOMAN: '100000',
    EUR: '0.92',
    SAR: '3,750'.replace('3,750', '3.75'),
  });
  assert.equal(ok, true);
  assert.equal(rates.EUR, 0.92);
  assert.equal(rates.SAR, 3.75);
});

test('validateRates ignores unknown codes but keeps core errors', () => {
  const { ok, errors } = validateRates({ IQD: '1500', TOMAN: '', FAKE: '5' });
  assert.equal(ok, false);
  assert.equal(errors.TOMAN, MESSAGES.missingRates);
  assert.equal(errors.FAKE, undefined);
});

test('world rate of zero is rejected', () => {
  const { ok, errors } = validateRates({ IQD: '1500', TOMAN: '100000', EUR: '0' });
  assert.equal(ok, false);
  assert.equal(errors.EUR, MESSAGES.invalidRate);
});

test('parseRate handles grouping, Arabic digits, decimals', () => {
  assert.equal(parseRate('1500'), 1500);
  assert.equal(parseRate('1,500'), 1500);
  assert.equal(parseRate('0.92'), 0.92);
  assert.equal(parseRate('١٥٠٠'), 1500);
  assert.equal(parseRate('100000'), 100000);
  assert.equal(parseRate('0'), null);
  assert.equal(parseRate('-5'), null);
  assert.equal(parseRate('abc'), null);
  assert.equal(parseRate(''), null);
});

test('USD → EUR → USD round-trip', () => {
  assert.equal(convert(100, 'USD', 'EUR', WORLD_RATES), 92);
  assert.ok(Math.abs(convert(92, 'EUR', 'USD', WORLD_RATES) - 100) < 1e-9);
});

test('world ↔ world via USD base: EUR → SAR', () => {
  // 92 EUR = 100 USD = 375 SAR
  assert.equal(convert(92, 'EUR', 'SAR', WORLD_RATES), 375);
});

test('core ↔ world: 2,000,000 TOMAN → EUR', () => {
  // 20 USD × 0.92 = 18.4 EUR
  assert.equal(convert(2_000_000, 'TOMAN', 'EUR', WORLD_RATES), 18.4);
});

test('JPY uses 0 decimals in display', () => {
  const jpy = convert(1, 'USD', 'JPY', WORLD_RATES);
  assert.equal(jpy, 150);
  assert.equal(formatAmount(jpy, 'JPY'), '150 JPY');
});

test('convert without a world rate throws missingCurrencyRate', () => {
  assert.throws(
    () => convert(100, 'USD', 'EUR', RATES),
    (e) => e.message === MESSAGES.missingCurrencyRate
  );
});

test('convertToAll works across mixed core + world', () => {
  const out = convertToAll(
    100,
    'USD',
    WORLD_RATES,
    ['USD', 'IQD', 'TOMAN', 'EUR', 'SAR']
  );
  assert.equal(out.find((x) => x.code === 'IQD').value, 150000);
  assert.equal(out.find((x) => x.code === 'TOMAN').value, 10000000);
  assert.equal(out.find((x) => x.code === 'EUR').value, 92);
  assert.equal(out.find((x) => x.code === 'SAR').value, 375);
});

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) process.exit(1);
