import { randomBytes } from "node:crypto";
/**
 * Sample data for a demo or staging environment. A real launch starts from an empty database
 * (run the migrations only). Usage:
 *   npm run db:seed            (refuses if data exists)
 *   npm run db:seed -- --reset (wipes all tables first; on a hosted database also needs --wipe-hosted)
 * All people and businesses here are fictional.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db, schema } from "../src/db";
import type { Category, OrderStage, OrderStatus, PortfolioItem, ServicePackage, StructuredBrief } from "../src/db/schema";
import { computeFees, MANAGED_FEE } from "../src/lib/constants";
import { newId } from "../src/lib/id";

// Passwords never live in the repository. Against a real database they must come from the
// environment; if they are missing, random ones are generated and printed once.
const hosted = Boolean(process.env.DATABASE_URL);
const randomPassword = () => randomBytes(12).toString("base64url");
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? (hosted ? randomPassword() : "local-dev-only");
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? (hosted ? randomPassword() : DEMO_PASSWORD);
const DAY = 24 * 3600 * 1000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600 * 1000);

const HOUR = 3600 * 1000;

/** Fictional but checksum-valid Saudi IBANs, so payout screens behave as they will in production. */
function demoIban(n: number) {
  const bban = "80" + String(100000000000000000 + n * 7919).padStart(18, "0");
  const numeric = (bban + "SA00").replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97;
  return `SA${String(98 - rem).padStart(2, "0")}${bban}`;
}

type SellerSeed = {
  key: string;
  name: string;
  email?: string;
  headline: string;
  bio: string;
  city: string;
  categories: Category[];
  tools: string[];
  doc?: string;
  score: number;
  portfolio?: PortfolioItem[];
  services: { title: string; description: string; tools: string[]; packages: [number, number, number]; days: [number, number, number]; features: [string[], string[], string[]] }[];
};

