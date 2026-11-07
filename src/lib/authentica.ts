import "server-only";

export { normaliseSaudiPhone } from "./validation";

/**
 * Authentica (authentica.sa) — Saudi OTP via SMS/WhatsApp, plus Nafath.
 * Docs: base https://api.authentica.sa/api/v2, API key in X-Authorization header.
 * Optional: everything is disabled when AUTHENTICA_API_KEY is not set.
 */
const BASE = "https://api.authentica.sa/api/v2";

export function authenticaEnabled() {
  return Boolean(process.env.AUTHENTICA_API_KEY);
}

async function call(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Authorization": process.env.AUTHENTICA_API_KEY ?? "",
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; status?: boolean; message?: string };
  return { ok: res.ok, data };
}

export async function sendOtp(phone: string) {
  const { ok, data } = await call("/send-otp", { method: "sms", phone });
  return { ok: ok && data.success !== false, message: data.message };
}

export async function verifyOtp(phone: string, otp: string) {
  const { ok, data } = await call("/verify-otp", { phone, otp });
  // verify-otp returns `status` (not `success`)
  return { ok: ok && data.status === true, message: data.message };
}
