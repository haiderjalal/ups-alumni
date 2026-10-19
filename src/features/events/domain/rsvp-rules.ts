/**
 * RSVP capacity, deadline and waitlist rules. This module is pure: the RSVP service calls these
 * functions inside the transaction that holds the event row lock, so `goingCount` is read under the lock.
 */

export type RsvpRejectReason = "DEADLINE_PASSED";

export type RsvpDecision =
  | { outcome: "GOING" }
  | { outcome: "WAITLIST" }
  | { outcome: "REJECT"; reason: RsvpRejectReason };

export interface RsvpDecisionInput {
  /** null means unlimited capacity. */
  capacity: number | null;
  /** Registrations currently in GOING status for the event. */
  goingCount: number;
  /** Effective deadline, as returned by effectiveRsvpDeadline. */
  deadline: Date;
  now: Date;
}

/**
 * Refuses RSVPs after the deadline. Before the deadline, a member gets a seat while one is free and
 * joins the waitlist once the event is full. Exactly at the deadline, RSVPs are still accepted.
 */
export function decideRsvp(input: RsvpDecisionInput): RsvpDecision {
  if (input.now.getTime() > input.deadline.getTime()) {
    return { outcome: "REJECT", reason: "DEADLINE_PASSED" };
  }
  if (input.capacity === null || input.goingCount < input.capacity) {
    return { outcome: "GOING" };
  }
  return { outcome: "WAITLIST" };
}

/**
 * When an organizer sets no RSVP deadline, registration closes when the event starts.
 * This default is a product decision that should be confirmed with the organizers.
 */
export function effectiveRsvpDeadline(rsvpDeadline: Date | null, startsAt: Date): Date {
  return rsvpDeadline ?? startsAt;
}

/** What the RSVP control offers the viewer. CLOSED means registration is over; UNAVAILABLE means the event is not open. */
export type RsvpPrompt = "CANCEL" | "JOIN" | "JOIN_WAITLIST" | "CLOSED" | "UNAVAILABLE";

export interface RsvpPromptInput {
  /** Event is published and the viewer's audience admits them. */
  eventOpen: boolean;
  viewerStatus: "GOING" | "WAITLISTED" | null;
  capacity: number | null;
  goingCount: number;
  deadline: Date;
  now: Date;
}

/** Chooses the RSVP control for a viewer. An existing registration can always be cancelled. */
export function rsvpPrompt(input: RsvpPromptInput): RsvpPrompt {
  if (input.viewerStatus !== null) {
    return "CANCEL";
  }
  if (!input.eventOpen) {
    return "UNAVAILABLE";
  }
  const decision = decideRsvp(input);
  if (decision.outcome === "REJECT") {
    return "CLOSED";
  }
  return decision.outcome === "GOING" ? "JOIN" : "JOIN_WAITLIST";
}

export interface PromotionInput {
  capacity: number | null;
  goingCount: number;
  /** Waitlisted user ids in queue order (earliest waitlistedAt first). */
  queue: readonly string[];
}

/**
 * Returns the waitlisted users to promote after one or more seats are freed, in queue order.
 * Never promotes beyond capacity, so a lowered capacity does not evict members.
 */
export function selectPromotions(input: PromotionInput): string[] {
  if (input.capacity === null) {
    return [...input.queue];
  }
  const freeSeats = Math.max(0, input.capacity - input.goingCount);
  return input.queue.slice(0, freeSeats);
}
