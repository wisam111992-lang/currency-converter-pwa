# محول العملات

تطبيق ويب خفيف (PWA) لتحويل بين ثلاث عملات فقط:

- الدولار الأمريكي (USD)
- الدينار العراقي (IQD)
- التومان الإيراني (TOMAN)

أسعار الصرف يُدخلها المستخدم ويحفظها محلياً. **لا يوجد أي اتصال بالإنترنت للأسعار**، ولا Backend، ولا قاعدة بيانات، ولا تسجيل دخول. بعد أول تحميل يعمل التطبيق بالكامل Offline ويُثبَّت على الشاشة الرئيسية.

## التشغيل

يجب تشغيله عبر خادم محلي (Service Worker لا يعمل من `file://`):

```bash
cd currency-converter
python3 -m http.server 8080
# ثم افتح http://localhost:8080
```

أو:

```bash
./start.sh
```

## البنية

| المسار | الدور |
|---|---|
| `js/currencies.js` | Currency model + تنسيق الأرقام |
| `js/conversion.js` | منطق التحويل والتحقق (نقي، بدون DOM) |
| `js/storage.js` | Local Storage service (الأسعار + السجل) |
| `js/app.js` | طبقة الواجهة (UI) |
| `css/style.css` | تصميم Mobile First عربي RTL |
| `sw.js` | Service Worker للعمل Offline |
| `manifest.json` | بيانات PWA (الاسم، الأيقونات، standalone) |
| `icons/` | أيقونات التطبيق |
| `tests/conversion.test.mjs` | اختبارات المنطق |

## نموذج أسعار الصرف

أسعار مخزّنة دائماً مقابل الدولار:

```
1 USD = IQD
1 USD = TOMAN
```

أي زوج آخر يُشتق تلقائياً، مثال: `1 TOMAN = (IQD / TOMAN) IQD`.

## الاختبارات

```bash
node tests/conversion.test.mjs
```

يشمل سيناريو الاختبار الأساسي:

- `2,000,000 TOMAN` → `20 USD` و `30,000 IQD`
- `30,000 IQD` → `20 USD` و `2,000,000 TOMAN`
- الاتجاهات الستة + التحقق من المدخلات + تنسيق الأرقام.

## التخزين المحلي

| المفتاح | المحتوى |
|---|---|
| `currency_converter.rates.v1` | `{ rates: {IQD, TOMAN}, updatedAt }` |
| `currency_converter.history.v1` | آخر 10 تحويلات |

يبقى بعد إغلاق التطبيق وإعادة تشغيل الجهاز، ولا يُرسل لأي سيرفر.
