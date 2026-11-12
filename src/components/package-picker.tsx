"use client";

import { useState } from "react";
import Link from "next/link";
import type { ServicePackage } from "@/db/schema";
import { buttonClass } from "./ui";
import { arCount, cn, COUNT } from "@/lib/utils";

const sarFmt = (n: number) => `${n.toLocaleString("ar-SA")} ر.س`;
const days = (d: number) => (d === 1 ? "يوم واحد" : d === 2 ? "يومين" : `${d.toLocaleString("ar-SA")} أيام`);

export function PackagePicker({ serviceId, packages, disabledReason }: { serviceId: string; packages: ServicePackage[]; disabledReason?: string }) {
  const [i, setI] = useState(Math.min(1, packages.length - 1));
  const p = packages[i];
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-sand-200">
      <div className="grid grid-cols-3 border-b border-sand-200" role="tablist">
        {packages.map((pk, idx) => (
          <button
            key={pk.tier}
            role="tab"
            aria-selected={idx === i}
            onClick={() => setI(idx)}
            className={cn("py-3 text-sm font-semibold transition", idx === i ? "border-b-2 border-brand-700 text-brand-800" : "text-stone-500 hover:bg-sand-50")}
          >
            {pk.name}
          </button>
        ))}
      </div>
      <div className="p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-bold text-brand-950">{sarFmt(p.price)}</p>
          <p className="text-xs font-semibold text-brand-700">السعر النهائي — بدون رسوم إضافية</p>
        </div>
        <div className="mt-3 flex gap-4 text-sm text-stone-700">
          <span>⏱ التسليم خلال {days(p.deliveryDays)}</span>
          <span>↻ {p.revisions ? arCount(p.revisions, COUNT.revisions) : "بدون تعديلات"}</span>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {p.features.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-brand-600">✓</span>
              {f}
            </li>
          ))}
        </ul>
        {disabledReason ? (
          <p className="mt-5 rounded-xl bg-sand-100 p-3 text-center text-sm text-stone-600">{disabledReason}</p>
        ) : (
          <Link href={`/brief?service=${serviceId}&tier=${p.tier}`} className={buttonClass("primary", "lg", "mt-5 w-full")}>
            اطلب الباقة {p.name}
          </Link>
        )}
        <p className="mt-3 text-center text-xs text-stone-500">🔒 المبلغ يُحجز لدى متقن ولا يُحوَّل للمستقل إلا بعد موافقتك</p>
      </div>
    </div>
  );
}
