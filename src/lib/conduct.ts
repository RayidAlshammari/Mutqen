/**
 * Short scenario quiz every freelancer passes before being verified. It teaches the rules that
 * prevent most disputes: scope, expectations, deadlines, and keeping the work on the platform.
 */
export const CONDUCT_PASS = 75;

export const CONDUCT_QUIZ: { id: string; q: string; options: string[]; correct: number; why: string }[] = [
  {
    id: "scope",
    q: "سلّمت 12 منشور حسب الملخص، والعميل طلب بعدها 6 منشورات إضافية «بما إنك شغّال». وش تسوي؟",
    options: ["أسويها مجاناً عشان التقييم", "أرسل له عرض إضافة بسعر ومدة من صفحة الطلب", "أرفض وأطلب منه يفتح خلاف", "أطلب منه يحوّل لي الفرق على حسابي"],
    correct: 1,
    why: "أي شي خارج الملخص ومعايير القبول يتسعّر كإضافة من داخل الطلب.",
  },
  {
    id: "sample",
    q: "وصلك طلب شعار. متى ترسل أول شي للعميل؟",
    options: ["لما يخلص الشعار كامل بكل ملفاته", "عيّنة أولى مبكرة يعتمد منها الاتجاه قبل ما أكمل", "لما يسألني العميل عن التقدم", "بعد ما أخلص ثلاث نسخ نهائية"],
    correct: 1,
    why: "العيّنة الأولى تكشف اختلاف التوقعات في أول يوم بدل ما يظهر بعد التسليم.",
  },
  {
    id: "late",
    q: "اكتشفت إنك ما راح تلحق موعد التسليم. وش الصح؟",
    options: ["أسلّم شغل ناقص في الموعد", "أسكت وأسلّم متأخر يوم", "أبلّغ العميل قبل الموعد وأوضح له المتبقي والموعد الجديد", "ألغي الطلب بدون ما أكتب شي"],
    correct: 2,
    why: "التبليغ المبكر يحفظ الثقة. التأخير بدون تبليغ يعطي العميل حق الإلغاء والاسترداد.",
  },
  {
    id: "offplatform",
    q: "العميل قال: «خلنا نكمل على الواتساب وأحوّل لك مباشرة، أرخص لنا». وش ترد؟",
    options: ["أوافق، العمولة تروح علي", "أوافق بس لأول طلب", "أعتذر: الشغل والدفع داخل متقن عشان المبلغ المحجوز يحميني ويحميه", "أعطيه رقمي وأقرر بعدين"],
    correct: 2,
    why: "خارج المنصة ما فيه مبلغ محجوز ولا حل خلافات، والتعامل الخارجي يوقف الحساب.",
  },
];

export function gradeConduct(answers: Record<string, number>) {
  const right = CONDUCT_QUIZ.filter((q) => answers[q.id] === q.correct).length;
  const score = Math.round((right / CONDUCT_QUIZ.length) * 100);
  return { score, passed: score >= CONDUCT_PASS, missed: CONDUCT_QUIZ.filter((q) => answers[q.id] !== q.correct).map((q) => q.why) };
}

/* ───────────── Contact details in order messages ─────────────
 * Rule from the quiz above: the work and the payment stay inside the order. A phone number,
 * email or social handle in a message is replaced with «[مخفي]» and the team is told, so nobody
 * gets moved off the platform where the held amount no longer protects them. */

const MASK = "[مخفي]";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Arabic-Indic and Persian digits read as Latin digits, so «٠٥٥…» is caught like «055…». */
const latinDigits = (s: string) =>
  s.replace(/[٠-٩۰-۹]/g, (d) => String(AR_DIGITS.includes(d) ? AR_DIGITS.indexOf(d) : FA_DIGITS.indexOf(d)));

const PATTERNS: RegExp[] = [
  // Messaging / social links and handles written as links.
  /(?:https?:\/\/)?(?:www\.)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.me|instagram\.com|snapchat\.com|x\.com|twitter\.com|tiktok\.com|facebook\.com|fb\.me|linkedin\.com\/in)\/[^\s،,]*/gi,
  // Emails, including «name at gmail dot com».
  /[\w.+-]+\s*(?:@|\(at\)|\[at\])\s*[\w-]+(?:\s*(?:\.|\(dot\)|\[dot\])\s*[a-z]{2,})+/gi,
  // Phone numbers: international (+ or 00), Saudi 9665…, local 0…, or a bare 5xxxxxxxx mobile.
  // Dates, prices and counts («2026-11-15», «1,500», «12 منشور») don't start that way.
  /(?:\+|00)\d(?:[\s\-.]?\d){7,13}/g,
  /(?<!\d)9665\d{8}(?!\d)/g,
  /(?<![\d\-./])0\d(?:[\s\-.]?\d){7,9}(?![\d\-./])/g,
  /(?<!\d)5\d{8}(?!\d)/g,
  // Handles after a messaging word: «سناب: @name», «واتس 05…», «انستا name».
  /(?:واتس(?:اب)?|واتساب|سناب(?:شات)?|انستا(?:قرام|غرام|جرام)?|تيليجرام|تلغرام|تويتر|whatsapp|snap(?:chat)?|insta(?:gram)?|telegram)\s*[:：]?\s*@?[\w.]{3,}/gi,
  // Bare @handles (not emails: those are caught above).
  /(?<![\w.])@[a-z0-9_.]{3,}/gi,
];

export function maskContacts(text: string): { text: string; hidden: boolean } {
  let out = latinDigits(text);
  const before = out;
  for (const re of PATTERNS) out = out.replace(re, MASK);
  if (out === before) return { text, hidden: false };
  return { text: out, hidden: true };
}
