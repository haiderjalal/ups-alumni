import type { Metadata } from "next";
import Link from "next/link";

import { SectionHeading } from "@/components/shared/section-heading";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { getEffectiveRegistrationFee } from "@/features/payments/services/fee.service";
import { formatRupees } from "@/lib/money";

export const metadata: Metadata = {
  title: "Membership",
  description: "Eligibility, the one-time registration fee and how membership is approved.",
};

export const revalidate = 300;

const ELIGIBILITY = [
  "You studied at University Public School, and you can tell us the matric year you completed.",
  "You can verify your email address and keep your sign-in details private.",
  "You provide accurate information in your alumni profile.",
];

const PROCESS = [
  "Create an account and verify your email address.",
  "Complete your alumni profile: school details, current work or study, and privacy choices.",
  "Review your details and transfer the registration fee to a receiving account shown in your payment step.",
  "Upload your transfer receipt and quote your order reference. A finance reviewer confirms the payment.",
  "An alumni reviewer checks your application. Membership activates when your email, application and payment are all confirmed.",
];

export default async function MembershipPage() {
  const fee = await getEffectiveRegistrationFee();

  return (
    <>
      <section className="border-b border-brand-border py-16 md:py-24">
        <Container className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <SectionHeading
            as="h1"
            eyebrow="Membership"
            title="Join the network"
            description={
              <p>
                Membership is open to former {SITE.schoolName} students. It is a one-time registration fee, not a
                subscription.
              </p>
            }
          />
          <div className="rounded-[1.25rem] bg-brand-deep p-8 text-white">
            <p className="text-sm uppercase tracking-[0.14em] text-white/75">One-time fee</p>
            <p className="mt-2 font-display text-6xl font-semibold">{formatRupees(fee.amountMinor)}</p>
            <p className="mt-4 text-white/85">No recurring renewal. Paid manually by bank or wallet transfer.</p>
            <Button className="mt-8" size="lg" variant="secondary" render={<Link href={ROUTES.register} />}>
              Join for {formatRupees(fee.amountMinor)}
            </Button>
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container className="grid gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <h2 className="font-display text-3xl font-semibold">Who can join</h2>
            <ul className="space-y-4">
              {ELIGIBILITY.map((item) => (
                <li key={item} className="border-l-2 border-brand-vermilion pl-5 text-lg leading-relaxed text-brand-muted">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-6">
            <h2 className="font-display text-3xl font-semibold">How it works</h2>
            <ol className="space-y-4">
              {PROCESS.map((item, index) => (
                <li key={item} className="flex gap-4">
                  <span className="font-display text-2xl font-semibold text-brand-violet">{index + 1}</span>
                  <p className="pt-0.5 leading-relaxed text-brand-muted">{item}</p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container className="space-y-6">
          <h2 className="font-display text-3xl font-semibold">Payment and review</h2>
          <p className="max-w-3xl text-lg leading-relaxed text-brand-muted">
            Payment confirmation and alumni approval are separate checks. Uploading a receipt does not activate your
            membership on its own. The school will publish review timelines before live collections begin. Read the{" "}
            <Link href={ROUTES.refundPolicy} className="font-semibold text-brand-deep underline decoration-brand-vermilion underline-offset-4">
              refund policy
            </Link>{" "}
            before you pay.
          </p>
        </Container>
      </section>
    </>
  );
}
