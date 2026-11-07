import { redirect } from "next/navigation";
import { Container, PageHeader, Badge } from "@/components/ui";
import { OnboardingForm } from "@/components/onboarding-form";
import { requireRole } from "@/lib/session";
import { getSellerProfile } from "@/lib/queries";
import { VERIFICATION_TASKS, PASS_SCORE } from "@/lib/ai";
import { AI_TOOLS, CATEGORIES, SAUDI_CITIES, SELLER_STATUS } from "@/lib/constants";
import { num } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "توثيق المستقل" };

export default async function OnboardingPage() {
  const user = await requireRole("seller", "/seller/onboarding");
  const p = await getSellerProfile(user.id);
  const st = SELLER_STATUS[p?.status ?? "draft"];

  if (p && (p.status === "pending" || p.status === "approved")) redirect("/seller/profile");

  return (
    <Container className="max-w-3xl py-10">
      <PageHeader
        title="وثّق ملفك كمستقل"
        subtitle="خطوتين: ملفك، ثم مهمة عملية قصيرة تثبت تمكنك من الذكاء الاصطناعي (15–20 دقيقة)."
        actions={p && <Badge tone={st.tone} className="text-sm">{st.label}</Badge>}
      />
      {p?.status === "rejected" && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">ما اجتاز ملفك المراجعة السابقة. عدّل إجابتك وأرسلها من جديد.</p>
      )}
      {p?.status === "draft" && p.verificationScore != null && (
        <p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-900 ring-1 ring-amber-200">
          نتيجتك السابقة {num(p.verificationScore)}/100. {p.verificationFeedback}
        </p>
      )}
      <OnboardingForm
        defaults={{ displayName: p?.displayName ?? user.name, headline: p?.headline, bio: p?.bio, city: p?.city, freelanceDocNumber: p?.freelanceDocNumber, aiTools: p?.aiTools, portfolio: p?.portfolio, verificationCategory: p?.verificationCategory, verificationAnswer: p?.verificationAnswer }}
        tasks={VERIFICATION_TASKS}
        categories={CATEGORIES}
        tools={AI_TOOLS}
        cities={SAUDI_CITIES}
        passScore={PASS_SCORE}
      />
    </Container>
  );
}
