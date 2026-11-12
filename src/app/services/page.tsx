import Link from "next/link";
import { Container, Card, Input, Select, Button, EmptyState, LinkButton } from "@/components/ui";
import { ServiceCard } from "@/components/service-card";
import { listServices, type ServiceFilters } from "@/lib/queries";
import { CATEGORIES, CATEGORY_KEYS, ALL_AI_TOOLS, AI_TOOLS } from "@/lib/constants";
import type { Category } from "@/db/schema";
import { arCount, COUNT, num } from "@/lib/utils";

export const metadata = { title: "تصفح الخدمات" };
export const dynamic = "force-dynamic";

type SP = { category?: string; q?: string; maxPrice?: string; maxDays?: string; tool?: string; sort?: string };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const category = CATEGORY_KEYS.includes(sp.category as Category) ? (sp.category as Category) : undefined;
  const filters: ServiceFilters = {
    category,
    q: sp.q?.slice(0, 80) || undefined,
    maxPrice: Number(sp.maxPrice) || undefined,
    maxDays: Number(sp.maxDays) || undefined,
    tool: sp.tool && ALL_AI_TOOLS.includes(sp.tool) ? sp.tool : undefined,
    sort: (["popular", "rating", "price_asc", "price_desc", "newest"] as const).find((s) => s === sp.sort),
  };
  const services = await listServices(filters);
  const tools = category ? AI_TOOLS[category] : ALL_AI_TOOLS;

  return (
    <Container className="py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-950 sm:text-3xl">{category ? `خدمات ${CATEGORIES[category].label}` : "كل الخدمات"}</h1>
        <p className="mt-2 text-stone-600">{category ? CATEGORIES[category].description : "محتوى، ميديا، وبرمجة من مستقلين موثقين في استخدام الذكاء الاصطناعي."}</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <CatPill href={hrefWith(sp, { category: undefined })} active={!category}>
          الكل
        </CatPill>
        {CATEGORY_KEYS.map((c) => (
          <CatPill key={c} href={hrefWith(sp, { category: c, tool: undefined })} active={category === c}>
            {CATEGORIES[c].icon} {CATEGORIES[c].label}
          </CatPill>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit p-5">
          <form className="space-y-4" method="get">
            {category && <input type="hidden" name="category" value={category} />}
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="q">بحث</label>
              <Input id="q" name="q" defaultValue={filters.q} placeholder="مثلاً: ريلز، متجر، مقالات" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="tool">أداة الذكاء الاصطناعي</label>
              <Select id="tool" name="tool" defaultValue={filters.tool ?? ""}>
                <option value="">أي أداة</option>
                {tools.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="maxPrice">الميزانية القصوى</label>
              <Select id="maxPrice" name="maxPrice" defaultValue={sp.maxPrice ?? ""}>
                <option value="">بدون حد</option>
                {[200, 500, 1000, 2500, 5000].map((p) => (
                  <option key={p} value={p}>
                    حتى {num(p)} ر.س
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="maxDays">مدة التسليم</label>
              <Select id="maxDays" name="maxDays" defaultValue={sp.maxDays ?? ""}>
                <option value="">أي مدة</option>
                <option value="1">خلال 24 ساعة</option>
                <option value="2">خلال 48 ساعة</option>
                <option value="3">خلال 3 أيام</option>
                <option value="7">خلال أسبوع</option>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="sort">الترتيب</label>
              <Select id="sort" name="sort" defaultValue={filters.sort ?? "popular"}>
                <option value="popular">الأكثر طلباً</option>
                <option value="rating">الأعلى تقييماً</option>
                <option value="price_asc">السعر: الأقل أولاً</option>
                <option value="price_desc">السعر: الأعلى أولاً</option>
                <option value="newest">الأحدث</option>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              تطبيق
            </Button>
            <Link href={category ? `/services?category=${category}` : "/services"} className="block text-center text-sm text-stone-500 hover:text-brand-700">
              مسح الفلاتر
            </Link>
          </form>
        </Card>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
            <p className="text-sm text-brand-900">
              مو متأكد وش تختار؟ <strong>اكتب احتياجك بجملة</strong> ومتقن يرشّح لك ثلاثة مستقلين.
            </p>
            <LinkButton href="/brief" size="sm">
              رشّحوا لي
            </LinkButton>
          </div>
          <p className="mb-3 text-sm text-stone-500">{arCount(services.length, COUNT.services)}</p>
          {services.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {services.map((s) => (
                <ServiceCard key={s.id} {...s} />
              ))}
            </div>
          ) : (
            <EmptyState title="ما لقينا خدمات تطابق بحثك" text="جرّب توسّع الفلاتر، أو اكتب احتياجك ومتقن يرشّح لك." action={<LinkButton href="/brief">اكتب احتياجك</LinkButton>} />
          )}
        </div>
      </div>
    </Container>
  );
}

function hrefWith(sp: SP, patch: Partial<SP>) {
  const p = new URLSearchParams();
  const merged = { ...sp, ...patch };
  for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/services?${s}` : "/services";
}

function CatPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition ${active ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-brand-900 ring-sand-300 hover:bg-sand-100"}`}
    >
      {children}
    </Link>
  );
}
