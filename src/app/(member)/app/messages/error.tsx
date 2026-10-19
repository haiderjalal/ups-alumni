"use client";

import Link from "next/link";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

interface MessagesErrorProps {
  reset: () => void;
}

/** Shows no internal detail. The digest and stack stay in the server logs. */
export default function MessagesError({ reset }: MessagesErrorProps) {
  return (
    <Container className="py-16">
      <div role="alert" className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="font-display text-3xl font-semibold">We could not load your messages</h1>
        <p className="text-brand-muted">
          Please try again. If the problem continues, <Link href={ROUTES.contact} className="font-semibold text-brand-deep underline underline-offset-4">contact the alumni office</Link>.
        </p>
        <Button type="button" size="lg" onClick={reset}>
          Try again
        </Button>
      </div>
    </Container>
  );
}
