import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";
import { sendEmail } from "./notify";

export const auth = betterAuth({
  appName: "متقن",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 60 * 30,
    revokeSessionsOnPasswordReset: true,
    // The link opens our own page, which submits the token with the new password.
    sendResetPassword: async ({ user, token }) => {
      await sendEmail(user.email, "إعادة تعيين كلمة المرور", "طلبت إعادة تعيين كلمة المرور. الرابط صالح لمدة 30 دقيقة. إذا ما طلبتها، تجاهل هذي الرسالة.", `/reset-password?token=${encodeURIComponent(token)}`);
    },
  },
  user: {
    additionalFields: {
      // never accepted from the client; set server-side only
      role: { type: "string", defaultValue: "buyer", input: false },
      phone: { type: "string", required: false, input: false },
      phoneVerified: { type: "boolean", defaultValue: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
  },
  // nextCookies must be the last plugin so server actions can set auth cookies
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
