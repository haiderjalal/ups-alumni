import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/password-reset-forms";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl font-semibold">Reset your password</h1>
        <p className="text-brand-muted">Enter the email address on your account and we will send a reset link.</p>
      </header>
      <ForgotPasswordForm />
    </div>
  );
}
