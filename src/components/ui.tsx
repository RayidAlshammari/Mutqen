import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

/* ───────── Button ───────── */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 shadow-sm",
  accent: "bg-saffron-500 text-brand-950 hover:bg-saffron-400 shadow-sm",
  secondary: "bg-white text-brand-800 ring-1 ring-sand-300 hover:bg-sand-100",
  ghost: "text-brand-800 hover:bg-brand-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ───────── Surfaces ───────── */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl bg-white ring-1 ring-sand-200", className)} {...props} />;
}

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />;
}

/* ───────── Badges ───────── */

type Tone = "green" | "amber" | "blue" | "violet" | "gray" | "red" | "brand";
const tones: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
  gray: "bg-stone-100 text-stone-700 ring-stone-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  brand: "bg-brand-50 text-brand-800 ring-brand-200",
};

export function Badge({ tone = "gray", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", tones[tone], className)}>
      {children}
    </span>
  );
}

export function ToolChip({ name }: { name: string }) {
  return (
    <span className="ltr inline-flex items-center rounded-md bg-sand-100 px-2 py-0.5 text-xs font-medium text-brand-900 ring-1 ring-sand-200">
      {name}
    </span>
  );
}

export function VerifiedBadge({ small }: { small?: boolean }) {
  return (
    <span
      title="اجتاز اختبار متقن العملي في استخدام الذكاء الاصطناعي"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-700 font-semibold text-white",
        small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
    >
      <svg viewBox="0 0 20 20" className={small ? "h-3 w-3" : "h-3.5 w-3.5"} fill="currentColor" aria-hidden>
        <path d="M10 1.5l2.2 1.6 2.7-.2.9 2.6 2.2 1.6-.9 2.6.9 2.6-2.2 1.6-.9 2.6-2.7-.2L10 18.5l-2.2-1.6-2.7.2-.9-2.6-2.2-1.6.9-2.6-.9-2.6 2.2-1.6.9-2.6 2.7.2L10 1.5zm-1.2 11.3l5-5-1.1-1.1-3.9 3.9-1.8-1.8L5.9 10l2.9 2.8z" />
      </svg>
      موثّق AI
    </span>
  );
}

/* ───────── Form fields ───────── */

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-semibold text-brand-950", className)} {...props} />;
}

const field =
  "w-full rounded-xl bg-white px-3.5 py-2.5 text-[15px] ring-1 ring-sand-300 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(field, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-28 leading-7", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(field, "h-11", className)} {...props} />;
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs leading-5 text-stone-500">{children}</p>;
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">{message}</p>;
}

/* ───────── Misc ───────── */

export function Stars({ value, count, className }: { value: number; count?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-saffron-500" fill="currentColor" aria-hidden>
        <path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8L10 1.8z" />
      </svg>
      <span className="font-semibold">{value ? value.toFixed(1) : "جديد"}</span>
      {count !== undefined && count > 0 && <span className="text-stone-500">({count})</span>}
    </span>
  );
}

const avatarColors = ["bg-brand-600", "bg-saffron-600", "bg-sky-700", "bg-rose-700", "bg-violet-700", "bg-teal-700", "bg-amber-700"];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    // "الديرة" → "د": the definite article is not an initial.
    .map((p) => (p.length > 3 && p.startsWith("ال") ? p[2] : p[0]))
    .join(" ");
  const color = avatarColors[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % avatarColors.length];
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white", color)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-12 text-center">
      <p className="text-lg font-semibold text-brand-950">{title}</p>
      {text && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-950 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-stone-600">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </Card>
  );
}
