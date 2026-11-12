import "server-only";
import type { BriefAsset, Category, StructuredBrief } from "@/db/schema";
import { CATEGORIES } from "./constants";
import { chatJSON, cleanText, detectCategory } from "./ai";

export type BriefQuestion = { id: string; q: string; hint?: string; options?: string[]; multi?: boolean };

const BUSINESS: BriefQuestion = { id: "business", q: "وش نشاطك، ومين عملاؤك؟", hint: "مثال: مقهى مختص في حائل، عملاؤه شباب وعائلات" };

/**
 * The questions an account manager at an agency would ask. Clients rarely know how to
 * write a brief; they do know how to answer short, concrete questions.
 */
export const QUESTION_BANK: Record<Category, BriefQuestion[]> = {
  content: [
    BUSINESS,
    { id: "purpose", q: "وش تبي المحتوى يحقق؟", options: ["تعريف بالنشاط", "حماس قبل افتتاح أو إطلاق", "زيادة الطلبات والمبيعات", "تفاعل ومتابعين"] },
    { id: "quantity", q: "كم قطعة تحتاج، ولأي منصة؟", hint: "مثال: 12 منشور انستقرام + 4 ستوري" },
    { id: "voice", q: "بأي لهجة ونبرة؟", options: ["سعودية بيضاء", "فصحى مبسطة", "نجدية", "حجازية", "إنجليزي"] },
    { id: "includes", q: "تبي نص فقط، أو نص مع تصميم؟", options: ["نص فقط", "نص + تصميم", "ما أدري، اقترحوا علي"] },
    { id: "must", q: "فيه شي لازم ينذكر أو ممنوع ينذكر؟", hint: "عروض، أسعار، مواعيد، كلمات ما تبيها" },
  ],
  media: [
    BUSINESS,
    { id: "type", q: "وش نوع العمل؟", options: ["شعار وهوية", "تصاميم سوشال", "فيديو قصير", "صور منتجات", "تعليق صوتي"] },
    { id: "quantity", q: "كم قطعة، وبأي مقاسات أو مدة؟", hint: "مثال: 6 تصاميم مربعة + 3 ستوري، أو فيديو 15 ثانية" },
    { id: "have", q: "وش عندك جاهز؟", options: ["شعار", "ألوان وخطوط", "صور للمنتجات", "ما عندي شي"], multi: true },
    { id: "use", q: "وين بينعرض؟", options: ["انستقرام", "تيك توك", "سناب", "مطبوعات", "الموقع"], multi: true },
    { id: "must", q: "فيه شي لازم يظهر أو ممنوع يظهر؟", hint: "نص معيّن، سعر، عرض، أشخاص، موسيقى" },
  ],
  code: [
    BUSINESS,
    { id: "type", q: "وش تبي ينبني؟", options: ["صفحة أو موقع تعريفي", "متجر إلكتروني", "شات بوت", "أتمتة بين أنظمة", "لوحة بيانات"] },
    { id: "users", q: "مين بيستخدمه، ووش أهم 3 أشياء يسويها فيه؟" },
    { id: "have", q: "وش عندك جاهز؟", options: ["دومين", "استضافة", "تصميم", "محتوى وصور", "حسابات (سلة / زد / واتساب)", "ما عندي شي"], multi: true },
    { id: "integrations", q: "يحتاج يرتبط بشي؟", hint: "دفع، واتساب، سلة، زد، قوقل شيت…" },
    { id: "must", q: "وش اللي يخليك تقول: هذا مضبوط؟", hint: "مثال: العميل يحجز موعد من الجوال في أقل من دقيقة" },
  ],
};

/** Step 1: understand the request and pick the questions worth asking. */
export async function startBrief(input: string): Promise<{ category: Category; questions: BriefQuestion[]; source: "ai" | "fallback" }> {
  const fallbackCategory = detectCategory(input);
  const system = `أنت مسؤول حسابات في وكالة سعودية. عميل كتب احتياجه بجملة. مهمتك:
1) حدّد الفئة: content (محتوى مكتوب وسوشال)، media (تصميم، فيديو، صوت، صور)، code (مواقع، بوتات، أتمتة).
2) اختر من بنك الأسئلة ما يلزم لهذا الطلب بالذات (5 إلى 6 أسئلة)، وعدّل صياغتها لتناسب نشاط العميل. احذف أي سؤال جاوب عليه العميل في جملته.
أعد JSON فقط: {"category":"content|media|code","questions":[{"id":"...","q":"...","hint":"...","options":["..."],"multi":false}]}
استخدم نفس قيم id الموجودة في البنك. اللهجة سعودية بيضاء مختصرة. لا تضف أسئلة عن الميزانية.
بنك الأسئلة: ${JSON.stringify(QUESTION_BANK)}`;
  const out = await chatJSON<{ category?: string; questions?: BriefQuestion[] }>(system, input.slice(0, 1500));
  const category = (["content", "media", "code"] as const).includes(out?.category as Category) ? (out!.category as Category) : fallbackCategory;
  const bank = QUESTION_BANK[category];
  const ids = new Set(bank.map((b) => b.id));
  const tailored = (Array.isArray(out?.questions) ? out!.questions : [])
    .filter((q) => q && ids.has(q.id) && typeof q.q === "string")
    .slice(0, 6)
    .map((q) => {
      const base = bank.find((b) => b.id === q.id)!;
      return {
        id: q.id,
        q: cleanText(q.q, 200) || base.q,
        hint: q.hint ? cleanText(q.hint, 200) : base.hint,
        // Options always come from the bank: they are the tested, tappable answers.
        options: base.options,
        multi: base.multi,
      };
    });
  return tailored.length >= 4 ? { category, questions: tailored, source: "ai" } : { category, questions: bank, source: "fallback" };
}

