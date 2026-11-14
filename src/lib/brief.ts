import "server-only";
import type { BriefAsset, Category, StructuredBrief } from "@/db/schema";
import { CATEGORIES } from "./constants";
import { chatJSON, cleanText, detectCategory } from "./ai";

export type BriefQuestion = { id: string; q: string; hint?: string; options?: string[]; multi?: boolean; required?: boolean };

export const IDK = "ما أدري، اقترحوا علي";

const BUSINESS: BriefQuestion = { id: "business", q: "وش نشاطك، ومين عملاؤك؟", hint: "مثال: مقهى مختص في حائل، عملاؤه شباب وعائلات", required: true };

/**
 * The questions an account manager at an agency would ask. Clients rarely know how to
 * write a brief; they do know how to answer short, concrete questions. Required questions
 * are the ones a freelancer cannot start without: what, how many, and where.
 */
export const QUESTION_BANK: Record<Category, BriefQuestion[]> = {
  content: [
    BUSINESS,
    { id: "purpose", q: "وش تبي المحتوى يحقق؟", options: ["تعريف بالنشاط", "حماس قبل افتتاح أو إطلاق", "زيادة الطلبات والمبيعات", "تفاعل ومتابعين"] },
    { id: "quantity", q: "كم قطعة تحتاج؟", options: ["8 منشورات", "12 منشور + 4 ستوري", "30 منشور (يومي لشهر)", IDK], hint: "أو اكتب العدد اللي تبيه", required: true },
    { id: "platform", q: "لأي منصة؟", options: ["انستقرام", "تيك توك", "سناب", "إكس", "لينكدإن", IDK], multi: true, required: true },
    { id: "voice", q: "بأي لهجة ونبرة؟", options: ["سعودية بيضاء", "فصحى مبسطة", "نجدية", "حجازية", "إنجليزي"] },
    { id: "includes", q: "تبي نص فقط، أو نص مع تصميم؟", options: ["نص فقط", "نص + تصميم", IDK] },
    { id: "must", q: "فيه شي لازم ينذكر أو ممنوع ينذكر؟", hint: "عروض، أسعار، مواعيد، كلمات ما تبيها" },
  ],
  media: [
    BUSINESS,
    { id: "type", q: "وش نوع العمل؟", options: ["شعار وهوية", "تصاميم سوشال", "فيديو قصير", "صور منتجات", "تعليق صوتي"], required: true },
    { id: "quantity", q: "كم قطعة أو كم مدة؟", options: ["قطعة وحدة", "3 إلى 5", "6 إلى 10", IDK], hint: "أو اكتب: 6 تصاميم مربعة + 3 ستوري، فيديو 15 ثانية…", required: true },
    { id: "have", q: "وش عندك جاهز؟", options: ["شعار", "ألوان وخطوط", "صور للمنتجات", "ما عندي شي"], multi: true },
    { id: "use", q: "وين بينعرض؟", options: ["انستقرام", "تيك توك", "سناب", "مطبوعات", "الموقع", IDK], multi: true, required: true },
    { id: "must", q: "فيه شي لازم يظهر أو ممنوع يظهر؟", hint: "نص معيّن، سعر، عرض، أشخاص، موسيقى" },
  ],
  code: [
    BUSINESS,
    { id: "type", q: "وش تبي ينبني؟", options: ["صفحة أو موقع تعريفي", "متجر إلكتروني", "شات بوت", "أتمتة بين أنظمة", "لوحة بيانات"], required: true },
    { id: "users", q: "مين بيستخدمه، ووش أهم 3 أشياء يسويها فيه؟", required: true },
    { id: "have", q: "وش عندك جاهز؟", options: ["دومين", "استضافة", "تصميم", "محتوى وصور", "حسابات (سلة / زد / واتساب)", "ما عندي شي"], multi: true },
    { id: "integrations", q: "يحتاج يرتبط بشي؟", hint: "دفع، واتساب، سلة، زد، قوقل شيت…" },
    { id: "must", q: "وش اللي يخليك تقول: هذا مضبوط؟", hint: "مثال: العميل يحجز موعد من الجوال في أقل من دقيقة" },
  ],
};

/** What Mutqen proposes when the client answers "I don't know". Shown as a suggestion they can edit. */
const MEDIA_DEFAULTS: Record<string, string> = {
  "شعار وهوية": "شعار + لوحة ألوان وخطوط + 5 قوالب سوشال",
  "تصاميم سوشال": "6 تصاميم مربعة + 3 ستوري",
  "فيديو قصير": "فيديو واحد من 15 إلى 30 ثانية بمقاس 9:16",
  "صور منتجات": "10 صور منتجات",
  "تعليق صوتي": "تعليق صوتي واحد حتى 60 ثانية",
};

export type ResolvedAnswers = { values: Record<string, string>; suggested: string[] };

