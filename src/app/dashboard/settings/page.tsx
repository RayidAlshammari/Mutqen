import { Container, PageHeader, Card, Badge, LinkButton } from "@/components/ui";
import { PhoneVerify } from "@/components/phone-verify";
import { PayoutForm, BillingForm } from "@/components/settings-forms";
import { requireUser } from "@/lib/session";
import { authenticaEnabled } from "@/lib/authentica";
import { aiConfigured } from "@/lib/ai";
import { getBillingProfile, getSellerProfile } from "@/lib/queries";
import { FEES, SAUDI_CITIES, computeFees } from "@/lib/constants";
import { num, sar } from "@/lib/utils";
import { emailEnabled } from "@/lib/notify";
import { paymentsLive } from "@/lib/payments";
import { uploadsEnabled } from "@/lib/uploads";
import { safeNextPath } from "@/lib/validation";
import { MANAGED_FEE } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإعدادات" };

const ROLE = { buyer: "عميل", seller: "مستقل", admin: "مدير" } as const;

const Status = ({ on, yes, no }: { on: boolean; yes: string; no: string }) => <Badge tone={on ? "green" : "amber"}>{on ? yes : no}</Badge>;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ need?: string; next?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  const user = await requireUser("/dashboard/settings");
  const [seller, billing] = await Promise.all([
    user.role === "seller" ? getSellerProfile(user.id) : Promise.resolve(null),
    user.role === "buyer" ? getBillingProfile(user.id) : Promise.resolve(null),
  ]);
  const ex = computeFees(1000);

  return (
    <Container className="max-w-2xl space-y-4 py-10">
      <PageHeader title="الإعدادات" />

      <Card className="space-y-2 p-6">
        <h2 className="font-bold">الحساب</h2>
        <p className="text-lg font-semibold">{user.name}</p>
        <p className="ltr text-right text-stone-600">{user.email}</p>
        <Badge tone="brand">{ROLE[user.role]}</Badge>
      </Card>

      {user.role === "seller" && (
        <>
          <Card className={`space-y-4 p-6 ${sp.need === "iban" && !seller?.iban ? "ring-2 ring-saffron-500" : ""}`}>
            <h2 className="font-bold">تحويل الأرباح</h2>
            {sp.need === "iban" && !seller?.iban && <p className="rounded-xl bg-saffron-50 px-3.5 py-2.5 text-sm text-brand-950 ring-1 ring-saffron-200">قبل ما تقبل أول طلب، أضف الحساب اللي تتحول له أرباحك.</p>}
            <PayoutForm payoutName={seller?.payoutName} iban={seller?.iban} />
            {seller?.iban && next && <LinkButton href={next}>ارجع للطلب واقبله</LinkButton>}
          </Card>
          <Card className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div>
              <h2 className="font-bold">ملفك العام</h2>
              <p className="text-sm text-stone-600">النبذة، الأدوات، والأعمال السابقة.</p>
            </div>
            <LinkButton href="/seller/profile" variant="secondary">عدّل ملفي</LinkButton>
          </Card>
        </>
      )}

      {user.role === "buyer" && (
        <Card className="space-y-4 p-6">
          <h2 className="font-bold">بيانات الفاتورة</h2>
          <BillingForm defaults={billing ?? {}} cities={SAUDI_CITIES} />
        </Card>
      )}

      {user.role === "admin" && (
        <Card className="space-y-3 p-6">
          <h2 className="font-bold">إعدادات المنصة</h2>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span>رسوم على العميل</span><strong>لا يوجد — يدفع السعر المعروض فقط</strong></div>
            <div className="flex justify-between"><span>عمولة متقن من المستقل</span><strong>{num(FEES.commissionRate * 100)}٪</strong></div>
            <div className="flex justify-between"><span>بعد {num(FEES.repeatAfterOrders)} طلبات مكتملة مع نفس العميل</span><strong>{num(FEES.repeatCommissionRate * 100)}٪</strong></div>
            <div className="flex justify-between"><span>إيراد المنصة من طلب بـ {sar(ex.price)}</span><strong>{sar(ex.platformRevenue)}</strong></div>
            <div className="flex justify-between"><span>رسوم الطلب المُدار</span><strong>{sar(MANAGED_FEE)}</strong></div>
          </div>
          <h2 className="pt-2 font-bold">حالة الربط مع الخدمات</h2>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span>بوابة الدفع</span><Status on={paymentsLive()} yes="حيّة" no="وضع الاختبار" /></div>
            <div className="flex justify-between"><span>الذكاء الاصطناعي (الملخص والتقييم)</span><Status on={aiConfigured()} yes="متصل" no="يعمل بالقواعد الاحتياطية" /></div>
            <div className="flex justify-between"><span>بريد الإشعارات</span><Status on={emailEnabled()} yes="مفعّل" no="الإشعارات داخل الموقع فقط" /></div>
            <div className="flex justify-between"><span>رفع الملفات</span><Status on={uploadsEnabled()} yes="مفعّل" no="بالروابط فقط" /></div>
            <div className="flex justify-between"><span>توثيق الجوال برسالة</span><Status on={authenticaEnabled()} yes="مفعّل" no="غير مفعّل" /></div>
          </div>
          <p className="text-xs leading-5 text-stone-500">كل خدمة تتفعّل بإضافة مفتاحها في إعدادات الاستضافة، بدون تعديل على الموقع.</p>
        </Card>
      )}

      {user.role !== "admin" && (
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">توثيق الجوال</h2>
            {user.phoneVerified && <Badge tone="green">موثّق <span className="ltr">{user.phone}</span></Badge>}
          </div>
          <p className="text-sm leading-6 text-stone-600">نوثّق رقمك برسالة نصية عشان نتواصل معك وقت الحاجة ونحمي حسابك.</p>
          {!user.phoneVerified && <PhoneVerify enabled={authenticaEnabled()} />}
        </Card>
      )}
    </Container>
  );
}
