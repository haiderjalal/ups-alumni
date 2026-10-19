/**
 * Who may see a member's contact detail. Pure function, shared by the directory, profile pages,
 * connection views and any API response, so the rule is defined in one place.
 *
 * PRIVATE      -> the owner and staff with a membership role only (never other members)
 * CONNECTIONS  -> accepted connections of the owner, plus the owner and staff
 * MEMBERS      -> any active member, plus the owner and staff
 */

export type ContactVisibilityLevel = "PRIVATE" | "CONNECTIONS" | "MEMBERS";

export interface ContactViewer {
  viewerId: string | null;
  isActiveMember: boolean;
  isConnectedToOwner: boolean;
  /** True for staff who hold a membership-administration role. Set by the server from role assignments. */
  isMembershipStaff: boolean;
}

export function canViewContact(
  ownerId: string,
  visibility: ContactVisibilityLevel,
  viewer: ContactViewer,
): boolean {
  if (viewer.viewerId !== null && viewer.viewerId === ownerId) {
    return true;
  }
  if (viewer.isMembershipStaff) {
    return true;
  }
  if (viewer.viewerId === null) {
    return false;
  }
  switch (visibility) {
    case "PRIVATE":
      return false;
    case "CONNECTIONS":
      return viewer.isConnectedToOwner;
    case "MEMBERS":
      return viewer.isActiveMember;
  }
}

/** Keeps the directory's privacy rules in one place: an unlisted member is never discoverable, whatever the other flags say. */
export function isDiscoverable(profile: { directoryDiscoverable: boolean }, membershipActive: boolean): boolean {
  return profile.directoryDiscoverable && membershipActive;
}
