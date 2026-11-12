import type { StructuredBrief } from "@/db/schema";
import { CATEGORIES, PALETTES } from "@/lib/constants";
import { Badge } from "./ui";

const List = ({ title, items, mark }: { title: string; items?: string[]; mark: string }) =>
  items?.length ? (
    <div>
      <p className="text-sm font-semibold text-stone-500">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((d) => (
          <li key={d} className="flex gap-2 text-[15px] leading-7">
            <span className="text-brand-600">{mark}</span>
            <span>{d}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

/** The brief exactly as the freelancer will read it. Shown to the client before paying and on the order. */
export function BriefCard({ b, compact }: { b: StructuredBrief; compact?: boolean }) {
  const palette = PALETTES.find((p) => p.name === b.colors?.[0]);
  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">
            {CATEGORIES[b.category].icon} {CATEGORIES[b.category].label}
          </Badge>
          {b.timeline && <Badge>⏱ {b.timeline}</Badge>}
          {b.budgetHint && !compact && <Badge>تقدير السعر: {b.budgetHint}</Badge>}
        </div>
        <p className="mt-3 text-xl font-bold leading-8 text-brand-950">{b.title}</p>
        <p className="mt-1 leading-7 text-stone-700">{b.goal}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <List title="وش تستلم" items={b.deliverables} mark="✓" />
        <List title="متى نقول الشغل مضبوط (معايير القبول)" items={b.acceptance} mark="◆" />
      </div>
      {Boolean(b.style?.length || b.colors?.length || b.tone || b.audience) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {b.audience && <Badge>الجمهور: {b.audience}</Badge>}
          {b.tone && <Badge>النبرة: {b.tone}</Badge>}
          {b.style?.map((s) => <Badge key={s}>{s}</Badge>)}
          {b.colors?.map((c) => (
            <Badge key={c}>
              {palette && (
                <span className="flex overflow-hidden rounded-full ring-1 ring-black/10">
                  {palette.colors.map((x) => (
                    <span key={x} className="h-3 w-3" style={{ background: x }} />
                  ))}
                </span>
              )}
              {c}
            </Badge>
          ))}
        </div>
      )}
      {!compact && <List title="المطلوب منك توفّره للمستقل" items={b.clientProvides} mark="•" />}
      {Boolean(b.assets?.length || b.references?.length) && (
        <div>
          <p className="text-sm font-semibold text-stone-500">الملفات والمراجع</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {b.assets?.map((a) => (
              <li key={a.url}>
                <a href={a.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 rounded-lg bg-sand-100 px-3 py-1.5 font-medium text-brand-800 ring-1 ring-sand-200 hover:bg-sand-200">
                  📎 {a.label}
                </a>
              </li>
            ))}
            {b.references?.map((r, i) => (
              <li key={r}>
                <a href={r} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 rounded-lg bg-sand-100 px-3 py-1.5 font-medium text-brand-800 ring-1 ring-sand-200 hover:bg-sand-200">
                  🔗 مرجع {(i + 1).toLocaleString("ar-SA")}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
