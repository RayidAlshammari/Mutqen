"use client";

import { useFormAction } from "./use-form-action";
import { useRef, useState, useTransition } from "react";
import { draftProfileAction, submitOnboardingAction, updateSellerProfileAction } from "@/app/actions/seller";
import { UploadField, useUpload } from "./upload-field";
import type { Category, PortfolioItem } from "@/db/schema";
import { Button, Card, FormError, Hint, Input, Label, Select, Textarea } from "./ui";
import { cn } from "@/lib/utils";

type Defaults = {
  displayName?: string;
  gender?: "m" | "f";
  headline?: string;
  bio?: string;
  city?: string | null;
  freelanceDocNumber?: string | null;
  categories?: Category[];
  aiTools?: string[];
  portfolio?: PortfolioItem[];
  verificationCategory?: string | null;
  verificationAnswer?: string | null;
  verificationUrl?: string | null;
  nationalId?: string | null;
};

export function OnboardingForm({
  defaults,
  tasks,
  categories,
  tools,
  cities,
  passScore,
  quiz,
  uploads,
  userId,
}: {
  defaults: Defaults;
  tasks: Record<Category, string>;
  categories: Record<Category, { label: string; icon: string }>;
  tools: Record<Category, string[]>;
  cities: string[];
  passScore: number;
  quiz: { id: string; q: string; options: string[] }[];
  uploads: boolean;
  userId: string;
}) {
  const [state, action, pending] = useFormAction(submitOnboardingAction, undefined);
  const [vCat, setVCat] = useState<Category>((defaults.verificationCategory as Category) ?? defaults.categories?.[0] ?? "content");
  const cats = Object.keys(categories) as Category[];
  const form = useRef<HTMLFormElement>(null);
  const [cv, setCv] = useState("");
  const [cvMsg, setCvMsg] = useState<string | null>(null);
  const [drafting, startDraft] = useTransition();

  // Fill the profile from a pasted CV. The freelancer reviews and edits before submitting.
  function autofill() {
    setCvMsg(null);
    startDraft(async () => {
      const d = await draftProfileAction(cv);
      if (!d || d.error) return setCvMsg(d?.error ?? "ما قدرنا نقرأ النص. عبّي الحقول يدوياً.");
      const f = form.current;
      if (!f) return;
      const set = (name: string, value?: string) => {
        const el = f.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (el && value) el.value = value;
      };
      set("headline", d.headline);
      set("bio", d.bio);
      if (d.city && cities.includes(d.city)) set("city", d.city);
      f.querySelectorAll<HTMLInputElement>("input[name=aiTools]").forEach((c) => {
        if (d.tools?.includes(c.value)) c.checked = true;
      });
      setCvMsg("عبّينا ملفك من السيرة. راجعه وعدّل اللي تبي قبل الإرسال.");
    });
  }

  return (
    <form ref={form} onSubmit={action} className="space-y-6">
      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-bold">اختصر الوقت: الصق سيرتك</h2>
        <p className="text-sm leading-6 text-stone-600">الصق نص سيرتك الذاتية أو نبذتك من لينكدإن، ونعبّي لك التخصص والنبذة والأدوات. ما ينحفظ شي إلا لما ترسل.</p>
        <Textarea aria-label="نص السيرة الذاتية" rows={4} value={cv} onChange={(e) => setCv(e.target.value)} maxLength={6000} placeholder="الصق هنا…" />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={autofill} disabled={drafting || cv.trim().length < 80}>
            {drafting ? "يقرأ السيرة…" : "عبّي ملفي"}
          </Button>
          {cvMsg && <p className="text-sm text-stone-700">{cvMsg}</p>}
        </div>
      </Card>

      <ProfileFields defaults={defaults} categories={categories} tools={tools} cities={cities} title="١. ملفك" uploads={uploads} userId={userId} />

      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-bold">٢. الهوية</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">نتأكد إن ورا كل حساب شخص حقيقي واحد. الرقم ما يظهر للعملاء، ويشوفه فريق التوثيق فقط.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="nationalId">رقم الهوية الوطنية أو الإقامة</Label>
            <Input id="nationalId" name="nationalId" dir="ltr" inputMode="numeric" maxLength={10} required defaultValue={defaults.nationalId ?? ""} placeholder="10 أرقام" />
          </div>
          <div>
            <Label htmlFor="freelanceDocNumber">رقم وثيقة العمل الحر (اختياري)</Label>
            <Input id="freelanceDocNumber" name="freelanceDocNumber" dir="ltr" defaultValue={defaults.freelanceDocNumber ?? ""} />
            <Hint>تظهر في ملفك كـ «مُعلنة» بعد مراجعة الفريق.</Hint>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-bold">٣. الاختبار العملي</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            مهمة صغيرة حقيقية تنفّذها وترفع ناتجها. الشرح يتقيّم آلياً ({passScore.toLocaleString("ar-SA")} من ١٠٠ للنجاح)، وبعدها فريق متقن يراجع الشغل نفسه. المجال اللي تختاره هو المجال اللي بتبيع فيه.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c} type="button" onClick={() => setVCat(c)} aria-pressed={vCat === c} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold ring-1", vCat === c ? "bg-brand-700 text-white ring-brand-700" : "bg-white ring-sand-300")}>
              {categories[c].icon} {categories[c].label}
            </button>
          ))}
        </div>
        <input type="hidden" name="verificationCategory" value={vCat} />
        <div className="whitespace-pre-line rounded-xl bg-sand-100 p-4 text-[15px] leading-8 text-brand-950 ring-1 ring-sand-200">{tasks[vCat]}</div>
        <div>
          <Label>ناتج المهمة (ملف أو رابط)</Label>
          <UploadField name="verificationUrl" uploads={uploads} folder={`verification/${userId}`} required defaultValue={defaults.verificationUrl ?? ""} placeholder="https:// رابط الملف، المستودع، أو الفيديو" />
        </div>
        <div>
          <Label htmlFor="verificationAnswer">اشرح كيف اشتغلت</Label>
          <Textarea id="verificationAnswer" name="verificationAnswer" rows={8} required minLength={120} defaultValue={defaults.verificationAnswer ?? ""} />
          <Hint>اذكر الأدوات بالاسم، والبرومبتات الفعلية، ووش عدّلت بيدك، وكيف تتأكد من الجودة.</Hint>
        </div>
      </Card>

      <Card className="space-y-5 p-6">
        <div>
          <h2 className="text-lg font-bold">٤. التعامل مع العملاء</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">أربعة مواقف تصير في كل مشروع. إجاباتها هي قواعد العمل في متقن.</p>
        </div>
        {quiz.map((q, i) => (
          <fieldset key={q.id}>
            <legend className="mb-2 font-semibold leading-7 text-brand-950">
              {(i + 1).toLocaleString("ar-SA")}. {q.q}
            </legend>
            <div className="space-y-2">
              {q.options.map((o, k) => (
                <label key={o} className="flex cursor-pointer items-start gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm leading-6 ring-1 ring-sand-300 has-[:checked]:bg-brand-50 has-[:checked]:ring-2 has-[:checked]:ring-brand-600">
                  <input type="radio" name={`conduct_${q.id}`} value={k} required className="mt-1 accent-brand-700" />
                  {o}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </Card>

      {state?.ok && (
        <div className={cn("rounded-2xl p-5 ring-1", state.passed ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-amber-200")}>
          <p className="text-lg font-bold">
            الاختبار العملي: {state.score?.toLocaleString("ar-SA")} من ١٠٠ · التعامل مع العملاء: {state.conductScore?.toLocaleString("ar-SA")} من ١٠٠
          </p>
          <p className="mt-1 font-semibold">{state.passed ? "اجتزت ✓ ملفك الحين عند فريق متقن للمراجعة، وبيوصلك إشعار بالنتيجة." : "تحتاج تحسين قبل ما يروح ملفك للمراجعة. عدّل وأرسل مرة ثانية."}</p>
          {state.feedback && <p className="mt-2 text-sm leading-7">{state.feedback}</p>}
          {!!state.conductMissed?.length && (
            <ul className="mt-2 list-disc space-y-1 pr-5 text-sm leading-7">
              {state.conductMissed.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "جارٍ تقييم اختبارك…" : "أرسل للتقييم"}
      </Button>
    </form>
  );
}

type Cats = Record<Category, { label: string; icon: string }>;

export function ProfileFields({ defaults, categories, tools, cities, title, uploads, userId, withDoc }: { defaults: Defaults; categories: Cats; tools: Record<Category, string[]>; cities: string[]; title: string; uploads: boolean; userId: string; withDoc?: boolean }) {
  const cats = Object.keys(categories) as Category[];
  const known = new Set(Object.values(tools).flat());
  const other = (defaults.aiTools ?? []).filter((t) => !known.has(t)).join("، ");
  return (
    <Card className="space-y-5 p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="displayName">الاسم الظاهر للعملاء</Label>
          <Input id="displayName" name="displayName" required defaultValue={defaults.displayName} />
          <div className="mt-2 flex gap-4 text-sm" role="radiogroup" aria-label="تظهر للعملاء كـ">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="gender" value="m" defaultChecked={defaults.gender !== "f"} className="accent-brand-700" /> مستقل
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="gender" value="f" defaultChecked={defaults.gender === "f"} className="accent-brand-700" /> مستقلة
            </label>
          </div>
        </div>
        <div>
          <Label htmlFor="headline">تخصصك بسطر</Label>
          <Input id="headline" name="headline" required defaultValue={defaults.headline} placeholder="كاتب محتوى سوشال بالذكاء الاصطناعي" />
        </div>
        <div>
          <Label htmlFor="city">المدينة</Label>
          <Select id="city" name="city" defaultValue={defaults.city ?? ""}>
            <option value="">—</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
        {withDoc && (
          <div>
            <Label htmlFor="freelanceDocNumber">رقم وثيقة العمل الحر (اختياري)</Label>
            <Input id="freelanceDocNumber" name="freelanceDocNumber" dir="ltr" defaultValue={defaults.freelanceDocNumber ?? ""} />
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="bio">نبذة عنك وعن طريقة شغلك</Label>
        <Textarea id="bio" name="bio" defaultValue={defaults.bio} placeholder="خبرتك، نوع العملاء اللي اشتغلت معهم، وكيف تدمج أدوات الذكاء الاصطناعي مع لمستك" />
      </div>
      {defaults.categories && defaults.categories.length > 0 && (
        <div>
          <Label>مجالك الموثّق</Label>
          <div className="flex flex-wrap items-center gap-2">
            {defaults.categories.map((c) => (
              <span key={c} className="rounded-xl bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 ring-1 ring-brand-200">
                {categories[c].icon} {categories[c].label}
              </span>
            ))}
          </div>
          <Hint>تقدر تنشر خدمات في المجال اللي توثّقت فيه فقط. إضافة مجال جديد تحتاج مهمة تحقق جديدة عن طريق فريق متقن.</Hint>
        </div>
      )}
      <div>
        <Label>أدوات الذكاء الاصطناعي اللي تتقنها</Label>
        <div className="space-y-3">
          {cats.map((c) => (
            <div key={c}>
              <p className="mb-1.5 text-xs font-semibold text-stone-500">{categories[c].label}</p>
              <div className="flex flex-wrap gap-2">
                {tools[c].map((t) => (
                  <label key={t} className="ltr flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-sm ring-1 ring-sand-300 has-[:checked]:bg-brand-700 has-[:checked]:text-white has-[:checked]:ring-brand-700">
                    <input type="checkbox" name="aiTools" value={t} defaultChecked={defaults.aiTools?.includes(t)} className="sr-only" />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <Input name="otherTools" defaultValue={other} placeholder="أدوات أخرى (افصل بفاصلة)" />
        </div>
      </div>
      <div>
        <Label>أعمالك (حتى 4)</Label>
        <Hint>العميل يختار من الأعمال قبل أي شي ثاني. أضف صورة لكل عمل إذا تقدر.</Hint>
        <div className="mt-3 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <PortfolioRow key={i} i={i} item={defaults.portfolio?.[i]} uploads={uploads} userId={userId} />
          ))}
        </div>
      </div>
    </Card>
  );
}

function PortfolioRow({ i, item, uploads, userId }: { i: number; item?: PortfolioItem; uploads: boolean; userId: string }) {
  const [image, setImage] = useState(item?.image ?? "");
  const input = useRef<HTMLInputElement>(null);
  const { send, busy, error } = useUpload(`portfolio/${userId}`);
  return (
    <div className="grid gap-2 rounded-xl bg-sand-50 p-3 ring-1 ring-sand-200 sm:grid-cols-[88px_1fr]">
      <div className="flex flex-col items-center gap-1">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-20 w-20 rounded-lg object-cover ring-1 ring-sand-300" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-lg bg-white text-xs text-stone-400 ring-1 ring-dashed ring-sand-300">صورة</span>
        )}
        {uploads && (
          <>
            <input
              ref={input}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const url = await send(f);
                if (url) setImage(url);
              }}
            />
            <button type="button" onClick={() => input.current?.click()} disabled={busy} className="text-xs font-semibold text-brand-700 hover:underline">
              {busy ? "يرفع…" : image ? "غيّر" : "ارفع صورة"}
            </button>
          </>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input name={`pf_title_${i}`} aria-label={`عنوان العمل ${i + 1}`} placeholder="عنوان العمل" defaultValue={item?.title} maxLength={80} />
        <Input name={`pf_url_${i}`} aria-label={`رابط العمل ${i + 1}`} dir="ltr" inputMode="url" placeholder="رابط العمل (اختياري)" defaultValue={item?.url} />
        <Input name={`pf_desc_${i}`} aria-label={`وصف العمل ${i + 1}`} className="sm:col-span-2" placeholder="وش كان المطلوب، ووش سلّمت؟" defaultValue={item?.description} maxLength={200} />
        {uploads ? <input type="hidden" name={`pf_image_${i}`} value={image} /> : <Input name={`pf_image_${i}`} aria-label={`صورة العمل ${i + 1}`} className="sm:col-span-2" dir="ltr" inputMode="url" placeholder="رابط صورة العمل (اختياري)" value={image} onChange={(e) => setImage(e.target.value)} />}
        {error && <p className="text-xs text-red-700 sm:col-span-2">{error}</p>}
      </div>
    </div>
  );
}

export function SellerProfileForm({ defaults, categories, tools, cities, uploads, userId }: { defaults: Defaults; categories: Cats; tools: Record<Category, string[]>; cities: string[]; uploads: boolean; userId: string }) {
  const [state, action, pending] = useFormAction(updateSellerProfileAction, undefined);
  return (
    <form onSubmit={action} className="space-y-4">
      <ProfileFields defaults={defaults} categories={categories} tools={tools} cities={cities} title="بيانات ملفك العام" uploads={uploads} userId={userId} withDoc />
      {state?.ok && <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">تم حفظ التعديلات ✓</p>}
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "احفظ التعديلات"}
      </Button>
    </form>
  );
}
