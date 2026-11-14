import "server-only";
import { newId } from "./id";

/**
 * Payment boundary. Money is collected and held by a licensed payment provider, never by
 * Mutqen directly. No provider is wired yet: every payment runs in test mode (no card is
 * charged, references start with TEST-), whatever keys are present, so adding a key early
 * cannot break checkout. Wiring a provider replaces holdPayment with: create the payment,
 * handle the return and webhook, refund on cancellation, and pay out after completion.
 */
export const PROVIDER_WIRED = false;

export const paymentsLive = () => PROVIDER_WIRED && Boolean(process.env.PAYMENT_PROVIDER && process.env.PAYMENT_SECRET_KEY);

export type PaymentMethod = "mada" | "applepay" | "card";

export async function holdPayment(input: { amount: number; method: PaymentMethod; orderId: string }) {
  return { ref: `TEST-${input.method.toUpperCase()}-${newId().slice(0, 8)}`, live: false };
}
