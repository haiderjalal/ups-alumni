/**
 * Who may see, register for and manage a member event. Pure: no framework or database imports.
 *
 * Callers must have already confirmed that the viewer is an ACTIVE member; these rules decide only
 * what an active member may see of an event.
 */

export type EventAudience = "PUBLIC" | "MEMBERS" | "BATCH";

export type EventPublicationStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";

export interface EventAccessTarget {
  status: EventPublicationStatus;
  visibility: EventAudience;
  /** Batch the event is limited to. Only used when visibility is BATCH. */
  batchId: string | null;
  organizerId: string;
}

export interface EventViewer {
  userId: string;
  /** Matric batch from AlumniProfile.batchId. */
  batchId: string | null;
  /** Staff role names held by the viewer. */
  roles: ReadonlyArray<string>;
}

/** Organizers and content moderators manage an event: they see drafts, the roster and attendance tools. */
export function canManageEvent(
  target: Pick<EventAccessTarget, "organizerId">,
  viewer: Pick<EventViewer, "userId" | "roles">,
): boolean {
  return target.organizerId === viewer.userId || viewer.roles.includes("CONTENT_MODERATOR");
}

/** Whether the audience setting admits this viewer. Does not consider status. */
export function isInAudience(target: Pick<EventAccessTarget, "visibility" | "batchId">, viewer: EventViewer): boolean {
  switch (target.visibility) {
    case "PUBLIC":
    case "MEMBERS":
      return true;
    case "BATCH":
      return viewer.batchId !== null && viewer.batchId === target.batchId;
  }
}

/** Members may register only for published events that their audience admits. */
export function canRegisterForEvent(target: EventAccessTarget, viewer: EventViewer): boolean {
  return target.status === "PUBLISHED" && isInAudience(target, viewer);
}

/** Managers see every status. Other members see published events their audience admits. */
export function canViewEvent(target: EventAccessTarget, viewer: EventViewer): boolean {
  if (canManageEvent(target, viewer)) {
    return true;
  }
  return canRegisterForEvent(target, viewer);
}

/** Virtual meeting links are shared with people going to the event and with its organizer, never with others. */
export function canSeeVirtualLink(
  target: Pick<EventAccessTarget, "organizerId">,
  viewer: Pick<EventViewer, "userId">,
  isGoing: boolean,
): boolean {
  return isGoing || target.organizerId === viewer.userId;
}
