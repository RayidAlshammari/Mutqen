import { redirect } from "next/navigation";
import { Container, PageHeader, Stat, LinkButton, Card, Badge } from "@/components/ui";
import { OrdersList } from "@/components/orders-list";
import { requireUser } from "@/lib/session";
import { listOrdersForUser, getSellerProfile, listServicesBySeller } from "@/lib/queries";
import { SELLER_STATUS } from "@/lib/constants";
import { num, sar } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة التحكم" };

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  if (user.role === "admin") redirect("/admin");

  if (user.role === "seller") {
    const [profile, orders, services] = await Promise.all([getSellerProfile(user.id), listOrdersForUser(user.id, "seller"), listServicesBySeller(user.id)]);
    const active = orders.filter((o) => ["in_progress", "revision_requested", "delivered"].includes(o.status));
    const earned = orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.sellerEarning, 0);
    const held = active.reduce((s, o) => s + o.sellerEarning, 0);
    const st = SELLER_STATUS[profile?.status ?? "draft"];
    return (
      <Container className="py-10">
        <PageHeader title={`أهلاً ${user.name.split(" ")[0]} 👋`} subtitle="لوحة المستقل" actions={<LinkButton href="/seller/services/new">+ خدمة جديدة</LinkButton>} />
        {profile?.status !== "approved" && (
          <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-r-4 border-saffron-500 p-5">
            <div>
              <div className="flex items-center gap-2"><p className="font-bold">حالة التوثيق</p><Badge tone={st.tone}>{st.label}</Badge></div>
              <p className="mt-1 text-sm text-stone-600">
                {profile?.status === "pending" ? "استلمنا اختبارك، وفريق متقن يراجعه. خدماتك بتظهر للعملاء بعد التوثيق." : profile?.status === "rejected" ? "ما اجتاز ملفك المراجعة. تقدر تعدّل إجابتك وتعيد التقديم." : "كمّل ملفك وحل مهمة التحقق العملية عشان تبدأ تستقبل طلبات."}
              </p>
            </div>
            <LinkButton href={profile?.status === "pending" ? "/seller/profile" : "/seller/onboarding"} variant={profile?.status === "pending" ? "secondary" : "accent"}>
              {profile?.status === "pending" ? "عرض الملف" : "كمّل التوثيق"}
            </LinkButton>
          </Card>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="أرباح محوّلة" value={sar(earned)} />
          <Stat label="أرباح محجوزة (طلبات جارية)" value={sar(held)} />
          <Stat label="طلبات نشطة" value={num(active.length)} />
          <Stat label="خدماتي" value={num(services.length)} />
        </div>
        <h2 className="mb-3 mt-10 text-lg font-bold">أحدث الطلبات</h2>
        <OrdersList rows={orders.slice(0, 8)} as="seller" />
      </Container>
    );
  }

  const orders = await listOrdersForUser(user.id, "buyer");
  const active = orders.filter((o) => ["in_progress", "revision_requested", "delivered"].includes(o.status));
  const spent = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.price + o.buyerFee, 0);
  return (
    <Container className="py-10">
      <PageHeader title={`أهلاً ${user.name.split(" ")[0]} 👋`} subtitle="وش تبي تنجز اليوم؟" actions={<LinkButton href="/assistant">✨ اطلب بالمساعد الذكي</LinkButton>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="طلبات نشطة" value={num(active.length)} />
        <Stat label="بانتظار مراجعتك" value={num(orders.filter((o) => o.status === "delivered").length)} />
        <Stat label="إجمالي المدفوع" value={sar(spent)} />
      </div>
      <h2 className="mb-3 mt-10 text-lg font-bold">طلباتي</h2>
      <OrdersList
        rows={orders.slice(0, 10)}
        as="buyer"
        empty={
          <Card className="p-10 text-center">
            <p className="text-lg font-semibold">ما عندك طلبات بعد</p>
            <p className="mt-1 text-sm text-stone-600">اكتب احتياجك للمساعد الذكي وهو يرشح لك المستقل المناسب.</p>
            <div className="mt-5 flex justify-center gap-2">
              <LinkButton href="/assistant">جرّب المساعد الذكي</LinkButton>
              <LinkButton href="/services" variant="secondary">تصفح الخدمات</LinkButton>
            </div>
          </Card>
        }
      />
    </Container>
  );
}
