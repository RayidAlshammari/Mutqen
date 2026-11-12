"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { composeBriefAction } from "@/app/actions/brief";
import type { BriefAsset, Category } from "@/db/schema";
import { PALETTES, PALETTE_EXTRA, STYLE_CHOICES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button, FormError, Input, Textarea } from "./ui";
import { useUpload } from "./upload-field";

type Question = { id: string; q: string; hint?: string; options?: string[]; multi?: boolean };
type Answer = { picked: string[]; other: string };
export type WizardInitial = { answers: Record<string, string>; style: string[]; colors: string[]; references: string[]; assets: BriefAsset[] };

const ASSET_LABELS = ["الشعار", "الهوية أو دليل الألوان", "صور المنتجات أو المكان", "محتوى أو نصوص جاهزة", "ملف آخر"];

const chip = (on: boolean) =>
  cn("rounded-xl px-3.5 py-2 text-sm font-medium ring-1 transition", on ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-stone-800 ring-sand-300 hover:bg-sand-100");

function splitInitial(q: Question, value: string | undefined): Answer {
  if (!value) return { picked: [], other: "" };
  if (!q.options) return { picked: [], other: value };
  const parts = value.split("،").map((p) => p.trim()).filter(Boolean);
  const picked = parts.filter((p) => q.options!.includes(p));
  return { picked, other: parts.filter((p) => !q.options!.includes(p)).join("، ") };
}

export function BriefWizard({ briefId, category, input, questions, initial, uploads }: { briefId: string; category: Category; input: string; questions: Question[]; initial: WizardInitial; uploads: boolean }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => Object.fromEntries(questions.map((q) => [q.id, splitInitial(q, initial.answers[q.id])])));
  const [style, setStyle] = useState<string[]>(initial.style);
  const [palette, setPalette] = useState<string | null>(initial.colors[0] ?? null);
  const [refs, setRefs] = useState<string[]>([...initial.references, "", ""].slice(0, 2));
  const [assets, setAssets] = useState<BriefAsset[]>(initial.assets);
  const [assetLabel, setAssetLabel] = useState(ASSET_LABELS[0]);
  const [assetUrl, setAssetUrl] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const { send, busy, error: uploadError } = useUpload(`briefs/${briefId}`);

  const valueOf = (q: Question) => {
    const a = answers[q.id];
    return [...a.picked, a.other.trim()].filter(Boolean).join("، ");
  };
  // Visual questions only matter when the work has a look: design, video, a page.
  const wantsLook = category !== "content" || /تصميم/.test(valueOf(questions.find((q) => q.id === "includes") ?? questions[0]));
  const steps = useMemo(() => ["الأسئلة", ...(wantsLook ? ["الشكل"] : []), "الملفات"], [wantsLook]);
  const current = steps[Math.min(step, steps.length - 1)];
  const answered = questions.filter((q) => valueOf(q)).length;

  function toggle(q: Question, option: string) {
    setAnswers((s) => {
      const a = s[q.id];
      const picked = q.multi ? (a.picked.includes(option) ? a.picked.filter((p) => p !== option) : [...a.picked, option]) : a.picked.includes(option) ? [] : [option];
      return { ...s, [q.id]: { ...a, picked } };
    });
  }

  function addAsset(url: string, label = assetLabel) {
    try {
      const u = new URL(url.trim());
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    } catch {
      setError("الرابط لازم يبدأ بـ https://");
      return;
    }
    setError(null);
    setAssets((a) => [...a, { label, url: url.trim() }].slice(0, 8));
    setAssetUrl("");
  }

  function next() {
    setError(null);
    if (current === "الأسئلة" && answered < Math.min(3, questions.length)) {
      setError("جاوب على ثلاثة أسئلة على الأقل. كل جواب يقلّل التعديلات لاحقاً.");
      return;
    }
    if (step < steps.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    start(async () => {
      const res = await composeBriefAction(briefId, {
        answers: questions.map((q) => ({ id: q.id, a: valueOf(q) })).filter((a) => a.a),
        style: wantsLook ? style : [],
        colors: wantsLook && palette ? [palette] : [],
        references: wantsLook ? refs.map((r) => r.trim()).filter(Boolean) : [],
        assets,
      });
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-brand-50 px-5 py-4 ring-1 ring-brand-100">
        <p className="text-xs font-semibold text-brand-700">طلبك</p>
        <p className="mt-1 leading-7 text-brand-950">{input}</p>
      </div>

      <ol className="flex items-center gap-2 text-sm" aria-label="خطوات الملخص">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", i < step ? "bg-brand-700 text-white" : i === step ? "bg-brand-700 text-white ring-4 ring-brand-100" : "bg-sand-200 text-stone-600")}>{i < step ? "✓" : (i + 1).toLocaleString("ar-SA")}</span>
            <span className={cn("font-semibold", i === step ? "text-brand-950" : "text-stone-500")}>{s}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-sand-300" />}
          </li>
        ))}
      </ol>

      {current === "الأسئلة" && (
        <div className="space-y-6">
          {questions.map((q, i) => (
            <fieldset key={q.id} className="rounded-2xl bg-white p-5 ring-1 ring-sand-200">
              <legend className="float-right mb-3 w-full font-bold text-brand-950">
                <span className="ml-2 text-brand-600">{(i + 1).toLocaleString("ar-SA")}.</span>
                {q.q}
                {q.multi && <span className="mr-2 text-xs font-normal text-stone-500">(تقدر تختار أكثر من واحد)</span>}
              </legend>
              {q.options ? (
                <div className="clear-both space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((o) => (
                      <button key={o} type="button" aria-pressed={answers[q.id].picked.includes(o)} onClick={() => toggle(q, o)} className={chip(answers[q.id].picked.includes(o))}>
                        {o}
                      </button>
                    ))}
                  </div>
                  <Input aria-label={`${q.q} — إجابة أخرى`} value={answers[q.id].other} onChange={(e) => setAnswers((s) => ({ ...s, [q.id]: { ...s[q.id], other: e.target.value } }))} maxLength={300} placeholder="شي ثاني؟ اكتبه هنا (اختياري)" />
                </div>
              ) : (
                <Textarea aria-label={q.q} className="clear-both min-h-20" rows={2} maxLength={600} value={answers[q.id].other} onChange={(e) => setAnswers((s) => ({ ...s, [q.id]: { ...s[q.id], other: e.target.value } }))} placeholder={q.hint} />
              )}
            </fieldset>
          ))}
        </div>
      )}

      {current === "الشكل" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-sand-200">
            <p className="font-bold text-brand-950">أي اتجاه أقرب لذوقك؟</p>
            <p className="mt-1 text-sm text-stone-600">اختر من كل سطر اللي يشبهك. إذا ما يفرق معك، اتركه.</p>
            <div className="mt-4 space-y-2">
              {STYLE_CHOICES.map(([a, b]) => (
                <div key={a} className="grid grid-cols-2 gap-2">
                  {[a, b].map((v) => (
                    <button key={v} type="button" aria-pressed={style.includes(v)} onClick={() => setStyle((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s.filter((x) => x !== a && x !== b), v]))} className={cn(chip(style.includes(v)), "py-3")}>
                      {v}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-sand-200">
            <p className="font-bold text-brand-950">أي ألوان أقرب للي في بالك؟</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PALETTES.map((p) => (
                <button key={p.name} type="button" aria-pressed={palette === p.name} onClick={() => setPalette(palette === p.name ? null : p.name)} className={cn("overflow-hidden rounded-xl text-right ring-1 transition", palette === p.name ? "ring-2 ring-brand-600" : "ring-sand-300 hover:ring-brand-300")}>
                  <span className="flex h-12">
                    {p.colors.map((c) => (
                      <span key={c} className="flex-1" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="block px-3 py-2 text-sm font-medium">{p.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PALETTE_EXTRA.map((p) => (
                <button key={p} type="button" aria-pressed={palette === p} onClick={() => setPalette(palette === p ? null : p)} className={chip(palette === p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-sand-200">
            <p className="font-bold text-brand-950">فيه شغل شفته وأعجبك؟ (اختياري)</p>
            <p className="mt-1 text-sm text-stone-600">رابط حساب انستقرام، موقع، أو تصميم. المثال يختصر على المستقل نص الطريق.</p>
            <div className="mt-3 space-y-2">
              {refs.map((r, i) => (
                <Input key={i} dir="ltr" inputMode="url" aria-label={`مرجع ${i + 1}`} value={r} onChange={(e) => setRefs((s) => s.map((x, j) => (j === i ? e.target.value : x)))} placeholder="https://" />
              ))}
            </div>
          </div>
        </div>
      )}

      {current === "الملفات" && (
        <div className="rounded-2xl bg-white p-5 ring-1 ring-sand-200">
          <p className="font-bold text-brand-950">عندك ملفات تساعد المستقل؟ (اختياري)</p>
          <p className="mt-1 text-sm leading-6 text-stone-600">الشعار، الهوية، صور المنتجات، أو أي شي جاهز. إذا ما عندك شي، كمّل والمستقل يشتغل من الملخص.</p>
          {assets.length > 0 && (
            <ul className="mt-4 space-y-2">
              {assets.map((a, i) => (
                <li key={a.url + i} className="flex items-center justify-between gap-3 rounded-xl bg-sand-50 px-3 py-2 text-sm ring-1 ring-sand-200">
                  <span className="min-w-0">
                    <span className="font-semibold">{a.label}</span>
                    <span className="ltr mr-2 block truncate text-xs text-stone-500">{a.url}</span>
                  </span>
                  <button type="button" onClick={() => setAssets((s) => s.filter((_, j) => j !== i))} className="shrink-0 text-xs font-semibold text-red-700 hover:underline">
                    احذف
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {ASSET_LABELS.map((l) => (
              <button key={l} type="button" aria-pressed={assetLabel === l} onClick={() => setAssetLabel(l)} className={chip(assetLabel === l)}>
                {l}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {uploads && (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    const url = await send(f);
                    if (url) addAsset(url);
                  }}
                />
                <Button type="button" variant="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
                  {busy ? "يرفع…" : `ارفع: ${assetLabel}`}
                </Button>
              </>
            )}
            <div className="flex min-w-60 flex-1 gap-2">
              <Input dir="ltr" inputMode="url" aria-label="رابط الملف" value={assetUrl} onChange={(e) => setAssetUrl(e.target.value)} placeholder={uploads ? "أو حط رابط (Drive, Figma…)" : "رابط الملف (Google Drive, Figma…)"} />
              <Button type="button" variant="secondary" disabled={!assetUrl.trim()} onClick={() => addAsset(assetUrl)}>
                أضف
              </Button>
            </div>
          </div>
          {uploadError && <p className="mt-2 text-xs text-red-700">{uploadError}</p>}
        </div>
      )}

      <FormError message={error} />
      <div className="flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => setStep(step - 1)} disabled={pending}>
            رجوع
          </Button>
        ) : (
          <span className="text-xs text-stone-500">جاوبت على {answered.toLocaleString("ar-SA")} من {questions.length.toLocaleString("ar-SA")}</span>
        )}
        <Button type="button" size="lg" onClick={next} disabled={pending || busy}>
          {pending ? "متقن يكتب الملخص…" : step < steps.length - 1 ? "التالي" : "جهّز الملخص"}
        </Button>
      </div>
    </div>
  );
}
