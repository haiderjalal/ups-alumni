import type { MetadataRoute } from "next";

import { ROUTES } from "@/constants/routes";
import { listPublicEvents } from "@/features/events/services/public-events.service";
import { listPublishedStories } from "@/features/stories/services/public-stories.service";

const STATIC_PUBLIC_ROUTES = [
  ROUTES.home,
  ROUTES.about,
  ROUTES.membership,
  ROUTES.events,
  ROUTES.stories,
  ROUTES.contact,
  ROUTES.faq,
  ROUTES.privacy,
  ROUTES.terms,
  ROUTES.refundPolicy,
] as const;

/** Public pages and published public content only. Member data never appears in the sitemap. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [events, stories] = await Promise.all([
    listPublicEvents({ upcoming: true, limit: 50 }),
    listPublishedStories(50),
  ]);

  return [
    ...STATIC_PUBLIC_ROUTES.map((route) => ({ url: new URL(route, siteUrl).toString() })),
    ...events.map((event) => ({ url: new URL(`${ROUTES.events}/${event.slug}`, siteUrl).toString() })),
    ...stories.map((story) => ({ url: new URL(`${ROUTES.stories}/${story.slug}`, siteUrl).toString() })),
  ];
}
