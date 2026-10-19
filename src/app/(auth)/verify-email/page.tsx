import type { Metadata } from "next";
import Link from "next/link";

import { ResendVerificationForm } from "@/features/auth/components/password-reset-forms";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl font-semibold">Check your inbox</h1>
        <p className="text-brand-muted">
          We sent a verification link to the address you registered with. Open it on this device to continue. The link
          expires in 24 hours.
        </p>
      </header>
      <section aria-labelledby="resend-heading" className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
        <h2 id="resend-heading" className="font-display text-2xl font-semibold">
          Didn&apos;t receive it?
        </h2>
        <p className="text-sm text-brand-muted">Check your spam folder first. You can request a new link below.</p>
        <ResendVerificationForm />
      </section>
      <p className="text-sm text-brand-muted">
        Verified already?{" "}
        <Link href={ROUTES.login} className="font-semibold text-brand-deep underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
