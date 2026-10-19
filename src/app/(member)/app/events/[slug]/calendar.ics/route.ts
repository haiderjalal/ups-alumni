import { getMemberEventDetail } from "@/features/events/services/event-query.service";
import { loadEventViewer } from "@/features/events/services/event-viewer.service";
import { buildEventIcs } from "@/features/events/domain/ics";
import { getCurrentUser, getMemberStatus } from "@/lib/session";

/** Personal download: never cached by shared caches or the browser's shared store. */
const PRIVATE_NO_STORE = "private, no-store";

interface CalendarRouteContext {
  params: Promise<{ slug: string }>;
}

function plainTextResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": PRIVATE_NO_STORE,
    },
  });
}

/**
 * Calendar file for one event. Serves only events the signed-in active member may see. The join link is
 * included only for people going to the event, as the event detail page does.
 */
export async function GET(_request: Request, context: CalendarRouteContext): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return plainTextResponse("Sign in to download this event.", 401);
  }

  const membership = await getMemberStatus(user.id);
  if (membership?.membershipStatus !== "ACTIVE") {
    return plainTextResponse("Event not found.", 404);
  }

  const { slug } = await context.params;
  const viewer = await loadEventViewer(user.id);
  const event = await getMemberEventDetail({ slug, viewer });
  if (!event) {
    return plainTextResponse("Event not found.", 404);
  }

  const calendarFile = buildEventIcs({
    uid: `${event.id}@ups-alumni`,
    stamp: event.updatedAt,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    summary: event.title,
    description: event.description,
    location: event.locationText,
    url: event.virtualUrl,
  });

  return new Response(calendarFile, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": PRIVATE_NO_STORE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
