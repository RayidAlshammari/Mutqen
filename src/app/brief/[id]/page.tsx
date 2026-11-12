import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Avatar, Badge, Card, Container, LinkButton, Stars, ToolChip, VerifiedBadge, buttonClass } from "@/components/ui";
import { BriefCard } from "@/components/brief-card";
import { BriefWizard, type WizardInitial } from "@/components/brief-wizard";
import { ManagedForm, SummaryEditor } from "@/components/brief-forms";
import { cancelManagedAction, reopenBriefAction } from "@/app/actions/brief";
import { db, schema } from "@/db";
import { loadOwnBrief } from "@/lib/brief-access";
import { MANAGED_FEE } from "@/lib/constants";
import { recommendFor, type Recommendation } from "@/lib/match";
import { getService } from "@/lib/queries";
import { uploadsEnabled } from "@/lib/uploads";
import { daysLabel, sar } from "@/lib/utils";

export const metadata = { title: "ملخص الطلب" };
export const dynamic = "force-dynamic";

function Candidate({ r, briefId, pinned, tier }: { r: Recommendation; briefId: string; pinned: boolean; tier?: string | null }) {
  const shots = r.portfolio.filter((p) => p.image).slice(0, 3);
  return (
    <Card className={pinned ? "p-5 ring-2 ring-brand-500 sm:p-6" : "p-5 sm:p-6"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={r.sellerName} size={48} />
          <div>
            <p className="flex flex-wrap items-center gap-2 font-bold text-brand-950">
              {r.sellerName} <VerifiedBadge small />
              {pinned && <Badge tone="brand">اختيارك</Badge>}
            </p>
            <p className="text-sm text-stone-600">
              {r.headline}
              {r.city ? ` · ${r.city}` : ""}
            </p>
          </div>
        </div>
        <div className="text-left">
          <Stars value={r.record.rating} count={r.record.ratingCount} />
          <Link href={`/freelancers/${r.sellerId}`} target="_blank" className="mt-1 block text-xs font-semibold text-brand-700 hover:underline">
            ملفه وأعماله ↗
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-stone-500">ليش رشّحناه</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6">
            {r.reasons.map((x) => (
              <li key={x} className="flex gap-2">
                <span className="text-brand-600">✓</span>
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-stone-500">من أعماله</p>
          {shots.length ? (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {shots.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.title} src={p.image} alt={p.title} loading="lazy" className="aspect-square w-full rounded-lg object-cover ring-1 ring-sand-200" />
              ))}
            </div>
          ) : r.portfolio.length ? (
            <ul className="mt-2 space-y-1 text-sm text-stone-700">
              {r.portfolio.slice(0, 3).map((p) => (
                <li key={p.title}>• {p.title}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-stone-500">ما أضاف أعمال بعد. شوف نتيجة اختباره في ملفه.</p>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-sand-50 p-4 ring-1 ring-sand-200">
        <p className="text-sm font-semibold">{r.service.title}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {r.service.aiTools.slice(0, 4).map((t) => (
            <ToolChip key={t} name={t} />
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {r.service.packages.map((p) => (
            <Link
              key={p.tier}
              href={`/order/new?brief=${briefId}&service=${r.service.id}&tier=${p.tier}`}
              className={buttonClass(pinned && p.tier === (tier ?? "standard") ? "primary" : "secondary", "md", "h-auto flex-col gap-0 py-2.5")}
            >
              <span className="text-xs font-medium opacity-80">{p.name} · {daysLabel(p.deliveryDays)}</span>
              <span className="text-base font-bold">{sar(p.price)}</span>
            </Link>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">السعر نهائي. المبلغ ينحجز لدى متقن وما يتحوّل للمستقل إلا بعد ما تعتمد التسليم.</p>
      </div>
    </Card>
  );
}

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const own = await loadOwnBrief(id);
  if (!own) notFound();
  const { brief: b, user } = own;

  if (b.status === "ordered") {
    const [o] = await db.select({ id: schema.order.id }).from(schema.order).where(eq(schema.order.briefId, id)).orderBy(desc(schema.order.createdAt)).limit(1);
    if (o) redirect(`/orders/${o.id}`);
  }

  if (b.status === "draft" || !b.structured) {
    const sb = b.structured;
    const initial: WizardInitial = {
      answers: Object.fromEntries(b.questions.map((q) => [q.id, sb?.answers?.find((a) => a.q === q.q)?.a ?? ""])),
      style: sb?.style ?? [],
      colors: sb?.colors ?? [],
      references: sb?.references ?? [],
      assets: sb?.assets ?? [],
    };
    return (
      <Container className="max-w-3xl py-10">
        <h1 className="mb-6 text-2xl font-bold text-brand-950 sm:text-3xl">نرتّب طلبك</h1>
        <BriefWizard briefId={id} category={b.category} input={b.input} questions={b.questions} initial={initial} uploads={uploadsEnabled()} />
      </Container>
    );
  }

  const sb = b.structured;
  const [managed] = b.status === "managed" ? await db.select().from(schema.managedRequest).where(eq(schema.managedRequest.briefId, id)).orderBy(desc(schema.managedRequest.createdAt)).limit(1) : [];
  const offer = managed?.status === "offered" && managed.offeredServiceId ? await getService(managed.offeredServiceId) : null;
  const offerPkg = offer?.service.packages.find((p) => p.tier === managed?.offeredTier);
  const recs = b.status === "ready" ? await recommendFor(sb, { excludeUserId: user?.id, pinServiceId: b.serviceId }) : [];

  return (
    <Container className="max-w-4xl py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-700">ملخص طلبك جاهز</p>
          <h1 className="mt-1 text-2xl font-bold text-brand-950 sm:text-3xl">هذا اللي بيشتغل منه المستقل</h1>
        </div>
        {b.status === "ready" && (
          <form action={reopenBriefAction}>
            <input type="hidden" name="briefId" value={id} />
            <button className="text-sm font-semibold text-stone-600 hover:text-brand-700 hover:underline">↩ ارجع للأسئلة</button>
          </form>
        )}
      </div>

      <Card className="p-5 sm:p-7">
        <BriefCard b={sb} />
        {b.status === "ready" && (
          <div className="mt-5 border-t border-sand-200 pt-4">
            <SummaryEditor briefId={id} b={sb} />
          </div>
        )}
      </Card>

      {b.status === "managed" && managed && (
        <Card className="mt-8 p-5 sm:p-7" id="managed">
          <Badge tone="amber">متقن يدير الطلب</Badge>
          {offer && offerPkg ? (
            <>
              <h2 className="mt-3 text-xl font-bold text-brand-950">رشّحنا لك {offer.seller.displayName}</h2>
              <p className="mt-1 text-sm text-stone-600">{offer.service.title} — الباقة {offerPkg.name}، التسليم خلال {daysLabel(offerPkg.deliveryDays)}.</p>
              {managed.note && <p className="mt-3 rounded-xl bg-sand-50 p-3 text-sm leading-7 ring-1 ring-sand-200">ملاحظة الفريق: {managed.note}</p>}
              <div className="mt-4 max-w-sm space-y-1 text-sm">
                <div className="flex justify-between"><span>سعر الخدمة</span><span>{sar(offerPkg.price)}</span></div>
                <div className="flex justify-between"><span>رسوم إدارة الطلب</span><span>{sar(MANAGED_FEE)}</span></div>
                <div className="flex justify-between border-t border-sand-200 pt-2 text-base font-bold"><span>الإجمالي</span><span>{sar(offerPkg.price + MANAGED_FEE)}</span></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <LinkButton href={`/order/new?brief=${id}&service=${offer.service.id}&tier=${offerPkg.tier}&managed=${managed.id}`} size="lg">
                  وافق وادفع
                </LinkButton>
                <Link href={`/freelancers/${offer.seller.userId}`} target="_blank" className="text-sm font-semibold text-brand-700 hover:underline">
                  شوف ملف المستقل ↗
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-3 text-xl font-bold text-brand-950">استلمنا طلبك</h2>
              <p className="mt-2 leading-7 text-stone-700">فريق متقن يراجع ملخصك ويختار لك المستقل الأنسب. بيوصلك إشعار بالترشيح والسعر خلال يوم عمل، وما تدفع شي قبل ما توافق.</p>
            </>
          )}
          <form action={cancelManagedAction} className="mt-4">
            <input type="hidden" name="briefId" value={id} />
            <button className="text-sm font-semibold text-stone-600 hover:text-brand-700 hover:underline">أبي أختار المستقل بنفسي</button>
          </form>
        </Card>
      )}

      {b.status === "ready" && (
        <>
          <div className="mt-10 mb-4">
            <h2 className="text-xl font-bold text-brand-950">{recs.length ? "رشّحنا لك" : "ما لقينا مستقل مناسب الحين"}</h2>
            <p className="mt-1 text-sm text-stone-600">
              {recs.length ? "الترشيح مبني على سجل المستقل الفعلي في متقن: وش أنجز، وهل سلّم في الموعد، وكم يأخذ عشان يرد." : "خلّ متقن يدير الطلب وبنلقى لك المستقل المناسب، أو تصفّح كل الخدمات."}
            </p>
          </div>
          <div className="space-y-4">
            {recs.map((r) => (
              <Candidate key={r.sellerId} r={r} briefId={id} pinned={r.service.id === b.serviceId} tier={b.tier} />
            ))}
          </div>
          <Card className="mt-8 bg-saffron-50/60 p-5 ring-saffron-200 sm:p-7" id="managed">
            <h2 className="text-lg font-bold text-brand-950">ما تبي تختار؟ خلّ متقن يدير الطلب</h2>
            <ul className="mt-3 space-y-1.5 text-sm leading-6 text-stone-700">
              <li>• نختار لك المستقل المناسب لطلبك وميزانيتك.</li>
              <li>• نراجع العيّنة الأولى والتسليم على معايير القبول قبل ما توصلك.</li>
              <li>• نتابع الموعد، وإذا صار خلاف نحلّه عنك.</li>
            </ul>
            <ManagedForm briefId={id} fee={sar(MANAGED_FEE)} />
          </Card>
          <p className="mt-6 text-center text-sm text-stone-600">
            تبي تشوف خيارات أكثر؟{" "}
            <Link href={`/services?category=${sb.category}`} className="font-semibold text-brand-700 hover:underline">
              تصفّح كل خدمات هذا المجال
            </Link>
          </p>
        </>
      )}
    </Container>
  );
}
