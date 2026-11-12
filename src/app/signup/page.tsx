import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth-forms";
import { Card, Container } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import { safeNextPath } from "@/lib/validation";

export const metadata = { title: "إنشاء حساب" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const { next, as } = await searchParams;
  if (await getCurrentUser()) redirect(safeNextPath(next) ?? "/dashboard");
  return (
    <Container className="flex justify-center py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-brand-950">أنشئ حسابك في متقن</h1>
        <p className="mt-1 mb-6 text-sm text-stone-600">دقيقة وحدة وتبدأ.</p>
        <SignUpForm next={next} defaultRole={as === "seller" ? "seller" : "buyer"} />
        <p className="mt-6 text-center text-sm text-stone-600">
          عندك حساب؟{" "}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-700 hover:underline">
            سجّل دخولك
          </Link>
        </p>
      </Card>
    </Container>
  );
}
