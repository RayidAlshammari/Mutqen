import Link from "next/link";
import { Badge, EmptyState } from "./ui";
import { CATEGORIES, ORDER_STATUS } from "@/lib/constants";
import { relativeTime, sar } from "@/lib/utils";
import type { Category } from "@/db/schema";

export type OrderRow = {
  id: string;
  status: string;
  price: number;
  buyerFee: number;
  sellerEarning: number;
  packageName: string;
  dueAt: Date | null;
  createdAt: Date;
  serviceTitle: string;
  category: Category;
  counterpartName: string;
};

export function OrdersList({ rows, as, empty }: { rows: OrderRow[]; as: "buyer" | "seller"; empty?: React.ReactNode }) {
  if (!rows.length) return <>{empty ?? <EmptyState title="ما فيه طلبات بعد" />}</>;
  return (
    <ul className="divide-y divide-sand-100 overflow-hidden rounded-2xl bg-white ring-1 ring-sand-200">
      {rows.map((r) => {
        const st = ORDER_STATUS[r.status];
        return (
          <li key={r.id}>
            <Link href={`/orders/${r.id}`} className="flex flex-wrap items-center gap-4 p-4 hover:bg-sand-50">
              <span className="text-2xl" aria-hidden>{CATEGORIES[r.category].icon}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-brand-950">{r.serviceTitle}</p>
                <p className="text-xs text-stone-500">
                  {as === "buyer" ? "المستقل" : "العميل"}: {r.counterpartName} · {r.packageName} · {relativeTime(r.createdAt)}
                </p>
              </div>
              <Badge tone={st.tone}>{st.label}</Badge>
              <span className="w-24 text-left font-bold text-brand-900">{sar(as === "buyer" ? r.price + r.buyerFee : r.sellerEarning)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
