import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Card, Badge, Avatar, Button } from "@/components/ui";
import { DeliverForm, RevisionForm, MessageForm, ReviewForm } from "@/components/order-actions";
import {
  deliverOrderAction,
  requestRevisionAction,
  acceptOrderAction,
  cancelOrderAction,
  sendMessageAction,
  submitReviewAction,
} from "@/app/actions/orders";
import { getOrder } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { AUTO_COMPLETE_DAYS, CATEGORIES, ORDER_STATUS } from "@/lib/constants";
import { formatDate, relativeTime, sar } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "تفاصيل الطلب" };

const STEPS = [
  { key: "paid", label: "الدفع وحجز المبلغ" },
  { key: "work", label: "التنفيذ" },
  { key: "delivered", label: "التسليم" },
  { key: "done", label: "الموافقة وتحويل المبلغ" },
];

function stepIndex(status: string) {
  if (status === "in_progress" || status === "revision_requested") return 1;
  if (status === "delivered") return 2;
  if (status === "completed") return 4;
  return 0;
}

const EVENT_LABEL: Record<string, string> = {
  created: "أُنشئ الطلب",
  payment_held: "حجز المبلغ",
  message: "رسالة",
  delivered: "تسليم",
  revision_requested: "طلب تعديل",
  completed: "اكتمال الطلب",
  payment_released: "تحويل المبلغ",
  cancelled: "إلغاء واسترداد",
};

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const user = await requireUser(`/orders/${id}`);
  const data = await getOrder(id);
  if (!data) notFound();
  const o = data.order;
  const isBuyer = o.buyerId === user.id;
  const isSeller = o.sellerId === user.id;
  if (!isBuyer && !isSeller && user.role !== "admin") notFound();

  const status = ORDER_STATUS[o.status];
  const step = stepIndex(o.status);
  const late = o.status === "in_progress" && o.dueAt.getTime() < Date.now();
  const closed = o.status === "completed" || o.status === "cancelled";
  const sb = o.structuredBrief;

  return (
    <Container className="py-10">
      {isNew && (
        <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-200">
          <p className="font-bold">تم الدفع وحجز المبلغ بنجاح ✓</p>
          <p className="mt-1 text-sm">وصل طلبك للمستقل وبدأ التنفيذ. بنبلغك أول ما يسلّم.</p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">
            طلب <span className="ltr font-mono">#{o.id.slice(2, 8).toUpperCase()}</span> · {CATEGORIES[data.category].label}
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-[1.5] text-brand-950">{data.serviceTitle}</h1>
          <p className="mt-1 text-sm text-stone-600">
            الباقة {o.packageName} · {isBuyer ? `المستقل: ${data.sellerName}` : `العميل: ${data.buyerName}`}
          </p>
        </div>
        <Badge tone={status.tone} className="text-sm">
          {status.label}
        </Badge>
      </div>

      {o.status !== "cancelled" && (
        <ol className="mb-8 grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.key}>
              <div className={cn("h-1.5 rounded-full", i < step || (i === step && step === 4) ? "bg-brand-600" : i === step ? "bg-brand-300" : "bg-sand-200")} />
              <p className={cn("mt-2 text-xs sm:text-sm", i <= step ? "font-semibold text-brand-900" : "text-stone-400")}>{s.label}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-bold text-brand-950">تفاصيل الطلب</h2>
            {sb && (
              <div className="mt-3 rounded-xl bg-brand-50 p-4 text-sm ring-1 ring-brand-100">
                <p className="mb-2 font-semibold text-brand-800">✨ الطلب المنظَّم (من المساعد الذكي)</p>
                <p className="font-bold">{sb.title}</p>
                <p className="mt-1 leading-7 text-stone-700">{sb.goal}</p>
                {sb.deliverables?.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-stone-700">
                    {sb.deliverables.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {sb.audience && <Badge>الجمهور: {sb.audience}</Badge>}
                  {sb.tone && <Badge>الأسلوب: {sb.tone}</Badge>}
                </div>
              </div>
            )}
            {sb ? (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-semibold text-stone-600">نص الطلب الكامل</summary>
                <p className="mt-2 whitespace-pre-line leading-8 text-stone-700">{o.brief}</p>
              </details>
            ) : (
              <p className="mt-3 whitespace-pre-line text-[15px] leading-8 text-stone-700">{o.brief}</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-bold text-brand-950">سجل الطلب</h2>
            <ol className="space-y-4">
              {data.events.map(({ e, actorName }) => {
                const system = !e.actorId;
                return (
                  <li key={e.id} className="flex gap-3">
                    {system ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm">🔒</span>
                    ) : (
                      <Avatar name={actorName ?? "?"} size={32} />
                    )}
                    <div className={cn("flex-1 rounded-xl p-3 text-sm", e.type === "delivered" ? "bg-violet-50 ring-1 ring-violet-200" : system ? "bg-sand-50 ring-1 ring-sand-200" : "bg-white ring-1 ring-sand-200")}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">
                          {system ? "متقن" : actorName} · <span className="text-stone-500">{EVENT_LABEL[e.type] ?? e.type}</span>
                        </span>
                        <span className="text-xs text-stone-400" title={formatDate(e.createdAt)}>
                          {relativeTime(e.createdAt)}
                        </span>
                      </div>
                      {e.message && e.type !== "created" && <p className="mt-1 whitespace-pre-line leading-7 text-stone-700">{e.message}</p>}
                      {e.attachmentUrl && (
                        <a href={e.attachmentUrl} target="_blank" rel="noopener noreferrer nofollow" className="ltr mt-2 inline-block break-all font-semibold text-brand-700 hover:underline">
                          {e.attachmentUrl} ↗
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {!closed && (isBuyer || isSeller) && (
              <div className="mt-6 border-t border-sand-200 pt-4">
                <MessageForm action={sendMessageAction.bind(null, o.id)} />
              </div>
            )}
          </Card>
        </div>

        <aside className="order-first space-y-4 lg:order-none">
          <Card className="p-5 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-stone-600">موعد التسليم</span>
              <span className={cn("font-semibold", late && "text-red-700")}>{formatDate(o.dueAt)}</span>
            </div>
            {isBuyer ? (
              <>
                <div className="flex justify-between py-1"><span className="text-stone-600">سعر الباقة</span><span>{sar(o.price)}</span></div>
                <div className="flex justify-between py-1"><span className="text-stone-600">رسوم الخدمة</span><span>{sar(o.buyerFee)}</span></div>
                <div className="flex justify-between border-t border-sand-200 pt-2 font-bold"><span>المدفوع</span><span>{sar(o.price + o.buyerFee)}</span></div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-1"><span className="text-stone-600">سعر الباقة</span><span>{sar(o.price)}</span></div>
                <div className="flex justify-between py-1"><span className="text-stone-600">عمولة متقن (١٠٪)</span><span>- {sar(o.platformCommission)}</span></div>
                <div className="flex justify-between border-t border-sand-200 pt-2 font-bold"><span>صافي أرباحك</span><span>{sar(o.sellerEarning)}</span></div>
              </>
            )}
            <p className="mt-3 text-xs text-stone-500">
              {o.status === "completed" ? "✓ تم تحويل المبلغ للمستقل." : o.status === "cancelled" ? "↩︎ تم استرداد المبلغ للعميل." : "🔒 المبلغ محجوز لدى متقن."}
            </p>
          </Card>

          {isSeller && (o.status === "in_progress" || o.status === "revision_requested") && (
            <Card className="p-5">
              <h2 className="mb-3 font-bold">{o.status === "revision_requested" ? "سلّم النسخة المعدلة" : "سلّم الطلب"}</h2>
              <DeliverForm action={deliverOrderAction.bind(null, o.id)} />
            </Card>
          )}

          {isBuyer && o.status === "delivered" && (
            <Card className="space-y-4 p-5">
              <h2 className="font-bold">راجع التسليم</h2>
              <p className="text-xs leading-5 text-stone-500">إذا ما راجعت التسليم خلال {AUTO_COMPLETE_DAYS.toLocaleString("ar-SA")} أيام، يكتمل الطلب تلقائياً ويتحول المبلغ للمستقل.</p>
              <form action={acceptOrderAction.bind(null, o.id)}>
                <Button type="submit" className="w-full">
                  ✓ أوافق على التسليم وحوّل المبلغ
                </Button>
              </form>
              {o.revisionsLeft > 0 ? (
                <RevisionForm action={requestRevisionAction.bind(null, o.id)} left={o.revisionsLeft} />
              ) : (
                <p className="text-xs text-stone-500">استنفدت التعديلات المشمولة في الباقة.</p>
              )}
            </Card>
          )}

          {isBuyer && late && (
            <Card className="p-5">
              <p className="text-sm text-red-800">تجاوز المستقل موعد التسليم. تقدر تلغي الطلب وتسترد المبلغ كامل.</p>
              <form action={cancelOrderAction.bind(null, o.id)} className="mt-3">
                <Button type="submit" variant="danger" className="w-full">
                  ألغِ واسترد المبلغ
                </Button>
              </form>
            </Card>
          )}

          {user.role === "admin" && !closed && (
            <Card className="p-5">
              <p className="text-sm text-stone-600">إجراء إداري: إلغاء الطلب وإعادة المبلغ كاملاً للعميل.</p>
              <form action={cancelOrderAction.bind(null, o.id)} className="mt-3">
                <Button type="submit" variant="danger" className="w-full">
                  إلغاء واسترداد (إدارة)
                </Button>
              </form>
            </Card>
          )}

          {isBuyer && o.status === "completed" && !data.review && (
            <Card className="p-5">
              <ReviewForm action={submitReviewAction.bind(null, o.id)} />
            </Card>
          )}
          {data.review && (
            <Card className="p-5 text-sm">
              <p className="font-bold">تقييم العميل</p>
              <p className="mt-1 text-xl text-saffron-500">{"★".repeat(data.review.rating)}</p>
              {data.review.comment && <p className="mt-1 leading-7 text-stone-700">{data.review.comment}</p>}
            </Card>
          )}

          <Link href="/dashboard/orders" className="block text-center text-sm text-stone-500 hover:text-brand-700">
            ← كل الطلبات
          </Link>
        </aside>
      </div>
    </Container>
  );
}
