import { redirect } from "next/navigation";
import { Container, PageHeader, Card, Badge, LinkButton } from "@/components/ui";
import { SellerProfileForm } from "@/components/onboarding-form";
import { requireRole } from "@/lib/session";
import { getSellerProfile } from "@/lib/queries";
import { AI_TOOLS, CATEGORIES, SAUDI_CITIES, SELLER_STATUS } from "@/lib/constants";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "ملفي كمستقل" };

export default async function SellerProfilePage() {
  const user = await requireRole("seller", "/seller/profile");
  const p = await getSellerProfile(user.id);
  if (!p || p.status === "draft" || p.status === "rejected") redirect("/seller/onboarding");
  const st = SELLER_STATUS[p.status];

  return (
    <Container className="max-w-3xl py-10">
      <PageHeader
        title="ملفي كمستقل"
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={st.tone} className="text-sm">{st.label}</Badge>
            {p.status === "approved" && <LinkButton href={`/freelancers/${user.id}`} variant="secondary" size="sm">عرض ملفي العام</LinkButton>}
          </div>
        }
      />
      <Card className="mb-6 p-5">
        <p className="text-sm text-stone-600">نتيجة مهمة التحقق</p>
        <p className="mt-1 text-2xl font-bold text-brand-900">{num(p.verificationScore ?? 0)}/100</p>
        {p.verificationFeedback && <p className="mt-2 text-sm leading-7 text-stone-700">{p.verificationFeedback}</p>}
        <p className="mt-3 text-xs text-stone-500">
          {p.status === "pending" ? "فريق متقن يراجع ملفك. تقدر تجهز خدماتك من الحين، وبتظهر للعملاء بعد التوثيق." : "تعديل بيانات ملفك ما يأثر على توثيقك."}
        </p>
      </Card>
      <SellerProfileForm
        defaults={{ displayName: p.displayName, headline: p.headline, bio: p.bio, city: p.city, freelanceDocNumber: p.freelanceDocNumber, categories: p.categories, aiTools: p.aiTools, portfolio: p.portfolio }}
        categories={CATEGORIES}
        tools={AI_TOOLS}
        cities={SAUDI_CITIES}
      />
    </Container>
  );
}
