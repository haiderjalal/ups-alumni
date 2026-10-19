/**
 * Who may read or write a direct conversation. A conversation is open only while both members are active,
 * they hold an accepted connection, and neither has blocked the other.
 */
export interface MessagingAccessFacts {
  viewerActive: boolean;
  otherActive: boolean;
  connected: boolean;
  blocked: boolean;
}

export type MessagingDenial = "VIEWER_INACTIVE" | "MEMBER_UNAVAILABLE" | "NOT_CONNECTED" | "BLOCKED";

/**
 * Returns the first reason access is refused, or null when messaging is allowed. Callers that talk to users
 * must show BLOCKED and NOT_CONNECTED with the same generic wording, so the blocked party cannot learn of the block.
 */
export function evaluateMessagingAccess(facts: MessagingAccessFacts): MessagingDenial | null {
  if (!facts.viewerActive) {
    return "VIEWER_INACTIVE";
  }
  if (!facts.otherActive) {
    return "MEMBER_UNAVAILABLE";
  }
  if (facts.blocked) {
    return "BLOCKED";
  }
  if (!facts.connected) {
    return "NOT_CONNECTED";
  }
  return null;
}
