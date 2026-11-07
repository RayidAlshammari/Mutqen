import { z } from "zod";

/** Only http(s) links are accepted from users (blocks javascript:, data:, etc.). */
export const httpUrl = (message = "الرابط لازم يبدأ بـ https://") =>
  z
    .string()
    .trim()
    .max(500)
    .refine((v) => {
      try {
        const u = new URL(v);
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    }, message);

/** Saudi IBAN: SA + 22 digits (24 chars), validated with the ISO 13616 mod-97 checksum. */
export function normaliseSaudiIban(raw: string): string | null {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^SA\d{22}$/.test(iban)) return null;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1 ? iban : null;
}

/** Saudi VAT registration number: 15 digits, starts and ends with 3. */
export const isSaudiVat = (v: string) => /^3\d{13}3$/.test(v);

/** Commercial registration number: 10 digits. */
export const isSaudiCr = (v: string) => /^\d{10}$/.test(v);

/** Normalise Saudi mobile numbers to E.164 (+9665XXXXXXXX). Returns null if invalid. */
export function normaliseSaudiPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "").replace(/^00/, "+");
  const m = digits.match(/^(?:\+?966|0)5(\d{8})$/);
  return m ? `+9665${m[1]}` : null;
}

/** Only same-site relative paths are allowed as post-login redirects. */
export const safeNextPath = (n: unknown): string | null =>
  typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : null;

/**
 * Detects text that tries to instruct the AI grader instead of answering the task
 * (prompt injection). Flagged answers are capped and highlighted for the human reviewer.
 */
const INJECTION_PATTERNS = [
  /ignore (all |the )?(previous|above|prior) (instructions|prompts?)/i,
  /(give|assign|set|rate)( me| this| the answer)? (a )?(score|grade|mark)/i,
  /\b(system prompt|you are now|as an ai grader)\b/i,
  /تجاهل (كل |جميع )?(التعليمات|الأوامر|ما سبق)/,
  /(أعطني|اعطني|اعطها|أعطها|ضع لي|حط لي)\s*(درجة|الدرجة|علامة|العلامة)\s*(كاملة|عالية|١٠٠|100)/,
  /(أنت|انت) (الآن|الحين) (مقيّم|مقيم|نموذج)/,
];

export function looksLikePromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}
