"use client";

import { useFormAction } from "./use-form-action";
import { savePayoutAction, saveBillingAction } from "@/app/actions/settings";
import { Button, Input, Label, Select, FormError, Hint } from "./ui";

function Saved({ ok }: { ok?: boolean }) {
  return ok ? <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">تم الحفظ ✓</p> : null;
}

export function PayoutForm({ payoutName, iban }: { payoutName?: string | null; iban?: string | null }) {
  const [state, action, pending] = useFormAction(savePayoutAction, undefined);
  return (
    <form onSubmit={action} className="space-y-4">
      <div>
        <Label htmlFor="payoutName">اسم صاحب الحساب البنكي</Label>
        <Input id="payoutName" name="payoutName" required defaultValue={payoutName ?? ""} />
      </div>
      <div>
        <Label htmlFor="iban">رقم الآيبان</Label>
        <Input id="iban" name="iban" required dir="ltr" placeholder="SA00 0000 0000 0000 0000 0000" defaultValue={iban ?? ""} />
        <Hint>تتحول أرباحك لهذا الحساب بعد ما يعتمد العميل التسليم. الاسم لازم يطابق اسم صاحب الحساب في البنك.</Hint>
      </div>
      <Saved ok={state?.ok} />
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>{pending ? "جارٍ الحفظ…" : "احفظ بيانات التحويل"}</Button>
    </form>
  );
}

export function BillingForm({ defaults, cities }: { defaults: { companyName?: string | null; vatNumber?: string | null; crNumber?: string | null; city?: string | null }; cities: string[] }) {
  const [state, action, pending] = useFormAction(saveBillingAction, undefined);
  return (
    <form onSubmit={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="companyName">اسم المنشأة (اختياري)</Label>
          <Input id="companyName" name="companyName" defaultValue={defaults.companyName ?? ""} />
        </div>
        <div>
          <Label htmlFor="city">المدينة</Label>
          <Select id="city" name="city" defaultValue={defaults.city ?? ""}>
            <option value="">—</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="vatNumber">الرقم الضريبي (اختياري)</Label>
          <Input id="vatNumber" name="vatNumber" dir="ltr" inputMode="numeric" placeholder="3XXXXXXXXXXXXX3" defaultValue={defaults.vatNumber ?? ""} />
        </div>
        <div>
          <Label htmlFor="crNumber">السجل التجاري (اختياري)</Label>
          <Input id="crNumber" name="crNumber" dir="ltr" inputMode="numeric" defaultValue={defaults.crNumber ?? ""} />
        </div>
      </div>
      <Hint>تظهر هذي البيانات في فواتيرك.</Hint>
      <Saved ok={state?.ok} />
      <FormError message={state?.error} />
      <Button type="submit" disabled={pending}>{pending ? "جارٍ الحفظ…" : "احفظ بيانات الفاتورة"}</Button>
    </form>
  );
}
