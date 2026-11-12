"use client";

import { useFormAction } from "./use-form-action";
import { phoneAction } from "@/app/actions/settings";
import { Button, Input, Label, FormError } from "./ui";

export function PhoneVerify({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useFormAction(phoneAction, undefined);
  if (!enabled)
    return <p className="rounded-xl bg-sand-100 p-3 text-sm text-stone-600">توثيق الجوال غير متاح حالياً.</p>;
  if (state?.step === "verified") return <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">تم توثيق جوالك <span className="ltr">{state.phone}</span> ✓</p>;
  return (
    <form onSubmit={action} className="space-y-3">
      {state?.step === "sent" ? (
        <>
          <Label htmlFor="otp">رمز التحقق المرسل إلى <span className="ltr">{state.phone}</span></Label>
          <Input id="otp" name="otp" inputMode="numeric" autoComplete="one-time-code" dir="ltr" required />
          <input type="hidden" name="intent" value="verify" />
          <Button type="submit" disabled={pending}>تحقق</Button>
        </>
      ) : (
        <>
          <Label htmlFor="phone">رقم الجوال</Label>
          <Input id="phone" name="phone" inputMode="tel" dir="ltr" placeholder="05XXXXXXXX" required />
          <input type="hidden" name="intent" value="send" />
          <Button type="submit" disabled={pending}>أرسل رمز التحقق</Button>
        </>
      )}
      <FormError message={state?.error} />
    </form>
  );
}