const SELLERS: SellerSeed[] = [
  {
    key: "noura",
    name: "نورة العتيبي",
    email: "seller@mutqen.demo",
    headline: "كاتبة محتوى سوشال بالذكاء الاصطناعي للمطاعم والكافيهات",
    bio: "أكتب محتوى انستقرام وتيك توك للمطاعم والكافيهات من 3 سنوات. أستخدم ChatGPT وClaude لتسريع الأفكار والمسودات، وأعدّل النبرة يدوياً عشان تطلع قريبة من جمهور كل مدينة.",
    city: "الرياض",
    categories: ["content"],
    tools: ["ChatGPT", "Claude", "Midjourney"],
    doc: "FL-2026-118392",
    score: 88,
    services: [
      {
        title: "محتوى انستقرام لشهر كامل لمطعمك أو كافيهك بلهجة سعودية",
        description: "أجهز لك خطة محتوى شهرية مع الكابشن والهاشتاقات وأفكار الصور.\nأبدأ بفهم هوية مكانك وجمهورك، أولّد الأفكار بالذكاء الاصطناعي، ثم أكتب وأعدّل كل منشور بنفسي عشان يطلع طبيعي ومو آلي.\nتحتاج تعطيني: اسم المكان، المنيو، وأي حسابات تعجبك.",
        tools: ["ChatGPT", "Claude", "Midjourney"],
        packages: [450, 850, 1500],
        days: [2, 3, 5],
        features: [["6 منشورات", "كابشن وهاشتاقات"], ["12 منشور", "كابشن وهاشتاقات", "أفكار صور بالذكاء الاصطناعي"], ["20 منشور + 8 ستوري", "صور مقترحة بـ Midjourney", "تقويم نشر", "تعديلين"]],
      },
      {
        title: "سكربت إعلان قصير (ريلز/تيك توك) يجذب من أول 3 ثواني",
        description: "أكتب سكربتات إعلانية قصيرة مبنية على أفضل الأنماط في السوق السعودي، مع 3 بدايات (Hooks) مختلفة لكل سكربت عشان تختبر الأفضل.",
        tools: ["ChatGPT", "Claude"],
        packages: [200, 380, 700],
        days: [1, 2, 3],
        features: [["سكربت واحد", "3 بدايات مختلفة"], ["3 سكربتات", "3 بدايات لكل سكربت"], ["6 سكربتات", "توصيات تصوير", "تعديلين"]],
      },
    ],
  },
  {
    key: "faisal",
    name: "فيصل القحطاني",
    headline: "مقالات SEO عربية متوافقة مع محركات البحث والذكاء الاصطناعي",
    bio: "متخصص في المحتوى العربي الطويل للمدونات والمتاجر. أبحث بالكلمات المفتاحية، أبني الهيكل بالذكاء الاصطناعي، وأكتب وأدقق يدوياً.",
    city: "جدة",
    categories: ["content"],
    tools: ["ChatGPT", "Perplexity", "Gemini"],
    score: 82,
    services: [
      {
        title: "مقالات SEO عربية لمدونة متجرك (1500 كلمة)",
        description: "مقالات مبنية على بحث كلمات مفتاحية حقيقي، بهيكل واضح وعناوين جذابة، ومراجعة يدوية للمعلومات والمصادر.",
        tools: ["Perplexity", "ChatGPT", "Gemini"],
        packages: [250, 650, 1200],
        days: [2, 4, 7],
        features: [["مقال واحد", "بحث كلمات مفتاحية"], ["3 مقالات", "وصف ميتا", "روابط داخلية"], ["6 مقالات", "خطة محتوى", "تحسين مقالات قديمة"]],
      },
    ],
  },
  {
    key: "reem",
    name: "ريم الزهراني",
    headline: "ترجمة وتعريب احترافي بالذكاء الاصطناعي + مراجعة بشرية",
    bio: "أعرّب المواقع والتطبيقات والعروض التقديمية. أستخدم DeepL وClaude للترجمة الأولية وأراجع كل جملة عشان تطلع عربية طبيعية.",
    city: "الدمام",
    categories: ["content"],
    tools: ["DeepL", "Claude", "ChatGPT"],
    doc: "FL-2026-204418",
    score: 79,
    services: [
      {
        title: "تعريب موقعك أو تطبيقك بلغة عربية طبيعية",
        description: "مو ترجمة حرفية: أعرّب النصوص بما يناسب المستخدم السعودي، مع قاموس مصطلحات ثابت لمنتجك.",
        tools: ["DeepL", "Claude"],
        packages: [300, 700, 1400],
        days: [2, 3, 6],
        features: [["حتى 1000 كلمة"], ["حتى 3000 كلمة", "قاموس مصطلحات"], ["حتى 7000 كلمة", "قاموس مصطلحات", "مراجعة واجهات"]],
      },
    ],
  },
  {
    key: "abdulaziz",
    name: "عبدالعزيز الحربي",
    headline: "صانع فيديو قصير بالذكاء الاصطناعي للعلامات التجارية",
    bio: "أصنع إعلانات ريلز وتيك توك بدمج التصوير بالجوال مع أدوات Runway وKling، وتعليق صوتي سعودي. أحرص على مطابقة أنظمة المحتوى.",
    city: "الرياض",
    categories: ["media"],
    tools: ["Runway", "Kling", "ElevenLabs", "CapCut AI"],
    doc: "FL-2026-331027",
    score: 91,
    services: [
      {
        title: "فيديو ريلز إعلاني 15–30 ثانية بالذكاء الاصطناعي",
        description: "من الفكرة للسكربت للفيديو النهائي. أولّد المشاهد بـ Runway وKling وأدمجها مع لقطات منتجك، مع تعليق صوتي سعودي.",
        tools: ["Runway", "Kling", "ElevenLabs", "CapCut AI"],
        packages: [600, 1200, 2400],
        days: [2, 3, 5],
        features: [["فيديو 15 ثانية", "موسيقى مرخصة"], ["فيديو 30 ثانية", "تعليق صوتي", "3 مقاسات"], ["3 فيديوهات", "تعليق صوتي", "سكربت", "3 مقاسات لكل فيديو"]],
      },
      {
        title: "تعليق صوتي سعودي بالذكاء الاصطناعي لإعلانك",
        description: "أصوات طبيعية بلهجات سعودية مختلفة، مع ضبط الإيقاع والنطق يدوياً.",
        tools: ["ElevenLabs"],
        packages: [150, 300, 600],
        days: [1, 1, 2],
        features: [["حتى 30 ثانية"], ["حتى 90 ثانية", "صوتين للاختيار"], ["حتى 5 دقائق", "3 أصوات", "مزج مع موسيقى"]],
      },
    ],
  },
  {
    key: "lama",
    name: "لمى الدوسري",
    headline: "مصممة هويات بصرية وصور منتجات بالذكاء الاصطناعي",
    bio: "أصمم هويات بصرية للمشاريع الناشئة، وصور منتجات احترافية بدون استوديو باستخدام Midjourney وFirefly.",
    city: "الخبر",
    categories: ["media"],
    tools: ["Midjourney", "Adobe Firefly"],
    score: 86,
    services: [
      {
        title: "صور منتجات احترافية بدون تصوير — بالذكاء الاصطناعي",
        description: "أرسل لي صورة منتجك بالجوال، وأسلمك صوراً بخلفيات ومشاهد احترافية جاهزة للمتجر والإعلانات.",
        tools: ["Midjourney", "Adobe Firefly"],
        packages: [250, 550, 1100],
        days: [1, 2, 4],
        features: [["5 صور لمنتج واحد"], ["15 صورة لـ 3 منتجات", "مقاسات المتاجر"], ["40 صورة لـ 8 منتجات", "مقاسات المتاجر والسوشال"]],
      },
      {
        title: "هوية بصرية متكاملة لمشروعك الناشئ",
        description: "شعار، ألوان، خطوط، وقوالب سوشال. أستخدم الذكاء الاصطناعي للاستكشاف السريع وأرسم الشعار النهائي يدوياً بصيغ متجهة.",
        tools: ["Midjourney", "Adobe Firefly"],
        packages: [900, 1800, 3500],
        days: [3, 5, 8],
        features: [["شعار + لوحة ألوان"], ["شعار + ألوان + خطوط", "5 قوالب سوشال"], ["هوية كاملة", "دليل هوية", "15 قالب", "مطبوعات"]],
      },
    ],
  },
  {
    key: "turki",
    name: "تركي العنزي",
    headline: "موشن جرافيك وأنيميشن قصير بالذكاء الاصطناعي",
    bio: "أحوّل فكرتك لفيديو موشن قصير يشرح منتجك. أدمج أدوات توليد الفيديو مع التحريك اليدوي.",
    city: "حائل",
    categories: ["media"],
    tools: ["Runway", "Midjourney", "Suno"],
    score: 77,
    services: [
      {
        title: "فيديو موشن يشرح منتجك في 45 ثانية",
        description: "سكربت + رسومات + تحريك + موسيقى. مناسب للتطبيقات والخدمات الجديدة.",
        tools: ["Runway", "Midjourney", "Suno"],
        packages: [800, 1500, 2800],
        days: [3, 5, 7],
        features: [["30 ثانية", "موسيقى"], ["45 ثانية", "تعليق صوتي", "موسيقى خاصة"], ["90 ثانية", "تعليق صوتي", "نسخة إنجليزية"]],
      },
    ],
  },
  {
    key: "omar",
    name: "عمر الشهري",
    headline: "مطوّر وكلاء ذكاء اصطناعي وشات بوت واتساب",
    bio: "أبني شات بوت وأنظمة أتمتة تشتغل على بيانات الشركة. أستخدم Claude Code وCursor للبناء السريع، وn8n للأتمتة، مع اختبار جودة قبل التسليم.",
    city: "الرياض",
    categories: ["code"],
    tools: ["Claude Code", "Cursor", "n8n"],
    doc: "FL-2026-419950",
    score: 93,
    services: [
      {
        title: "شات بوت واتساب يرد على عملاء متجرك من ملف الأسئلة الشائعة",
        description: "بوت يجاوب بدقة من بياناتك فقط، ويحوّل للموظف إذا ما لقى جواب. أبنيه بأسلوب RAG مع اختبار على أسئلة حقيقية قبل التسليم.",
        tools: ["Claude Code", "n8n", "Cursor"],
        packages: [1500, 3000, 6000],
        days: [4, 6, 10],
        features: [["حتى 50 سؤال", "واتساب"], ["حتى 200 سؤال", "واتساب + موقع", "تقارير أسبوعية"], ["بيانات غير محدودة", "ربط بالمتجر", "تحويل للموظف", "شهر دعم"]],
      },
      {
        title: "أتمتة شغلك المتكرر بـ n8n والذكاء الاصطناعي",
        description: "ربط الإيميل والجداول والمتجر والواتساب، وخلي الذكاء الاصطناعي يصنف ويرد ويلخص بدالك.",
        tools: ["n8n", "Claude Code"],
        packages: [700, 1400, 2800],
        days: [2, 4, 7],
        features: [["أتمتة واحدة"], ["3 أتمتات", "توثيق"], ["6 أتمتات", "لوحة متابعة", "تدريب الفريق"]],
      },
    ],
  },
  {
    key: "sara",
    name: "سارة المطيري",
    headline: "صفحات هبوط ومواقع سريعة بالذكاء الاصطناعي",
    bio: "أبني صفحات هبوط ومواقع تعريفية سريعة ومتجاوبة باستخدام v0 وCursor، مع كتابة المحتوى وتحسين السرعة.",
    city: "جدة",
    categories: ["code"],
    tools: ["v0", "Cursor", "Lovable"],
    score: 84,
    services: [
      {
        title: "صفحة هبوط احترافية لإطلاق منتجك خلال 48 ساعة",
        description: "صفحة عربية متجاوبة، سريعة، ومربوطة بنموذج تسجيل وتحليلات. تشمل كتابة النصوص.",
        tools: ["v0", "Cursor"],
        packages: [700, 1300, 2500],
        days: [2, 3, 5],
        features: [["صفحة واحدة", "نموذج تسجيل"], ["صفحة + نصوص", "تحليلات", "نطاق خاص"], ["حتى 5 صفحات", "نصوص", "لوحة تعديل", "تحسين SEO"]],
      },
    ],
  },
  {
    key: "khaled",
    name: "خالد السبيعي",
    headline: "تطبيقات ويب داخلية للشركات (داشبورد، أنظمة طلبات)",
    bio: "أبني أدوات داخلية تختصر شغل الإكسل: داشبوردات، أنظمة طلبات، وبوابات عملاء.",
    city: "القصيم",
    categories: ["code"],
    tools: ["Cursor", "GitHub Copilot", "Claude Code"],
    score: 80,
    services: [
      {
        title: "داشبورد يحوّل ملفات الإكسل عندك لتقارير حية",
        description: "ربط بياناتك، مؤشرات أداء واضحة، وتحديث تلقائي. مع صلاحيات للمستخدمين.",
        tools: ["Cursor", "Claude Code"],
        packages: [1200, 2500, 5000],
        days: [4, 7, 12],
        features: [["5 مؤشرات"], ["15 مؤشر", "صلاحيات"], ["غير محدود", "ربط أنظمة", "تدريب"]],
      },
    ],
  },
];


