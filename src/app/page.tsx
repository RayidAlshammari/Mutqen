import Link from "next/link";
import { Container, LinkButton, Card, VerifiedBadge } from "@/components/ui";
import { ServiceCard } from "@/components/service-card";
import { WaitlistForm } from "@/components/waitlist-form";
import { heroSearchAction } from "@/app/actions/public";
import { redirect } from "next/navigation";
import { listServices, categoryCounts, listOrdersForUser } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { ORDER_STATUS } from "@/lib/constants";
import { CATEGORIES, CATEGORY_KEYS, FEES } from "@/lib/constants";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SUGGESTIONS = [
  "أبي 12 منشور انستقرام لمطعمي بلهجة سعودية",
  "فيديو ريلز إعلاني لعطر جديد مدته 15 ثانية",
  "شات بوت واتساب يرد على عملاء متجري",
  "صفحة هبوط لإطلاق تطبيق",
];

export default async function Home() {
  const user = await getCurrentUser();
  // Freelancers and admins work from their own dashboards; the home page is the client storefront.
  if (user?.role === "seller") redirect("/dashboard");
  if (user?.role === "admin") redirect("/admin");

  const [featured, counts, myOrders] = await Promise.all([
    listServices({ sort: "popular" }, 8),
    categoryCounts(),
    user ? listOrdersForUser(user.id, "buyer") : Promise.resolve([]),
  ]);
  const active = myOrders.filter((o) => ["in_progress", "revision_requested", "delivered"].includes(o.status)).slice(0, 3);

  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <div className="pattern-dots absolute inset-0" aria-hidden />
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-saffron-500/20 blur-3xl" aria-hidden />
        <Container className="relative grid gap-12 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm ring-1 ring-white/20">
              <span className="h-2 w-2 rounded-full bg-saffron-400" /> منصة العمل الحر للمتمكنين من الذكاء الاصطناعي
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.35] sm:text-5xl sm:leading-[1.3]">
              شغلك يخلص في <span className="text-saffron-400">أيام، مو أسابيع</span>
              <br />
              على يد مستقلين يتقنون الذكاء الاصطناعي
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-brand-100">
              محتوى، ميديا، وبرمجة — من مستقلين سعوديين اجتازوا اختبار متقن العملي في أدوات الذكاء الاصطناعي. ادفع بأمان، وما يوصل المبلغ للمستقل إلا بعد ما تستلم وترضى.
            </p>

            <form action={heroSearchAction} className="mt-8 rounded-2xl bg-white p-2 shadow-xl">
              <label htmlFor="hero-q" className="sr-only">
                وش تبي تنجز؟
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="hero-q"
                  name="q"
                  placeholder="اكتب احتياجك بكلامك… والمساعد الذكي يرتبه ويرشح لك الأنسب"
                  className="h-12 flex-1 rounded-xl px-4 text-[15px] text-ink placeholder:text-stone-400 focus:outline-none"
                />
                <button className="h-12 rounded-xl bg-saffron-500 px-6 font-semibold text-brand-950 hover:bg-saffron-400">✨ رتّب طلبي</button>
              </div>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s}
                  href={`/assistant?q=${encodeURIComponent(s)}`}
                  className="rounded-full bg-white/10 px-3 py-1 text-sm text-brand-100 ring-1 ring-white/15 hover:bg-white/20"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden items-center md:flex">
            <Card className="w-full rotate-[-2deg] p-5 text-ink shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-500">طلب #A21</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">تم التسليم خلال 31 ساعة</span>
              </div>
              <p className="mt-3 text-lg font-bold">محتوى انستقرام لشهر كامل — مقهى رَوْق</p>
              <div className="mt-3 flex items-center gap-2 text-sm text-stone-600">
                <span>نورة العتيبي</span> <VerifiedBadge small />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                {["ChatGPT", "Midjourney", "CapCut AI"].map((t) => (
                  <span key={t} className="ltr rounded-lg bg-sand-100 py-2 font-semibold text-brand-900">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-brand-50 p-3 text-sm leading-6 text-brand-900">
                ”سلّمت 12 منشور مع الصور والكابشن، وعدّلت النبرة يدوياً عشان تناسب أهل حائل.“
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-stone-500">المبلغ محجوز لدى متقن</span>
                <span className="font-bold text-brand-800">850 ر.س</span>
              </div>
            </Card>
          </div>
        </Container>
      </section>

      {user && active.length > 0 && (
        <Container className="relative z-10 -mt-8 mb-12">
          <Card className="p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold text-brand-950">طلباتك الجارية</p>
              <Link href="/dashboard/orders" className="text-sm font-semibold text-brand-700 hover:underline">كل طلباتي ←</Link>
            </div>
            <ul className="grid gap-2 md:grid-cols-3">
              {active.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className={`block rounded-xl p-3 ring-1 transition hover:bg-sand-50 ${o.status === "delivered" ? "bg-violet-50 ring-violet-200" : "ring-sand-200"}`}>
                    <p className="truncate text-sm font-semibold">{o.serviceTitle}</p>
                    <p className="mt-1 text-xs text-stone-600">{o.counterpartName} · {ORDER_STATUS[o.status].label}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </Container>
      )}

      {/* ───────── Value props ───────── */}
      <Container className={`relative z-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${user && active.length > 0 ? "" : "-mt-8"}`}>
        {[
          ["🧪", "مستقلون مختبَرون", "كل مستقل يجتاز مهمة عملية في أدوات الذكاء الاصطناعي قبل قبوله"],
          ["⚡", "سرعة الذكاء الاصطناعي", "المهام الصغيرة تُسلَّم خلال 24–72 ساعة، والمشاريع في أيام بدل أسابيع"],
          ["🔒", "دفع مضمون", "المبلغ محجوز لدى المنصة ولا يُحوَّل إلا بعد استلامك"],
          ["🇸🇦", "محلي بالكامل", "عربي ولهجات، ودفع بالريال، ومستقلون محليون"],
        ].map(([icon, title, text]) => (
          <Card key={title} className="p-5 shadow-sm">
            <p className="text-2xl">{icon}</p>
            <p className="mt-2 font-bold text-brand-950">{title}</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">{text}</p>
          </Card>
        ))}
      </Container>

      {/* ───────── Categories ───────── */}
      <Container className="mt-20">
        <h2 className="text-2xl font-bold text-brand-950 sm:text-3xl">ثلاث مجالات، ومستقلون متخصصون</h2>
        <p className="mt-2 text-stone-600">اختر المجال، أو خلّ المساعد الذكي يحدده لك.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {CATEGORY_KEYS.map((c) => (
            <Link key={c} href={`/services?category=${c}`} className={`cover-${c} pattern-dots group relative overflow-hidden rounded-2xl p-6 text-white`}>
              <span className="text-4xl">{CATEGORIES[c].icon}</span>
              <p className="mt-4 text-2xl font-bold">{CATEGORIES[c].label}</p>
              <p className="mt-1 text-sm leading-6 text-white/85">{CATEGORIES[c].description}</p>
              <p className="mt-5 inline-flex items-center gap-1 text-sm font-semibold">
                {num(counts[c] ?? 0)} خدمة <span className="transition group-hover:-translate-x-1">←</span>
              </p>
            </Link>
          ))}
        </div>
      </Container>

      {/* ───────── How it works ───────── */}
      <Container className="mt-20">
        <div className="grid gap-10 rounded-3xl bg-white p-8 ring-1 ring-sand-200 md:grid-cols-[1fr_2fr] md:p-12">
          <div>
            <h2 className="text-2xl font-bold text-brand-950 sm:text-3xl">كيف يشتغل متقن؟</h2>
            <p className="mt-3 leading-7 text-stone-600">من الفكرة للتسليم في 4 خطوات، والمبلغ محفوظ طول الوقت.</p>
            <LinkButton href="/how-it-works" variant="secondary" className="mt-6">
              التفاصيل والرسوم
            </LinkButton>
          </div>
          <ol className="grid gap-6 sm:grid-cols-2">
            {[
              ["اكتب احتياجك", "بكلامك العادي. المساعد الذكي يحوله لطلب واضح ويرشح لك أنسب الخدمات."],
              ["اختر الباقة وادفع", "المبلغ يُحجز لدى متقن ولا يوصل للمستقل إلا بعد موافقتك. (الدفع تجريبي في هذي النسخة)"],
              ["المستقل ينفذ", "بأدوات الذكاء الاصطناعي ومراجعته البشرية، وتتابع حالة طلبك لحظة بلحظة."],
              ["استلم وقيّم", "راجع الشغل، اطلب تعديل إذا تحتاج، وبعد موافقتك يتحول المبلغ للمستقل."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 font-bold text-white">{num(i + 1)}</span>
                <div>
                  <p className="font-bold text-brand-950">{t}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>

      {/* ───────── Featured ───────── */}
      <Container className="mt-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-brand-950 sm:text-3xl">الأكثر طلباً</h2>
            <p className="mt-2 text-stone-600">خدمات من مستقلين موثقين.</p>
          </div>
          <LinkButton href="/services" variant="ghost">
            كل الخدمات ←
          </LinkButton>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((s) => (
            <ServiceCard key={s.id} {...s} />
          ))}
        </div>
      </Container>

      {/* ───────── Why not a generic marketplace ───────── */}
      <Container className="mt-20">
        <h2 className="text-2xl font-bold text-brand-950 sm:text-3xl">وش يفرق متقن؟</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl ring-1 ring-sand-200">
          <table className="w-full min-w-[560px] bg-white text-sm">
            <thead className="bg-sand-100 text-right text-brand-950">
              <tr>
                <th className="p-4 font-semibold"></th>
                <th className="p-4 font-bold text-brand-700">متقن</th>
                <th className="p-4 font-semibold text-stone-500">منصات العمل الحر التقليدية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {[
                ["التحقق من المستقل", "اختبار عملي في أدوات الذكاء الاصطناعي + مراجعة بشرية", "تسجيل مفتوح لأي أحد"],
                ["سرعة التسليم", "أيام بدل أسابيع بفضل أدوات الذكاء الاصطناعي", "تختلف كثيراً"],
                ["عمولة المستقل", `${num(FEES.sellerCommissionRate * 100)}٪`, "تصل إلى 20٪"],
                ["الدفع", "بالريال، ومدى وApple Pay عند الإطلاق", "غالباً بالدولار وبطاقات دولية"],
                ["اللغة والسياق", "عربي ولهجات، ومراعاة أنظمة المحتوى السعودية", "عام وعالمي"],
              ].map(([k, a, b]) => (
                <tr key={k}>
                  <td className="p-4 font-semibold text-brand-950">{k}</td>
                  <td className="p-4 text-brand-900">✓ {a}</td>
                  <td className="p-4 text-stone-500">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>

      {/* ───────── Freelancers ───────── */}
      {!user && (
      <Container className="mt-20">
        <div className="grid items-center gap-8 rounded-3xl bg-sand-100 p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-2xl font-bold text-brand-950 sm:text-3xl">تتقن أدوات الذكاء الاصطناعي؟ حوّلها لدخل</h2>
            <p className="mt-3 leading-7 text-stone-700">
              اجتز مهمة عملية قصيرة، واحصل على شارة <strong>موثّق AI</strong>، وابدأ تستقبل طلبات من شركات وأفراد في السعودية — بعمولة {num(FEES.sellerCommissionRate * 100)}٪ فقط.
            </p>
            <LinkButton href="/signup?as=seller" className="mt-6">
              انضم كمستقل
            </LinkButton>
          </div>
          <ul className="space-y-3 text-[15px]">
            {["سجّل وأضف أدواتك وأعمالك", "حل مهمة التحقق العملية (15–20 دقيقة)", "فريق متقن يراجع ويوثّق ملفك", "أضف خدماتك وباقاتك واستقبل الطلبات"].map((s, i) => (
              <li key={s} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-sand-200">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{num(i + 1)}</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </Container>
      )}

      {/* ───────── Waitlist ───────── */}
      {!user && (
      <Container className="mt-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand-800 px-6 py-12 text-center text-white md:px-16">
          <div className="pattern-dots absolute inset-0" aria-hidden />
          <div className="relative mx-auto max-w-xl">
            <h2 className="text-2xl font-bold sm:text-3xl">الإطلاق التجريبي قريب</h2>
            <p className="mt-3 text-brand-100">سجّل بريدك وكن من أول المستخدمين — عملاء ومستقلين.</p>
            <div className="mt-6">
              <WaitlistForm />
            </div>
          </div>
        </div>
      </Container>
      )}
    </>
  );
}
