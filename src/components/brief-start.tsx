"use client";

import { useRef } from "react";
import { useFormAction } from "./use-form-action";
import { startBriefAction } from "@/app/actions/brief";
import { Button, FormError, Textarea } from "./ui";

const EXAMPLES = [
  "أبي شعار وهوية لمقهى مختص بفتحه في حائل",
  "أبي 12 منشور انستقرام لمحل حلويات قبل العيد",
  "أبي صفحة هبوط لدورة تدريبية مع نموذج تسجيل",
  "أبي فيديو قصير 15 ثانية يعرّف بمنتجي الجديد",
];

export function BriefStart({ initial, serviceId, tier }: { initial?: string; serviceId?: string; tier?: string }) {
  const [state, onSubmit, pending] = useFormAction(startBriefAction, undefined);
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {serviceId && <input type="hidden" name="serviceId" value={serviceId} />}
      {tier && <input type="hidden" name="tier" value={tier} />}
      <label htmlFor="need" className="block text-lg font-bold text-brand-950">
        وش تحتاج؟ اكتبها بجملة وحدة
      </label>
      <Textarea ref={ref} id="need" name="text" rows={3} required minLength={8} maxLength={2000} defaultValue={state?.input ?? initial} placeholder="مثال: أبي شعار وهوية لمقهى مختص بفتحه في حائل" />
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => {
              if (ref.current) {
                ref.current.value = e;
                ref.current.focus();
              }
            }}
            className="rounded-full bg-sand-100 px-3 py-1.5 text-xs text-stone-700 ring-1 ring-sand-200 hover:bg-sand-200"
          >
            {e}
          </button>
        ))}
      </div>
      <FormError message={state?.error} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-stone-500">ما تحتاج تكتب تفاصيل. بنسألك 5 أسئلة قصيرة ونكتب الملخص عنك.</p>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "نجهّز أسئلتك…" : "التالي"}
        </Button>
      </div>
    </form>
  );
}
