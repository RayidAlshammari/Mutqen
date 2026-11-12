import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { newId } from "./id";
import { SITE } from "./constants";

const { notification, user } = schema;

export type Notice = { title: string; body?: string; href?: string };

export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Sends one transactional email through Resend. Never throws: a failed email must not fail the action. */
export async function sendEmail(to: string, subject: string, text: string, href?: string) {
  if (!emailEnabled()) return false;
  const base = process.env.BETTER_AUTH_URL ?? "";
  const link = href ? `${base}${href}` : base;
  const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:16px;line-height:1.9;color:#17231f">
<p style="font-weight:bold">${escapeHtml(subject)}</p><p>${escapeHtml(text)}</p>
<p><a href="${link}" style="background:#1b5444;color:#fff;padding:10px 22px;border-radius:999px;text-decoration:none">افتح ${SITE.name}</a></p></div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject: `${SITE.name}: ${subject}`, html, text: `${text}\n${link}` }),
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Tells a user that something needs their attention: always in the app (the bell),
 * and by email as well when email is configured.
 */
export async function notify(userId: string, n: Notice) {
  await db.insert(notification).values({ id: newId("n_"), userId, title: n.title, body: n.body ?? "", href: n.href ?? null });
  if (!emailEnabled()) return;
  const [u] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  if (u && !u.email.endsWith(".demo")) await sendEmail(u.email, n.title, n.body ?? "", n.href);
}

export async function notifyAdmins(n: Notice) {
  const admins = await db.select({ id: user.id }).from(user).where(eq(user.role, "admin"));
  for (const a of admins) await notify(a.id, n);
}
