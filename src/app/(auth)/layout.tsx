import Link from "next/link";

import { Container } from "@/components/shared/container";
import { Wordmark } from "@/components/layout/wordmark";
import { ROUTES } from "@/constants/routes";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-brand-ivory">
      <header className="border-b border-brand-border bg-brand-ivory">
        <Container className="flex h-20 items-center justify-between">
          <Wordmark />
          <Link href={ROUTES.home} className="text-sm font-semibold text-brand-deep underline underline-offset-4">
            Back to the site
          </Link>
        </Container>
      </header>
      <main id="main-content" className="py-12 md:py-20">
        <Container className="max-w-md">{children}</Container>
      </main>
    </div>
  );
}
