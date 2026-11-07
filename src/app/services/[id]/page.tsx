import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Card, Avatar, VerifiedBadge, ToolChip, Stars, Badge } from "@/components/ui";
import { ServiceCover } from "@/components/service-card";
import { PackagePicker } from "@/components/package-picker";
import { getService } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { CATEGORIES, FEES } from "@/lib/constants";
import { num, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const data = await getService((await params).id);
  return { title: data?.service.title ?? "خدمة" };
}

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, user] = await Promise.all([getService(id), getCurrentUser()]);
  if (!data || (!data.service.active && user?.id !== data.service.sellerId)) notFound();
  const { service: s, seller, reviews } = data;
  const isOwner = user?.id === s.sellerId;
  const disabledReason = isOwner ? "هذي خدمتك — العملاء يشوفون زر الطلب هنا." : seller.status !== "approved" ? "المستقل غير موثّق حالياً." : undefined;

  return (
    <Container className="py-8">
      <nav className="mb-4 text-sm text-stone-500">
        <Link href="/services" className="hover:text-brand-700">الخدمات</Link> ‹{" "}
        <Link href={`/services?category=${s.category}`} className="hover:text-brand-700">{CATEGORIES[s.category].label}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <h1 className="text-2xl font-bold leading-[1.5] text-brand-950 sm:text-3xl">{s.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <Link href={`/freelancers/${seller.userId}`} className="flex items-center gap-2 font-semibold hover:text-brand-700">
              <Avatar name={seller.displayName} size={30} /> {seller.displayName}
            </Link>
            {seller.status === "approved" && <VerifiedBadge small />}
            <Stars value={s.ratingAvg} count={s.ratingCount} />
            {s.ordersCount > 0 && <span className="text-stone-500">· {num(s.ordersCount)} طلب</span>}
          </div>

          <ServiceCover category={s.category} title={s.title} className="mt-6 h-56 rounded-2xl sm:h-72" />

          <section className="mt-8">
            <h2 className="text-lg font-bold text-brand-950">عن الخدمة</h2>
            <p className="mt-3 whitespace-pre-line leading-8 text-stone-700">{s.description}</p>
          </section>

          <section className="mt-8">
            <Card className="p-5">
              <h2 className="font-bold text-brand-950">🤖 أدوات الذكاء الاصطناعي في هذي الخدمة</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {s.aiTools.map((t) => (
                  <ToolChip key={t} name={t} />
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                المستقل يستخدم هذي الأدوات لتسريع الإنجاز، ويراجع ويعدّل المخرجات بنفسه قبل التسليم. هذا اللي اختبرناه فيه قبل توثيقه.
              </p>
            </Card>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-bold text-brand-950">التقييمات {reviews.length > 0 && <span className="text-stone-500">({num(reviews.length)})</span>}</h2>
            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">ما فيه تقييمات بعد.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {reviews.map((r) => (
                  <li key={r.id}>
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Avatar name={r.buyerName} size={28} /> {r.buyerName}
                        </div>
                        <span className="text-xs text-stone-500">{relativeTime(r.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-saffron-500" aria-label={`${r.rating} من 5`}>
                        {"★".repeat(r.rating)}
                        <span className="text-sand-300">{"★".repeat(5 - r.rating)}</span>
                      </p>
                      {r.comment && <p className="mt-1 text-sm leading-7 text-stone-700">{r.comment}</p>}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <PackagePicker serviceId={s.id} packages={s.packages} buyerFeeRate={FEES.buyerFeeRate} disabledReason={disabledReason} />
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={seller.displayName} size={48} />
              <div>
                <p className="font-bold">{seller.displayName}</p>
                <p className="text-sm text-stone-600">{seller.headline}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {seller.status === "approved" && <VerifiedBadge />}
              {seller.verificationScore != null && <Badge tone="brand">نتيجة اختبار AI: {num(seller.verificationScore)}/100</Badge>}
              {seller.freelanceDocNumber && <Badge tone="gray"><span title="أدخلها المستقل ولم يتم التحقق منها آلياً بعد">وثيقة عمل حر (مُعلنة)</span></Badge>}
              {seller.city && <Badge>📍 {seller.city}</Badge>}
            </div>
            <Link href={`/freelancers/${seller.userId}`} className="mt-4 block text-center text-sm font-semibold text-brand-700 hover:underline">
              عرض الملف الكامل
            </Link>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
