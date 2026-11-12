"use client";

import { useState } from "react";
import { useFormAction } from "./use-form-action";
import { requestManagedAction, updateSummaryAction } from "@/app/actions/brief";
import type { StructuredBrief } from "@/db/schema";
import { Button, FormError, Hint, Input, Label, Textarea } from "./ui";

/** The client can correct anything before a freelancer sees it. One line per item. */
export function SummaryEditor({ briefId, b }: { briefId: string; b: StructuredBrief }) {
  const [open, setOpen] = useState(false);
  const [state, onSubmit, pending] = useFormAction(async (prev: Awaited<ReturnType<typeof updateSummaryAction>>, fd: FormData) => {
    const res = await updateSummaryAction(prev, fd);
    if (res?.ok) setOpen(false);
    return res;
  }, undefined);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-brand-700 hover:underline">
        ✎ عدّل الملخص
      </button>
    );
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-sand-50 p-5 ring-1 ring-sand-200">
      <input type="hidden" name="briefId" value={briefId} />
      <div>
        <Label htmlFor="title">عنوان الطلب</Label>
        <Input id="title" name="title" defaultValue={b.title} maxLength={120} required />
      </div>
      <div>
        <Label htmlFor="goal">الهدف</Label>
        <Textarea id="goal" name="goal" rows={2} defaultValue={b.goal} maxLength={600} />
      </div>
      <div>
        <Label htmlFor="deliverables">وش تستلم</Label>
        <Textarea id="deliverables" name="deliverables" rows={5} defaultValue={b.deliverables.join("\n")} required />
        <Hint>سطر لكل مخرج. اكتب العدد والمقاس إذا تعرفه.</Hint>
      </div>
      <div>
        <Label htmlFor="acceptance">معايير القبول</Label>
        <Textarea id="acceptance" name="acceptance" rows={4} defaultValue={(b.acceptance ?? []).join("\n")} required />
        <Hint>سطر لكل معيار. التعديل اللي داخل هذي المعايير مشمول في السعر، واللي خارجها يتسعّر كإضافة.</Hint>
      </div>
      <FormError message={state?.error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "يحفظ…" : "احفظ التعديل"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

export function ManagedForm({ briefId, fee }: { briefId: string; fee: string }) {
  const [state, onSubmit, pending] = useFormAction(requestManagedAction, undefined);
  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <input type="hidden" name="briefId" value={briefId} />
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <div>
          <Label htmlFor="budget">ميزانيتك (اختياري)</Label>
          <Input id="budget" name="budget" type="number" inputMode="numeric" min={50} max={100000} placeholder="مثال: 800" />
        </div>
        <div>
          <Label htmlFor="note">شي نحتاج نعرفه؟ (اختياري)</Label>
          <Input id="note" name="note" maxLength={400} placeholder="مثال: أحتاجه قبل الافتتاح يوم ٢٠" />
        </div>
      </div>
      <FormError message={state?.error} />
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? "يرسل…" : "خلّ متقن يدير الطلب"}
      </Button>
      <p className="text-xs leading-5 text-stone-500">ما تدفع شي الحين. نرسل لك ترشيحنا، وإذا وافقت تدفع سعر الخدمة + {fee} رسوم إدارة ثابتة.</p>
    </form>
  );
}
