"use client";

import { useFormAction } from "./use-form-action";
import { useState } from "react";
import { signInAction, signUpAction } from "@/app/actions/auth";
import { Button, Input, Label, FormError } from "./ui";
import { cn } from "@/lib/utils";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useFormAction(signInAction, undefined);
  return (
    <form onSubmit={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" />
      </div>
      <div>
        <Label htmlFor="password">كلمة المرور</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" />
      </div>
      <FormError message={state?.error} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "جارٍ الدخول…" : "دخول"}
      </Button>
    </form>
  );
}

export function SignUpForm({ next, defaultRole = "buyer" }: { next?: string; defaultRole?: "buyer" | "seller" }) {
  const [state, action, pending] = useFormAction(signUpAction, undefined);
  const ordering = Boolean(next && /^\/(order|brief)\b/.test(next));
  const [role, setRole] = useState<"buyer" | "seller">(ordering ? "buyer" : defaultRole);
  return (
    <form onSubmit={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="role" value={role} />
      {ordering && <p className="rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-900 ring-1 ring-brand-100">ملخص طلبك محفوظ. أنشئ حسابك وتكمل الدفع مباشرة.</p>}
      <div className={ordering ? "hidden" : undefined}>
        <Label>أبي أسجل كـ</Label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["buyer", "عميل", "أبي أنجز شغلي"],
              ["seller", "مستقل", "أبي أقدم خدماتي"],
            ] as const
          ).map(([value, title, sub]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRole(value)}
              aria-pressed={role === value}
              className={cn(
                "rounded-xl px-4 py-3 text-right ring-1 transition",
                role === value ? "bg-brand-50 ring-2 ring-brand-600" : "bg-white ring-sand-300 hover:bg-sand-100",
              )}
            >
              <span className="block font-semibold">{title}</span>
              <span className="block text-xs text-stone-500">{sub}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="name">الاسم</Label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
      <div>
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" />
      </div>
      <div>
        <Label htmlFor="password">كلمة المرور</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required dir="ltr" />
      </div>
      <FormError message={state?.error} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "جارٍ إنشاء الحساب…" : role === "seller" ? "أنشئ حسابي وابدأ التوثيق" : "أنشئ حسابي"}
      </Button>
    </form>
  );
}
