export function sar(n: number) {
  return `${n.toLocaleString("ar-SA")} ر.س`;
}

export function num(n: number) {
  return n.toLocaleString("ar-SA");
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });

export function relativeTime(date: Date) {
  const diff = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function daysLabel(d: number) {
  if (d === 1) return "يوم واحد";
  if (d === 2) return "يومين";
  if (d <= 10) return `${num(d)} أيام`;
  return `${num(d)} يوم`;
}

/**
 * Arabic count agreement: 1 → "طلب واحد", 2 → "طلبين", 3-10 → "٤ طلبات", 11+ → "١٢ طلب".
 * forms = [one, two, few (3-10), many (11+)]
 */
export function arCount(n: number, forms: [string, string, string, string]) {
  if (n === 1) return forms[0];
  if (n === 2) return forms[1];
  const r = n % 100;
  return `${num(n)} ${r >= 3 && r <= 10 ? forms[2] : forms[3]}`;
}

export const COUNT = {
  orders: ["طلب واحد", "طلبين", "طلبات", "طلب"] as [string, string, string, string],
  services: ["خدمة واحدة", "خدمتين", "خدمات", "خدمة"] as [string, string, string, string],
  reviews: ["تقييم واحد", "تقييمين", "تقييمات", "تقييم"] as [string, string, string, string],
  hours: ["ساعة", "ساعتين", "ساعات", "ساعة"] as [string, string, string, string],
  revisions: ["تعديل واحد", "تعديلين", "تعديلات", "تعديل"] as [string, string, string, string],
  clients: ["عميل واحد", "عميلين", "عملاء", "عميل"] as [string, string, string, string],
};

/** WhatsApp link to the Mutqen team (SUPPORT_WHATSAPP, international digits). Null when not configured. */
export function supportWhatsApp(text?: string): string | null {
  const digits = (process.env.SUPPORT_WHATSAPP ?? "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
