# دليل النشر — متقن

الهدف: رابط حي على Vercel، وقاعدة بيانات Postgres مجانية (Neon أو Supabase). الوقت المتوقع 20 إلى 30 دقيقة.

## 0) جرّبه على جهازك أولاً

```bash
npm install
cp .env.example .env
```

افتح `.env` وضع قيمة لـ `BETTER_AUTH_SECRET`. تقدر تولدها بهذا الأمر:

```bash
openssl rand -base64 32
```

وإذا ما عندك openssl:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

بعدها شغّل:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

افتح http://localhost:3000 وسجل دخول بـ `buyer@mutqen.demo` وكلمة المرور `local-dev-only`.

## 1) ارفع الكود على GitHub

```bash
git add -A
git commit -m "Mutqen MVP"
git branch -M main
git remote add origin https://github.com/<حسابك>/mutqen.git
git push -u origin main
```

لا ترفع ملف `.env`. هو مستثنى أصلاً في `.gitignore`.

## 2) قاعدة البيانات

### الخيار أ: Neon (الأسهل مع Vercel)
1. ادخل neon.tech وأنشئ مشروع جديد. اختر أقرب منطقة، مثل Frankfurt.
2. انسخ **Connection string**. شكله كذا: `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`

### الخيار ب: Supabase
1. أنشئ مشروع، وروح لـ **Connect** ← **Transaction pooler**.
2. انسخ الرابط اللي على المنفذ **6543**. الكود مضبوط أصلاً على `prepare: false` عشان يشتغل مع الـ pooler.

### جهّز الجداول والبيانات التجريبية
1. حط الرابط مؤقتاً في `.env` على جهازك: `DATABASE_URL=...`
2. شغّل:

```bash
npm run db:migrate
npm run db:seed
```

3. بعدها رجّع `DATABASE_URL` فاضي في `.env` المحلي إذا تبي تكمل تطوير على القاعدة المحلية.

## 3) Vercel
1. ادخل vercel.com ← **Add New Project** ← اختر مستودع `mutqen`.
2. في **Environment Variables** أضف:

| المتغير | القيمة |
|---|---|
| `DATABASE_URL` | رابط Neon أو Supabase |
| `BETTER_AUTH_SECRET` | نفس السر اللي ولدته، أو سر جديد |
| `BETTER_AUTH_URL` | رابط الموقع النهائي، مثل `https://mutqen.vercel.app` |
| `AI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/` |
| `AI_API_KEY` | مفتاح Gemini من Google AI Studio |
| `AI_MODEL` | `gemini-3.5-flash-lite` |
| `AUTHENTICA_API_KEY` | اختياري |

3. اضغط **Deploy**.
4. إذا طلع الرابط مختلف عن اللي كتبته في `BETTER_AUTH_URL`، عدّل المتغير وسوِّ **Redeploy**. تسجيل الدخول يعتمد على أن الرابط يطابق.

> **مهم:** على Vercel لازم يكون `DATABASE_URL` موجود. القاعدة المدمجة (PGlite) للتطوير المحلي فقط.

> روابط المعاينة (Preview) تختلف عن الرابط الأساسي، فتسجيل الدخول فيها ممكن يفشل. استخدم رابط Production في العرض.

## 4) قائمة فحص بعد النشر
- [ ] الرئيسية تفتح، والخدمات تظهر.
- [ ] المساعد الذكي يرجع طلب منظم، وتظهر شارة **"بالذكاء الاصطناعي"** بدل "وضع بدون اتصال".
- [ ] تسجيل عميل جديد، ثم طلب ودفع تجريبي، ثم تظهر صفحة الطلب.
- [ ] دخول `seller@mutqen.demo`، ثم تسليم الطلب.
- [ ] العميل يوافق ويقيّم.
- [ ] دخول `admin@mutqen.demo`، والأرقام تتحدث.
- [ ] جرّب الموقع على الجوال.

## مشاكل شائعة

| المشكلة | الحل |
|---|---|
| تسجيل الدخول يرجعك لصفحة الدخول | تأكد إن `BETTER_AUTH_URL` يطابق رابط الموقع حرفياً، مع `https://`، وبدون `/` في الآخر |
| خطأ اتصال بقاعدة البيانات | تأكد من الرابط ومن وجود `sslmode=require` في Neon، أو إنك تستخدم منفذ 6543 في Supabase |
| المساعد يظهر "وضع بدون اتصال" | راجع متغيرات `AI_*` الثلاثة، وسوِّ Redeploy بعد التعديل |
| تبي تعيد البيانات التجريبية من البداية | شغّل `npm run db:reset` مع رابط القاعدة في `.env` |
