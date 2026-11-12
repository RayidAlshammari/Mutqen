import Link from "next/link";
import { Container, LinkButton, Card } from "@/components/ui";
import { ServiceCard } from "@/components/service-card";
import { heroSearchAction } from "@/app/actions/public";
import { redirect } from "next/navigation";
import { listServices, categoryCounts, listOrdersForUser } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { ORDER_STATUS } from "@/lib/constants";
import { CATEGORIES, CATEGORY_KEYS, FEES } from "@/lib/constants";
import { arCount, COUNT, num } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SUGGESTIONS = [
  "أبي شعار وهوية لمقهى مختص",
  "أبي 12 منشور انستقرام لمحل حلويات قبل العيد",
  "أبي شات بوت واتساب يرد على عملاء متجري",
  "أبي صفحة هبوط لدورة تدريبية",
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
  const active = myOrders.filter((o) => !["completed", "cancelled"].includes(o.status)).slice(0, 3);

  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <div className="pattern-dots absolute inset-0" aria-hidden />
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-saffron-500/20 blur-3xl" aria-hidden />
        <Container className="relative grid gap-12 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm ring-1 ring-white/20">
              <span className="h-2 w-2 rounded-full bg-saffron-400" /> مستقلون موثّقون يشتغلون بالذكاء الاصطناعي
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.35] sm:text-5xl sm:leading-[1.3]">
              قل وش تحتاج <span className="text-saffron-400">بجملة وحدة</span>
              <br />
              والملخص والمستقل علينا
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-brand-100">
              متقن يسألك أسئلة قصيرة، يكتب ملخص الطلب عنك، ويرشّح لك ثلاثة مستقلين في المحتوى والميديا والبرمجة اجتازوا اختباراً عملياً. تدفع السعر المعروض فقط، والمبلغ محجوز لين تعتمد التسليم.
            </p>

            <form action={heroSearchAction} className="mt-8 rounded-2xl bg-white p-2 shadow-xl">
              <label htmlFor="hero-q" className="sr-only">
                وش تبي تنجز؟
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="hero-q"
                  name="q"
                  placeholder="مثال: أبي شعار وهوية لمقهى مختص بفتحه في حائل"
                  className="h-12 flex-1 rounded-xl px-4 text-[15px] text-ink placeholder:text-stone-400 focus:outline-none"
                />
                <button className="h-12 rounded-xl bg-saffron-500 px-6 font-semibold text-brand-950 hover:bg-saffron-400">ابدأ طلبي</button>
              </div>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s}
                  href={`/brief?q=${encodeURIComponent(s)}`}
                  className="rounded-full bg-white/10 px-3 py-1 text-sm text-brand-100 ring-1 ring-white/15 hover:bg-white/20"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden items-center md:flex">
            <Card className="w-full rotate-[-2deg] p-5 text-ink shadow-2xl" aria-label="مثال على ملخص طلب">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-500">مثال: ملخص طلب</span>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 ring-1 ring-brand-200">🎬 الميديا</span>
              </div>
              <p className="mt-3 text-lg font-bold">شعار وهوية بصرية لمقهى مختص</p>
              <p className="mt-3 text-xs font-semibold text-stone-500">وش تستلم</p>
              <ul className="mt-1 space-y-1 text-sm">
                {["شعار بصيغ SVG و PNG", "لوحة ألوان وخطوط", "5 قوالب سوشال"].map((t) => (
                  <li key={t} className="flex gap-2"><span className="text-brand-600">✓</span>{t}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-semibold text-stone-500">معايير القبول</p>
              <ul className="mt-1 space-y-1 text-sm">
                {["الشعار يُقرأ بوضوح بحجم 2 سم", "الألوان من اللوحة المعتمدة فقط"].map((t) => (
                  <li key={t} className="flex gap-2"><span className="text-brand-600">◆</span>{t}</li>
                ))}
              </ul>
              <div className="mt-4 flex items-center gap-2">
                {["#6f4e37", "#c8a27c", "#f3e9dc"].map((c) => (
                  <span key={c} className="h-6 w-6 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                ))}
                <span className="rounded-full bg-sand-100 px-2.5 py-0.5 text-xs">عصري</span>
                <span className="rounded-full bg-sand-100 px-2.5 py-0.5 text-xs">بسيط</span>
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
                  <Link href={`/orders/${o.id}`} className={`block rounded-xl p-3 ring-1 transition hover:bg-sand-50 ${o.status === "delivered" || o.status === "sample_review" ? "bg-violet-50 ring-violet-200" : "ring-sand-200"}`}>
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
          ["📝", "ما تحتاج تعرف توصف", "جاوب على أسئلة قصيرة باختيارات، ومتقن يكتب ملخص الطلب ومعايير القبول عنك"],
          ["🧪", "مستقلون مختبَرون", "كل مستقل ينفّذ مهمة عملية بأدوات الذكاء الاصطناعي ويراجعها فريقنا قبل قبوله"],
          ["🎯", "عيّنة أولى قبل ما يكمل", "تعتمد الاتجاه من أول يوم، وتغييره مرة مشمول في السعر"],
          ["🔒", "المبلغ محجوز لين تعتمد", "تدفع السعر المعروض فقط، وإذا ما قبل المستقل خلال 24 ساعة يرجع لك كامل"],
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
        <p className="mt-2 text-stone-600">اختر المجال، أو اكتب احتياجك ومتقن يحدده لك.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {CATEGORY_KEYS.map((c) => (
            <Link key={c} href={`/services?category=${c}`} className={`cover-${c} pattern-dots group relative overflow-hidden rounded-2xl p-6 text-white`}>
              <span className="text-4xl">{CATEGORIES[c].icon}</span>
              <p className="mt-4 text-2xl font-bold">{CATEGORIES[c].label}</p>
              <p className="mt-1 text-sm leading-6 text-white/85">{CATEGORIES[c].description}</p>
              <p className="mt-5 inline-flex items-center gap-1 text-sm font-semibold">
                {arCount(counts[c] ?? 0, COUNT.services)} <span className="transition group-hover:-translate-x-1">←</span>
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
            <p className="mt-3 leading-7 text-stone-600">من الجملة الأولى للتسليم في 4 خطوات، والمبلغ محفوظ طول الوقت.</p>
            <LinkButton href="/how-it-works" variant="secondary" className="mt-6">
              التفاصيل والرسوم
            </LinkButton>
          </div>
          <ol className="grid gap-6 sm:grid-cols-2">
            {[
              ["اكتب وش تحتاج بجملة", "متقن يسألك أسئلة قصيرة ويكتب ملخص فيه المخرجات ومعايير القبول."],
              ["اختر من ثلاثة مرشحين", "بسجلهم الفعلي على المنصة ونماذج أعمالهم. أو خلّ متقن يدير الطلب عنك."],
              ["ادفع السعر المعروض", "المبلغ ينحجز لدى متقن. المستقل يقبل خلال 24 ساعة ويرسل عيّنة أولى."],
              ["اعتمد واستلم", "التعديل ضمن الملخص مشمول. بعد اعتمادك يتحوّل المبلغ للمستقل."],
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
                ["وصف الطلب", "أسئلة قصيرة باختيارات، ومتقن يكتب الملخص عنك", "تكتب الوصف بنفسك من صفحة فاضية"],
                ["اختيار المستقل", "ثلاثة مرشحين بسجلهم الفعلي، أو متقن يختار عنك", "تفاضل بين عشرات العروض"],
                ["التحقق من المستقل", "مهمة عملية بأدوات الذكاء الاصطناعي + مراجعة بشرية", "تسجيل مفتوح أو اختبار نظري"],
                ["السعر", "اللي تشوفه هو اللي تدفعه", "رسوم خدمة تنضاف في آخر خطوة"],
                ["التعديلات", "عيّنة أولى ومعايير قبول تحدد المشمول والإضافي", "خلاف على وش داخل السعر"],
                ["الدفع واللغة", "بالريال، وعربي بلهجاته", "غالباً بالدولار"],
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
              اجتز مهمة عملية قصيرة، واحصل على شارة <strong>موثّق AI</strong>، واستقبل طلبات جاهزة بملخص ومعايير قبول واضحة. عمولة {num(FEES.commissionRate * 100)}٪ تنزل إلى {num(FEES.repeatCommissionRate * 100)}٪ مع العميل المتكرر.
            </p>
            <LinkButton href="/signup?as=seller" className="mt-6">
              انضم كمستقل
            </LinkButton>
          </div>
          <ul className="space-y-3 text-[15px]">
            {["سجّل وعبّي ملفك من سيرتك الذاتية", "نفّذ مهمة عملية صغيرة وارفع ناتجها", "فريق متقن يراجع شغلك ويوثّق ملفك", "أضف خدماتك واستقبل طلبات بملخص واضح"].map((s, i) => (
              <li key={s} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-sand-200">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{num(i + 1)}</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </Container>
      )}

    </>
  );
}
