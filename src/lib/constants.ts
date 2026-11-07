import type { Category } from "@/db/schema";

export const SITE = {
  name: "متقن",
  nameEn: "Mutqen",
  tagline: "مستقلون سعوديون متحقق من تمكنهم في الذكاء الاصطناعي، ينجزون شغلك في أيام مو أسابيع",
};

/** Business model levers: client service fee + freelancer commission. */
export const FEES = {
  buyerFeeRate: 0.05, // added on top of the package price, paid by the client
  sellerCommissionRate: 0.1, // deducted from the freelancer's earning
};

/** Deliveries left unreviewed this long are completed automatically. */
export const AUTO_COMPLETE_DAYS = 3;

export function computeFees(price: number) {
  const buyerFee = Math.round(price * FEES.buyerFeeRate);
  const platformCommission = Math.round(price * FEES.sellerCommissionRate);
  return {
    price,
    buyerFee,
    total: price + buyerFee,
    platformCommission,
    sellerEarning: price - platformCommission,
    platformRevenue: buyerFee + platformCommission,
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
  in_progress: { label: "قيد التنفيذ", tone: "blue" },
  delivered: { label: "تم التسليم — بانتظار مراجعتك", tone: "violet" },
  revision_requested: { label: "مطلوب تعديل", tone: "amber" },
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
