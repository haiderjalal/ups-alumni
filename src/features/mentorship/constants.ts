import type { PreferredFormat } from "./domain/mentorship-rules";

export const PREFERRED_FORMAT_LABELS: Record<PreferredFormat, string> = {
  ONLINE: "Online (you arrange the call)",
  PHONE: "Phone call",
  IN_PERSON: "In person",
};

export const MENTORSHIP_PAGE_SIZE = 12;

/** Shown wherever scheduling is described, so members never expect a booking tool that does not exist. */
export const NO_SCHEDULING_NOTICE =
  "This site does not include a calendar or video call integration. Mentors and mentees agree on times and channels directly.";