export type BriefInputs = {
  input: string;
  category: Category;
  answers: { q: string; a: string }[];
  style: string[];
  colors: string[];
  references: string[];
  assets: BriefAsset[];
};

const list = (v: unknown, max: number, len = 300) => (Array.isArray(v) ? v.map((x) => cleanText(x, len)).filter(Boolean).slice(0, max) : []);

function fallbackCompose(i: BriefInputs): StructuredBrief {
  const answer = (needle: string) => i.answers.find((a) => a.q.includes(needle))?.a;
  const quantity = answer("كم قطعة") ?? "";
  const deliver: Record<Category, string[]> = {
    content: [quantity ? `المطلوب: ${quantity}` : "القطع المطلوبة مكتوبة وجاهزة للنشر", "عيّنة أولى من قطعتين لاعتماد النبرة", "ملف واحد منظّم بكل القطع"],
    media: [quantity ? `المطلوب: ${quantity}` : "التصاميم أو المقاطع المطلوبة بجودة عالية", "عيّنة أولى لاعتماد الاتجاه البصري", "الملفات المصدرية وصيغ جاهزة للنشر"],
    code: ["نسخة تعمل على رابط تجريبي", "عيّنة أولى: الصفحة أو المسار الأساسي", "الكود المصدري وتعليمات التشغيل"],
  };
  const accept: Record<Category, string[]> = {
    content: ["العدد والمنصة مطابقان للمطلوب", "اللهجة والنبرة كما في الملخص", "خالٍ من الأخطاء الإملائية", "يذكر كل ما طُلب ذكره"],
    media: ["العدد والمقاسات مطابقة للمطلوب", "يلتزم بالألوان والأسلوب المختارين", "الشعار والنصوص صحيحة وواضحة", "صيغ جاهزة للمنصات المحددة"],
    code: ["كل وظيفة مذكورة في الملخص تعمل", "يعمل على الجوال والكمبيوتر", "الربط المطلوب يعمل فعلياً", "تسليم الكود وطريقة التشغيل"],
  };
  const have = answer("جاهز");
  return {
    title: cleanText(i.input.split(/[.\n،!؟?]/)[0], 80) || `طلب ${CATEGORIES[i.category].label}`,
    category: i.category,
    goal: cleanText([answer("نشاطك"), answer("يحقق") ?? answer("نوع") ?? answer("ينبني")].filter(Boolean).join(" — ") || i.input, 600),
    deliverables: deliver[i.category],
    acceptance: accept[i.category],
    clientProvides: have ? [have] : [],
    audience: answer("نشاطك"),
    tone: answer("لهجة"),
  };
}

/** Step 2: turn the answers into a brief with deliverables and acceptance criteria. */
export async function composeBrief(i: BriefInputs): Promise<{ brief: StructuredBrief; source: "ai" | "fallback" }> {
  const extras = { style: i.style, colors: i.colors, references: i.references, assets: i.assets, answers: i.answers };
  const system = `أنت مسؤول حسابات في وكالة سعودية تكتب «ملخص طلب» يقرؤه مستقل وينفّذ منه بدون ما يرجع يسأل.
اكتب بلهجة سعودية بيضاء مختصرة. لا تخترع معلومات ما قالها العميل؛ إذا نقص شي مهم اكتبه في clientProvides كشيء يوفّره العميل.
أعد JSON فقط:
{"title":"عنوان قصير محدد","goal":"الهدف في جملتين: النشاط ووش يبي يحقق","deliverables":["مخرجات محددة بالعدد والمقاس والصيغة، 3 إلى 6"],"acceptance":["معايير قبول قابلة للتحقق بنعم أو لا، 3 إلى 5"],"clientProvides":["وش لازم يوفّره العميل"],"audience":"الجمهور","tone":"اللهجة والنبرة","timeline":"مدة معقولة","budgetHint":"نطاق سعر تقريبي بالريال"}
معايير القبول هي اللي تحدد لاحقاً إن التعديل مشمول أو عمل إضافي، فخلها واضحة وما تحتمل تفسيرين.`;
  const user = JSON.stringify({ request: i.input.slice(0, 1500), category: CATEGORIES[i.category].label, answers: i.answers, style: i.style, colors: i.colors, has_files: i.assets.map((a) => a.label), references: i.references.length });
  const out = await chatJSON<Partial<StructuredBrief>>(system, user);
  const deliverables = list(out?.deliverables, 6);
  const acceptance = list(out?.acceptance, 5);
  if (!out || !out.title || deliverables.length < 2 || acceptance.length < 2) return { brief: { ...fallbackCompose(i), ...extras }, source: "fallback" };
  return {
    source: "ai",
    brief: {
      title: cleanText(out.title, 120),
      category: i.category,
      goal: cleanText(out.goal, 600),
      deliverables,
      acceptance,
      clientProvides: list(out.clientProvides, 6),
      audience: cleanText(out.audience, 200) || undefined,
      tone: cleanText(out.tone, 120) || undefined,
      timeline: cleanText(out.timeline, 80) || undefined,
      budgetHint: cleanText(out.budgetHint, 80) || undefined,
      ...extras,
    },
  };
}