/** Fills "I don't know" with a concrete default, so no brief goes out without a count and a place. */
export function resolveAnswers(category: Category, raw: Record<string, string>): ResolvedAnswers {
  const values: Record<string, string> = {};
  const suggested: string[] = [];
  const idk = (v?: string) => !v || v.includes(IDK);
  // The "I don't know" option itself contains a comma, so remove it before splitting the picks.
  const clean = (v?: string) => (v ?? "").replaceAll(IDK, "").split("،").map((x) => x.trim()).filter(Boolean).join("، ");
  for (const [k, v] of Object.entries(raw)) if (v) values[k] = clean(v) || v;
  const suggest = (id: string, value: string) => {
    values[id] = value;
    suggested.push(value);
  };
  if (category === "content") {
    if (idk(raw.quantity) && !clean(raw.quantity)) suggest("quantity", "12 منشور + 4 ستوري");
    if (idk(raw.platform) && !clean(raw.platform)) suggest("platform", "انستقرام");
    if (raw.includes?.includes(IDK)) suggest("includes", "نص + تصميم بسيط بقالب ثابت");
  }
  if (category === "media") {
    const type = clean(raw.type).split("، ")[0];
    if (idk(raw.quantity) && !clean(raw.quantity)) suggest("quantity", MEDIA_DEFAULTS[type] ?? "3 إلى 5 قطع");
    if (idk(raw.use) && !clean(raw.use)) suggest("use", "انستقرام");
  }
  return { values, suggested };
}

export function missingRequired(questions: BriefQuestion[], answers: Record<string, string>) {
  return questions.filter((q) => q.required && !answers[q.id]?.trim()).map((q) => q.q);
}

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
    .map((q): BriefQuestion => {
      const base = bank.find((b) => b.id === q.id)!;
      return {
        id: q.id,
        q: cleanText(q.q, 200) || base.q,
        hint: q.hint ? cleanText(q.hint, 200) : base.hint,
        // Options always come from the bank: they are the tested, tappable answers.
        options: base.options,
        multi: base.multi,
        required: base.required,
      };
    });
  if (tailored.length < 4) return { category, questions: bank, source: "fallback" };
  // The model may drop a question it thinks was answered; required ones always stay, in bank order.
  for (const req of bank.filter((b) => b.required)) if (!tailored.some((t) => t.id === req.id)) tailored.push(req);
  const order = bank.map((b) => b.id);
  tailored.sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));
  return { category, questions: tailored, source: "ai" };
}

export type BriefInputs = {
  input: string;
  category: Category;
  answers: { id: string; q: string; a: string }[];
  style: string[];
  colors: string[];
  references: string[];
  assets: BriefAsset[];
};

const list = (v: unknown, max: number, len = 300) => (Array.isArray(v) ? v.map((x) => cleanText(x, len)).filter(Boolean).slice(0, max) : []);
const hasNumber = (t: string) => /[0-9٠-٩]/.test(t);

function fallbackCompose(i: BriefInputs, r: ResolvedAnswers): StructuredBrief {
  const v = r.values;
  const mark = (x: string) => (r.suggested.includes(x) ? `${x} (اقتراح متقن، تقدر تعدّله)` : x);
  const look = [i.colors[0] ? `الألوان: ${i.colors[0]}` : "", i.style.length ? `الأسلوب: ${i.style.join("، ")}` : ""].filter(Boolean).join("، ");
  let deliverables: string[] = [];
  let acceptance: string[] = [];
  if (i.category === "content") {
    const design = (v.includes ?? "").includes("تصميم");
    deliverables = [
      `${mark(v.quantity)} على ${mark(v.platform)}، مع الكابشن والهاشتاقات${design ? " والتصميم" : ""}`,
      "عيّنة أولى من قطعتين لاعتماد النبرة قبل باقي القطع",
      "ملف واحد منظّم بكل القطع، جاهز للنشر",
    ];
    acceptance = [
      `العدد ${v.quantity} على ${v.platform}`,
      v.voice ? `اللهجة ${v.voice}` : "اللهجة والنبرة كما اتفقنا في العيّنة",
      "بدون أخطاء إملائية",
      v.must ? `يلتزم بالمطلوب: ${v.must}` : "يذكر النشاط وكيف يوصل له العميل",
    ];
  } else if (i.category === "media") {
    deliverables = [
      `${v.type}: ${mark(v.quantity)}`,
      `بمقاسات جاهزة لـ${mark(v.use)}`,
      "عيّنة أولى لاعتماد الاتجاه البصري",
      "الملفات المصدرية مع التسليم",
    ];
    acceptance = [
      `العدد ${v.quantity}، بمقاسات ${v.use}`,
      look ? `يلتزم بـ${look}` : (v.have ?? "").includes("شعار") ? "يلتزم بالشعار والهوية المرفقة" : "يلتزم بالاتجاه المعتمد في العيّنة",
      "النصوص والأسماء مكتوبة صح وواضحة",
      v.must ? `يلتزم بالمطلوب: ${v.must}` : "تسليم ملفات المصدر",
    ];
  } else {
    deliverables = [`${v.type} يخدم: ${v.users}`, "عيّنة أولى: الصفحة أو المسار الأساسي يشتغل على رابط تجريبي", "الكود المصدري وشرح مكتوب للتشغيل"];
    acceptance = [
      `الوظائف المذكورة تشتغل: ${v.users}`,
      "يشتغل على الجوال والكمبيوتر",
      v.integrations ? `الربط مع ${v.integrations} يشتغل فعلياً` : "تسليم الكود وطريقة التشغيل",
      ...(v.must ? [v.must] : []),
    ];
  }
  return {
    title: cleanText(i.input.split(/[.\n،!؟?]/)[0], 80) || `طلب ${CATEGORIES[i.category].label}`,
    category: i.category,
    goal: cleanText([v.business, v.purpose ?? v.type].filter(Boolean).join(" — ") || i.input, 600),
    deliverables,
    acceptance,
    clientProvides: v.have && !v.have.includes("ما عندي") ? [`الموجود عندك: ${v.have}`] : [],
    audience: v.business,
    tone: v.voice,
  };
}

