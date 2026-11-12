import type { Category } from "@/db/schema";

export const SITE = {
  name: "متقن",
  nameEn: "Mutqen",
  tagline: "مستقلون سعوديون متحقق من تمكنهم في الذكاء الاصطناعي، ينجزون شغلك في أيام مو أسابيع",
};

/**
 * Business model: one commission, taken from the freelancer's side only.
 * The client pays exactly the listed price — nothing is added at checkout.
 * The commission drops for repeat work with the same client, so staying on the
 * platform is cheaper than leaving it.
 */
export const FEES = {
  commissionRate: 0.15,
  repeatCommissionRate: 0.1,
  /** Completed orders with the same client before the lower rate applies. */
  repeatAfterOrders: 3,
};

export const commissionRateFor = (completedWithSameClient: number) =>
  completedWithSameClient >= FEES.repeatAfterOrders ? FEES.repeatCommissionRate : FEES.commissionRate;

/** Deliveries and samples left unreviewed this long move forward automatically. */
export const AUTO_COMPLETE_DAYS = 3;
/** A paid order the freelancer hasn't accepted within this time is refunded in full. */
export const ACCEPT_HOURS = 24;
/** Extra time the freelancer gets after the client asks for a revision. */
export const REVISION_DAYS = 2;
/** Fixed fee for "let Mutqen run it": the team writes the brief, picks the freelancer and follows the order. */
export const MANAGED_FEE = 99;

export function computeFees(price: number, completedWithSameClient = 0) {
  const rate = commissionRateFor(completedWithSameClient);
  const platformCommission = Math.round(price * rate);
  return {
    price,
    /** What the client pays: the listed price, with nothing on top. */
    total: price,
    rate,
    platformCommission,
    sellerEarning: price - platformCommission,
    platformRevenue: platformCommission,
  };
}

export const CATEGORIES: Record<
  Category,
  { label: string; short: string; description: string; icon: string; examples: string[] }
> = {
  content: {
    label: "المحتوى",
    short: "محتوى",
    description: "كتابة إعلانية، مقالات، محتوى سوشال ميديا، ترجمة وتعريب",
    icon: "✍️",
    examples: ["محتوى انستقرام شهري", "مقالات SEO", "سكربت إعلان"],
  },
  media: {
    label: "الميديا",
    short: "ميديا",
    description: "تصاميم، فيديو قصير، تعليق صوتي، صور منتجات بالذكاء الاصطناعي",
    icon: "🎬",
    examples: ["فيديو ريلز إعلاني", "هوية بصرية", "صور منتجات"],
  },
  code: {
    label: "البرمجة",
    short: "برمجة",
    description: "مواقع وتطبيقات، أتمتة، شات بوت، وكلاء ذكاء اصطناعي",
    icon: "💻",
    examples: ["صفحة هبوط", "شات بوت واتساب", "أتمتة n8n"],
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

export const AI_TOOLS: Record<Category, string[]> = {
  content: ["ChatGPT", "Claude", "Gemini", "Perplexity", "Jasper", "DeepL"],
  media: ["Midjourney", "Runway", "Kling", "ElevenLabs", "Adobe Firefly", "CapCut AI", "Suno"],
  code: ["Cursor", "Claude Code", "GitHub Copilot", "v0", "Lovable", "n8n", "Bolt"],
};

export const ALL_AI_TOOLS = Array.from(new Set(Object.values(AI_TOOLS).flat()));

export const ORDER_STATUS: Record<string, { label: string; tone: "amber" | "blue" | "violet" | "green" | "gray" }> = {
  awaiting_acceptance: { label: "بانتظار قبول المستقل", tone: "amber" },
  in_progress: { label: "قيد التنفيذ", tone: "blue" },
  sample_review: { label: "العيّنة الأولى جاهزة للمراجعة", tone: "violet" },
  delivered: { label: "تم التسليم — بانتظار الاعتماد", tone: "violet" },
  revision_requested: { label: "مطلوب تعديل", tone: "amber" },
  disputed: { label: "مشكلة قيد المراجعة لدى متقن", tone: "amber" },
  completed: { label: "مكتمل", tone: "green" },
  cancelled: { label: "ملغي", tone: "gray" },
};

export const SELLER_STATUS: Record<string, { label: string; tone: "amber" | "green" | "gray" | "red" }> = {
  draft: { label: "لم يكتمل التسجيل", tone: "gray" },
  pending: { label: "بانتظار المراجعة", tone: "amber" },
  approved: { label: "موثّق", tone: "green" },
  rejected: { label: "مرفوض", tone: "red" },
};

export const SAUDI_CITIES = ["الرياض", "جدة", "الدمام", "مكة المكرمة", "المدينة المنورة", "حائل", "أبها", "القصيم", "تبوك", "الخبر"];

/* ───────────── Brief builder: choices the client picks instead of writing ───────────── */

export const STYLE_CHOICES: [string, string][] = [
  ["كلاسيكي", "عصري"],
  ["هادئ", "جريء"],
  ["رسمي", "مرح"],
  ["بسيط", "غني بالتفاصيل"],
];

export const PALETTES: { name: string; colors: string[] }[] = [
  { name: "ترابي دافئ", colors: ["#6f4e37", "#c8a27c", "#f3e9dc"] },
  { name: "أخضر وطبيعي", colors: ["#1b5444", "#7aa874", "#eef5e6"] },
  { name: "أزرق وهادئ", colors: ["#1d3557", "#6fa3d8", "#edf4fb"] },
  { name: "أسود وذهبي", colors: ["#111111", "#c9a227", "#f5f0e4"] },
  { name: "ألوان مرحة", colors: ["#ff6b6b", "#ffd166", "#4ecdc4"] },
  { name: "باستيل ناعم", colors: ["#f6c1c7", "#cde7f0", "#fdf3d8"] },
];

export const PALETTE_EXTRA = ["ألوان هويتي (أرفقتها)", "خلّ المستقل يقترح"];

/** Set DEMO_MODE=1 on a demo or staging deployment that runs on sample data. Never on the live site. */
export const DEMO_MODE = process.env.DEMO_MODE === "1";
