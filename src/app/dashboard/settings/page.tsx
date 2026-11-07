import { Container, PageHeader, Card, Badge, LinkButton } from "@/components/ui";
import { PhoneVerify } from "@/components/phone-verify";
import { PayoutForm, BillingForm } from "@/components/settings-forms";
import { requireUser } from "@/lib/session";
import { authenticaEnabled } from "@/lib/authentica";
import { aiConfigured } from "@/lib/ai";
import { getBillingProfile, getSellerProfile } from "@/lib/queries";
import { FEES, SAUDI_CITIES, computeFees } from "@/lib/constants";
import { num, sar } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإعدادات" };

const ROLE = { buyer: "عميل", seller: "مستقل", admin: "مدير" } as const;

export default async function SettingsPage() {
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
          <Card className="space-y-4 p-6">
            <h2 className="font-bold">تحويل الأرباح</h2>
            <PayoutForm payoutName={seller?.payoutName} iban={seller?.iban} />
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
            <div className="flex justify-between"><span>رسوم الخدمة على العميل</span><strong>{num(FEES.buyerFeeRate * 100)}٪</strong></div>
            <div className="flex justify-between"><span>عمولة المستقل</span><strong>{num(FEES.sellerCommissionRate * 100)}٪</strong></div>
            <div className="flex justify-between"><span>إيراد المنصة من طلب بـ {sar(ex.price)}</span><strong>{sar(ex.platformRevenue)}</strong></div>
            <div className="flex justify-between"><span>الذكاء الاصطناعي</span><Badge tone={aiConfigured() ? "green" : "gray"}>{aiConfigured() ? `متصل (${process.env.AI_MODEL})` : "وضع بدون اتصال"}</Badge></div>
            <div className="flex justify-between"><span>التحقق من الجوال (Authentica)</span><Badge tone={authenticaEnabled() ? "green" : "gray"}>{authenticaEnabled() ? "مفعّل" : "غير مفعّل"}</Badge></div>
          </div>
          <p className="text-xs text-stone-500">النسب معرّفة حالياً في الكود (src/lib/constants.ts). تعديلها من هنا ضمن الخطوة القادمة.</p>
        </Card>
      )}

      {user.role !== "admin" && (
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">توثيق الجوال</h2>
            {user.phoneVerified && <Badge tone="green">موثّق <span className="ltr">{user.phone}</span></Badge>}
          </div>
          <p className="text-sm leading-6 text-stone-600">نوثّق أرقام الجوال برسالة SMS عبر Authentica. والتوثيق عبر نفاذ للمستقلين ضمن الخطوة القادمة.</p>
          {!user.phoneVerified && <PhoneVerify enabled={authenticaEnabled()} />}
        </Card>
      )}
    </Container>
  );
}
