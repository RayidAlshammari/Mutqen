import { notFound } from "next/navigation";
import { Container, Card, Avatar, VerifiedBadge, ToolChip, Badge, Stars } from "@/components/ui";
import { ServiceCard } from "@/components/service-card";
import { getSeller } from "@/lib/queries";
import { CATEGORIES } from "@/lib/constants";
import { num, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FreelancerPage({ params }: { params: Promise<{ id: string }> }) {
  const data = await getSeller((await params).id);
  if (!data || data.profile.status !== "approved") notFound();
  const { profile: p, services, reviews, ratingAvg, completed, onTime } = data;

  return (
    <Container className="py-10">
      <Card className="overflow-hidden">
        <div className="pattern-dots h-28 bg-brand-800" />
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 px-6 pb-6">
          <div className="flex items-end gap-4">
            <span className="rounded-full ring-4 ring-white">
              <Avatar name={p.displayName} size={96} />
            </span>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-brand-950">{p.displayName}</h1>
                <VerifiedBadge />
              </div>
              <p className="text-stone-600">{p.headline}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pb-1">
            {p.city && <Badge>📍 {p.city}</Badge>}
            {p.freelanceDocNumber && <Badge tone="gray"><span title="أدخلها المستقل ولم يتم التحقق منها آلياً بعد">وثيقة عمل حر (مُعلنة)</span></Badge>}
            {p.categories.map((c) => (
              <Badge key={c} tone="brand">
                {CATEGORIES[c].icon} {CATEGORIES[c].label}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="grid grid-cols-3 divide-x divide-x-reverse divide-sand-200 p-4 text-center">
            <div>
              <p className="text-xl font-bold">{ratingAvg ? ratingAvg.toFixed(1) : "—"}</p>
              <p className="text-xs text-stone-500">التقييم</p>
            </div>
            <div>
              <p className="text-xl font-bold">{num(completed)}</p>
              <p className="text-xs text-stone-500">طلب مكتمل</p>
            </div>
            <div>
              <p className="text-xl font-bold">{completed ? `${num(Math.round((onTime / completed) * 100))}٪` : "—"}</p>
              <p className="text-xs text-stone-500">في الوقت</p>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">نبذة</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-stone-700">{p.bio || "—"}</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold">🤖 أدوات الذكاء الاصطناعي</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.aiTools.map((t) => (
                <ToolChip key={t} name={t} />
              ))}
            </div>
            {p.verificationScore != null && (
              <div className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
                اجتاز اختبار متقن العملي بنتيجة <strong>{num(p.verificationScore)}/100</strong>
              </div>
            )}
          </Card>
          {p.portfolio.length > 0 && (
            <Card className="p-5">
              <h2 className="font-bold">أعمال سابقة</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {p.portfolio.map((it) => (
                  <li key={it.title}>
                    {it.url ? (
                      <a href={it.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-brand-700 hover:underline">
                        {it.title} ↗
                      </a>
                    ) : (
                      <span className="font-semibold">{it.title}</span>
                    )}
                    {it.description && <p className="text-stone-600">{it.description}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-lg font-bold text-brand-950">الخدمات ({num(services.length)})</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((s) => (
              <ServiceCard key={s.id} {...s} sellerName={p.displayName} sellerStatus={p.status} />
            ))}
          </div>

          <h2 className="mb-4 mt-10 text-lg font-bold text-brand-950">آراء العملاء</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-stone-500">ما فيه تقييمات بعد.</p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id}>
                  <Card className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Avatar name={r.buyerName} size={28} /> {r.buyerName}
                        <Stars value={r.rating} />
                      </div>
                      <span className="text-xs text-stone-500">{relativeTime(r.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">{r.serviceTitle}</p>
                    {r.comment && <p className="mt-2 text-sm leading-7 text-stone-700">{r.comment}</p>}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Container>
  );
}
