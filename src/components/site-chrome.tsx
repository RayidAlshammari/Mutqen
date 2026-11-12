import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/session";
import { signOutAction } from "@/app/actions/auth";
import { Container, LinkButton, Avatar } from "./ui";
import { CATEGORIES, CATEGORY_KEYS, DEMO_MODE } from "@/lib/constants";
import { num } from "@/lib/utils";

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="متقن — الرئيسية">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${light ? "bg-white text-brand-800" : "bg-brand-700 text-white"}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.2 4.2L19 7" />
        </svg>
      </span>
      <span className={`text-2xl font-bold tracking-tight ${light ? "text-white" : "text-brand-900"}`}>متقن</span>
    </Link>
  );
}

export async function SiteHeader() {
  const user = await getCurrentUser();
  const [{ n: unread }] = user
    ? await db.select({ n: count() }).from(schema.notification).where(and(eq(schema.notification.userId, user.id), isNull(schema.notification.readAt)))
    : [{ n: 0 }];
  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand-50/90 backdrop-blur">
      {DEMO_MODE && <p className="bg-saffron-500 px-4 py-1 text-center text-xs font-semibold text-brand-950">بيئة تجربة: الحسابات والطلبات المعروضة بيانات عرض، والدفع في وضع الاختبار.</p>}
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-[15px] font-medium text-stone-700 md:flex">
            {CATEGORY_KEYS.map((c) => (
              <Link key={c} href={`/services?category=${c}`} className="hover:text-brand-700">
                {CATEGORIES[c].label}
              </Link>
            ))}
            <Link href="/brief" className="hover:text-brand-700">
              اطلب خدمة
            </Link>
            <Link href="/how-it-works" className="hover:text-brand-700">
              كيف يعمل
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <Link href="/notifications" aria-label={unread ? `الإشعارات: ${num(Number(unread))} جديد` : "الإشعارات"} className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-sand-100">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand-900" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0" />
              </svg>
              {Number(unread) > 0 && <span className="absolute -top-0.5 -left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{num(Math.min(Number(unread), 99))}</span>}
            </Link>
          )}
          {user ? (
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-sand-100">
                <Avatar name={user.name} size={32} />
                <span className="hidden text-sm font-semibold sm:inline">{user.name.split(" ")[0]}</span>
              </summary>
              <div className="absolute left-0 mt-2 w-56 overflow-hidden rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-sand-200">
                {user.role === "admin" ? (
                  <>
                    <MenuLink href="/admin">لوحة الإدارة</MenuLink>
                    <MenuLink href="/admin/orders">كل الطلبات</MenuLink>
                    <MenuLink href="/admin/managed">الطلبات المُدارة</MenuLink>
                    <MenuLink href="/admin/freelancers">المستقلون</MenuLink>
                  </>
                ) : (
                  <>
                    <MenuLink href="/dashboard">لوحة التحكم</MenuLink>
                    <MenuLink href="/dashboard/orders">{user.role === "seller" ? "الطلبات" : "طلباتي"}</MenuLink>
                  </>
                )}
                {user.role === "seller" && <MenuLink href="/seller/services">خدماتي</MenuLink>}
                {user.role === "seller" && <MenuLink href="/seller/profile">ملفي كمستقل</MenuLink>}
                <MenuLink href="/dashboard/settings">الإعدادات</MenuLink>
                <form action={signOutAction}>
                  <button className="w-full rounded-xl px-3 py-2 text-right text-sm text-red-700 hover:bg-red-50">تسجيل الخروج</button>
                </form>
              </div>
            </details>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">
                دخول
              </LinkButton>
              <LinkButton href="/signup" size="sm">
                ابدأ الآن
              </LinkButton>
            </>
          )}
        </div>
      </Container>
      {/* mobile category strip */}
      <nav className="flex gap-2 overflow-x-auto border-t border-sand-200 px-4 py-2 text-sm md:hidden">
        {CATEGORY_KEYS.map((c) => (
          <Link key={c} href={`/services?category=${c}`} className="shrink-0 rounded-full bg-white px-3 py-1 ring-1 ring-sand-200">
            {CATEGORIES[c].icon} {CATEGORIES[c].label}
          </Link>
        ))}
        <Link href="/brief" className="shrink-0 rounded-full bg-brand-700 px-3 py-1 text-white">
          اطلب خدمة
        </Link>
      </nav>
    </header>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-xl px-3 py-2 text-sm hover:bg-sand-100">
      {children}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-brand-950 text-brand-100">
      <Container className="grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-7 text-brand-200">
            منصة سعودية تربط الأفراد والشركات بمستقلين متحقق من تمكنهم في أدوات الذكاء الاصطناعي، لإنجاز مهام المحتوى والميديا والبرمجة بسرعة وجودة.
          </p>
        </div>
        <div>
          <p className="mb-3 font-semibold text-white">التصنيفات</p>
          <ul className="space-y-2 text-sm">
            {CATEGORY_KEYS.map((c) => (
              <li key={c}>
                <Link href={`/services?category=${c}`} className="hover:text-white">
                  {CATEGORIES[c].label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold text-white">متقن</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/how-it-works" className="hover:text-white">كيف يعمل</Link></li>
            <li><Link href="/signup?as=seller" className="hover:text-white">انضم كمستقل</Link></li>
            <li><Link href="/brief" className="hover:text-white">اطلب خدمة</Link></li>
            <li><Link href="/terms" className="hover:text-white">الشروط وسياسة الاستخدام</Link></li>
            <li><Link href="/privacy" className="hover:text-white">الخصوصية</Link></li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-brand-900">
        <Container className="flex flex-wrap items-center justify-between gap-2 py-5 text-xs text-brand-300">
          <span>© {new Date().getFullYear()} متقن</span>
          <span>المبلغ محجوز لدى متقن حتى تعتمد التسليم.</span>
        </Container>
      </div>
    </footer>
  );
}
