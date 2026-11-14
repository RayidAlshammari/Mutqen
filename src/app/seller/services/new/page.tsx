import { Container, PageHeader } from "@/components/ui";
import { ServiceForm } from "@/components/service-form";
import { requireRole } from "@/lib/session";
import { getSellerProfile } from "@/lib/queries";
import { AI_TOOLS, CATEGORIES, FEES } from "@/lib/constants";
import { redirect } from "next/navigation";

export const metadata = { title: "خدمة جديدة" };

export default async function NewServicePage() {
  const user = await requireRole("seller", "/seller/services/new");
  const p = await getSellerProfile(user.id);
  if (!p || !["pending", "approved"].includes(p.status)) redirect("/seller/onboarding");
  return (
    <Container className="max-w-5xl py-10">
      <PageHeader title="أضف خدمة" subtitle="ثلاث باقات واضحة تسهّل على العميل القرار." />
      <ServiceForm categories={CATEGORIES} tools={AI_TOOLS} allowed={p.categories.length ? p.categories : ["content"]} commissionRate={FEES.commissionRate} />
    </Container>
  );
}
