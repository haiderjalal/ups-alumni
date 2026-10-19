import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { listPublishedStories } from "@/features/stories/services/public-stories.service";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Stories",
  description: "Editorially reviewed stories from UPS alumni, shared with consent.",
};
export const revalidate = 300;

export default async function StoriesPage() {
  const stories = await listPublishedStories(24);

  return (
    <section className="py-16 md:py-24">
      <Container className="space-y-12">
        <SectionHeading
          as="h1"
          eyebrow="Stories"
          title="Alumni stories"
          description="Every story is reviewed by the community team and published only with the author's explicit consent."
        />
        {stories.length === 0 ? (
          <EmptyState
            title="No stories have been published yet"
            description="Members can submit a story from their dashboard. Stories appear here after review and consent."
            action={<Button render={<Link href={ROUTES.register} />}>Join the Network</Button>}
          />
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {stories.map((story) => (
              <li key={story.slug}>
                <Link
                  href={`${ROUTES.stories}/${story.slug}`}
                  className="block h-full space-y-3 rounded-2xl border border-brand-border bg-brand-surface p-7 transition-colors duration-200 hover:border-brand-deep"
                >
                  <h2 className="font-display text-3xl font-semibold">{story.title}</h2>
                  <p className="text-sm text-brand-muted">
                    {story.authorBatchYear ? `Batch ${story.authorBatchYear} · ` : ""}
                    {formatDate(story.publishedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
