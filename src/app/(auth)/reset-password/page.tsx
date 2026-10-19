import type { Metadata } from "next";

import { ResetPasswordForm } from "@/features/auth/components/password-reset-forms";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.error ? null : (params.token ?? null);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl font-semibold">Choose a new password</h1>
        <p className="text-brand-muted">Use at least 12 characters. You will be asked to sign in again afterwards.</p>
      </header>
      <ResetPasswordForm token={token} />
    </div>
  );
}
