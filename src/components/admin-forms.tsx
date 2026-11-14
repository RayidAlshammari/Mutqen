"use client";

import { useState } from "react";
import { useFormAction } from "./use-form-action";
import { markPaidAction, offerManagedAction, reviewSellerAction, revokeSellerAction } from "@/app/actions/admin";
import { Button, FormError, Input, Label, Textarea } from "./ui";

export function ReviewSellerForm({ userId }: { userId: string }) {
  const [state, onSubmit, pending] = useFormAction(reviewSellerAction, undefined);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  if (state?.ok) return <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">تم، ووصل المستقل إشعار بالقرار.</p>;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="decision" value={decision} />
      <div>
        <Label>ملاحظة للمستقل (إلزامية عند الرفض)</Label>
        <Textarea name="note" className="min-h-16" maxLength={500} placeholder="مثال: الناتج المرفوع ما يطابق المهمة؛ المطلوب 3 منشورات والملف فيه منشور واحد." aria-label="ملاحظة للمستقل" />
      </div>
      <FormError message={state?.error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending} onClick={() => setDecision("approved")}>
          ✓ وثّق
        </Button>
        <Button type="submit" size="sm" variant="secondary" disabled={pending} onClick={() => setDecision("rejected")}>
          ارفض مع السبب
        </Button>
      </div>
    </form>
  );
}

export function RevokeSellerForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [state, onSubmit, pending] = useFormAction(revokeSellerAction, undefined);
  if (state?.ok) return <span className="text-xs font-semibold text-red-700">تم سحب التوثيق</span>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-red-700 hover:underline">
        اسحب التوثيق
      </button>
    );
  return (
    <form onSubmit={onSubmit} className="w-full space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <Input name="note" required minLength={10} maxLength={500} placeholder="سبب سحب التوثيق (يوصل للمستقل)" aria-label="سبب سحب التوثيق" />
      <FormError message={state?.error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="danger" disabled={pending}>
          أكّد السحب
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

export type OfferOption = { serviceId: string; tier: string; label: string };

export function ManagedOfferForm({ requestId, options, current }: { requestId: string; options: OfferOption[]; current?: string }) {
  const [state, onSubmit, pending] = useFormAction(offerManagedAction, undefined);
  const [pick, setPick] = useState(current ?? (options[0] ? `${options[0].serviceId}|${options[0].tier}` : ""));
  const [serviceId, tier] = pick.split("|");
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="serviceId" value={serviceId ?? ""} />
      <input type="hidden" name="tier" value={tier ?? ""} />
      <div>
        <Label htmlFor={`pick-${requestId}`}>المستقل والباقة</Label>
        <select id={`pick-${requestId}`} value={pick} onChange={(e) => setPick(e.target.value)} className="h-11 w-full rounded-xl bg-white px-3.5 text-[15px] ring-1 ring-sand-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
          {options.map((o) => (
            <option key={`${o.serviceId}|${o.tier}`} value={`${o.serviceId}|${o.tier}`}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>ليش هذا الترشيح؟ (يوصل للعميل)</Label>
        <Input name="note" maxLength={400} placeholder="مثال: سلّم 3 طلبات مشابهة في الموعد، وباقته تغطي كل المخرجات ضمن ميزانيتك." aria-label="سبب الترشيح" />
      </div>
      {state?.ok && <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">وصل الترشيح للعميل ✓</p>}
      <FormError message={state?.error} />
      <Button type="submit" size="sm" disabled={pending || !options.length}>
        {pending ? "يرسل…" : current ? "حدّث الترشيح" : "أرسل الترشيح للعميل"}
      </Button>
    </form>
  );
}

export function MarkPaidForm({ sellerId, total }: { sellerId: string; total: string }) {
  const [state, onSubmit, pending] = useFormAction(markPaidAction, undefined);
  if (state?.ok) return <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">سُجّل التحويل ووصل المستقل إشعار ✓</p>;
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="sellerId" value={sellerId} />
      <div className="min-w-48 flex-1">
        <Label htmlFor={`ref-${sellerId}`}>رقم الحوالة (اختياري)</Label>
        <Input id={`ref-${sellerId}`} name="ref" maxLength={60} dir="ltr" placeholder="TR-…" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "يسجّل…" : `حوّلت ${total}`}
      </Button>
      <FormError message={state?.error} />
    </form>
  );
}
