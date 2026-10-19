import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "Email addresses can be up to 254 characters.")
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

const password = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use 128 characters or fewer.");

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(120, "Use 120 characters or fewer."),
    email,
    password,
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((accepted) => accepted, {
      message: "Accept the terms and privacy notice to continue.",
    }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });
export type RegisterInput = z.infer<typeof registerSchema>;
/** Form values before validation. The input and output types match because acceptTerms is a plain boolean. */
export type RegisterFormValues = z.input<typeof registerSchema>;

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "This reset link is incomplete. Request a new one."),
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Accepts only same-site relative paths, so a crafted `next` parameter cannot redirect members
 * to another domain.
 */
export function toSafeInternalPath(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}