const PORTFOLIO: Record<string, PortfolioItem[]> = {
  noura: [
    { title: "حملة افتتاح مقهى مختص", description: "12 منشور بلهجة نجدية خفيفة قبل الافتتاح بأسبوعين.", image: "/demo/social-post-1.svg" },
    { title: "محتوى موسم العيد لمحل حلويات", description: "تقويم نشر 3 أسابيع مع عروض الطلب المسبق.", image: "/demo/social-post-2.svg" },
  ],
  faisal: [{ title: "مقالات مدونة متجر عناية", description: "6 مقالات مبنية على بحث كلمات مفتاحية.", image: "/demo/article.svg" }],
  reem: [{ title: "تعريب تطبيق توصيل", description: "واجهات التطبيق كاملة مع قاموس مصطلحات.", image: "/demo/translation.svg" }],
  abdulaziz: [
    { title: "ريلز إطلاق عطر", description: "ستوري بورد ثم فيديو 15 ثانية بثلاثة مقاسات.", image: "/demo/reel-storyboard.svg" },
    { title: "صورة منتج للإعلان", description: "مشهد غروب مولّد ومدموج مع لقطة المنتج.", image: "/demo/product-shot.svg" },
  ],
  lama: [
    { title: "شعار مقهى مختص", description: "شعار مرسوم يدوياً بعد استكشاف الاتجاهات بالذكاء الاصطناعي.", image: "/demo/logo-cafe.svg" },
    { title: "لوحة ألوان وخطوط", description: "هوية متجر حلويات مع قوالب سوشال.", image: "/demo/identity-palette.svg" },
    { title: "صور منتجات بدون استوديو", description: "15 صورة لثلاثة عطور.", image: "/demo/product-shot.svg" },
  ],
  turki: [{ title: "موشن يشرح تطبيق", description: "45 ثانية مع تعليق صوتي.", image: "/demo/motion-frames.svg" }],
  omar: [
    { title: "بوت واتساب لمتجر", description: "يجاوب من ملف الأسئلة الشائعة ويحوّل للموظف.", image: "/demo/chatbot.svg" },
    { title: "أتمتة طلبات المتجر", description: "من المتجر إلى واتساب وجدول المتابعة.", image: "/demo/automation.svg" },
  ],
  sara: [{ title: "صفحة هبوط لدورة تدريبية", description: "صفحة عربية سريعة مع نموذج تسجيل.", image: "/demo/landing-page.svg" }],
  khaled: [{ title: "لوحة مبيعات يومية", description: "تقارير حيّة من ملفات الإكسل.", image: "/demo/dashboard.svg" }],
};

const PENDING: SellerSeed = {
  key: "hind",
  name: "هند الغامدي",
  email: "pending@mutqen.demo",
  headline: "كاتبة محتوى تسويقي وإيميلات بالذكاء الاصطناعي",
  bio: "أكتب حملات إيميل ومحتوى تسويقي للمتاجر الإلكترونية.",
  city: "مكة المكرمة",
  categories: ["content"],
  tools: ["ChatGPT", "Claude"],
  score: 74,
  services: [],
};

const BUYERS = [
  { key: "rawq", name: "مقهى رَوْق", email: "buyer@mutqen.demo" },
  { key: "deera", name: "حلويات الديرة", email: "deera@mutqen.demo" },
  { key: "abaq", name: "متجر عبق للعطور", email: "abaq@mutqen.demo" },
  { key: "salman", name: "سلمان الرشيدي", email: "salman@mutqen.demo" },
  { key: "nabd", name: "وكالة نَبْض للتسويق", email: "nabd@mutqen.demo" },
  { key: "munira", name: "منيرة الحمدان", email: "munira@mutqen.demo" },
] as const;
type BuyerKey = (typeof BUYERS)[number]["key"];

