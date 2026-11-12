import "server-only";
import { newId } from "./id";

/**
 * Payment boundary. Money is collected and held by a licensed payment provider, never by
 * Mutqen directly. Until a merchant account is connected (PAYMENT_PROVIDER + its keys),
 * payments run in test mode: no card is charged and every reference starts with TEST-.
 */
export const paymentsLive = () => Boolean(process.env.PAYMENT_PROVIDER && process.env.PAYMENT_SECRET_KEY);

export type PaymentMethod = "mada" | "applepay" | "card";

export async function holdPayment(input: { amount: number; method: PaymentMethod; orderId: string }) {
  if (paymentsLive()) {
    // The provider integration plugs in here (authorise now, capture on completion).
    throw new Error("Live payment provider is configured but not wired yet.");
  }
  return { ref: `TEST-${input.method.toUpperCase()}-${newId().slice(0, 8)}`, live: false };
}
