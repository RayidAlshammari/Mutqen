"use client";

import { useFormAction } from "./use-form-action";
import { useEffect, useRef, useState } from "react";
import type { ActionState } from "@/app/actions/orders";
import { Button, FormError, Input, Label, Textarea } from "./ui";
import { cn } from "@/lib/utils";
import { UploadField } from "./upload-field";

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
  urlLabel = "العمل: ارفع الملف أو حط رابطه",
  uploads = false,
  folder = "orders",
}: {
  action: BoundAction;
  label: string;
  placeholder?: string;
  button: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  withUrl?: boolean;
  urlLabel?: string;
  uploads?: boolean;
  folder?: string;
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
          <UploadField name="url" uploads={uploads} folder={folder} required placeholder="https:// (Google Drive، Figma، GitHub…)" />
        </div>
      )}
      <FormError message={state?.error} />
      <Button type="submit" variant={variant} disabled={pending} className="w-full">
        {pending ? pendingLabel : button}
      </Button>
    </form>
  );
}

/** A revision names the acceptance criterion that wasn't met; anything else is an add-on. */
export function RevisionForm({ action, criteria, left }: { action: BoundAction; criteria: string[]; left: number }) {
  const { state, run, pending, ref } = useResettingAction(action);
  return (
    <form ref={ref} onSubmit={run} className="space-y-3">
      <Label>تعديل ضمن الملخص (باقي لك {left.toLocaleString("ar-SA")})</Label>
      {criteria.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs text-stone-500">أي معيار قبول ما تحقق؟</legend>
          {criteria.map((c) => (
            <label key={c} className="flex items-start gap-2 rounded-lg bg-sand-50 p-2 text-sm ring-1 ring-sand-200">
              <input type="radio" name="criterion" value={c} required className="mt-1 accent-brand-700" />
              <span>{c}</span>
            </label>
          ))}
          <p className="text-xs leading-5 text-stone-500">طلبك مو من هذي المعايير؟ هذا عمل إضافي: اطلب من المستقل عرض بسعر ومدة في الرسائل.</p>
        </fieldset>
      )}
      <Textarea name="message" required placeholder="وش الناقص بالضبط؟ مثال: المنشور 4 ما فيه الشعار" className="min-h-20" aria-label="وش يتعدّل" />
      <FormError message={state?.error} />
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        {pending ? "…" : "اطلب تعديل"}
      </Button>
    </form>
  );
}

/** Managed orders: the team releases a delivery to the client, or sends it back with notes. */
export function TeamReviewForm({ action }: { action: BoundAction }) {
  const [state, run, pending] = useFormAction(action, undefined);
  const [decision, setDecision] = useState("pass");
  return (
    <form onSubmit={run} className="space-y-3">
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="decision" value="pass" checked={decision === "pass"} onChange={() => setDecision("pass")} className="accent-brand-700" />
          يطابق الملخص، وصّله للعميل
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="decision" value="return" checked={decision === "return"} onChange={() => setDecision("return")} className="accent-brand-700" />
          رجّعه للمستقل بملاحظات
        </label>
      </div>
      <Textarea name="note" required={decision === "return"} placeholder={decision === "return" ? "وش يتعدّل قبل ما يوصل العميل؟" : "ملاحظة للعميل (اختياري)"} className="min-h-16" aria-label="ملاحظة المراجعة" />
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "…" : "اعتمد المراجعة"}
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