/** Briefs as the guided builder produces them: deliverables plus acceptance criteria. */
const BRIEF_BANK: Record<string, { input: string; b: StructuredBrief }> = {
  cafeLaunch: {
    input: "أبي محتوى انستقرام لافتتاح فرعنا الجديد في حائل",
    b: {
      title: "محتوى انستقرام لافتتاح فرع مقهى رَوْق في حائل",
      category: "content",
      goal: "مقهى مختص يفتح فرعه الثاني في حائل. نبي الناس تعرف موعد الافتتاح وتجي أول أسبوع.",
      deliverables: ["12 منشور انستقرام مع الكابشن والهاشتاقات", "4 ستوريات للعد التنازلي", "تقويم نشر لأسبوعين"],
      acceptance: ["العدد 12 منشور و4 ستوريات", "اللهجة نجدية خفيفة بدون فصحى ثقيلة", "كل منشور يذكر موعد الافتتاح أو الموقع", "خالٍ من الأخطاء الإملائية"],
      clientProvides: ["الشعار وصور المكان", "المنيو والأسعار"],
      audience: "شباب وعائلات في حائل",
      tone: "دافئة وقريبة، نجدية خفيفة",
      style: ["عصري", "هادئ"],
      colors: ["ترابي دافئ"],
      answers: [
        { q: "وش نشاطك، ومين عملاؤك؟", a: "مقهى مختص في حائل، عملاؤنا شباب وعائلات" },
        { q: "وش تبي المحتوى يحقق؟", a: "حماس قبل افتتاح أو إطلاق" },
        { q: "كم قطعة تحتاج، ولأي منصة؟", a: "12 منشور انستقرام + 4 ستوري" },
      ],
      timeline: "3 أيام",
    },
  },
  sweetsEid: {
    input: "أبي منشورات لمحل الحلويات قبل العيد",
    b: {
      title: "محتوى موسم العيد لحلويات الديرة",
      category: "content",
      goal: "محل حلويات في حائل يبي يرفع الطلب المسبق قبل العيد بثلاثة أسابيع.",
      deliverables: ["12 منشور انستقرام مع الكابشن", "3 نصوص لعروض الطلب المسبق", "قائمة هاشتاقات محلية"],
      acceptance: ["كل منشور فيه دعوة واضحة للطلب المسبق", "ذكر آخر موعد للطلب في 4 منشورات على الأقل", "اللهجة سعودية بيضاء", "بدون مبالغات أو ادعاءات صحية"],
      clientProvides: ["قائمة الأصناف والأسعار", "صور الحلويات"],
      audience: "عائلات حائل",
      tone: "سعودية بيضاء ومرحة",
      timeline: "3 أيام",
    },
  },
  blogSeo: {
    input: "أبي مقالات لمدونة المتجر عن العطور",
    b: {
      title: "3 مقالات SEO لمدونة متجر عبق للعطور",
      category: "content",
      goal: "متجر عطور إلكتروني يبي زيارات من البحث لمدونته.",
      deliverables: ["3 مقالات، كل مقال 1500 كلمة", "وصف ميتا لكل مقال", "قائمة الكلمات المفتاحية المستخدمة"],
      acceptance: ["كل مقال 1400 كلمة على الأقل", "الكلمة المفتاحية في العنوان وأول فقرة", "مصادر المعلومات مذكورة", "فصحى مبسطة بدون أخطاء"],
      clientProvides: ["رابط المتجر", "المنتجات اللي نبي نركز عليها"],
      tone: "فصحى مبسطة",
      timeline: "4 أيام",
    },
  },
  appArabic: {
    input: "أبي تعريب صفحات التطبيق قبل الإطلاق",
    b: {
      title: "تعريب واجهات تطبيق توصيل (3000 كلمة)",
      category: "content",
      goal: "تطبيق توصيل يطلق في السعودية ويحتاج واجهات عربية طبيعية.",
      deliverables: ["ملف النصوص معرّب كامل", "قاموس مصطلحات ثابت للتطبيق"],
      acceptance: ["كل نص في الملف له مقابل عربي", "المصطلح الواحد له ترجمة واحدة في كل الواجهات", "الأزرار ما تتجاوز 3 كلمات"],
      clientProvides: ["ملف النصوص الإنجليزي", "صور الشاشات"],
      timeline: "3 أيام",
    },
  },
  perfumeReel: {
    input: "أبي فيديو ريلز لعطرنا الجديد سدو",
    b: {
      title: "ريلز إعلاني 30 ثانية لعطر «سدو»",
      category: "media",
      goal: "متجر عطور يطلق عطر جديد ويبي فيديو يوصل إحساس فخم وتراثي.",
      deliverables: ["فيديو 30 ثانية بمقاس 9:16", "نسختين إضافيتين 1:1 و16:9", "تعليق صوتي سعودي"],
      acceptance: ["المدة بين 28 و32 ثانية", "اسم العطر يظهر مكتوباً في آخر 5 ثواني", "الموسيقى مرخصة للاستخدام التجاري", "التعليق الصوتي واضح وبدون أخطاء نطق"],
      clientProvides: ["صور وفيديو للعبوة", "الشعار"],
      style: ["كلاسيكي", "جريء"],
      colors: ["أسود وذهبي"],
      timeline: "3 أيام",
    },
  },
  cafeLogo: {
    input: "أبي شعار وهوية لمقهى مختص",
    b: {
      title: "شعار وهوية بصرية لمقهى رَوْق",
      category: "media",
      goal: "مقهى مختص في حائل يحتاج شعار وألوان وخطوط قبل افتتاح الفرع الثاني.",
      deliverables: ["شعار بصيغ SVG و PNG", "لوحة ألوان وخطوط", "5 قوالب سوشال"],
      acceptance: ["الشعار يُقرأ بوضوح بحجم 2 سم", "الملفات المصدرية مسلّمة", "القوالب بمقاس 1080×1080", "الألوان من اللوحة المعتمدة فقط"],
      clientProvides: ["اسم المقهى بالعربي والإنجليزي", "صور للمكان"],
      style: ["عصري", "بسيط"],
      colors: ["ترابي دافئ"],
      timeline: "5 أيام",
    },
  },
  productPhotos: {
    input: "أبي صور منتجات لثلاثة عطور",
    b: {
      title: "15 صورة منتجات لثلاثة عطور بخلفيات صحراوية",
      category: "media",
      goal: "متجر عطور يحتاج صور احترافية للمتجر والإعلانات بدون جلسة تصوير.",
      deliverables: ["15 صورة (5 لكل عطر)", "مقاسات المتجر والسوشال"],
      acceptance: ["العبوة والملصق مطابقين للمنتج الحقيقي", "5 صور لكل عطر", "دقة لا تقل عن 2000 بكسل"],
      clientProvides: ["صورة واضحة لكل عبوة بالجوال"],
      colors: ["ترابي دافئ"],
      timeline: "يومين",
    },
  },
  appMotion: {
    input: "أبي فيديو يشرح تطبيقنا في أقل من دقيقة",
    b: {
      title: "فيديو موشن 45 ثانية يشرح تطبيق حجز ملاعب",
      category: "media",
      goal: "تطبيق حجز ملاعب يبي فيديو يشرح الفكرة لصفحة المتجر والإعلانات.",
      deliverables: ["فيديو موشن 45 ثانية", "تعليق صوتي", "نسخة بدون صوت مع ترجمة"],
      acceptance: ["المدة بين 40 و50 ثانية", "يشرح ثلاث خطوات: ابحث، احجز، ادفع", "ألوان التطبيق مستخدمة"],
      clientProvides: ["الشعار وألوان التطبيق", "صور الشاشات"],
      timeline: "5 أيام",
    },
  },
  waBot: {
    input: "أبي شات بوت واتساب يرد على العملاء",
    b: {
      title: "شات بوت واتساب يجاوب عن الطلبات والأسعار",
      category: "code",
      goal: "متجر حلويات يستقبل أسئلة متكررة على الواتساب ويبي بوت يجاوب من ملف عنده.",
      deliverables: ["بوت واتساب يجاوب من ملف الأسئلة (حتى 50 سؤال)", "تحويل للموظف إذا ما لقى جواب", "شرح مكتوب لطريقة تحديث الملف"],
      acceptance: ["يجاوب صح على 45 من 50 سؤال اختبار", "ما يخترع أسعار أو معلومات خارج الملف", "يحوّل للموظف خلال رسالتين إذا ما عرف"],
      clientProvides: ["ملف الأسئلة والأجوبة", "رقم واتساب أعمال"],
      timeline: "4 أيام",
    },
  },
  landing: {
    input: "أبي صفحة هبوط لدورة تدريبية",
    b: {
      title: "صفحة هبوط لدورة تدريبية مع نموذج تسجيل",
      category: "code",
      goal: "مدرب مستقل يطلق دورة ويبي صفحة تجمع التسجيلات.",
      deliverables: ["صفحة هبوط عربية متجاوبة", "نموذج تسجيل مربوط بجدول", "ربط بنطاق خاص"],
      acceptance: ["تفتح على الجوال في أقل من 3 ثواني", "التسجيل يوصل للجدول", "النصوص كلها عربية وبدون أخطاء"],
      clientProvides: ["محتوى الدورة وصورة المدرب", "النطاق"],
      style: ["عصري", "بسيط"],
      colors: ["أزرق وهادئ"],
      timeline: "3 أيام",
    },
  },
  automation: {
    input: "أبي طلبات المتجر توصل لقروب الواتساب",
    b: {
      title: "أتمتة طلبات المتجر إلى واتساب وجدول متابعة",
      category: "code",
      goal: "متجر عطور على سلة يبي كل طلب جديد يوصل لقروب الفريق ويتسجل في جدول.",
      deliverables: ["أتمتة n8n تشتغل على كل طلب جديد", "جدول متابعة", "توثيق مختصر"],
      acceptance: ["الطلب يوصل للقروب خلال دقيقة", "كل طلب يتسجل مرة وحدة بدون تكرار", "تنبيه إذا تعطلت الأتمتة"],
      clientProvides: ["صلاحية الربط مع سلة", "رقم الواتساب"],
      timeline: "4 أيام",
    },
  },
  dashboard: {
    input: "أبي داشبورد لمبيعات الفروع",
    b: {
      title: "لوحة مبيعات يومية من ملفات الإكسل",
      category: "code",
      goal: "وكالة تسويق تتابع أداء عملائها من ملفات إكسل متفرقة وتبي لوحة وحدة.",
      deliverables: ["لوحة بخمسة مؤشرات", "تحديث تلقائي يومي", "صلاحيات لمستخدمين"],
      acceptance: ["الأرقام تطابق ملف الإكسل", "تتحدث يومياً بدون تدخل", "تفتح على الجوال"],
      clientProvides: ["ملفات الإكسل الحالية"],
      timeline: "7 أيام",
    },
  },
};
type BriefKey = keyof typeof BRIEF_BANK;

