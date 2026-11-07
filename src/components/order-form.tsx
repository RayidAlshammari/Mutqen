"use client";

import { useFormAction } from "./use-form-action";
import { useState } from "react";
import { createOrderAction } from "@/app/actions/orders";
import { Button, Label, Textarea, FormError, Hint } from "./ui";
import { cn } from "@/lib/utils";

const METHODS = [
  ["mada", "مدى", "💳"],
  ["applepay", "Apple Pay", ""],
  ["card", "فيزا / ماستركارد", "💳"],
] as const;

export function OrderForm({ serviceId, tier, total, defaultBrief, structuredBrief }: { serviceId: string; tier: string; total: string; defaultBrief?: string; structuredBrief?: string }) {
  const [state, action, pending] = useFormAction(createOrderAction, undefined);
  const [method, setMethod] = useState<string>("mada");
  return (
    <form onSubmit={action} className="space-y-6">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="tier" value={tier} />
      <input type="hidden" name="paymentMethod" value={method} />
      {structuredBrief && <input type="hidden" name="structuredBrief" value={structuredBrief} />}
      <div>
        <Label htmlFor="brief">تفاصيل طلبك للمستقل</Label>
        <Textarea id="brief" name="brief" required minLength={15} rows={7} defaultValue={defaultBrief} placeholder="وش تبي بالضبط؟ لمين؟ وش الأسلوب؟ أي روابط أو أمثلة تعجبك؟" />
        <Hint>كل ما كان الوصف أوضح، كان التسليم أسرع وأقرب لاحتياجك.</Hint>
      </div>
      <div>
        <Label>طريقة الدفع</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {METHODS.map(([v, label, icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => setMethod(v)}
              aria-pressed={method === v}
              className={cn("flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold ring-1 transition", method === v ? "bg-brand-50 ring-2 ring-brand-600" : "bg-white ring-sand-300 hover:bg-sand-100")}
            >
              {v === "applepay" ? <span className="ltr font-bold"> Pay</span> : <span>{icon}</span>} {v !== "applepay" && label}
            </button>
          ))}
        </div>
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">وضع تجريبي: ما راح يتم خصم أي مبلغ فعلي. في الإطلاق نربط بوابة دفع سعودية تدعم مدى وApple Pay.</p>
      </div>
      <label className="flex items-start gap-2 text-sm leading-6">
        <input type="checkbox" name="agree" required className="mt-1 h-4 w-4 accent-brand-700" />
        <span>أوافق إن المبلغ يُحجز لدى متقن ويتحول للمستقل بعد موافقتي على التسليم، وإذا تأخر المستقل عن الموعد أقدر ألغي وأسترد المبلغ كامل.</span>
      </label>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "جارٍ تأكيد الدفع…" : `ادفع ${total} واحجز المبلغ`}
      </Button>
    </form>
  );
}