/** A brief is only ready when a freelancer can count what to deliver and test it. */
function ensureMeasurable(b: StructuredBrief, r: ResolvedAnswers): StructuredBrief {
  if (b.category === "code") return b;
  const qty = r.values.quantity;
  const where = r.values.platform ?? r.values.use;
  const out = { ...b, deliverables: [...b.deliverables], acceptance: [...(b.acceptance ?? [])] };
  if (qty && !out.deliverables.some(hasNumber)) out.deliverables.unshift(`${qty}${where ? ` على ${where}` : ""}`);
  if (qty && !out.acceptance.some(hasNumber)) out.acceptance.unshift(`العدد ${qty}${where ? ` على ${where}` : ""}`);
  return out;
}

/** Step 2: turn the answers into a brief with deliverables and acceptance criteria. */
export async function composeBrief(i: BriefInputs): Promise<{ brief: StructuredBrief; source: "ai" | "fallback" }> {
  const resolved = resolveAnswers(i.category, Object.fromEntries(i.answers.map((a) => [a.id, a.a])));
  const extras = { style: i.style, colors: i.colors, references: i.references, assets: i.assets, answers: i.answers.map(({ q, a }) => ({ q, a })) };
  const system = `أنت مسؤول حسابات في وكالة سعودية تكتب «ملخص طلب» يقرؤه مستقل وينفّذ منه بدون ما يرجع يسأل.
اكتب بلهجة سعودية بيضاء مختصرة. لا تخترع معلومات ما قالها العميل؛ إذا نقص شي مهم اكتبه في clientProvides كشيء يوفّره العميل.
أعد JSON فقط:
{"title":"عنوان قصير محدد","goal":"الهدف في جملتين: النشاط ووش يبي يحقق","deliverables":["مخرجات محددة بالعدد والمقاس والصيغة، 3 إلى 6"],"acceptance":["معايير قبول قابلة للتحقق بنعم أو لا، 3 إلى 5"],"clientProvides":["وش لازم يوفّره العميل"],"audience":"الجمهور","tone":"اللهجة والنبرة","timeline":"مدة معقولة","budgetHint":"نطاق سعر تقريبي بالريال"}
معايير القبول هي اللي تحدد لاحقاً إن التعديل مشمول أو عمل إضافي، فخلها واضحة وما تحتمل تفسيرين.
لازم أول مخرج فيه العدد والمنصة أو المقاس بالأرقام. القيم في suggested_by_mutqen اقترحها متقن لأن العميل قال «ما أدري»: استخدمها واكتب بعدها «(اقتراح متقن، تقدر تعدّله)».`;
  const answers = i.answers.map((a) => ({ q: a.q, a: resolved.values[a.id] ?? a.a }));
  const user = JSON.stringify({ request: i.input.slice(0, 1500), category: CATEGORIES[i.category].label, answers, suggested_by_mutqen: resolved.suggested, style: i.style, colors: i.colors, has_files: i.assets.map((a) => a.label), references: i.references.length });
  const out = await chatJSON<Partial<StructuredBrief>>(system, user);
  const deliverables = list(out?.deliverables, 6);
  const acceptance = list(out?.acceptance, 5);
  if (!out || !out.title || deliverables.length < 2 || acceptance.length < 2) return { brief: { ...fallbackCompose(i, resolved), ...extras }, source: "fallback" };
  return {
    source: "ai",
    brief: ensureMeasurable({
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
    }, resolved),
  };
}
