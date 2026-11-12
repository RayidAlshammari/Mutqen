"use client";

import { useFormAction } from "./use-form-action";
import { useEffect, useRef, useState } from "react";
import type { ActionState } from "@/app/actions/orders";
import { Button, FormError, Input, Label, Textarea } from "./ui";
import { cn } from "@/lib/utils";

type BoundAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function useResettingAction(action: BoundAction) {
  const [state, run, pending] = useFormAction(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return { state, run, pending, ref };
}

/** One note (and optionally a link) sent with an order action: deliver, ask for a change, raise a problem… */
export function NoteForm({
  action,
  label,
  placeholder,
  button,
  pendingLabel = "…",
  variant = "primary",
  withUrl,
  urlLabel = "رابط العمل (Google Drive، Figma، GitHub…)",
}: {
  action: BoundAction;
  label: string;
  placeholder?: string;
  button: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  withUrl?: boolean;
  urlLabel?: string;
}) {
  const { state, run, pending, ref } = useResettingAction(action);
  return (
    <form ref={ref} onSubmit={run} className="space-y-3">
      <div>
        <Label>{label}</Label>
        <Textarea name="message" required placeholder={placeholder} className="min-h-20" aria-label={label} />
      </div>
      {withUrl && (
        <div>
          <Label>{urlLabel}</Label>
          <Input name="url" type="url" dir="ltr" placeholder="https://" required aria-label={urlLabel} />
        </div>
      )}
      <FormError message={state?.error} />
      <Button type="submit" variant={variant} disabled={pending} className="w-full">
        {pending ? pendingLabel : button}
      </Button>
    </form>
  );
}

export function AddonOfferForm({ action }: { action: BoundAction }) {
  const { state, run, pending, ref } = useResettingAction(action);
  return (
    <form ref={ref} onSubmit={run} className="space-y-3">
      <div>
        <Label>وش يشمل العمل الإضافي؟</Label>
        <Textarea name="title" required className="min-h-16" placeholder="مثال: 4 منشورات إضافية بنفس الأسلوب" aria-label="وصف العمل الإضافي" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>السعر (ر.س)</Label>
          <Input name="price" type="number" min={20} required dir="ltr" aria-label="السعر" />
        </div>
        <div>
          <Label>المدة (أيام)</Label>
          <Input name="days" type="number" min={1} max={60} defaultValue={2} required dir="ltr" aria-label="المدة" />
        </div>
      </div>
      <FormError message={state?.error} />
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        {pending ? "…" : "أرسل العرض للعميل"}
      </Button>
    </form>
  );
}

export function ResolveDisputeForm({ action, price }: { action: BoundAction; price: number }) {
  const [state, run, pending] = useFormAction(action, undefined);
  const [decision, setDecision] = useState("resume");
  return (
    <form onSubmit={run} className="space-y-3">
      <div>
        <Label>القرار</Label>
        <select name="decision" value={decision} onChange={(e) => setDecision(e.target.value)} className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm" aria-label="القرار">
          <option value="resume">يكمل الطلب من حيث توقف</option>
          <option value="partial">استرداد جزئي للعميل</option>
          <option value="refund">إلغاء واسترداد كامل</option>
        </select>
      </div>
      {decision === "partial" && (
        <div>
          <Label>المبلغ المسترد للعميل (من {price.toLocaleString("ar-SA")} ر.س)</Label>
          <Input name="amount" type="number" min={1} max={price - 1} required dir="ltr" aria-label="المبلغ المسترد" />
        </div>
      )}
      <div>
        <Label>سبب القرار (يظهر للطرفين)</Label>
        <Textarea name="note" required className="min-h-20" aria-label="سبب القرار" />
      </div>
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "…" : "اعتمد القرار"}
      </Button>
    </form>
  );
}

export function MessageForm({ action }: { action: BoundAction }) {
  const { state, run, pending, ref } = useResettingAction(action);
  return (
    <form ref={ref} onSubmit={run} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <Textarea name="message" required className="min-h-12" rows={2} placeholder="اكتب رسالة…" aria-label="رسالة" />
        <FormError message={state?.error} />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        إرسال
      </Button>
    </form>
  );
}

export function ReviewForm({ action }: { action: BoundAction }) {
  const [state, run, pending] = useFormAction(action, undefined);
  const [rating, setRating] = useState(0);
  return (
    <form onSubmit={run} className="space-y-3">
      <input type="hidden" name="rating" value={rating} />
      <Label>قيّم تجربتك</Label>
      <div className="flex gap-1" role="radiogroup" aria-label="التقييم">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} من 5`}
            onClick={() => setRating(n)}
            className={cn("text-3xl transition", n <= rating ? "text-saffron-500" : "text-sand-300 hover:text-saffron-400")}
          >
            ★
          </button>
        ))}
      </div>
      <Textarea name="comment" placeholder="وش عجبك؟ وش ممكن يتحسن؟" className="min-h-20" />
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending || rating === 0} className="w-full">
        أرسل التقييم
      </Button>
    </form>
  );
}
