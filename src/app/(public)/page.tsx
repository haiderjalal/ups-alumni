import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, GraduationCap, Handshake, Briefcase, HeartHandshake } from "lucide-react";

import { BatchExplorer } from "@/components/home/batch-explorer";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { PhotoPlaceholder } from "@/components/shared/photo-placeholder";
import { SectionHeading } from "@/components/shared/section-heading";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { listListedBatchYears } from "@/features/batches/services/batch-catalog.service";
import { DEFAULT_FAQ } from "@/features/content/domain/defaults";
import { CONTENT_KEYS, faqDocumentSchema } from "@/features/content/domain/documents";
import { getPublishedDocument } from "@/features/content/services/content.service";
import { listPublicEvents } from "@/features/events/services/public-events.service";
import { getEffectiveRegistrationFee } from "@/features/payments/services/fee.service";
import { listPublishedStories } from "@/features/stories/services/public-stories.service";
import { formatRupees } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Different batches. Shared beginnings.",
  description:
    "Reconnect with your UPS classmates, discover alumni across professions, and create new opportunities together.",
};

export const revalidate = 300;

const BENEFITS = [
  {
    icon: GraduationCap,
    title: "Classmates across batches",
    text: "Find former students from your matric year and from the years around it.",
  },
  {
    icon: Briefcase,
    title: "Professional connections",
    text: "Connect with alumni in employment, business, freelancing and study.",
  },
  {
    icon: Handshake,
    title: "Alumni businesses and jobs",
    text: "Discover alumni-owned businesses, and share opportunities with people who can use them.",
  },
  {
    icon: HeartHandshake,
    title: "Mentorship and giving back",
    text: "Offer or ask for guidance, and take part in reunions and school initiatives.",
  },
] as const;

const STEPS = [
  "Create an account and verify your email.",
  "Complete your alumni profile and choose your privacy settings.",
  "Pay the one-time Rs. 500 registration fee by bank or wallet transfer.",
  "Receive confirmation of your payment and alumni review.",
] as const;

