import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Access not available",
  robots: { index: false, follow: false },
};

export default function AccessDeniedPage() {
  return (
    <section className="py-24">
      <Container className="max-w-xl space-y-6">
        <h1 className="font-display text-4xl font-semibold">This area is not available to your account</h1>
        <p className="text-brand-muted">
          Member and staff areas are limited to people with the right membership status or role. If you think this is
          a mistake, contact the network team from the contact page.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button render={<Link href={ROUTES.app} />}>Go to your dashboard</Button>
          <Button variant="outline" render={<Link href={ROUTES.contact} />}>
            Contact the team
          </Button>
        </div>
      </Container>
    </section>
  );
}
