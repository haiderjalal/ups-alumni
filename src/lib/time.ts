import { SITE } from "@/constants/site";

/** Calendar year in the school's display zone. Matric-year validation uses this, not the server's zone. */
export function currentYearInZone(now: Date = new Date(), timeZone: string = SITE.defaultTimeZone): number {
  const formatted = new Intl.DateTimeFormat("en", { year: "numeric", timeZone }).format(now);
  return Number(formatted);
}

/** Formats a stored UTC instant for display in the school's zone, with the zone shown explicitly. */
export function formatDateTime(value: Date, timeZone: string = SITE.defaultTimeZone): string {
  return `${new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(value)} (${timeZone})`;
}

/** Date-only display, for fields such as payment dates that carry no time of day. */
export function formatDate(value: Date, timeZone: string = SITE.defaultTimeZone): string {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone }).format(value);
}
