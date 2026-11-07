import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

export type Role = "buyer" | "seller" | "admin";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  phoneVerified: boolean;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const h = await headers();
  const s = await auth.api.getSession({ headers: h });
  if (!s) return null;
  const u = s.user as typeof s.user & { role?: string; phone?: string | null; phoneVerified?: boolean };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role as Role) ?? "buyer",
    phone: u.phone ?? null,
    phoneVerified: Boolean(u.phoneVerified),
  };
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return u;
}

export async function requireRole(role: Role | Role[], next?: string): Promise<CurrentUser> {
  const u = await requireUser(next);
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(u.role)) redirect("/dashboard");
  return u;
}
