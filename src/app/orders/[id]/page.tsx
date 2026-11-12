import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Card, Badge, Avatar, Button } from "@/components/ui";
import { NoteForm, MessageForm, ReviewForm, AddonOfferForm, ResolveDisputeForm } from "@/components/order-actions";
import {
  acceptOrderAction,
  declineOrderAction,
  deliverSampleAction,
  approveSampleAction,
  requestSampleChangeAction,
  deliverOrderAction,
  requestRevisionAction,
  approveDeliveryAction,
  offerAddonAction,
  acceptAddonAction,
  openDisputeAction,
  resolveDisputeAction,
  cancelOrderAction,
  sendMessageAction,
  submitReviewAction,
} from "@/app/actions/orders";
import { reorderBriefAction } from "@/app/actions/brief";
import { getOrder } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { paymentsLive } from "@/lib/payments";
import { ACCEPT_HOURS, AUTO_COMPLETE_DAYS, CATEGORIES, ORDER_STATUS } from "@/lib/constants";
import { formatDate, num, relativeTime, sar } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "تفاصيل الطلب" };

const STEPS = ["الدفع وحجز المبلغ", "قبول المستقل", "العيّنة الأولى", "التسليم الكامل", "الاعتماد وتحويل المبلغ"];

/** Index of the step the order is waiting on (5 = everything is done). */
function stepIndex(status: OrderStatus, stage: string): number {
  if (status === "awaiting_acceptance") return 1;
  if (status === "sample_review" || (status === "in_progress" && stage === "sample")) return 2;
  if (status === "in_progress" || status === "revision_requested") return 3;
  if (status === "delivered") return 4;
  if (status === "completed") return 5;
  return 0;
}

const EVENT_LABEL: Record<string, string> = {
  created: "أُنشئ الطلب",
  payment_held: "حجز المبلغ",
  accepted: "قبول الطلب",
  message: "رسالة",
  sample_delivered: "العيّنة الأولى",
  sample_approved: "اعتماد الاتجاه",
  sample_change: "طلب تغيير الاتجاه",
  delivered: "التسليم الكامل",
  revision_requested: "طلب تعديل",
  addon_offer: "عرض عمل إضافي",
  disputed: "مشكلة مرفوعة لمتقن",
  dispute_resolved: "قرار متقن",
  completed: "اكتمال الطلب",
  payment_released: "تحويل المبلغ",
  cancelled: "إلغاء واسترداد",
};

