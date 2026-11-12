import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth-forms";
import { Card, Container } from "@/components/ui";

export const metadata = { title: "نسيت كلمة المرور" };

export default function ForgotPasswordPage() {
  return (
    <Container className="flex justify-center py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-brand-950">نسيت كلمة المرور؟</h1>
        <p className="mt-1 mb-6 text-sm text-stone-600">اكتب بريدك ونرسل لك رابط تعيّن منه كلمة جديدة.</p>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            رجوع لتسجيل الدخول
          </Link>
        </p>
      </Card>
    </Container>
  );
}
