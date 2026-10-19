/**
 * Builds RFC 5545 iCalendar documents for member events. Pure: no framework or database imports.
 *
 * Times are written in UTC (the trailing Z), so the file needs no VTIMEZONE block and calendar apps
 * convert them to the viewer's zone.
 */

const MAX_LINE_OCTETS = 75;

/**
 * Escapes TEXT property values (RFC 5545 section 3.3.11). Backslashes go first so the escapes added
 * for the other characters are not escaped twice.
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Folds a content line so that no physical line exceeds 75 octets (RFC 5545 section 3.1). Continuation
 * lines begin with one space, which counts toward their 75 octets. Characters are never split.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let current = "";
  let currentOctets = 0;
  let limit = MAX_LINE_OCTETS;

  for (const character of line) {
    const octets = encoder.encode(character).length;
    if (currentOctets + octets > limit) {
      lines.push(current);
      current = character;
      currentOctets = octets;
      limit = MAX_LINE_OCTETS - 1;
    } else {
      current += character;
      currentOctets += octets;
    }
  }
  lines.push(current);

  return lines.join("\r\n ");
}

/** UTC form required for DATE-TIME values, for example 20261105T130000Z. */
export function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export interface IcsEventInput {
  /** Globally unique and stable for the event. */
  uid: string;
  /** Last modification time, written to DTSTAMP. */
  stamp: Date;
  startsAt: Date;
  endsAt: Date | null;
  summary: string;
  description: string;
  location: string | null;
  /** Included only for people who may join the event. */
  url: string | null;
}

export function buildEventIcs(input: IcsEventInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UPS Alumni Network//Member Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(input.uid)}`,
    `DTSTAMP:${formatIcsUtc(input.stamp)}`,
    `DTSTART:${formatIcsUtc(input.startsAt)}`,
    ...(input.endsAt ? [`DTEND:${formatIcsUtc(input.endsAt)}`] : []),
    `SUMMARY:${escapeIcsText(input.summary)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    ...(input.location ? [`LOCATION:${escapeIcsText(input.location)}`] : []),
    ...(input.url ? [`URL:${input.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