type Scenario = {
  buyer: BuyerKey;
  seller: string;
  /** index of the freelancer's service */
  svc?: number;
  tier?: 0 | 1 | 2;
  brief: BriefKey;
  status: OrderStatus;
  stage?: OrderStage;
  /** when the client paid */
  daysAgo: number;
  hoursAgo?: number;
  acceptHours?: number;
  /** delivery time as a fraction of the agreed days; above 1 means late */
  pace?: number;
  review?: [number, string];
  managed?: boolean;
};

// Finished work first (it builds each freelancer's record), then one order in every live state.
const SCENARIOS: Scenario[] = [
  { buyer: "rawq", seller: "noura", brief: "cafeLaunch", status: "completed", daysAgo: 41, acceptHours: 2, pace: 0.8, review: [5, "المحتوى طلع بلهجتنا فعلاً، والعيّنة الأولى وفّرت علينا تعديلات كثيرة."] },
  { buyer: "rawq", seller: "noura", svc: 1, brief: "cafeLaunch", status: "completed", daysAgo: 30, acceptHours: 1, pace: 0.7, review: [5, "ثلاث بدايات للسكربت وكلها تنفع. اخترنا الثانية."] },
  { buyer: "rawq", seller: "noura", brief: "cafeLaunch", status: "completed", daysAgo: 16, acceptHours: 3, pace: 0.9, review: [4, "شغل مرتب. منشورين احتاجوا تعديل في النبرة وعدّلتهم في نفس اليوم."] },
  { buyer: "deera", seller: "noura", brief: "sweetsEid", status: "completed", daysAgo: 24, acceptHours: 5, pace: 0.95, review: [5, "الطلب المسبق زاد عن السنة اللي قبلها. بنرجع لها في رمضان."] },
  { buyer: "abaq", seller: "faisal", brief: "blogSeo", tier: 1, status: "completed", daysAgo: 35, acceptHours: 9, pace: 0.9, review: [4, "المقالات مبنية على بحث حقيقي. الثالث كان أضعف من الأول والثاني."] },
  { buyer: "nabd", seller: "faisal", brief: "blogSeo", tier: 0, status: "completed", daysAgo: 20, acceptHours: 14, pace: 1.2, review: [3, "المحتوى جيد لكن تأخر يوم عن الموعد بدون ما يبلغنا."] },
  { buyer: "salman", seller: "reem", brief: "appArabic", tier: 1, status: "completed", daysAgo: 27, acceptHours: 4, pace: 0.75, review: [5, "تعريب طبيعي، وقاموس المصطلحات فادنا في باقي الشاشات."] },
  { buyer: "abaq", seller: "abdulaziz", brief: "perfumeReel", tier: 1, status: "completed", daysAgo: 33, acceptHours: 2, pace: 0.85, review: [5, "الستوري بورد في العيّنة خلانا نتفق على الاتجاه قبل ما يبدأ. النتيجة فخمة."] },
  { buyer: "abaq", seller: "abdulaziz", svc: 1, brief: "perfumeReel", tier: 1, status: "completed", daysAgo: 18, acceptHours: 1, pace: 0.6, review: [5, "صوتين للاختيار وسلّم في نفس اليوم."] },
  { buyer: "nabd", seller: "abdulaziz", brief: "perfumeReel", tier: 0, status: "completed", daysAgo: 12, acceptHours: 3, pace: 0.9 },
  { buyer: "abaq", seller: "lama", brief: "productPhotos", tier: 1, status: "completed", daysAgo: 29, acceptHours: 6, pace: 0.8, review: [5, "الصور طلعت كأنها استوديو، والملصق مطابق للعبوة."] },
  { buyer: "deera", seller: "lama", svc: 1, brief: "cafeLogo", tier: 0, status: "completed", daysAgo: 22, acceptHours: 8, pace: 1.0, review: [4, "الشعار حلو. الاتجاه الأول ما ناسبنا وغيّرته بدون رسوم مثل ما هو مكتوب."] },
  { buyer: "munira", seller: "lama", brief: "productPhotos", tier: 0, status: "completed", daysAgo: 9, acceptHours: 5, pace: 0.9, review: [5, "سريعة وفاهمة المطلوب من الملخص بدون أسئلة كثيرة."] },
  { buyer: "salman", seller: "turki", brief: "appMotion", tier: 1, status: "completed", daysAgo: 26, acceptHours: 20, pace: 1.15, review: [3, "الفيديو جيد لكن التسليم تأخر، والرد كان بطيء."] },
  { buyer: "deera", seller: "omar", brief: "waBot", tier: 0, status: "completed", daysAgo: 31, acceptHours: 2, pace: 0.9, review: [5, "اختبر البوت على أسئلتنا الحقيقية قبل التسليم. الرد على العملاء صار فوري."] },
  { buyer: "abaq", seller: "omar", svc: 1, brief: "automation", tier: 1, status: "completed", daysAgo: 19, acceptHours: 3, pace: 0.8, review: [5, "الطلبات توصل القروب خلال ثواني، وسلّم توثيق واضح."] },
  { buyer: "nabd", seller: "omar", svc: 1, brief: "automation", tier: 0, status: "completed", daysAgo: 8, acceptHours: 1, pace: 0.7, review: [4, "شغل نظيف. احتجنا إضافة خارج الملخص وسعّرها كإضافة مستقلة."] },
  { buyer: "salman", seller: "sara", brief: "landing", tier: 1, status: "completed", daysAgo: 23, acceptHours: 4, pace: 0.85, review: [5, "الصفحة سريعة على الجوال والتسجيلات توصل للجدول مباشرة."] },
  { buyer: "munira", seller: "sara", brief: "landing", tier: 0, status: "completed", daysAgo: 11, acceptHours: 7, pace: 0.95, review: [4, "ممتازة. النصوص احتاجت مراجعة بسيطة مني."] },
  { buyer: "nabd", seller: "khaled", brief: "dashboard", tier: 0, status: "completed", daysAgo: 28, acceptHours: 10, pace: 0.9, review: [4, "اللوحة تطابق أرقام الإكسل. نتمنى مؤشرات أكثر في الباقة الأساسية."] },
  // Live orders: every state the demo accounts need to act on.
  { buyer: "deera", seller: "noura", brief: "sweetsEid", status: "awaiting_acceptance", daysAgo: 0, hoursAgo: 3 },
  { buyer: "rawq", seller: "lama", svc: 1, brief: "cafeLogo", tier: 1, status: "in_progress", stage: "sample", daysAgo: 1, acceptHours: 4 },
  { buyer: "rawq", seller: "noura", brief: "cafeLaunch", tier: 1, status: "sample_review", daysAgo: 1, hoursAgo: 6, acceptHours: 2 },
  { buyer: "rawq", seller: "abdulaziz", brief: "perfumeReel", tier: 0, status: "delivered", daysAgo: 2, acceptHours: 2, pace: 0.8 },
  { buyer: "abaq", seller: "noura", svc: 1, brief: "sweetsEid", tier: 1, status: "in_progress", stage: "full", daysAgo: 1, acceptHours: 1 },
  { buyer: "salman", seller: "sara", brief: "landing", tier: 1, status: "revision_requested", daysAgo: 3, acceptHours: 5, pace: 0.8 },
  { buyer: "abaq", seller: "turki", brief: "appMotion", tier: 0, status: "disputed", daysAgo: 3, acceptHours: 18 },
  { buyer: "salman", seller: "khaled", brief: "dashboard", tier: 0, status: "cancelled", daysAgo: 6 },
];

