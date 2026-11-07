import Link from "next/link";
import type { Category } from "@/db/schema";
import { CATEGORIES } from "@/lib/constants";
import { daysLabel, sar } from "@/lib/utils";
import { Avatar, Stars, ToolChip, VerifiedBadge } from "./ui";

export type ServiceCardProps = {
  id: string;
  title: string;
  category: Category;
  aiTools: string[];
  minPrice: number;
  minDeliveryDays: number;
  ratingAvg: number;
  ratingCount: number;
  sellerName: string;
  sellerStatus?: string;
};

export function ServiceCover({ category, title, className = "" }: { category: Category; title: string; className?: string }) {
  return (
    <div className={`cover-${category} pattern-dots relative flex items-end overflow-hidden p-4 ${className}`}>
      <span className="absolute -top-3 left-3 text-7xl opacity-25 select-none" aria-hidden>
        {CATEGORIES[category].icon}
      </span>
      <span className="relative line-clamp-2 text-lg font-bold leading-7 text-white drop-shadow">{title}</span>
    </div>
  );
}

export function ServiceCard(s: ServiceCardProps) {
  return (
    <Link
      href={`/services/${s.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-sand-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand-200"
    >
      <ServiceCover category={s.category} title={CATEGORIES[s.category].label} className="h-28" />
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          <Avatar name={s.sellerName} size={28} />
          <span className="truncate text-sm font-semibold text-stone-700">{s.sellerName}</span>
          {s.sellerStatus === "approved" && <VerifiedBadge small />}
        </div>
        <h3 className="line-clamp-2 font-semibold leading-7 text-brand-950 group-hover:text-brand-700">{s.title}</h3>
        <div className="mt-2 flex flex-wrap gap-1">
          {s.aiTools.slice(0, 3).map((t) => (
            <ToolChip key={t} name={t} />
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-sand-100 pt-3 mt-4">
          <Stars value={s.ratingAvg} count={s.ratingCount} />
          <div className="text-left">
            <p className="text-[11px] text-stone-500">يبدأ من · {daysLabel(s.minDeliveryDays)}</p>
            <p className="font-bold text-brand-900">{sar(s.minPrice)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
