import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { getPublishedStoryBySlug } from "@/features/stories/services/public-stories.service";
import { formatDate } from "@/lib/time";

export const revalidate = 300;

interface StoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await getPublishedStoryBySlug(slug);
  return story ? { title: story.title } : { title: "Story not found" };
}

export default async function StoryDetailPage({ params }: StoryPageProps) {
  const { slug } = await params;
  const story = await getPublishedStoryBySlug(slug);
  if (!story) {
    notFound();
  }

  return (
    <article className="py-16 md:py-24">
      <Container className="max-w-3xl space-y-10">
        <SectionHeading
          as="h1"
          eyebrow="Story"
          title={story.title}
          description={
            <p>
              {story.authorBatchYear ? `Batch ${story.authorBatchYear} · ` : ""}
              {formatDate(story.publishedAt)}
            </p>
          }
        />
        <div className="whitespace-pre-line text-lg leading-relaxed text-brand-muted">{story.body}</div>
      </Container>
    </article>
  );
}
