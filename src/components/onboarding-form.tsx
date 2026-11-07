"use client";

import { useFormAction } from "./use-form-action";
import { useState } from "react";
import { submitOnboardingAction, updateSellerProfileAction } from "@/app/actions/seller";
import type { Category, PortfolioItem } from "@/db/schema";
import { Button, Card, FormError, Hint, Input, Label, Select, Textarea } from "./ui";
import { cn } from "@/lib/utils";

type Defaults = {
  displayName?: string;
  headline?: string;
  bio?: string;
  city?: string | null;
  freelanceDocNumber?: string | null;
  categories?: Category[];
  aiTools?: string[];
  portfolio?: PortfolioItem[];
  verificationCategory?: string | null;
  verificationAnswer?: string | null;
};

export function OnboardingForm({
  defaults,
  tasks,
  categories,
  tools,
  cities,
  passScore,
}: {
  defaults: Defaults;
  tasks: Record<Category, string>;
  categories: Record<Category, { label: string; icon: string }>;
  tools: Record<Category, string[]>;
  cities: string[];
  passScore: number;
}) {
  const [state, action, pending] = useFormAction(submitOnboardingAction, undefined);
  const [vCat, setVCat] = useState<Category>((defaults.verificationCategory as Category) ?? defaults.categories?.[0] ?? "content");
  const cats = Object.keys(categories) as Category[];

  return (
    <form onSubmit={action} className="space-y-6">
      <ProfileFields defaults={defaults} categories={categories} tools={tools} cities={cities} title="١. ملفك" />

      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-bold">٢. مهمة التحقق العملية</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            هذا اللي يميز متقن: نتحقق إنك تستخدم الذكاء الاصطناعي بإتقان، مو بس تعرف أسماء الأدوات. المجال اللي تختاره هنا هو المجال اللي بتقدر تبيع فيه خدماتك. الإجابة تُقيَّم آلياً ثم يراجعها فريقنا. الحد الأدنى للقبول {passScore.toLocaleString("ar-SA")}/100.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setVCat(c)}
              className={cn("rounded-full px-4 py-1.5 text-sm font-semibold ring-1", vCat === c ? "bg-brand-700 text-white ring-brand-700" : "bg-white ring-sand-300")}
            >
              {categories[c].icon} {categories[c].label}
            </button>
          ))}
        </div>
        <input type="hidden" name="verificationCategory" value={vCat} />
        <div className="whitespace-pre-line rounded-xl bg-sand-100 p-4 text-[15px] leading-8 text-brand-950 ring-1 ring-sand-200">{tasks[vCat]}</div>
        <div>
          <Label htmlFor="verificationAnswer">إجابتك</Label>
          <Textarea id="verificationAnswer" name="verificationAnswer" rows={10} required minLength={120} defaultValue={defaults.verificationAnswer ?? ""} />
          <Hint>اذكر الأدوات بالاسم، والبرومبتات الفعلية، ووش عدّلت بيدك، وكيف تتأكد من الجودة.</Hint>
        </div>
      </Card>

      {state?.ok && (
        <div className={cn("rounded-2xl p-5 ring-1", state.passed ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-amber-50 text-amber-900 ring-amber-200")}>
          <p className="text-lg font-bold">
            نتيجتك: {state.score?.toLocaleString("ar-SA")}/100 — {state.passed ? "اجتزت ✓ ملفك الحين بانتظار مراجعة الفريق" : "تحتاج تحسين"}
          </p>
          {state.feedback && <p className="mt-1 text-sm leading-7">{state.feedback}</p>}
        </div>
      )}
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "جارٍ تقييم إجابتك…" : "احفظ وأرسل للتقييم"}
      </Button>
    </form>
  );
}

type Cats = Record<Category, { label: string; icon: string }>;

export function ProfileFields({ defaults, categories, tools, cities, title }: { defaults: Defaults; categories: Cats; tools: Record<Category, string[]>; cities: string[]; title: string }) {
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
        <div>
          <Label htmlFor="freelanceDocNumber">رقم وثيقة العمل الحر (اختياري)</Label>
          <Input id="freelanceDocNumber" name="freelanceDocNumber" dir="ltr" defaultValue={defaults.freelanceDocNumber ?? ""} />
          <Hint>تظهر في ملفك كـ «مُعلنة» لين نفعّل التحقق الآلي منها.</Hint>
        </div>
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
          <Hint>تقدر تنشر خدمات في المجال اللي توثّقت فيه فقط. إضافة مجال جديد تحتاج مهمة تحقق جديدة، ومتاحة قريباً.</Hint>
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
        <Label>أعمال سابقة (اختياري)</Label>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-2">
              <Input name={`pf_title_${i}`} placeholder="عنوان العمل" defaultValue={defaults.portfolio?.[i]?.title} />
              <Input name={`pf_url_${i}`} type="url" dir="ltr" placeholder="https://" defaultValue={defaults.portfolio?.[i]?.url} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function SellerProfileForm({ defaults, categories, tools, cities }: { defaults: Defaults; categories: Cats; tools: Record<Category, string[]>; cities: string[] }) {
  const [state, action, pending] = useFormAction(updateSellerProfileAction, undefined);
  return (
    <form onSubmit={action} className="space-y-4">
      <ProfileFields defaults={defaults} categories={categories} tools={tools} cities={cities} title="بيانات ملفك العام" />
      {state?.ok && <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">تم حفظ التعديلات ✓</p>}
      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : "احفظ التعديلات"}
      </Button>
    </form>
  );
}
