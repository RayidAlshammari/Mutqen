"use client";

import { useFormAction } from "./use-form-action";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { assistantAction } from "@/app/actions/public";
import type { StructuredBrief } from "@/db/schema";
import { Button, Textarea, FormError, Card, Badge, buttonClass } from "./ui";
import { ServiceCard } from "./service-card";

const CATEGORY_LABEL = { content: "المحتوى", media: "الميديا", code: "البرمجة" } as const;

function briefToText(b: StructuredBrief, original: string) {
  const lines = [b.title, "", `الهدف: ${b.goal}`];
  if (b.deliverables?.length) lines.push("", "المخرجات المطلوبة:", ...b.deliverables.map((d) => `- ${d}`));
  if (b.audience) lines.push("", `الجمهور: ${b.audience}`);
  if (b.tone) lines.push(`الأسلوب: ${b.tone}`);
  if (b.timeline) lines.push(`المدة: ${b.timeline}`);
  lines.push("", `وصف العميل الأصلي: ${original}`);
  return lines.join("\n");
}

export function Assistant({ initial }: { initial?: string }) {
  const [state, action, pending] = useFormAction(assistantAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (initial && !fired.current) {
      fired.current = true;
      formRef.current?.requestSubmit();
    }
  }, [initial]);

  const r = state?.result;
  return (
    <div className="space-y-8">
      <Card className="p-5 sm:p-6">
        <form ref={formRef} onSubmit={action} className="space-y-3">
          <label htmlFor="assist" className="block font-bold text-brand-950">
            وش تبي تنجز؟ اكتب بكلامك
          </label>
          <Textarea
            id="assist"
            name="text"
            rows={4}
            defaultValue={state?.input ?? initial}
            placeholder="مثال: عندي متجر عبايات في سلة وأبي فيديوهات قصيرة لتيك توك تعرض المنتجات الجديدة كل أسبوع، بأسلوب راقي…"
          />
          <FormError message={state?.error} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-stone-500">المساعد يرتب طلبك، يحدد المجال والمخرجات، ويرشح لك أنسب الخدمات.</p>
            <Button type="submit" disabled={pending}>
              {pending ? "يرتّب طلبك…" : "✨ رتّب طلبي"}
            </Button>
          </div>
        </form>
      </Card>

      {pending && !r && (
        <Card className="animate-pulse p-6">
          <div className="h-5 w-1/3 rounded bg-sand-200" />
          <div className="mt-4 h-4 w-2/3 rounded bg-sand-100" />
          <div className="mt-2 h-4 w-1/2 rounded bg-sand-100" />
        </Card>
      )}

      {r && (
        <>
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-brand-50 px-6 py-3">
              <p className="font-bold text-brand-900">طلبك بعد الترتيب</p>
              <div className="flex gap-2">
                <Badge tone="brand">{CATEGORY_LABEL[r.brief.category]}</Badge>
                <Badge tone={r.source === "ai" ? "green" : "gray"}>{r.source === "ai" ? "بالذكاء الاصطناعي" : "وضع بدون اتصال"}</Badge>
              </div>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-2">
              <div>
                <p className="text-xl font-bold text-brand-950">{r.brief.title}</p>
                <p className="mt-2 leading-7 text-stone-700">{r.brief.goal}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {r.brief.audience && <Badge>👥 {r.brief.audience}</Badge>}
                  {r.brief.tone && <Badge>🎙 {r.brief.tone}</Badge>}
                  {r.brief.timeline && <Badge>⏱ {r.brief.timeline}</Badge>}
                  {r.brief.budgetHint && <Badge>💰 {r.brief.budgetHint}</Badge>}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-500">المخرجات المقترحة</p>
                <ul className="mt-2 space-y-2">
                  {r.brief.deliverables.map((d) => (
                    <li key={d} className="flex gap-2 text-[15px]">
                      <span className="text-brand-600">✓</span> {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <div>
            <h2 className="mb-4 text-lg font-bold text-brand-950">أنسب الخدمات لطلبك</h2>
            {state?.matches?.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {state.matches.map((s) => {
                  const href = `/order/new?service=${s.id}&tier=standard&brief=${encodeURIComponent(briefToText(r.brief, state.input ?? ""))}&sb=${encodeURIComponent(JSON.stringify(r.brief))}`;
                  return (
                    <div key={s.id} className="flex flex-col gap-2">
                      <ServiceCard {...s} />
                      <Link href={href} className={buttonClass("accent", "sm", "w-full")}>
                        اطلب بهذا الوصف
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-stone-600">
                ما لقينا خدمة مطابقة الحين. <Link href={`/services?category=${r.brief.category}`} className="font-semibold text-brand-700">تصفح خدمات {CATEGORY_LABEL[r.brief.category]}</Link>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
