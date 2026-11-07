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

export function DeliverForm({ action }: { action: BoundAction }) {
  const { state, run, pending, ref } = useResettingAction(action);
  return (
    <form ref={ref} onSubmit={run} className="space-y-3">
      <div>
        <Label htmlFor="d-msg">رسالة التسليم</Label>
        <Textarea id="d-msg" name="message" required placeholder="وش سلّمت، وكيف استخدمت أدوات الذكاء الاصطناعي، وأي ملاحظات للعميل" />
      </div>
      <div>
        <Label htmlFor="d-url">رابط الملفات (Google Drive، Figma، GitHub…)</Label>
        <Input id="d-url" name="url" type="url" dir="ltr" placeholder="https://" />
      </div>
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "جارٍ التسليم…" : "سلّم الطلب"}
      </Button>
    </form>
  );
}

export function RevisionForm({ action, left }: { action: BoundAction; left: number }) {
  const { state, run, pending, ref } = useResettingAction(action);
  return (
    <form ref={ref} onSubmit={run} className="space-y-3">
      <Label htmlFor="r-msg">وش تبي يتعدل؟ (باقي لك {left.toLocaleString("ar-SA")})</Label>
      <Textarea id="r-msg" name="message" required className="min-h-20" />
      <FormError message={state?.error} />
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        {pending ? "…" : "اطلب تعديل"}
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
