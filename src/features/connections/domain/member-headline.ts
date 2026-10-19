/**
 * Short professional line shown beside a member's name in connection and message views.
 * Built only from the public professional fields, never from contact details.
 */
export interface HeadlineSource {
  jobTitle: string | null;
  organization: string | null;
}

export function buildMemberHeadline(source: HeadlineSource): string | null {
  const title = source.jobTitle?.trim() ?? "";
  const organization = source.organization?.trim() ?? "";

  if (title && organization) {
    return `${title} at ${organization}`;
  }
  return title || organization || null;
}
