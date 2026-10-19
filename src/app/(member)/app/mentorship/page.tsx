import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { PaginationLinks } from "@/features/businesses/components/pagination-links";
import { MentorCard } from "@/features/mentorship/components/mentor-card";
import { MentorSearchForm } from "@/features/mentorship/components/mentor-search-form";
import { NO_SCHEDULING_NOTICE } from "@/features/mentorship/constants";
import { searchActiveMentors } from "@/features/mentorship/services/mentor-directory.service";
import { parseMentorSearchQuery } from "@/features/mentorship/validation/mentorship.schema";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = {
  title: "Mentorship",
  robots: { index: false, follow: false },
};

interface MentorshipPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MentorshipPage({
  searchParams,
}: MentorshipPageProps) {
  const user = await requireActiveMember();
  const query = parseMentorSearchQuery(await searchParams);
  const result = await searchActiveMentors(user.id, query);

  const hasSearch = Boolean(query.topic || query.q);
  const pageQuery: Record<string, string> = {};
  if (query.topic) pageQuery.topic = query.topic;
  if (query.q) pageQuery.q = query.q;

  return (
    <section className="py-10 md:py-14">
      <Container className="space-y-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            as="h1"
            eyebrow="Members"
            title="Mentorship"
            description={
              <p>
                Find an alumnus who can guide you, or offer your own experience
                to other members.
              </p>
            }
          />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              render={<Link href={`${ROUTES.appMentorship}/profile`} />}
            >
              Offer mentorship
            </Button>
            <Button
              variant="outline"
              render={<Link href={`${ROUTES.appMentorship}/requests`} />}
            >
              Your requests
            </Button>
          </div>
        </div>

        <p className="rounded-xl bg-brand-sage px-4 py-3 text-sm leading-relaxed text-brand-ink">
          {NO_SCHEDULING_NOTICE}
        </p>

        <MentorSearchForm topic={query.topic} q={query.q} />

        {result.total === 0 ? (
          <EmptyState
            title={
              hasSearch
                ? "No mentors match this search"
                : "No mentors available yet"
            }
            description={
              hasSearch
                ? "Try a broader topic or clear the search."
                : "Mentors appear here once they turn on their profile. You can offer mentorship yourself from the profile page."
            }
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((mentor) => (
              <li key={mentor.profileId}>
                <MentorCard mentor={mentor} />
              </li>
            ))}
          </ul>
        )}

        <PaginationLinks
          basePath={ROUTES.appMentorship}
          query={pageQuery}
          page={result.page}
          pageCount={result.pageCount}
        />
      </Container>
    </section>
  );
}