const HIGHLIGHT = new Set(["sample_delivered", "delivered", "addon_offer", "dispute_resolved"]);

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const user = await requireUser(`/orders/${id}`);
  const data = await getOrder(id);
  if (!data) notFound();
  const o = data.order;
  const isBuyer = o.buyerId === user.id;
  const isSeller = o.sellerId === user.id;
  const isAdmin = user.role === "admin";
  if (!isBuyer && !isSeller && !isAdmin) notFound();

  const statusKey = o.status;
  const status = ORDER_STATUS[statusKey];
  const effective = o.status === "disputed" ? (o.disputePrevStatus ?? "in_progress") : o.status;
  const step = stepIndex(effective, o.stage);
  const working = o.status === "in_progress" || o.status === "revision_requested";
  const late = working && o.dueAt != null && o.dueAt.getTime() < Date.now();
  const closed = o.status === "completed" || o.status === "cancelled";
  const sb = o.structuredBrief;
  const paid = o.price + o.buyerFee + o.managedFee;
  const bind = <A extends unknown[], R>(fn: (id: string, ...a: A) => R) => fn.bind(null, o.id) as (...a: A) => R;

  // What this viewer is waiting for, in one line.
  const waiting =
    o.status === "awaiting_acceptance"
      ? isSeller
        ? `اقبل الطلب أو اسأل العميل قبل ${o.acceptBy ? formatDate(o.acceptBy) : ""}. العدّاد يبدأ بعد قبولك.`
        : `المستقل عنده ${num(ACCEPT_HOURS)} ساعة يقبل أو يسألك. لو ما قبل، يرجع لك المبلغ كامل تلقائياً.`
      : o.status === "in_progress" && o.stage === "sample"
        ? isSeller
          ? "سلّم عيّنة أولى صغيرة عشان العميل يعتمد الاتجاه قبل ما تكمّل."
          : "المستقل يجهّز عيّنة أولى. تعتمد منها الاتجاه قبل الشغل الكامل."
        : o.status === "sample_review"
          ? isBuyer
            ? "شوف العيّنة: اعتمد الاتجاه، أو قل وش يتغيّر."
            : "بانتظار العميل يعتمد اتجاه العيّنة."
          : o.status === "disputed"
            ? "فريق متقن يراجع المشكلة. كل العدّادات متوقفة لين يصدر القرار."
            : null;

  return (
    <Container className="py-10">
      {isNew && (
        <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-200">
          <p className="font-bold">انحجز المبلغ ✓</p>
          <p className="mt-1 text-sm">وصل طلبك للمستقل. بيوصلك إشعار أول ما يقبل، وأول ما تجهز العيّنة.</p>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">
            طلب <span className="ltr font-mono">#{o.id.slice(2, 8).toUpperCase()}</span> · {CATEGORIES[data.category].label}
            {o.managed && <Badge tone="brand" className="mr-2">يديره فريق متقن</Badge>}
            {o.parentOrderId && (
              <Link href={`/orders/${o.parentOrderId}`} className="mr-2 font-semibold text-brand-700 hover:underline">
                عمل إضافي على طلب سابق ↗
              </Link>
            )}
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-[1.5] text-brand-950">{sb?.title ?? data.serviceTitle}</h1>
          <p className="mt-1 text-sm text-stone-600">
            {data.serviceTitle} · الباقة {o.packageName} · {isBuyer ? `المستقل: ${data.sellerName}` : isSeller ? `العميل: ${data.buyerName}` : `${data.buyerName} ← ${data.sellerName}`}
          </p>
        </div>
        <Badge tone={status.tone} className="text-sm">
          {status.label}
        </Badge>
      </div>

      {o.status !== "cancelled" && (
        <ol className="mb-6 grid grid-cols-5 gap-2">
          {STEPS.map((label, i) => (
            <li key={label}>
              <div className={cn("h-1.5 rounded-full", i < step ? "bg-brand-600" : i === step ? "bg-brand-300" : "bg-sand-200")} />
              <p className={cn("mt-2 text-[11px] leading-5 sm:text-sm", i <= step ? "font-semibold text-brand-900" : "text-stone-400")}>{label}</p>
            </li>
          ))}
        </ol>
      )}

      {waiting && <p className="mb-6 rounded-xl bg-sand-100 p-4 text-sm leading-7 text-brand-950 ring-1 ring-sand-200">{waiting}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-bold text-brand-950">ملخص الطلب</h2>
            {sb ? (
              <div className="mt-3 space-y-4 text-sm">
                <p className="leading-7 text-stone-700">{sb.goal}</p>
                {sb.deliverables?.length > 0 && (
                  <div>
                    <p className="mb-1 font-semibold text-brand-900">المطلوب استلامه</p>
                    <ul className="list-inside list-disc space-y-1 text-stone-700">{sb.deliverables.map((d) => <li key={d}>{d}</li>)}</ul>
                  </div>
                )}
                {sb.acceptance && sb.acceptance.length > 0 && (
                  <div className="rounded-xl bg-brand-50 p-4 ring-1 ring-brand-100">
                    <p className="mb-1 font-semibold text-brand-900">معايير القبول</p>
                    <ul className="space-y-1 text-stone-700">{sb.acceptance.map((d) => <li key={d}>✓ {d}</li>)}</ul>
                    <p className="mt-2 text-xs text-stone-500">التعديل ضمن هذي المعايير مشمول. أي شي خارجها يصير عمل إضافي بسعره.</p>
                  </div>
                )}
                {sb.clientProvides && sb.clientProvides.length > 0 && (
                  <div>
                    <p className="mb-1 font-semibold text-brand-900">يوفّره العميل</p>
                    <ul className="list-inside list-disc space-y-1 text-stone-700">{sb.clientProvides.map((d) => <li key={d}>{d}</li>)}</ul>
                  </div>
                )}
                {sb.assets && sb.assets.length > 0 && (
                  <div>
                    <p className="mb-1 font-semibold text-brand-900">ملفات العميل</p>
                    <ul className="space-y-1">
                      {sb.assets.map((a) => (
                        <li key={a.url}>
                          <a href={a.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-brand-700 hover:underline">
                            {a.label} ↗
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  {sb.audience && <Badge>الجمهور: {sb.audience}</Badge>}
                  {sb.tone && <Badge>النبرة: {sb.tone}</Badge>}
                  {sb.style?.map((s) => <Badge key={s}>{s}</Badge>)}
                  {sb.colors?.map((c) => <Badge key={c}>ألوان: {c}</Badge>)}
                </div>
                {sb.answers && sb.answers.length > 0 && (
                  <details>
                    <summary className="cursor-pointer font-semibold text-stone-600">إجابات العميل على أسئلة المساعد</summary>
                    <dl className="mt-2 space-y-2">
                      {sb.answers.map((a) => (
                        <div key={a.q}>
                          <dt className="text-stone-500">{a.q}</dt>
                          <dd className="text-stone-800">{a.a}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </div>
            ) : (
              <p className="mt-3 whitespace-pre-line text-[15px] leading-8 text-stone-700">{o.brief}</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-bold text-brand-950">سجل الطلب</h2>
            <ol className="space-y-4">
              {data.events.map(({ e, actorName }) => {
                const system = !e.actorId;
                const offer = e.type === "addon_offer" ? (e.data as { price?: number; days?: number; accepted?: boolean; orderId?: string } | null) : null;
                return (
                  <li key={e.id} className="flex gap-3">
                    {system ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm">🔒</span>
                    ) : (
                      <Avatar name={actorName ?? "?"} size={32} />
                    )}
                    <div className={cn("flex-1 rounded-xl p-3 text-sm", HIGHLIGHT.has(e.type) ? "bg-violet-50 ring-1 ring-violet-200" : e.type === "disputed" ? "bg-amber-50 ring-1 ring-amber-200" : system ? "bg-sand-50 ring-1 ring-sand-200" : "bg-white ring-1 ring-sand-200")}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">
                          {system ? "متقن" : actorName} · <span className="text-stone-500">{EVENT_LABEL[e.type] ?? e.type}</span>
                        </span>
                        <span className="text-xs text-stone-400" title={formatDate(e.createdAt)}>
                          {relativeTime(e.createdAt)}
                        </span>
                      </div>
                      {e.message && e.type !== "created" && <p className="mt-1 whitespace-pre-line leading-7 text-stone-700">{e.message}</p>}
                      {offer && (
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <Badge tone="brand">{sar(offer.price ?? 0)} · {num(offer.days ?? 0)} يوم</Badge>
                          {offer.accepted ? (
                            <Link href={`/orders/${offer.orderId}`} className="font-semibold text-brand-700 hover:underline">
                              تم القبول — افتح الطلب الإضافي ↗
                            </Link>
                          ) : isBuyer && !closed ? (
                            <form action={acceptAddonAction.bind(null, o.id, e.id)}>
                              <Button type="submit" size="sm">
                                وافق وادفع {sar(offer.price ?? 0)}
                              </Button>
                            </form>
                          ) : (
                            <span className="text-xs text-stone-500">بانتظار موافقة العميل</span>
                          )}
                        </div>
                      )}
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
            {!closed && (
              <div className="mt-6 border-t border-sand-200 pt-4">
                <MessageForm action={bind(sendMessageAction)} />
              </div>
            )}
          </Card>
        </div>

        <aside className="order-first space-y-4 lg:order-none">
          <Card className="p-5 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-stone-600">{o.dueAt ? "موعد التسليم" : "مدة التنفيذ"}</span>
              <span className={cn("font-semibold", late && "text-red-700")}>{o.dueAt ? formatDate(o.dueAt) : `${num(o.deliveryDays)} أيام من قبول المستقل`}</span>
            </div>
            {o.status === "in_progress" && o.stage === "sample" && o.sampleDueAt && (
              <div className="flex justify-between py-1">
                <span className="text-stone-600">موعد العيّنة الأولى</span>
                <span className="font-semibold">{formatDate(o.sampleDueAt)}</span>
              </div>
            )}
            {isSeller ? (
              <>
                <div className="flex justify-between py-1"><span className="text-stone-600">سعر الطلب</span><span>{sar(o.price)}</span></div>
                <div className="flex justify-between py-1"><span className="text-stone-600">عمولة متقن ({num(Math.round((o.platformCommission / Math.max(1, o.price - o.refundAmount)) * 100))}٪)</span><span>- {sar(o.platformCommission)}</span></div>
                <div className="flex justify-between border-t border-sand-200 pt-2 font-bold"><span>صافي أرباحك</span><span>{sar(o.sellerEarning)}</span></div>
              </>
            ) : (
              <>
                {o.managedFee > 0 && (
                  <>
                    <div className="flex justify-between py-1"><span className="text-stone-600">سعر الطلب</span><span>{sar(o.price)}</span></div>
                    <div className="flex justify-between py-1"><span className="text-stone-600">رسوم الخدمة المُدارة</span><span>{sar(o.managedFee)}</span></div>
                  </>
                )}
                <div className="flex justify-between py-1 font-bold"><span>المدفوع</span><span>{sar(paid)}</span></div>
                {o.refundAmount > 0 && <div className="flex justify-between py-1 text-emerald-800"><span>رجع للعميل</span><span>{sar(o.refundAmount)}</span></div>}
                <p className="text-xs text-stone-500">السعر النهائي، بدون أي رسوم تنضاف عند الدفع.</p>
              </>
            )}
            <p className="mt-3 text-xs text-stone-500">
              {o.status === "completed" ? "✓ تحوّل المبلغ للمستقل." : o.status === "cancelled" ? "↩︎ رجع المبلغ للعميل." : "🔒 المبلغ محجوز لدى متقن."}
              {!paymentsLive() && " (وضع الدفع التجريبي)"}
            </p>
          </Card>

          {/* ── Freelancer ── */}
          {isSeller && o.status === "awaiting_acceptance" && (
            <Card className="space-y-4 p-5">
              <h2 className="font-bold">تقبل الطلب؟</h2>
              <p className="text-xs leading-5 text-stone-500">اقرأ الملخص. لو ناقصك شي اسأل العميل في الرسائل قبل ما تقبل. موعد التسليم يبدأ من لحظة قبولك.</p>
              <form action={bind(acceptOrderAction)}>
                <Button type="submit" className="w-full">✓ أقبل الطلب وأبدأ</Button>
              </form>
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-stone-600">أعتذر عن الطلب</summary>
                <div className="mt-3">
                  <NoteForm action={bind(declineOrderAction)} label="سبب الاعتذار (يوصل للعميل ويرجع له المبلغ)" button="أعتذر وأرجّع المبلغ" variant="danger" />
                </div>
              </details>
            </Card>
          )}
          {isSeller && o.status === "in_progress" && o.stage === "sample" && (
            <Card className="p-5">
              <h2 className="mb-1 font-bold">سلّم العيّنة الأولى</h2>
              <p className="mb-3 text-xs leading-5 text-stone-500">جزء صغير من الشغل (مثلاً منشورين من 12) يوضّح الاتجاه، قبل ما تكمّل الباقي.</p>
              <NoteForm action={bind(deliverSampleAction)} label="وش في العيّنة؟" placeholder="وش سويت، وليش اخترت هالاتجاه" button="أرسل العيّنة للعميل" pendingLabel="جارٍ الإرسال…" withUrl />
            </Card>
          )}
          {isSeller && ((o.status === "in_progress" && o.stage === "full") || o.status === "revision_requested") && (
            <Card className="p-5">
              <h2 className="mb-3 font-bold">{o.status === "revision_requested" ? "سلّم النسخة المعدّلة" : "سلّم الشغل كامل"}</h2>
              <NoteForm action={bind(deliverOrderAction)} label="رسالة التسليم" placeholder="وش سلّمت، وكيف يتأكد العميل من معايير القبول" button="سلّم الطلب" pendingLabel="جارٍ التسليم…" withUrl />
            </Card>
          )}
          {isSeller && !closed && o.status !== "awaiting_acceptance" && o.status !== "disputed" && (
            <Card className="p-5">
              <details>
                <summary className="cursor-pointer font-bold">العميل طلب شي خارج الملخص؟</summary>
                <p className="my-3 text-xs leading-5 text-stone-500">لا تسويه مجاناً ولا ترفضه: أرسل له عرض بسعر ومدة، وإذا وافق يصير طلب مستقل مربوط بهذا الطلب.</p>
                <AddonOfferForm action={bind(offerAddonAction)} />
              </details>
            </Card>
          )}

          {/* ── Client ── */}
          {isBuyer && o.status === "sample_review" && (
            <Card className="space-y-4 p-5">
              <h2 className="font-bold">راجع العيّنة الأولى</h2>
              <p className="text-xs leading-5 text-stone-500">إذا ما رديت خلال {num(AUTO_COMPLETE_DAYS)} أيام، يُعتمد الاتجاه تلقائياً عشان الشغل ما يوقف.</p>
              <form action={bind(approveSampleAction)}>
                <Button type="submit" className="w-full">✓ الاتجاه صح، كمّل</Button>
              </form>
              {o.sampleChangesLeft > 0 ? (
                <NoteForm action={bind(requestSampleChangeAction)} label="وش يتغيّر في الاتجاه؟ (مرة وحدة مشمولة)" button="اطلب تغيير الاتجاه" variant="secondary" />
              ) : (
                <p className="text-xs text-stone-500">تغيير الاتجاه المشمول استُخدم.</p>
              )}
            </Card>
          )}
          {isBuyer && o.status === "delivered" && (
            <Card className="space-y-4 p-5">
              <h2 className="font-bold">راجع التسليم</h2>
              <p className="text-xs leading-5 text-stone-500">قارنه بمعايير القبول في الملخص. إذا ما راجعته خلال {num(AUTO_COMPLETE_DAYS)} أيام، يكتمل الطلب تلقائياً ويتحوّل المبلغ للمستقل.</p>
              <form action={bind(approveDeliveryAction)}>
                <Button type="submit" className="w-full">✓ أعتمد التسليم وحوّل المبلغ</Button>
              </form>
              {o.revisionsLeft > 0 ? (
                <NoteForm action={bind(requestRevisionAction)} label={`تعديل ضمن الملخص (باقي لك ${num(o.revisionsLeft)})`} button="اطلب تعديل" variant="secondary" />
              ) : (
                <p className="text-xs text-stone-500">استنفدت التعديلات المشمولة. لو تبي شي إضافي، اطلب من المستقل عرض لعمل إضافي.</p>
              )}
            </Card>
          )}
          {isBuyer && (o.status === "awaiting_acceptance" || late) && (
            <Card className="p-5">
              <p className={cn("text-sm", late ? "text-red-800" : "text-stone-600")}>
                {late ? "تجاوز المستقل موعد التسليم. تقدر تلغي وتسترد المبلغ كامل." : "غيّرت رأيك؟ تقدر تلغي قبل ما يقبل المستقل ويرجع لك المبلغ كامل."}
              </p>
              <form action={bind(cancelOrderAction)} className="mt-3">
                <Button type="submit" variant="danger" className="w-full">ألغِ واسترد المبلغ</Button>
              </form>
            </Card>
          )}
          {isBuyer && ["in_progress", "sample_review", "delivered", "revision_requested"].includes(o.status) && (
            <Card className="p-5">
              <details>
                <summary className="cursor-pointer font-bold">عندي مشكلة</summary>
                <p className="my-3 text-xs leading-5 text-stone-500">الشغل ما يطابق الملخص، أو المستقل ما يرد؟ ارفعها لفريق متقن. يتوقف العدّاد فوراً، والمبلغ يبقى محجوز لين نقرر.</p>
                <NoteForm action={bind(openDisputeAction)} label="وش المشكلة؟" button="ارفعها لفريق متقن" variant="danger" />
              </details>
            </Card>
          )}

          {/* ── Admin ── */}
          {isAdmin && o.status === "disputed" && (
            <Card className="space-y-3 p-5">
              <h2 className="font-bold">قرار في المشكلة</h2>
              <p className="rounded-xl bg-amber-50 p-3 text-sm leading-7 text-amber-950 ring-1 ring-amber-200">{o.disputeReason}</p>
              <ResolveDisputeForm action={bind(resolveDisputeAction)} price={o.price} />
            </Card>
          )}
          {isAdmin && !closed && o.status !== "disputed" && (
            <Card className="p-5">
              <p className="text-sm text-stone-600">إجراء إداري: إلغاء الطلب وإرجاع المبلغ كامل للعميل.</p>
              <form action={bind(cancelOrderAction)} className="mt-3">
                <Button type="submit" variant="danger" className="w-full">إلغاء واسترداد (إدارة)</Button>
              </form>
            </Card>
          )}

          {isBuyer && o.status === "completed" && !data.review && (
            <Card className="p-5">
              <ReviewForm action={bind(submitReviewAction)} />
            </Card>
          )}
          {data.review && (
            <Card className="p-5 text-sm">
              <p className="font-bold">تقييم العميل</p>
              <p className="mt-1 text-xl text-saffron-500">{"★".repeat(data.review.rating)}</p>
              {data.review.comment && <p className="mt-1 leading-7 text-stone-700">{data.review.comment}</p>}
            </Card>
          )}
          {isBuyer && o.status === "completed" && o.briefId && (
            <form action={reorderBriefAction}>
              <input type="hidden" name="briefId" value={o.briefId} />
              <input type="hidden" name="serviceId" value={o.serviceId} />
              <button className="block w-full rounded-2xl bg-brand-700 p-4 text-center font-bold text-white hover:bg-brand-800">
                اطلبها مرة ثانية بنفس الملخص
              </button>
            </form>
          )}

          <Link href={isAdmin ? "/admin/orders" : "/dashboard/orders"} className="block text-center text-sm text-stone-500 hover:text-brand-700">
            ← كل الطلبات
          </Link>
        </aside>
      </div>
    </Container>
  );
}