const PENDING_ANSWER = `(1) البرومبت: "أنت كاتب محتوى سوشال سعودي. اكتب 3 منشورات إطلاق لحساب مقهى مختص اسمه رَوْق في حائل. الجمهور: شباب وعوائل. النبرة: دافئة وقريبة بلهجة نجدية خفيفة. كل منشور: سطر افتتاحي جذاب، وصف قصير، دعوة لزيارة، 5 هاشتاقات محلية. تجنب المبالغة والإيموجي الكثير."
(2) المنشورات بعد التعديل:
- "حائل، صار عندك مكان تروق فيه ☕ رَوْق يفتح أبوابه هالخميس… قهوة مختصة محمصة على مزاجك."
- "مو كل قهوة تشبه الثانية. عندنا محاصيل من إثيوبيا وكولومبيا، وباريستا يعرف وش تحب قبل لا تطلب."
- "الجمعة العصر؟ جيب أهلك وتعال… جلسات عائلية وحلا بيتي معمول بحب."
(3) التعديلات: ChatGPT طلع بنبرة رسمية وفيها كلمات مصرية، فعدلتها لكلمات يستخدمها أهل حائل، وحذفت هاشتاقات عامة وحطيت #حائل #قهوة_مختصة_حائل، وتأكدت إن ما فيه ادعاءات صحية أو مبالغة تخالف أنظمة الإعلان.`;

const SAMPLE_FILE: Record<Category, string> = { content: "/demo/social-post-1.svg", media: "/demo/reel-storyboard.svg", code: "/demo/landing-page.svg" };
const FINAL_FILE: Record<Category, string> = { content: "/demo/social-post-2.svg", media: "/demo/product-shot.svg", code: "/demo/dashboard.svg" };

