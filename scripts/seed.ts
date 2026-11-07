/**
 * Demo data for the MVP. Usage:
 *   npm run db:seed            (refuses if data exists)
 *   npm run db:seed -- --reset (wipes all tables first)
 * All people and businesses here are fictional.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db, schema } from "../src/db";
import type { Category, ServicePackage, OrderStatus } from "../src/db/schema";
import { computeFees } from "../src/lib/constants";
import { newId } from "../src/lib/id";

const DEMO_PASSWORD = "Mutqen2026!";
const DAY = 24 * 3600 * 1000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600 * 1000);

let seedN = 7;
const rand = () => ((seedN = (seedN * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];

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
  { name: "مقهى رَوْق", email: "buyer@mutqen.demo" },
  { name: "متجر عبق للعطور", email: "abaq@mutqen.demo" },
  { name: "سلمان الرشيدي", email: "salman@mutqen.demo" },
  { name: "وكالة نَبْض للتسويق", email: "nabd@mutqen.demo" },
  { name: "عيادات رِفق", email: "rifq@mutqen.demo" },
  { name: "منيرة الحمدان", email: "munira@mutqen.demo" },
];

const BRIEFS: Record<Category, string[]> = {
  content: [
    "نبي محتوى لإطلاق فرعنا الجديد في حائل، الجمهور شباب وعوائل، والأسلوب خفيف وقريب.",
    "أبي مقالات عن العناية بالبشرة لمدونة المتجر، مع التركيز على الكلمات اللي يبحث عنها الناس في السعودية.",
    "تعريب صفحات التطبيق قبل الإطلاق، أبيها عربية طبيعية مو ترجمة حرفية.",
  ],
  media: [
    "فيديو ريلز لعطرنا الجديد 'سدو'، نبي إحساس فخم وتراثي.",
    "صور منتجات لـ 3 عطور بخلفيات صحراوية وقت الغروب.",
    "فيديو يشرح تطبيقنا للعيادات في أقل من دقيقة.",
  ],
  code: [
    "شات بوت واتساب يجاوب عن المواعيد والأسعار من ملف عندنا، ويحول للموظف إذا ما عرف.",
    "صفحة هبوط لإطلاق تطبيق توصيل قهوة، فيها تسجيل مبكر.",
    "أتمتة توصل طلبات المتجر لقروب واتساب وتسجلها في جدول.",
  ],
};

const COMMENTS = [
  "شغل مرتب وسريع، والتعديل كان في نفس اليوم.",
  "فهم المطلوب من أول مرة، والنتيجة أحسن من توقعي.",
  "ممتاز، بس أتمنى التواصل يكون أسرع شوي.",
  "سلّم قبل الموعد، وأكيد بنرجع له.",
  "جودة عالية والأسلوب مناسب لجمهورنا بالضبط.",
  "تعامل راقي، ووضح لي كيف استخدم الذكاء الاصطناعي في الشغل.",
];

const PENDING_ANSWER = `(1) البرومبت: "أنت كاتب محتوى سوشال سعودي. اكتب 3 منشورات إطلاق لحساب مقهى مختص اسمه رَوْق في حائل. الجمهور: شباب وعوائل. النبرة: دافئة وقريبة بلهجة نجدية خفيفة. كل منشور: سطر افتتاحي جذاب، وصف قصير، دعوة لزيارة، 5 هاشتاقات محلية. تجنب المبالغة والإيموجي الكثير."
(2) المنشورات بعد التعديل:
- "حائل، صار عندك مكان تروق فيه ☕ رَوْق يفتح أبوابه هالخميس… قهوة مختصة محمصة على مزاجك."
- "مو كل قهوة تشبه الثانية. عندنا محاصيل من إثيوبيا وكولومبيا، وباريستا يعرف وش تحب قبل لا تطلب."
- "الجمعة العصر؟ جيب أهلك وتعال… جلسات عائلية وحلا بيتي معمول بحب."
(3) التعديلات: ChatGPT طلع بنبرة رسمية وفيها كلمات مصرية، فعدلتها لكلمات يستخدمها أهل حائل، وحذفت هاشتاقات عامة وحطيت #حائل #قهوة_مختصة_حائل، وتأكدت إن ما فيه ادعاءات صحية أو مبالغة تخالف أنظمة الإعلان.`;

async function main() {
  const reset = process.argv.includes("--reset");
  const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(schema.user);
  if (n > 0 && !reset) {
    console.log(`Database already has ${n} users. Run with --reset to wipe and reseed.`);
    return;
  }
  if (reset) {
    await db.execute(sql`truncate table "review", "order_event", "order", "service", "seller_profile", "billing_profile", "rate_limit", "waitlist", "session", "account", "verification", "user" cascade`);
  }

  const hash = await hashPassword(DEMO_PASSWORD);
  const now = new Date();
  const createUser = async (name: string, email: string, role: "buyer" | "seller" | "admin", createdAt = ago(60)) => {
    const id = newId("u_");
    await db.insert(schema.user).values({ id, name, email, role, emailVerified: true, createdAt, updatedAt: now });
    await db.insert(schema.account).values({ id: newId("a_"), accountId: id, providerId: "credential", userId: id, password: hash, createdAt, updatedAt: now });
    return id;
  };

  await createUser("إدارة متقن", "admin@mutqen.demo", "admin");

  const buyerIds: string[] = [];
  for (const b of BUYERS) buyerIds.push(await createUser(b.name, b.email, "buyer", ago(40 + Math.floor(rand() * 20))));

  type SvcRef = { id: string; sellerId: string; category: Category; packages: ServicePackage[] };
  const services: SvcRef[] = [];

  for (const s of [...SELLERS, PENDING]) {
    const isPending = s === PENDING;
    const uid = await createUser(s.name, s.email ?? `${s.key}@mutqen.demo`, "seller", ago(50));
    await db.insert(schema.sellerProfile).values({
      userId: uid,
      displayName: s.name,
      headline: s.headline,
      bio: s.bio,
      city: s.city,
      categories: s.categories,
      aiTools: s.tools,
      portfolio: [{ title: `نماذج أعمال ${s.name.split(" ")[0]}`, url: "https://example.com/portfolio" }],
      freelanceDocNumber: s.doc ?? null,
      status: isPending ? "pending" : "approved",
      verificationCategory: s.categories[0],
      verificationTask: "مهمة التحقق العملية",
      verificationAnswer: isPending ? PENDING_ANSWER : "إجابة عملية مفصلة (بيانات تجريبية).",
      verificationScore: s.score,
      verificationFeedback: isPending
        ? "إجابة عملية: برومبت واضح بسياق ونبرة، وتعديلات بشرية مبررة، ومراعاة للسياق المحلي. يُنصح بذكر طريقة اختبار التفاعل."
        : "اجتاز التحقق العملي.",
      reviewedAt: isPending ? null : ago(45),
      createdAt: ago(50),
    });
    for (const sv of s.services) {
      const tiers = ["basic", "standard", "premium"] as const;
      const names = ["أساسية", "متقدمة", "شاملة"];
      const packages: ServicePackage[] = tiers.map((tier, i) => ({
        tier,
        name: names[i],
        price: sv.packages[i],
        deliveryDays: sv.days[i],
        revisions: i + 1,
        features: sv.features[i],
      }));
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
        createdAt: ago(45 - Math.floor(rand() * 20)),
      });
      services.push({ id, sellerId: uid, category: s.categories[0], packages });
    }
  }

  // ── Orders ──
  const plan: OrderStatus[] = [
    ...Array(26).fill("completed"),
    ...Array(4).fill("in_progress"),
    ...Array(3).fill("delivered"),
    "revision_requested",
    "cancelled",
  ];
  const noura = services.filter((s) => s.sellerId === services[0].sellerId);
  const stats = new Map<string, { orders: number; ratings: number[] }>();

  for (let i = 0; i < plan.length; i++) {
    const status = plan[i];
    // make sure the demo seller and demo buyer have orders in every interesting state
    const svc = i < 6 ? noura[i % noura.length] : pick(services);
    const buyerId = i < 8 ? buyerIds[0] : pick(buyerIds);
    if (svc.sellerId === buyerId) continue;
    const pkg = svc.packages[Math.min(2, Math.floor(rand() * 3))];
    const fees = computeFees(pkg.price);
    const createdDaysAgo = status === "completed" ? 5 + Math.floor(rand() * 38) : status === "cancelled" ? 12 : Math.floor(rand() * 2);
    const createdAt = ago(createdDaysAgo, Math.floor(rand() * 10));
    const dueAt = new Date(createdAt.getTime() + pkg.deliveryDays * DAY);
    const deliveredAt = ["completed", "delivered", "revision_requested"].includes(status) ? new Date(createdAt.getTime() + pkg.deliveryDays * DAY * (0.45 + rand() * 0.5)) : null;
    const completedAt = status === "completed" ? new Date((deliveredAt ?? createdAt).getTime() + 6 * 3600 * 1000) : null;
    const brief = pick(BRIEFS[svc.category]);
    const id = newId("o_");
    await db.insert(schema.order).values({
      id,
      serviceId: svc.id,
      buyerId,
      sellerId: svc.sellerId,
      packageTier: pkg.tier,
      packageName: pkg.name,
      price: fees.price,
      buyerFee: fees.buyerFee,
      platformCommission: fees.platformCommission,
      sellerEarning: fees.sellerEarning,
      brief,
      status,
      paymentRef: `TEST-MADA-${id.slice(2, 10)}`,
      revisionsLeft: status === "revision_requested" ? pkg.revisions - 1 : pkg.revisions,
      dueAt,
      deliveredAt,
      completedAt,
      createdAt,
    });
    const ev = (type: string, at: Date, actorId: string | null, message?: string, attachmentUrl?: string) =>
      db.insert(schema.orderEvent).values({ id: newId("e_"), orderId: id, type, actorId, message, attachmentUrl, createdAt: at });
    await ev("created", createdAt, buyerId, brief);
    await ev("payment_held", new Date(createdAt.getTime() + 1000), null, `تم حجز ${fees.total} ر.س لدى متقن (مرجع الدفع التجريبي). لن يُحوَّل المبلغ للمستقل إلا بعد موافقتك على التسليم.`);
    await ev("message", new Date(createdAt.getTime() + 2 * 3600 * 1000), svc.sellerId, "هلا! استلمت الطلب وبديت عليه، بأرسل لك تصور أولي قريب.");
    if (deliveredAt) await ev("delivered", deliveredAt, svc.sellerId, "سلّمت الملفات كاملة. استخدمت أدوات الذكاء الاصطناعي للمسودات وراجعت كل شي يدوياً.", "https://drive.google.com/demo-delivery");
    if (status === "revision_requested") await ev("revision_requested", new Date(deliveredAt!.getTime() + 3 * 3600 * 1000), buyerId, "حلو جداً، بس نبي النبرة أخف شوي في المنشور الثاني.");
    if (status === "cancelled") await ev("cancelled", new Date(dueAt.getTime() + DAY), buyerId, `أُلغي الطلب وأُعيد المبلغ كاملاً (${fees.total} ر.س) للعميل.`);
    if (completedAt) {
      await ev("completed", completedAt, buyerId, "وافق العميل على التسليم.");
      await ev("payment_released", new Date(completedAt.getTime() + 1000), null, `تم تحويل ${fees.sellerEarning} ر.س لمحفظة المستقل بعد خصم عمولة المنصة.`);
    }
    const st = stats.get(svc.id) ?? { orders: 0, ratings: [] };
    st.orders++;
    if (status === "completed" && rand() > 0.15) {
      const rating = rand() > 0.8 ? 4 : 5;
      st.ratings.push(rating);
      await db.insert(schema.review).values({ id: newId("r_"), orderId: id, serviceId: svc.id, sellerId: svc.sellerId, buyerId, rating, comment: pick(COMMENTS), createdAt: new Date(completedAt!.getTime() + 3600 * 1000) });
    }
    stats.set(svc.id, st);
  }

  for (const [sid, st] of stats) {
    const avg = st.ratings.length ? st.ratings.reduce((a, b) => a + b, 0) / st.ratings.length : 0;
    await db.update(schema.service).set({ ordersCount: st.orders, ratingAvg: avg, ratingCount: st.ratings.length }).where(sql`${schema.service.id} = ${sid}`);
  }

  for (const [email, side] of [
    ["lead1@example.com", "buyer"],
    ["lead2@example.com", "seller"],
    ["lead3@example.com", "seller"],
  ] as const)
    await db.insert(schema.waitlist).values({ id: newId("w_"), email, side });

  console.log(`✓ Seeded: ${SELLERS.length + 1} freelancers, ${services.length} services, ${plan.length} orders.`);
  console.log(`  Demo logins (password ${DEMO_PASSWORD}): admin@mutqen.demo · buyer@mutqen.demo · seller@mutqen.demo · pending@mutqen.demo`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
