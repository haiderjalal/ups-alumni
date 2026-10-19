import type { Metadata } from "next";
import Link from "next/link";

import { PhotoPlaceholder } from "@/components/shared/photo-placeholder";
import { SectionHeading } from "@/components/shared/section-heading";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

export const metadata: Metadata = {
  title: "About",
  description: `About the UPS Alumni Network for former ${SITE.schoolName} students, ${SITE.contextLine}.`,
};

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-brand-border py-16 md:py-24">
        <Container className="grid gap-12 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <SectionHeading
            as="h1"
            eyebrow={SITE.contextLine}
            title="About the community"
            description={
              <p>
                The UPS Alumni Network connects former students of {SITE.schoolName}. It is an alumni-led community.
                Institutional endorsement is shown only when the school confirms it.
              </p>
            }
          />
          <PhotoPlaceholder label="School photography will be added once approved." className="aspect-[4/3] w-full" />
        </Container>
      </section>

      <section className="py-20">
        <Container className="grid gap-12 md:grid-cols-2">
          <div className="space-y-5">
            <h2 className="font-display text-3xl font-semibold">About the school</h2>
            <p className="text-lg leading-relaxed text-brand-muted">
              {SITE.schoolName} is the school of the University of Malakand&apos;s University Public School and College,
              on the university&apos;s Chakdara campus. Details of the school&apos;s history, leadership and recognitions will
              be published here once the school confirms them.
            </p>
            <p className="text-sm text-brand-muted">
              Source: University of Malakand, University Public School and College.
            </p>
          </div>
          <div className="space-y-5">
            <h2 className="font-display text-3xl font-semibold">Why the network exists</h2>
            <p className="text-lg leading-relaxed text-brand-muted">
              Former students scatter across cities, countries and careers. The network helps you find classmates from
              your batch and from other years, share opportunities, mentor younger alumni, and plan reunions.
            </p>
            <p className="text-lg leading-relaxed text-brand-muted">
              Governance: <span className="font-semibold text-brand-ink">{SITE.governanceLabel}</span>. Alumni status is{" "}
              {SITE.verificationLabel.toLowerCase()}. Institutional endorsement is shown only when the school confirms it.
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="flex flex-col items-start gap-6 rounded-[1.25rem] bg-brand-deep p-8 text-white md:flex-row md:items-center md:justify-between md:p-12">
            <h2 className="font-display text-4xl font-semibold">Ready to reconnect?</h2>
            <Button size="lg" variant="secondary" render={<Link href={ROUTES.membership} />}>
              See how to join
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