async function main() {
  const reset = process.argv.includes("--reset");
  const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(schema.user);
  if (n > 0 && !reset) {
    console.log(`Database already has ${n} users. Run with --reset to wipe and reseed.`);
    return;
  }
  if (reset && hosted && !process.argv.includes("--wipe-hosted")) {
    console.log("Refusing to wipe a hosted database. This deletes every account and order. Add --wipe-hosted if that is really what you want.");
    return;
  }
  if (reset) {
    await db.execute(sql`truncate table "notification", "managed_request", "brief", "review", "order_event", "order", "service", "seller_profile", "billing_profile", "rate_limit", "waitlist", "session", "account", "verification", "user" cascade`);
  }

  const hash = await hashPassword(DEMO_PASSWORD);
  const now = new Date();
  const createUser = async (name: string, email: string, role: "buyer" | "seller" | "admin", createdAt = ago(60), password = hash) => {
    const id = newId("u_");
    await db.insert(schema.user).values({ id, name, email, role, emailVerified: true, createdAt, updatedAt: now });
    await db.insert(schema.account).values({ id: newId("a_"), accountId: id, providerId: "credential", userId: id, password, createdAt, updatedAt: now });
    return id;
  };

  const adminId = await createUser("إدارة متقن", "admin@mutqen.demo", "admin", ago(60), await hashPassword(ADMIN_PASSWORD));

  const buyers = {} as Record<BuyerKey, string>;
  for (const [i, b] of BUYERS.entries()) buyers[b.key] = await createUser(b.name, b.email, "buyer", ago(58 - i * 3));

  type SvcRef = { id: string; sellerId: string; category: Category; title: string; packages: ServicePackage[] };
  const bySeller: Record<string, { id: string; services: SvcRef[] }> = {};

  for (const [i, s] of [...SELLERS, PENDING].entries()) {
    const isPending = s === PENDING;
    const uid = await createUser(s.name, s.email ?? `${s.key}@mutqen.demo`, "seller", ago(55));
    bySeller[s.key] = { id: uid, services: [] };
    await db.insert(schema.sellerProfile).values({
      userId: uid,
      displayName: s.name,
      headline: s.headline,
      bio: s.bio,
      city: s.city,
      categories: s.categories,
      aiTools: s.tools,
      portfolio: PORTFOLIO[s.key] ?? [],
      freelanceDocNumber: s.doc ?? null,
      payoutName: isPending ? null : s.name,
      iban: isPending ? null : demoIban(i + 1),
      status: isPending ? "pending" : "approved",
      identityVerified: !isPending,
      conductScore: isPending ? 75 : 100,
      verificationCategory: s.categories[0],
      verificationTask: "مهمة التحقق العملية",
      verificationAnswer: isPending ? PENDING_ANSWER : "شرح خطوات العمل والأدوات والتعديلات اليدوية (بيانات عرض).",
      verificationUrl: isPending ? null : (PORTFOLIO[s.key]?.[0]?.image ?? null),
      verificationScore: s.score,
      verificationFeedback: isPending
        ? "إجابة عملية: برومبت واضح بسياق ونبرة، وتعديلات بشرية مبررة، ومراعاة للسياق المحلي. يُنصح بذكر طريقة اختبار التفاعل."
        : "اجتاز التحقق العملي.",
      reviewedAt: isPending ? null : ago(50),
      createdAt: ago(55),
    });
    for (const [j, sv] of s.services.entries()) {
      const tiers = ["basic", "standard", "premium"] as const;
      const names = ["أساسية", "متقدمة", "شاملة"];
      const packages: ServicePackage[] = tiers.map((tier, k) => ({ tier, name: names[k], price: sv.packages[k], deliveryDays: sv.days[k], revisions: k + 1, features: sv.features[k] }));
      const id = newId("s_");
      await db.insert(schema.service).values({
        id,
        sellerId: uid,
        category: s.categories[0],
        title: sv.title,
        description: sv.description,
        aiTools: sv.tools,
        packages,
        minPrice: sv.packages[0],
        minDeliveryDays: sv.days[0],
        createdAt: ago(48 - j * 2),
      });
      bySeller[s.key].services.push({ id, sellerId: uid, category: s.categories[0], title: sv.title, packages });
    }
  }

  // ── Orders ──
  const stats = new Map<string, { orders: number; ratings: number[] }>();
  const together = new Map<string, number>();
  const live: Partial<Record<OrderStatus, string>> = {};

  for (const sc of SCENARIOS) {
    const seller = bySeller[sc.seller];
    const svc = seller.services[sc.svc ?? 0];
    const buyerId = buyers[sc.buyer];
    const pkg = svc.packages[sc.tier ?? 1];
    const pairKey = `${buyerId}:${seller.id}`;
    const fees = computeFees(pkg.price, together.get(pairKey) ?? 0);
    const managedFee = sc.managed ? MANAGED_FEE : 0;
    const { input, b } = BRIEF_BANK[sc.brief];
    const sb: StructuredBrief = { ...b, category: svc.category };

    const createdAt = ago(sc.daysAgo, sc.hoursAgo ?? 0);
    const accepted = sc.status !== "awaiting_acceptance" && sc.status !== "cancelled";
    const acceptedAt = accepted ? new Date(createdAt.getTime() + (sc.acceptHours ?? 3) * HOUR) : null;
    const sampleSpan = Math.max(1, Math.ceil(pkg.deliveryDays / 3)) * DAY;
    const dueAt = acceptedAt ? new Date(acceptedAt.getTime() + pkg.deliveryDays * DAY) : null;
    const sampleDueAt = acceptedAt ? new Date(acceptedAt.getTime() + sampleSpan) : null;
    const pastSample = accepted && !(sc.status === "in_progress" && sc.stage === "sample");
    const sampleDeliveredAt = pastSample ? new Date(Math.min(acceptedAt!.getTime() + sampleSpan * 0.7, Date.now() - 2 * HOUR)) : null;
    const hasDelivery = ["completed", "delivered", "revision_requested"].includes(sc.status);
    const deliveredAt = hasDelivery ? new Date(Math.min(acceptedAt!.getTime() + pkg.deliveryDays * DAY * (sc.pace ?? 0.85), Date.now() - HOUR)) : null;
    const completedAt = sc.status === "completed" ? new Date(Math.min(deliveredAt!.getTime() + 5 * HOUR, Date.now() - HOUR / 2)) : null;

    const briefId = newId("b_");
    await db.insert(schema.brief).values({ id: briefId, ownerId: buyerId, input, category: svc.category, structured: sb, status: "ordered", createdAt, updatedAt: createdAt });

    const id = newId("o_");
    const paymentRef = `TEST-${id.slice(2, 10).toUpperCase()}`;
    await db.insert(schema.order).values({
      id,
      serviceId: svc.id,
      buyerId,
      sellerId: seller.id,
      packageTier: pkg.tier,
      packageName: pkg.name,
      price: fees.price,
      buyerFee: 0,
      platformCommission: fees.platformCommission,
      sellerEarning: fees.sellerEarning,
      brief: `${sb.title}\n${sb.goal}`,
      structuredBrief: sb,
      briefId,
      status: sc.status,
      stage: sc.stage ?? (pastSample ? "full" : "sample"),
      paymentRef,
      revisionsLeft: sc.status === "revision_requested" ? Math.max(0, pkg.revisions - 1) : pkg.revisions,
      deliveryDays: pkg.deliveryDays,
      acceptBy: new Date(createdAt.getTime() + 24 * HOUR),
      acceptedAt,
      dueAt: sc.status === "revision_requested" ? new Date(Date.now() + 1.5 * DAY) : dueAt,
      sampleDueAt,
      sampleDeliveredAt,
      managed: Boolean(sc.managed),
      managedFee,
      disputeReason: sc.status === "disputed" ? "العيّنة الأولى ما تطابق الملخص: المطلوب ثلاث خطوات (ابحث، احجز، ادفع) والعيّنة تشرح خطوة وحدة، والمستقل ما رد من يومين." : null,
      disputePrevStatus: sc.status === "disputed" ? "sample_review" : null,
      deliveredAt,
      completedAt,
      createdAt,
    });
    live[sc.status] ??= id;

    let tick = 0;
    const ev = (type: string, at: Date, actorId: string | null, message?: string, attachmentUrl?: string) =>
      db.insert(schema.orderEvent).values({ id: newId("e_"), orderId: id, type, actorId, message, attachmentUrl, createdAt: new Date(at.getTime() + tick++ * 1000) });
    await ev("created", createdAt, buyerId, `${sb.title}\n${sb.goal}`);
    await ev("payment_held", createdAt, null, `انحجز ${fees.total + managedFee} ر.س لدى متقن (مرجع ${paymentRef}). ما يتحوّل للمستقل إلا بعد ما تعتمد التسليم.`);
    if (acceptedAt) await ev("accepted", acceptedAt, seller.id, "قبلت الطلب. الملخص واضح وبأرسل العيّنة الأولى في موعدها.");
    if (sampleDeliveredAt) {
      await ev("sample_delivered", sampleDeliveredAt, seller.id, "هذي العيّنة الأولى عشان نتأكد من الاتجاه قبل ما أكمل الباقي.", SAMPLE_FILE[svc.category]);
      if (sc.status === "disputed") {
        await ev("disputed", new Date(sampleDeliveredAt.getTime() + 20 * HOUR), buyerId, "العيّنة الأولى ما تطابق الملخص: المطلوب ثلاث خطوات (ابحث، احجز، ادفع) والعيّنة تشرح خطوة وحدة، والمستقل ما رد من يومين.");
      } else if (sc.status !== "sample_review") {
        await ev("sample_approved", new Date(sampleDeliveredAt.getTime() + 3 * HOUR), buyerId, "الاتجاه مضبوط، كمّل.");
      }
    }
    if (deliveredAt) await ev("delivered", deliveredAt, seller.id, "سلّمت العمل كامل حسب الملخص. استخدمت أدوات الذكاء الاصطناعي في المسودات وراجعت كل شي يدوياً.", FINAL_FILE[svc.category]);
    if (sc.status === "revision_requested") await ev("revision_requested", new Date(deliveredAt!.getTime() + 2 * HOUR), buyerId, "نموذج التسجيل ما يوصّل البيانات للجدول، وهذا من معايير القبول.");
    if (sc.status === "cancelled") await ev("cancelled", new Date(createdAt.getTime() + 24 * HOUR), null, `ما قبل المستقل الطلب خلال 24 ساعة. رجع المبلغ كامل (${fees.total} ر.س) للعميل تلقائياً.`);
    if (completedAt) {
      await ev("completed", completedAt, buyerId, "اعتمد العميل التسليم.");
      await ev("payment_released", completedAt, null, `تحوّل ${fees.sellerEarning} ر.س للمستقل بعد عمولة المنصة (${Math.round(fees.rate * 100)}٪).`);
      together.set(pairKey, (together.get(pairKey) ?? 0) + 1);
    }

    const st = stats.get(svc.id) ?? { orders: 0, ratings: [] };
    st.orders++;
    if (sc.review && completedAt) {
      st.ratings.push(sc.review[0]);
      await db.insert(schema.review).values({ id: newId("r_"), orderId: id, serviceId: svc.id, sellerId: seller.id, buyerId, rating: sc.review[0], comment: sc.review[1], createdAt: new Date(completedAt.getTime() + 2 * HOUR) });
    }
    stats.set(svc.id, st);
  }

  for (const [sid, st] of stats) {
    const avg = st.ratings.length ? st.ratings.reduce((a, b) => a + b, 0) / st.ratings.length : 0;
    await db.update(schema.service).set({ ordersCount: st.orders, ratingAvg: avg, ratingCount: st.ratings.length }).where(sql`${schema.service.id} = ${sid}`);
  }

  // ── A managed-service request waiting for the team ──
  const managedBrief = newId("b_");
  await db.insert(schema.brief).values({ id: managedBrief, ownerId: buyers.munira, input: BRIEF_BANK.waBot.input, category: "code", structured: BRIEF_BANK.waBot.b, status: "managed", createdAt: ago(0, 5), updatedAt: ago(0, 5) });
  await db.insert(schema.managedRequest).values({ id: newId("m_"), briefId: managedBrief, buyerId: buyers.munira, budget: 2000, note: "أول مرة أطلب شي تقني، أبي أحد يتابع معي.", createdAt: ago(0, 5) });

  // ── Notifications the demo accounts will see in the bell ──
  const note = (userId: string, title: string, body: string, href: string, hoursAgo: number) =>
    db.insert(schema.notification).values({ id: newId("n_"), userId, title, body, href, createdAt: ago(0, hoursAgo) });
  if (live.sample_review) await note(buyers.rawq, "العيّنة الأولى جاهزة", "راجعها واعتمد الاتجاه أو اطلب تغييره.", `/orders/${live.sample_review}`, 2);
  if (live.delivered) await note(buyers.rawq, "وصل التسليم الكامل", "راجعه على معايير القبول واعتمده.", `/orders/${live.delivered}`, 1);
  if (live.awaiting_acceptance) await note(bySeller.noura.id, "وصلك طلب جديد", "اقبله أو اسأل العميل خلال 24 ساعة.", `/orders/${live.awaiting_acceptance}`, 3);
  if (live.disputed) await note(adminId, "خلاف جديد يحتاج قرار", "العميل ضغط «عندي مشكلة» والمؤقتات متوقفة.", `/orders/${live.disputed}`, 4);
  await note(adminId, "طلب خدمة مُدارة جديد", BRIEF_BANK.waBot.b.title, "/admin/managed", 5);
  await note(adminId, "مستقل بانتظار التوثيق", PENDING.name, "/admin", 8);

  console.log(`✓ Seeded: ${SELLERS.length + 1} freelancers, ${Object.values(bySeller).reduce((a, s) => a + s.services.length, 0)} services, ${SCENARIOS.length} orders.`);
  console.log(`  Accounts: buyer@mutqen.demo · seller@mutqen.demo · pending@mutqen.demo — password: ${process.env.SEED_PASSWORD ? "(from SEED_PASSWORD)" : DEMO_PASSWORD}`);
  console.log(`  Admin: admin@mutqen.demo — password: ${process.env.SEED_ADMIN_PASSWORD ? "(from SEED_ADMIN_PASSWORD)" : ADMIN_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
