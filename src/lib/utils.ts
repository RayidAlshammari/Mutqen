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
