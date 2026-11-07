"use client";

import { useFormAction } from "./use-form-action";
import { useState } from "react";
import { createServiceAction } from "@/app/actions/seller";
import type { Category } from "@/db/schema";
import { Button, Card, FormError, Hint, Input, Label, Select, Textarea } from "./ui";
import { cn } from "@/lib/utils";

const TIERS = [
  { tier: "basic", name: "أساسية", price: 300, days: 2, rev: 1, features: "مخرج واحد جاهز\nتعديل واحد" },
  { tier: "standard", name: "متقدمة", price: 650, days: 3, rev: 2, features: "3 مخرجات\nتعديلين\nملفات المصدر" },
  { tier: "premium", name: "شاملة", price: 1200, days: 5, rev: 3, features: "حزمة كاملة\n3 تعديلات\nملفات المصدر\nدعم بعد التسليم" },
] as const;

export function ServiceForm({ categories, tools, allowed }: { categories: Record<Category, { label: string; icon: string }>; tools: Record<Category, string[]>; allowed: Category[] }) {
  const [state, action, pending] = useFormAction(createServiceAction, undefined);
  const [cat, setCat] = useState<Category>(allowed[0] ?? "content");
  return (
    <form onSubmit={action} className="space-y-6">
      <Card className="space-y-4 p-6">
        <div>
          <Label htmlFor="title">عنوان الخدمة</Label>
          <Input id="title" name="title" required placeholder="أكتب لك محتوى انستقرام لشهر كامل بلهجة سعودية" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="category">المجال</Label>
            <Select id="category" name="category" value={cat} onChange={(e) => setCat(e.target.value as Category)}>
              {allowed.map((c) => (
                <option key={c} value={c}>{categories[c].icon} {categories[c].label}</option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>الأدوات اللي تستخدمها في هذي الخدمة</Label>
          <div className="flex flex-wrap gap-2">
            {tools[cat].map((t) => (
              <label key={t} className="ltr flex cursor-pointer items-center rounded-lg bg-white px-2.5 py-1 text-sm ring-1 ring-sand-300 has-[:checked]:bg-brand-700 has-[:checked]:text-white has-[:checked]:ring-brand-700">
                <input type="checkbox" name="aiTools" value={t} className="sr-only" />
                {t}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="description">وصف الخدمة</Label>
          <Textarea id="description" name="description" rows={6} required placeholder="وش يستلم العميل بالضبط؟ كيف تستخدم الذكاء الاصطناعي؟ وش تحتاج من العميل؟" />
          <Hint>كن محدد: العميل يدفع مقابل نتيجة واضحة.</Hint>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {TIERS.map((t) => (
          <Card key={t.tier} className={cn("space-y-3 p-5", t.tier === "standard" && "ring-2 ring-brand-300")}>
            <Input name={`${t.tier}_name`} defaultValue={t.name} aria-label="اسم الباقة" className="font-bold" />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">السعر ر.س</Label>
                <Input name={`${t.tier}_price`} type="number" min={50} defaultValue={t.price} required />
              </div>
              <div>
                <Label className="text-xs">أيام</Label>
                <Input name={`${t.tier}_days`} type="number" min={1} defaultValue={t.days} required />
              </div>
              <div>
                <Label className="text-xs">تعديلات</Label>
                <Input name={`${t.tier}_revisions`} type="number" min={0} defaultValue={t.rev} required />
              </div>
            </div>
            <div>
              <Label className="text-xs">المميزات (كل سطر ميزة)</Label>
              <Textarea name={`${t.tier}_features`} defaultValue={t.features} rows={4} />
            </div>
          </Card>
        ))}
      </div>

      <FormError message={state?.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "جارٍ النشر…" : "انشر الخدمة"}
      </Button>
    </form>
  );
}
