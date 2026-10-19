"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { ROUTES } from "@/constants/routes";
import { log } from "@/lib/logger";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import {
  type RegisterFormValues,
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
  signInSchema,
  toSafeInternalPath,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type SignInInput,
} from "../validation/auth.schema";

/** Shown for every sign-in failure so responses never reveal whether an email is registered. */
const GENERIC_SIGN_IN_ERROR = "Email or password is incorrect.";

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/**
 * Creates an account through Better Auth. The library hashes the password, creates the session policy and
 * sends the verification email; our hooks provision the alumni records. Duplicate emails get a generic
 * message so account existence cannot be probed.
 */
export async function registerAction(input: RegisterFormValues): Promise<ActionResult<{ email: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please correct the highlighted fields.", fieldErrorsFrom(parsed.error.issues));
  }

  try {
    await auth.api.signUpEmail({
      body: {
        name: parsed.data.fullName,
        email: parsed.data.email,
        password: parsed.data.password,
        callbackURL: ROUTES.appOnboarding,
      },
      headers: await headers(),
    });
    return actionOk({ email: parsed.data.email });
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 429) {
      return actionError("Too many attempts. Wait a few minutes and try again.");
    }
    if (error instanceof APIError && error.statusCode < 500) {
      return actionError(
        "We could not create that account. If you already registered, sign in or reset your password.",
      );
    }
    log("error", "auth.register_failed");
    return actionError("We could not create your account right now. Please try again shortly.");
  }
}

export async function signInAction(
  input: SignInInput & { next?: string },
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please correct the highlighted fields.", fieldErrorsFrom(parsed.error.issues));
  }

  try {
    await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    });
    return actionOk({ redirectTo: toSafeInternalPath(input.next, ROUTES.app) });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "EMAIL_NOT_VERIFIED") {
      return actionError("Verify your email address before signing in. We have sent a fresh link if needed.");
    }
    if (error instanceof APIError && error.statusCode === 429) {
      return actionError("Too many sign-in attempts. Wait a few minutes and try again.");
    }
    if (error instanceof APIError && error.statusCode >= 500) {
      log("error", "auth.sign_in_failed");
      return actionError("Sign-in is unavailable right now. Please try again shortly.");
    }
    return actionError(GENERIC_SIGN_IN_ERROR);
  }
}

/** Always reports success for well-formed emails, so responses do not reveal which addresses are registered. */
export async function requestPasswordResetAction(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please correct the highlighted fields.", fieldErrorsFrom(parsed.error.issues));
  }

  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data.email, redirectTo: ROUTES.resetPassword },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 429) {
      return actionError("Too many reset requests. Wait a few minutes and try again.");
    }
    log("error", "auth.password_reset_request_failed");
  }
  return actionOk();
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please correct the highlighted fields.", fieldErrorsFrom(parsed.error.issues));
  }

  try {
    await auth.api.resetPassword({
      body: { newPassword: parsed.data.password, token: parsed.data.token },
      headers: await headers(),
    });
    return actionOk();
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 429) {
      return actionError("Too many attempts. Wait a few minutes and try again.");
    }
    return actionError("This reset link has expired or was already used. Request a new one.");
  }
}

export async function resendVerificationAction(input: { email: string }): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Enter the email address you registered with.");
  }

  try {
    await auth.api.sendVerificationEmail({
      body: { email: parsed.data.email, callbackURL: ROUTES.appOnboarding },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 429) {
      return actionError("A link was sent recently. Check your inbox, or wait before requesting another.");
    }
    log("error", "auth.resend_verification_failed");
  }
  return actionOk();
}

export async function signOutAction(): Promise<ActionResult> {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (error) {
    log("error", "auth.sign_out_failed", { error });
    return actionError("We could not sign you out. Close the browser and try again.");
  }
  return actionOk();
}
