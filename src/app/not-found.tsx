import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section className="py-24">
      <Container className="max-w-xl space-y-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-gold-text">Error 404</p>
        <h1 className="font-display text-5xl font-semibold">This page could not be found</h1>
        <p className="text-brand-muted">The link may be out of date, or the page may have been moved.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button render={<Link href={ROUTES.home} />}>Back to home</Button>
          <Button variant="outline" render={<Link href={ROUTES.events} />}>
            See events
          </Button>
        </div>
      </Container>
    </section>
  );
}