export default async function HomePage() {
  const [fee, batchYears, upcomingEvents, stories, faq] = await Promise.all([
    getEffectiveRegistrationFee(),
    listListedBatchYears(),
    listPublicEvents({ upcoming: true, limit: 3 }),
    listPublishedStories(3),
    getPublishedDocument(CONTENT_KEYS.faq, faqDocumentSchema, DEFAULT_FAQ),
  ]);

  const feeLabel = formatRupees(fee.amountMinor);
  const previewFaq = faq.items.slice(0, 3);

  return (
    <>
      <section className="relative overflow-hidden border-b border-brand-border">
        <Container className="grid gap-12 py-14 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-24">
          <div className="space-y-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-gold-text">{SITE.contextLine}</p>
            <h1 className="font-display text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-[4.5rem]">
              Different batches. Shared beginnings.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-brand-muted">
              Reconnect with your UPS classmates, discover alumni across professions, and create new opportunities
              together.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" render={<Link href={ROUTES.register} />}>
                Join for {feeLabel}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
              <Button size="lg" variant="outline" render={<Link href={ROUTES.about} />}>
                Explore the Community
              </Button>
            </div>
          </div>
          <PhotoPlaceholder
            label="Approved campus and reunion photography will appear here."
            className="aspect-[4/5] w-full max-w-md justify-self-center md:justify-self-end"
          />
        </Container>
      </section>

      <section aria-labelledby="about-heading" className="py-20">
        <Container className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            as="h2"
            eyebrow="About the school"
            title="A school community that keeps growing"
            description={<p>{SITE.schoolName} is part of the {SITE.contextLine} context. This network is run by alumni to keep former students connected.</p>}
          />
          <div className="space-y-5 text-lg leading-relaxed text-brand-muted">
            <p>
              Whether you are employed, running a business, freelancing, still studying or looking for your next
              opportunity, the network is built for every stage of your career.
            </p>
            <p>
              <Link href={ROUTES.about} className="font-semibold text-brand-deep underline decoration-brand-gold underline-offset-4">
                Read more about the community
              </Link>
            </p>
          </div>
        </Container>
      </section>

      <section aria-labelledby="batches-heading" className="bg-brand-sage/60 py-20">
        <Container className="space-y-10">
          <SectionHeading
            as="h2"
            eyebrow="Find your batch"
            title="Start with the year you completed Class 10"
            description="Batches group former students by matric completion year. Member details are private: sign in to see who else is in your batch."
          />
          <BatchExplorer years={batchYears} />
        </Container>
      </section>

      <section aria-labelledby="benefits-heading" className="py-20">
        <Container className="space-y-12">
          <SectionHeading
            as="h2"
            eyebrow="Membership"
            title="What the network is for"
          />
          <ul className="grid gap-x-10 gap-y-12 md:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit.title} className="flex gap-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-deep">
                  <benefit.icon aria-hidden="true" className="size-6" />
                </span>
                <div className="space-y-2">
                  <h3 className="font-display text-2xl font-semibold">{benefit.title}</h3>
                  <p className="leading-relaxed text-brand-muted">{benefit.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {upcomingEvents.length > 0 || stories.length > 0 ? (
        <section aria-labelledby="spotlight-heading" className="bg-brand-surface py-20">
          <Container className="space-y-12">
            <SectionHeading as="h2" eyebrow="Happening now" title="Events and stories" />
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-display text-2xl font-semibold">Upcoming events</h3>
                <ul className="divide-y divide-brand-border border-y border-brand-border">
                  {upcomingEvents.map((event) => (
                    <li key={event.slug}>
                      <Link
                        href={`${ROUTES.events}/${event.slug}`}
                        className="flex flex-col gap-1 py-5 transition-colors duration-200 hover:text-brand-deep sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-semibold">{event.title}</span>
                        <span className="text-sm text-brand-muted">{formatDateTime(event.startsAt, event.timezone)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {stories.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                {stories.map((story) => (
                  <Link
                    key={story.slug}
                    href={`${ROUTES.stories}/${story.slug}`}
                    className="group space-y-3 rounded-2xl border border-brand-border bg-brand-ivory p-6 transition-colors duration-200 hover:border-brand-deep"
                  >
                    <h3 className="font-display text-2xl font-semibold group-hover:text-brand-deep">{story.title}</h3>
                    <p className="text-sm text-brand-muted">
                      {story.authorBatchYear ? `Batch ${story.authorBatchYear}` : "An alumnus"}
                    </p>
                  </Link>
                ))}
              </div>
            ) : null}
          </Container>
        </section>
      ) : null}

      <section aria-labelledby="process-heading" className="py-20">
        <Container className="grid gap-12 md:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading as="h2" eyebrow="How to join" title="Four steps to your membership" />
          <ol className="space-y-6">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-4 border-b border-brand-border pb-6">
                <span className="font-display text-3xl font-semibold text-brand-gold-text">{index + 1}</span>
                <p className="pt-1 text-lg leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="fee-heading" className="py-20">
        <Container className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5 rounded-[1.25rem] bg-brand-deep p-8 text-white md:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/75">Registration fee</p>
            <h2 id="fee-heading" className="font-display text-5xl font-semibold">
              {feeLabel}
            </h2>
            <p className="text-white/85">
              A one-time payment with no recurring subscription. You pay by bank or wallet transfer, and a finance
              reviewer confirms it against the receiving-account statement.
            </p>
            <Button variant="secondary" size="lg" render={<Link href={ROUTES.membership} />}>
              See membership details
            </Button>
          </div>
          <div className="space-y-6">
            <h2 className="font-display text-3xl font-semibold">Common questions</h2>
            <dl className="space-y-6">
              {previewFaq.map((item) => (
                <div key={item.question} className="space-y-2">
                  <dt className="font-semibold">{item.question}</dt>
                  <dd className="leading-relaxed text-brand-muted">{item.answer}</dd>
                </div>
              ))}
            </dl>
            <Link href={ROUTES.faq} className="inline-flex font-semibold text-brand-deep underline decoration-brand-gold underline-offset-4">
              All questions
            </Link>
          </div>
        </Container>
      </section>

      <section aria-labelledby="invite-heading" className="pb-24">
        <Container>
          <div className="flex flex-col items-start gap-6 rounded-[1.25rem] border border-brand-border bg-brand-surface p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div className="space-y-3">
              <h2 id="invite-heading" className="font-display text-4xl font-semibold">
                Be part of the founding community
              </h2>
              <p className="flex items-center gap-2 text-brand-muted">
                <CheckCircle2 aria-hidden="true" className="size-5 text-brand-success" />
                {SITE.verificationLabel}. {SITE.governanceLabel}.
              </p>
            </div>
            <Button size="lg" render={<Link href={ROUTES.register} />}>
              Join the Network
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
