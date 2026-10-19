import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormAlert } from "@/components/shared/form-alert";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { toSafeInternalPath } from "@/features/auth/validation/auth.schema";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; reset?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = toSafeInternalPath(params.next, ROUTES.app);

  const user = await getCurrentUser();
  if (user) {
    redirect(next);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="font-display text-4xl font-semibold">Sign in</h1>
        <p className="text-brand-muted">Welcome back. Sign in to continue your registration or open the network.</p>
      </header>
      {params.reset === "done" ? (
        <FormAlert tone="success" message="Your password has been changed. Sign in with the new password." />
      ) : null}
      <SignInForm next={next} />
    </div>
  );
}
