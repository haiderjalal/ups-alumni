import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/features/auth/components/register-form";
import { getCurrentUser } from "@/lib/session";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create an account to start your UPS alumni registration.",
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(ROUTES.app);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl font-semibold">Create your account</h1>
        <p className="text-brand-muted">
          You can save your progress and come back at any time. Your membership is activated after your email is
          verified, your application is approved and your fee is confirmed.
        </p>
      </header>
      <RegisterForm />
      <p className="text-sm text-brand-muted">
        Already registered?{" "}
        <Link href={ROUTES.login} className="font-semibold text-brand-deep underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
