import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { signOutAction } from "@/app/actions/auth";
import { Container, LinkButton, Avatar } from "./ui";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/constants";

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
  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand-50/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-[15px] font-medium text-stone-700 md:flex">
            {CATEGORY_KEYS.map((c) => (
              <Link key={c} href={`/services?category=${c}`} className="hover:text-brand-700">
                {CATEGORIES[c].label}
              </Link>
            ))}
            <Link href="/assistant" className="hover:text-brand-700">
              المساعد الذكي
            </Link>
            <Link href="/how-it-works" className="hover:text-brand-700">
              كيف يعمل
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
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
        <Link href="/assistant" className="shrink-0 rounded-full bg-brand-700 px-3 py-1 text-white">
          ✨ المساعد الذكي
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
            <li><Link href="/assistant" className="hover:text-white">المساعد الذكي</Link></li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-brand-900">
        <Container className="flex flex-wrap items-center justify-between gap-2 py-5 text-xs text-brand-300">
          <span>© {new Date().getFullYear()} متقن — نموذج أولي (MVP)</span>
          <span>البيانات والمستقلون المعروضون تجريبيون لأغراض العرض، والدفع في وضع تجريبي.</span>
        </Container>
      </div>
    </footer>
  );
}
