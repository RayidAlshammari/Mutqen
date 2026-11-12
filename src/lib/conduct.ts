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
