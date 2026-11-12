import { Container, Card, LinkButton } from "@/components/ui";
import { ACCEPT_HOURS, AUTO_COMPLETE_DAYS, MANAGED_FEE, computeFees, FEES } from "@/lib/constants";
import { num, sar } from "@/lib/utils";

export const metadata = { title: "كيف يعمل متقن" };

export default function HowItWorks() {
  const ex = computeFees(1000);
  return (
    <Container className="max-w-4xl py-12">
      <h1 className="text-3xl font-bold text-brand-950">كيف يعمل متقن؟</h1>
      <p className="mt-3 text-lg leading-8 text-stone-600">متقن يربط من يحتاج شغل محتوى أو ميديا أو برمجة بمستقلين أثبتوا عملياً إنهم يتقنون أدوات الذكاء الاصطناعي، ويشيل عن العميل أصعب جزء: إنه يعرف يوصف وش يبي.</p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-bold">للعملاء</h2>
          <ol className="mt-4 list-inside list-decimal space-y-2 leading-7 text-stone-700">
            <li>اكتب وش تحتاج بجملة وحدة.</li>
            <li>جاوب على أسئلة قصيرة باختيارات، واختر الأسلوب والألوان، وارفع شعارك إن وجد.</li>
            <li>متقن يكتب ملخص الطلب: وش تستلم، ومعايير القبول. تعدّله قبل ما يشوفه أحد.</li>
            <li>اختر من ثلاثة مستقلين مرشحين بسجلهم وأعمالهم، أو خلّ متقن يدير الطلب عنك.</li>
            <li>ادفع السعر المعروض. المبلغ ينحجز لدى متقن.</li>
            <li>المستقل يقبل خلال {num(ACCEPT_HOURS)} ساعة ويرسل عيّنة أولى تعتمد منها الاتجاه.</li>
            <li>استلم التسليم الكامل واعتمده، فيتحوّل المبلغ للمستقل.</li>
          </ol>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-bold">للمستقلين</h2>
          <ol className="mt-4 list-inside list-decimal space-y-2 leading-7 text-stone-700">
            <li>سجّل وعبّي ملفك من سيرتك الذاتية.</li>
            <li>نفّذ مهمة عملية صغيرة في مجالك وارفع ناتجها.</li>
            <li>جاوب على أربعة مواقف في التعامل مع العملاء.</li>
            <li>فريق متقن يراجع شغلك، وبعد التوثيق تظهر خدماتك بشارة «موثّق AI».</li>
            <li>يوصلك الطلب بملخص واضح ومعايير قبول. تقبله أو تعتذر خلال {num(ACCEPT_HOURS)} ساعة.</li>
            <li>أرسل العيّنة الأولى، ثم التسليم الكامل. الشغل خارج الملخص تسعّره كإضافة.</li>
            <li>أرباحك تتحوّل لحسابك بعد اعتماد العميل.</li>
          </ol>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-xl font-bold">وش يضمن حقك</h2>
        <div className="mt-4 grid gap-4 text-[15px] leading-7 md:grid-cols-2">
          <ul className="space-y-2">
            <li>• <strong>ما قبل المستقل خلال {num(ACCEPT_HOURS)} ساعة؟</strong> يرجع لك المبلغ كامل تلقائياً.</li>
            <li>• <strong>الاتجاه ما عجبك؟</strong> تغييره مرة بعد العيّنة الأولى مشمول في السعر.</li>
            <li>• <strong>التسليم ما يطابق معايير القبول؟</strong> التعديل مشمول حسب باقتك.</li>
          </ul>
          <ul className="space-y-2">
            <li>• <strong>تبي شي خارج الملخص؟</strong> المستقل يرسل لك عرض إضافة بسعر ومدة، وأنت تقرر.</li>
            <li>• <strong>تأخر المستقل عن الموعد؟</strong> تقدر تلغي وتسترد المبلغ.</li>
            <li>• <strong>صار خلاف؟</strong> زر «عندي مشكلة» يوقف المؤقتات، وفريق متقن يفصل: استكمال، استرداد جزئي، أو كامل.</li>
          </ul>
        </div>
        <p className="mt-4 rounded-xl bg-sand-50 p-3 text-sm leading-6 text-stone-700 ring-1 ring-sand-200">العيّنة أو التسليم اللي ما ترد عليه خلال {num(AUTO_COMPLETE_DAYS)} أيام يُعتمد تلقائياً، عشان ما يتعلق حق المستقل.</p>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-xl font-bold">الرسوم — بوضوح</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="space-y-2 text-[15px] leading-7">
            <p>• <strong>العميل</strong> يدفع السعر المعروض فقط. ما فيه رسوم تنضاف عند الدفع.</p>
            <p>• <strong>المستقل</strong> تنخصم منه عمولة {num(FEES.commissionRate * 100)}٪، وتنزل إلى {num(FEES.repeatCommissionRate * 100)}٪ بعد {num(FEES.repeatAfterOrders)} طلبات مكتملة مع نفس العميل.</p>
            <p>• <strong>خلّ متقن يدير الطلب</strong> (اختياري): {sar(MANAGED_FEE)} رسوم ثابتة يدفعها العميل إذا طلب إن فريق متقن يختار المستقل ويتابع الطلب عنه.</p>
            <p>• التسجيل وإضافة الخدمات مجاني.</p>
          </div>
          <div className="rounded-xl bg-sand-50 p-4 text-sm ring-1 ring-sand-200">
            <p className="mb-2 font-semibold">مثال: باقة بسعر {sar(ex.price)}</p>
            <div className="flex justify-between py-1"><span>يدفع العميل</span><strong>{sar(ex.total)}</strong></div>
            <div className="flex justify-between py-1"><span>يستلم المستقل</span><strong>{sar(ex.sellerEarning)}</strong></div>
            <div className="flex justify-between border-t border-sand-200 pt-2 text-brand-800"><span>إيراد متقن</span><strong>{sar(ex.platformRevenue)}</strong></div>
          </div>
        </div>
      </Card>

      <div className="mt-10 flex flex-wrap gap-3">
        <LinkButton href="/brief" size="lg">ابدأ طلبك</LinkButton>
        <LinkButton href="/signup?as=seller" size="lg" variant="secondary">انضم كمستقل</LinkButton>
      </div>
    </Container>
  );
}
