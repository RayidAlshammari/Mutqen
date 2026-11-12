import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth-forms";
import { Card, Container } from "@/components/ui";

export const metadata = { title: "كلمة مرور جديدة" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <Container className="flex justify-center py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="mb-6 text-2xl font-bold text-brand-950">كلمة مرور جديدة</h1>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-sm leading-7 text-stone-700">
            الرابط ناقص.{" "}
            <Link href="/forgot-password" className="font-semibold text-brand-700 hover:underline">
              اطلب رابط جديد
            </Link>
          </p>
        )}
      </Card>
    </Container>
  );
}
