/**
 * Publication transitions for member events. DRAFT is the only state that can be published, and a
 * cancelled event stays cancelled. Registrations are kept when an event is cancelled, so the roster
 * remains an accurate record.
 */

import type { EventPublicationStatus } from "./event-visibility";

const EVENT_STATUS_TRANSITIONS: Readonly<Record<EventPublicationStatus, readonly EventPublicationStatus[]>> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["CANCELLED"],
  CANCELLED: [],
};

export function canTransitionEventStatus(from: EventPublicationStatus, to: EventPublicationStatus): boolean {
  return EVENT_STATUS_TRANSITIONS[from].includes(to);
}
