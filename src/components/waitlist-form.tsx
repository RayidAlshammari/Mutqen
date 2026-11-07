"use client";

import { useFormAction } from "./use-form-action";
import { useState } from "react";
import { joinWaitlistAction } from "@/app/actions/public";
import { Button, Input, FormError } from "./ui";
import { cn } from "@/lib/utils";

export function WaitlistForm() {
  const [state, action, pending] = useFormAction(joinWaitlistAction, undefined);
  const [side, setSide] = useState<"buyer" | "seller">("buyer");
  if (state?.ok)
    return (
      <p className="rounded-2xl bg-white/10 px-5 py-4 text-center font-semibold text-white ring-1 ring-white/20">
        تم تسجيلك ✓ بنتواصل معك أول ما نفتح الإطلاق التجريبي.
      </p>
    );
  return (
    <form onSubmit={action} className="space-y-3">
      <input type="hidden" name="side" value={side} />
      <div className="flex justify-center gap-2">
        {(
          [
            ["buyer", "أبي أنجز شغلي"],
            ["seller", "أنا مستقل"],
          ] as const
        ).map(([v, label]) => (
          <button
            type="button"
            key={v}
            onClick={() => setSide(v)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition",
              side === v ? "bg-white text-brand-900" : "bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="email" type="email" required placeholder="بريدك الإلكتروني" dir="ltr" className="text-right" />
        <Button type="submit" variant="accent" disabled={pending} className="sm:w-44">
          {pending ? "لحظة…" : "سجّلني بالقائمة"}
        </Button>
      </div>
      <FormError message={state?.error} />
    </form>
  );
}
