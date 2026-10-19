import "server-only";

import { createHash } from "node:crypto";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { SITE } from "@/constants/site";
import { provisionAlumniRecords } from "@/features/membership/services/provision.service";
import { syncMembershipForUser } from "@/features/membership/services/eligibility.service";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { sendEmailNow } from "@/lib/email/outbox";
import { renderEmail } from "@/lib/email/templates";

const env = getEnv();

const ONE_HOUR_SECONDS = 60 * 60;
const ONE_DAY_SECONDS = 24 * ONE_HOUR_SECONDS;
const TWO_WEEKS_SECONDS = 14 * ONE_DAY_SECONDS;

/** Stable, non-reversible key fragment so the raw single-use token is never stored in the outbox key. */
function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 32);
}

/**
 * Better Auth instance. Password hashing, session cookies and token handling come from the library;
 * this file only configures policy and integrates with the alumni domain.
 */
export const auth = betterAuth({
  appName: SITE.name,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: ONE_HOUR_SECONDS,
    sendResetPassword: async ({ user, url, token }) => {
      const content = renderEmail({
        heading: "Reset your password",
        paragraphs: ["We received a request to reset the password for your UPS Alumni Network account."],
        action: { label: "Choose a new password", url },
        footnote: "This link expires in one hour. If you did not ask for a reset, no change has been made.",
      });
      await sendEmailNow({
        to: user.email,
        subject: "Reset your UPS Alumni Network password",
        dedupeKey: `password-reset:${user.id}:${tokenDigest(token)}`,
        ...content,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: ONE_DAY_SECONDS,
    sendVerificationEmail: async ({ user, url, token }) => {
      const content = renderEmail({
        heading: "Verify your email address",
        paragraphs: [
          "Thank you for starting your UPS Alumni Network registration. Confirm your email address to continue.",
        ],
        action: { label: "Verify email", url },
        footnote: "This link expires in 24 hours. If you did not create an account, you can ignore this message.",
      });
      await sendEmailNow({
        to: user.email,
        subject: "Verify your UPS Alumni Network email",
        dedupeKey: `email-verification:${user.id}:${tokenDigest(token)}`,
        ...content,
      });
    },
    afterEmailVerification: async (user) => {
      await syncMembershipForUser(user.id);
    },
  },

  session: {
    expiresIn: TWO_WEEKS_SECONDS,
    updateAge: ONE_DAY_SECONDS,
  },

  /** Database-backed so limits hold across server instances. Stricter rules protect sign-in, sign-up and reset. */
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 600, max: 5 },
      "/request-password-reset": { window: 600, max: 3 },
      "/send-verification-email": { window: 600, max: 3 },
    },
  },

  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await provisionAlumniRecords(user.id);
        },
      },
    },
  },

  // Must remain the last plugin so cookies set inside Server Actions are applied.
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
