"use client";

import { useFormAction } from "./use-form-action";
import { useState } from "react";
import { createOrderAction } from "@/app/actions/orders";
import { Button, Label, FormError } from "./ui";
import { cn } from "@/lib/utils";

const METHODS = [
  ["mada", "مدى"],
  ["applepay", "Apple Pay"],
  ["card", "فيزا / ماستركارد"],
] as const;

export function OrderForm({ serviceId, tier, briefId, managedRequestId, total, live }: { serviceId: string; tier: string; briefId: string; managedRequestId?: string; total: string; live: boolean }) {
  const [state, action, pending] = useFormAction(createOrderAction, undefined);
  const [method, setMethod] = useState<string>("mada");
  return (
    <form onSubmit={action} className="space-y-6">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="tier" value={tier} />
      <input type="hidden" name="briefId" value={briefId} />
      {managedRequestId && <input type="hidden" name="managedRequestId" value={managedRequestId} />}
      <input type="hidden" name="paymentMethod" value={method} />
      <div>
        <Label>طريقة الدفع</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {METHODS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setMethod(v)}
              aria-pressed={method === v}
              className={cn("flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold ring-1 transition", method === v ? "bg-brand-50 ring-2 ring-brand-600" : "bg-white ring-sand-300 hover:bg-sand-100")}
            >
              {v === "applepay" ? <span className="ltr font-bold"> Pay</span> : label}
            </button>
          ))}
        </div>
        {!live && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 ring-1 ring-amber-200">بوابة الدفع في وضع الاختبار: ما ينخصم أي مبلغ فعلي، وكل باقي الخطوات تشتغل كما في الإطلاق.</p>}
      </div>
      <label className="flex items-start gap-2 text-sm leading-6">
        <input type="checkbox" name="agree" required className="mt-1 h-4 w-4 accent-brand-700" />
        <span>أوافق إن المبلغ ينحجز لدى متقن ويتحوّل للمستقل بعد اعتمادي للتسليم، وإن الملخص أعلاه هو المرجع لأي تعديل أو خلاف.</span>
      </label>
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "جارٍ حجز المبلغ…" : `ادفع ${total} واحجز المبلغ`}
      </Button>
    </form>
  );
}
