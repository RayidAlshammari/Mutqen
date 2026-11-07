import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth-forms";
import { Card, Container } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next ?? "/dashboard");
  return (
    <Container className="flex justify-center py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-brand-950">أهلاً بعودتك</h1>
        <p className="mt-1 mb-6 text-sm text-stone-600">سجّل دخولك لمتابعة طلباتك.</p>
        <SignInForm next={next} />
        <p className="mt-6 text-center text-sm text-stone-600">
          ما عندك حساب؟{" "}
          <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-700 hover:underline">
            سجّل الآن
          </Link>
        </p>
      </Card>
    </Container>
  );
}
