// Currency model — core currencies (always active) + world catalog (opt-in).
// Codes are stable identifiers used in storage and conversion.
// World currencies become active only when the user saves a rate for them.

export const BASE_CURRENCY = 'USD';

/** Always available — the app's original three currencies. */
export const CORE_CURRENCIES = Object.freeze([
  {
    code: 'USD',
    nameAr: 'الدولار الأمريكي',
    shortAr: 'دولار',
    symbol: 'USD',
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

/**
 * World currencies the user may add from settings.
 * Each needs a user-entered rate (1 USD = X) — never fetched from the internet.
 */
export const WORLD_CATALOG = Object.freeze([
  // العربية والشرق الأوسط
  { code: 'SAR', nameAr: 'الريال السعودي', shortAr: 'ريال سعودي', symbol: 'SAR', maxDecimals: 2 },
  { code: 'AED', nameAr: 'الدرهم الإماراتي', shortAr: 'درهم إماراتي', symbol: 'AED', maxDecimals: 2 },
  { code: 'KWD', nameAr: 'الدينار الكويتي', shortAr: 'دينار كويتي', symbol: 'KWD', maxDecimals: 3 },
  { code: 'BHD', nameAr: 'الدينار البحريني', shortAr: 'دينار بحريني', symbol: 'BHD', maxDecimals: 3 },
  { code: 'OMR', nameAr: 'الريال العماني', shortAr: 'ريال عماني', symbol: 'OMR', maxDecimals: 3 },
  { code: 'QAR', nameAr: 'الريال القطري', shortAr: 'ريال قطري', symbol: 'QAR', maxDecimals: 2 },
  { code: 'EGP', nameAr: 'الجنيه المصري', shortAr: 'جنيه مصري', symbol: 'EGP', maxDecimals: 2 },
  { code: 'JOD', nameAr: 'الدينار الأردني', shortAr: 'دينار أردني', symbol: 'JOD', maxDecimals: 3 },
  { code: 'LBP', nameAr: 'الليرة اللبنانية', shortAr: 'ليرة لبنانية', symbol: 'LBP', maxDecimals: 2 },
  { code: 'SYP', nameAr: 'الليرة السورية', shortAr: 'ليرة سورية', symbol: 'SYP', maxDecimals: 2 },
  { code: 'YER', nameAr: 'الريال اليمني', shortAr: 'ريال يمني', symbol: 'YER', maxDecimals: 2 },
  { code: 'IRR', nameAr: 'الريال الإيراني', shortAr: 'ريال إيراني', symbol: 'IRR', maxDecimals: 0 },
  { code: 'TRY', nameAr: 'الليرة التركية', shortAr: 'ليرة تركية', symbol: 'TRY', maxDecimals: 2 },
  { code: 'SDG', nameAr: 'الجنيه السوداني', shortAr: 'جنيه سوداني', symbol: 'SDG', maxDecimals: 2 },
  { code: 'MAD', nameAr: 'الدرهم المغربي', shortAr: 'درهم مغربي', symbol: 'MAD', maxDecimals: 2 },
  { code: 'DZD', nameAr: 'الدينار الجزائري', shortAr: 'دينار جزائري', symbol: 'DZD', maxDecimals: 2 },
  { code: 'TND', nameAr: 'الدينار التونسي', shortAr: 'دينار تونسي', symbol: 'TND', maxDecimals: 3 },
  { code: 'LYD', nameAr: 'الدينار الليبي', shortAr: 'دينار ليبي', symbol: 'LYD', maxDecimals: 3 },
  { code: 'MRU', nameAr: 'الأوقية الموريتانية', shortAr: 'أوقية موريتانية', symbol: 'MRU', maxDecimals: 2 },
  { code: 'AFN', nameAr: 'الأفغاني', shortAr: 'أفغاني', symbol: 'AFN', maxDecimals: 2 },

  // أوروبا
  { code: 'EUR', nameAr: 'اليورو', shortAr: 'يورو', symbol: 'EUR', maxDecimals: 2 },
  { code: 'GBP', nameAr: 'الجنيه الإسترليني', shortAr: 'جنيه إسترليني', symbol: 'GBP', maxDecimals: 2 },
  { code: 'CHF', nameAr: 'الفرنك السويسري', shortAr: 'فرنك سويسري', symbol: 'CHF', maxDecimals: 2 },
  { code: 'RUB', nameAr: 'الروبل الروسي', shortAr: 'روبل روسي', symbol: 'RUB', maxDecimals: 2 },
  { code: 'UAH', nameAr: 'الهريفنيا الأوكرانية', shortAr: 'هريفنيا أوكرانية', symbol: 'UAH', maxDecimals: 2 },
  { code: 'PLN', nameAr: 'الزلوتي البولندي', shortAr: 'زلوتي بولندي', symbol: 'PLN', maxDecimals: 2 },
  { code: 'SEK', nameAr: 'الكرونة السويدية', shortAr: 'كرونة سويدية', symbol: 'SEK', maxDecimals: 2 },
  { code: 'NOK', nameAr: 'الكرونة النرويجية', shortAr: 'كرونة نرويجية', symbol: 'NOK', maxDecimals: 2 },
  { code: 'DKK', nameAr: 'الكرونة الدنماركية', shortAr: 'كرونة دنماركية', symbol: 'DKK', maxDecimals: 2 },
  { code: 'CZK', nameAr: 'الكرونة التشيكية', shortAr: 'كرونة تشيكية', symbol: 'CZK', maxDecimals: 2 },
  { code: 'HUF', nameAr: 'الفورنت المجري', shortAr: 'فورنت مجري', symbol: 'HUF', maxDecimals: 2 },
  { code: 'ISK', nameAr: 'الكرونة الآيسلندية', shortAr: 'كرونة آيسلندية', symbol: 'ISK', maxDecimals: 0 },
  { code: 'RON', nameAr: 'الليو الروماني', shortAr: 'ليو روماني', symbol: 'RON', maxDecimals: 2 },
  { code: 'RSD', nameAr: 'الدينار الصربي', shortAr: 'دينار صربي', symbol: 'RSD', maxDecimals: 2 },
  { code: 'ALL', nameAr: 'الليك الألباني', shortAr: 'ليك ألباني', symbol: 'ALL', maxDecimals: 2 },
  { code: 'MKD', nameAr: 'الدينار المقدوني', shortAr: 'دينار مقدوني', symbol: 'MKD', maxDecimals: 2 },
  { code: 'BAM', nameAr: 'المارك البوسني', shortAr: 'مارك بوسني', symbol: 'BAM', maxDecimals: 2 },
  { code: 'BYN', nameAr: 'الروبل البيلاروسي', shortAr: 'روبل بيلاروسي', symbol: 'BYN', maxDecimals: 2 },

  // آسيا
  { code: 'CNY', nameAr: 'اليوان الصيني', shortAr: 'يوان صيني', symbol: 'CNY', maxDecimals: 2 },
  { code: 'JPY', nameAr: 'الين الياباني', shortAr: 'ين ياباني', symbol: 'JPY', maxDecimals: 0 },
  { code: 'KRW', nameAr: 'الوون الكوري', shortAr: 'وون كوري', symbol: 'KRW', maxDecimals: 0 },
  { code: 'INR', nameAr: 'الروبية الهندية', shortAr: 'روبية هندية', symbol: 'INR', maxDecimals: 2 },
  { code: 'PKR', nameAr: 'الروبية الباكستانية', shortAr: 'روبية باكستانية', symbol: 'PKR', maxDecimals: 2 },
  { code: 'BDT', nameAr: 'التاكا البنغلاديشية', shortAr: 'تاكا بنغلاديشية', symbol: 'BDT', maxDecimals: 2 },
  { code: 'LKR', nameAr: 'الروبية السريلانكية', shortAr: 'روبية سريلانكية', symbol: 'LKR', maxDecimals: 2 },
  { code: 'NPR', nameAr: 'الروبية النيبالية', shortAr: 'روبية نيبالية', symbol: 'NPR', maxDecimals: 2 },
  { code: 'THB', nameAr: 'البات التايلاندي', shortAr: 'بات تايلاندي', symbol: 'THB', maxDecimals: 2 },
  { code: 'VND', nameAr: 'الدونغ الفيتنامي', shortAr: 'دونغ فيتنامي', symbol: 'VND', maxDecimals: 0 },
  { code: 'IDR', nameAr: 'الروبية الإندونيسية', shortAr: 'روبية إندونيسية', symbol: 'IDR', maxDecimals: 0 },
  { code: 'MYR', nameAr: 'الرينغيت الماليزي', shortAr: 'رينغيت ماليزي', symbol: 'MYR', maxDecimals: 2 },
  { code: 'SGD', nameAr: 'الدولار السنغافوري', shortAr: 'دولار سنغافوري', symbol: 'SGD', maxDecimals: 2 },
  { code: 'HKD', nameAr: 'دولار هونغ كونغ', shortAr: 'دولار هونغ كونغ', symbol: 'HKD', maxDecimals: 2 },
  { code: 'KZT', nameAr: 'التينغي الكازاخي', shortAr: 'تينغي كازاخي', symbol: 'KZT', maxDecimals: 2 },
  { code: 'UZS', nameAr: 'السوم الأوزبكي', shortAr: 'سوم أوزبكي', symbol: 'UZS', maxDecimals: 2 },
  { code: 'AZN', nameAr: 'المانات الأذربيجاني', shortAr: 'مانات أذربيجاني', symbol: 'AZN', maxDecimals: 2 },
  { code: 'GEL', nameAr: 'اللاري الجورجي', shortAr: 'لاري جورجي', symbol: 'GEL', maxDecimals: 2 },
  { code: 'AMD', nameAr: 'الدرام الأرميني', shortAr: 'درام أرميني', symbol: 'AMD', maxDecimals: 2 },
  { code: 'MNT', nameAr: 'التوغريك المنغولي', shortAr: 'توغريك منغولي', symbol: 'MNT', maxDecimals: 2 },
  { code: 'MMK', nameAr: 'الكيات الميانماري', shortAr: 'كيات ميانماري', symbol: 'MMK', maxDecimals: 2 },

  // أفريقيا
  { code: 'ZAR', nameAr: 'الراند الجنو أفريقي', shortAr: 'راند جنوب أفريقي', symbol: 'ZAR', maxDecimals: 2 },
  { code: 'NGN', nameAr: 'النايرا النيجيرية', shortAr: 'نايرا نيجيري', symbol: 'NGN', maxDecimals: 2 },
  { code: 'KES', nameAr: 'الشلن الكيني', shortAr: 'شلن كيني', symbol: 'KES', maxDecimals: 2 },
  { code: 'ETB', nameAr: 'البير الإثيوبي', shortAr: 'بير إثيوبي', symbol: 'ETB', maxDecimals: 2 },
  { code: 'GHS', nameAr: 'السيل الغاني', shortAr: 'سيل غاني', symbol: 'GHS', maxDecimals: 2 },

  // الأمريكتان وأوقيانوسيا
  { code: 'CAD', nameAr: 'الدولار الكندي', shortAr: 'دولار كندي', symbol: 'CAD', maxDecimals: 2 },
  { code: 'AUD', nameAr: 'الدولار الأسترالي', shortAr: 'دولار أسترالي', symbol: 'AUD', maxDecimals: 2 },
  { code: 'NZD', nameAr: 'الدولار النيوزيلندي', shortAr: 'دولار نيوزيلندي', symbol: 'NZD', maxDecimals: 2 },
  { code: 'BRL', nameAr: 'الريال البرازيلي', shortAr: 'ريال برازيلي', symbol: 'BRL', maxDecimals: 2 },
  { code: 'MXN', nameAr: 'البيزو المكسيكي', shortAr: 'بيزو مكسيكي', symbol: 'MXN', maxDecimals: 2 },
  { code: 'ARS', nameAr: 'البيزو الأرجنتيني', shortAr: 'بيزو أرجنتيني', symbol: 'ARS', maxDecimals: 2 },
  { code: 'CLP', nameAr: 'البيزو التشيلي', shortAr: 'بيزو تشيلي', symbol: 'CLP', maxDecimals: 0 },
  { code: 'COP', nameAr: 'البيزو الكولومبي', shortAr: 'بيزو كولومبي', symbol: 'COP', maxDecimals: 2 },
  { code: 'PEN', nameAr: 'السول البيروفي', shortAr: 'سول بيروفي', symbol: 'PEN', maxDecimals: 2 },
]);

/** Display order: core first, then world catalog order. */
export const CATALOG_ORDER = Object.freeze([
  ...CORE_CURRENCIES.map((c) => c.code),
  ...WORLD_CATALOG.map((c) => c.code),
]);

const BY_CODE = new Map(
  [...CORE_CURRENCIES, ...WORLD_CATALOG].map((c) => [c.code, c])
);

export function getCurrency(code) {
  return BY_CODE.get(code) || null;
}

export function isKnownCurrency(code) {
  return BY_CODE.has(code);
}

/** Catalog entries not yet used (available to add in settings). */
export function getAvailableWorldCurrencies(activeCodes) {
  const active = new Set(activeCodes);
  return WORLD_CATALOG.filter((c) => !active.has(c.code));
}

/**
 * Format a number for display: thousands separators, no excessive rounding.
 * - integers show no decimals
 * - values smaller than 0.01 keep up to 6 decimals so tiny results stay visible
 * - otherwise up to the currency's natural decimals (trailing zeros trimmed)
 */
export function formatAmount(value, code) {
  const currency = getCurrency(code);
  const symbol = currency ? currency.symbol : code;

  if (!Number.isFinite(value)) return `— ${symbol}`;

  const abs = Math.abs(value);
  let maxFractionDigits = currency ? currency.maxDecimals : 2;
  if (abs !== 0 && abs < 0.01) maxFractionDigits = 6;
  else if (abs !== 0 && abs < 1 && maxFractionDigits > 4) maxFractionDigits = 4;

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
