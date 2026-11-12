import { Container, Card, LinkButton } from "@/components/ui";
import { computeFees, FEES } from "@/lib/constants";
import { num, sar } from "@/lib/utils";

export const metadata = { title: "كيف يعمل متقن" };

export default function HowItWorks() {
  const ex = computeFees(1000);
  return (
    <Container className="max-w-4xl py-12">
      <h1 className="text-3xl font-bold text-brand-950">كيف يعمل متقن؟</h1>
      <p className="mt-3 text-lg leading-8 text-stone-600">منصة تربط من يحتاج شغل محتوى أو ميديا أو برمجة، بمستقلين سعوديين أثبتوا عملياً إنهم يتقنون أدوات الذكاء الاصطناعي — فيخلص الشغل أسرع وبجودة مضمونة.</p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-bold">للعملاء</h2>
          <ol className="mt-4 list-inside list-decimal space-y-2 leading-7 text-stone-700">
            <li>اكتب احتياجك للمساعد الذكي أو تصفح الخدمات.</li>
            <li>اختر الباقة المناسبة (السعر والمدة والتعديلات واضحة).</li>
            <li>ادفع — المبلغ يُحجز لدى متقن. (الدفع تجريبي في هذي النسخة، ومدى وApple Pay عند الإطلاق.)</li>
            <li>تابع التنفيذ وتواصل مع المستقل داخل الطلب.</li>
            <li>استلم، اطلب تعديل إن لزم، ووافق ليتحول المبلغ.</li>
          </ol>
          <p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">تأخر المستقل عن الموعد؟ تقدر تلغي وتسترد المبلغ كامل.</p>
        </Card>
        <Card className="p-6">
          <h2 className="text-xl font-bold">للمستقلين</h2>
          <ol className="mt-4 list-inside list-decimal space-y-2 leading-7 text-stone-700">
            <li>سجّل وأضف أدواتك وأعمالك.</li>
            <li>حل مهمة التحقق العملية في مجالك.</li>
            <li>يقيّمها النظام آلياً ثم يراجعها فريق متقن.</li>
            <li>بعد التوثيق تظهر خدماتك بشارة «موثّق AI».</li>
            <li>نفّذ، سلّم، واستلم أرباحك بعد موافقة العميل.</li>
          </ol>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-xl font-bold">الرسوم — بوضوح</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="space-y-2 text-[15px] leading-7">
            <p>• <strong>العميل</strong> يدفع السعر المعروض فقط. ما فيه رسوم تنضاف عند الدفع.</p>
            <p>• <strong>المستقل</strong> تنخصم منه عمولة {num(FEES.commissionRate * 100)}٪، وتنزل إلى {num(FEES.repeatCommissionRate * 100)}٪ بعد {num(FEES.repeatAfterOrders)} طلبات مكتملة مع نفس العميل.</p>
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
        <LinkButton href="/brief" size="lg">✨ ابدأ طلبك</LinkButton>
        <LinkButton href="/signup?as=seller" size="lg" variant="secondary">انضم كمستقل</LinkButton>
      </div>
    </Container>
  );
}
