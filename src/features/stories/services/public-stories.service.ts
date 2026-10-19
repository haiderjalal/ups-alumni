import "server-only";

import { db } from "@/lib/db";

export interface PublicStorySummary {
  slug: string;
  title: string;
  publishedAt: Date;
  authorBatchYear: number | null;
}

export interface PublicStoryDetail extends PublicStorySummary {
  body: string;
}

const PUBLISHED_STORY_FILTER = {
  status: "PUBLISHED" as const,
  /** Publication needs its own explicit consent. Stories without it never appear, even if editors approved them. */
  publicConsentAt: { not: null },
};

function batchYearOf(author: { profile: { matricYear: number | null } | null }): number | null {
  return author.profile?.matricYear ?? null;
}

export async function listPublishedStories(limit: number): Promise<PublicStorySummary[]> {
  const rows = await db.story.findMany({
    where: PUBLISHED_STORY_FILTER,
    orderBy: { publishedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
    select: {
      slug: true,
      title: true,
      publishedAt: true,
      author: { select: { profile: { select: { matricYear: true } } } },
    },
  });

  return rows.flatMap((row) =>
    row.publishedAt ? [{ slug: row.slug, title: row.title, publishedAt: row.publishedAt, authorBatchYear: batchYearOf(row.author) }] : [],
  );
}

export async function getPublishedStoryBySlug(slug: string): Promise<PublicStoryDetail | null> {
  const row = await db.story.findFirst({
    where: { ...PUBLISHED_STORY_FILTER, slug },
    select: {
      slug: true,
      title: true,
      body: true,
      publishedAt: true,
      author: { select: { profile: { select: { matricYear: true } } } },
    },
  });

  if (!row?.publishedAt) {
    return null;
  }
  return {
    slug: row.slug,
    title: row.title,
    body: row.body,
    publishedAt: row.publishedAt,
    authorBatchYear: batchYearOf(row.author),
  };
}
