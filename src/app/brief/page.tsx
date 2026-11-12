import Link from "next/link";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { Card, Container, LinkButton } from "@/components/ui";
import { BriefStart } from "@/components/brief-start";
import { db, schema } from "@/db";
import { getService } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { readBriefKey } from "@/lib/brief-access";
import { relativeTime } from "@/lib/utils";

export const metadata = { title: "اطلب خدمة" };
export const dynamic = "force-dynamic";

const STEPS = [
  ["١", "جملة وحدة", "اكتب وش تحتاج بكلامك."],
  ["٢", "خمسة أسئلة", "نسألك اللي يسأله مدير حسابات في وكالة."],
  ["٣", "ملخص واضح", "نكتب الملخص ومعايير القبول عنك."],
  ["٤", "ثلاثة مرشحين", "بسجلهم الفعلي على متقن، وأنت تختار."],
];

export default async function BriefStartPage({ searchParams }: { searchParams: Promise<{ q?: string; service?: string; tier?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const picked = sp.service ? await getService(sp.service) : null;
  const key = await readBriefKey();
  const mine = user ? eq(schema.brief.ownerId, user.id) : key ? and(eq(schema.brief.ownerKey, key), isNull(schema.brief.ownerId)) : null;
  const open = mine
    ? await db
        .select({ id: schema.brief.id, input: schema.brief.input, status: schema.brief.status, category: schema.brief.category, structured: schema.brief.structured, updatedAt: schema.brief.updatedAt })
        .from(schema.brief)
        .where(and(mine, inArray(schema.brief.status, ["draft", "ready", "managed"])))
        .orderBy(desc(schema.brief.updatedAt))
        .limit(3)
    : [];
  // Arrived from a service page with a finished brief for the same category: no need to answer the questions again.
  const reusable = picked?.service.active ? open.find((b) => b.status === "ready" && b.structured && b.category === picked.service.category) : undefined;
  return (
    <Container className="max-w-3xl py-10">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand-700">اطلب خدمة</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-950 sm:text-3xl">قل لنا وش تحتاج، والملخص علينا</h1>
        <p className="mt-2 leading-7 text-stone-600">ما تحتاج تعرف كيف تكتب طلب لمستقل. جاوب على أسئلة قصيرة، ونطلّع لك ملخص يشتغل منه المستقل بدون ما يرجع يسألك.</p>
      </div>
      {picked?.service.active && (
        <div className="mb-4 rounded-2xl bg-brand-50 px-5 py-3 text-sm ring-1 ring-brand-100">
          تطلب من <span className="font-bold">{picked.seller.displayName}</span>: {picked.service.title}
        </div>
      )}
      {reusable && picked && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-500">عندك ملخص جاهز</p>
            <p className="truncate font-bold text-brand-950">{reusable.structured?.title}</p>
          </div>
          <LinkButton href={`/order/new?brief=${reusable.id}&service=${picked.service.id}${sp.tier ? `&tier=${sp.tier}` : ""}`}>اطلب بهذا الملخص</LinkButton>
        </Card>
      )}
      <Card className="p-5 sm:p-7">
        <BriefStart initial={sp.q?.slice(0, 2000)} serviceId={picked?.service.active ? picked.service.id : undefined} tier={sp.tier} />
      </Card>
      {open.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-stone-600">أو كمّل ملخص بدأته</p>
          <ul className="space-y-2">
            {open.map((b) => (
              <li key={b.id}>
                <Link href={`/brief/${b.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-sand-200 hover:ring-brand-300">
                  <span className="truncate">{b.input}</span>
                  <span className="shrink-0 text-xs text-stone-500">{b.status === "managed" ? "يديره متقن" : b.status === "ready" ? "جاهز" : "مسودة"} · {relativeTime(b.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ol className="mt-8 grid gap-3 sm:grid-cols-4">
        {STEPS.map(([n, t, d]) => (
          <li key={n} className="rounded-2xl bg-white/70 p-4 ring-1 ring-sand-200">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">{n}</span>
            <p className="mt-2 font-bold text-brand-950">{t}</p>
            <p className="mt-1 text-xs leading-5 text-stone-600">{d}</p>
          </li>
        ))}
      </ol>
    </Container>
  );
}
