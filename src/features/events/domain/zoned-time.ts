/**
 * Converts wall-clock times entered in an event's IANA zone into UTC instants for storage.
 * Pure: relies only on Intl, so it runs in tests and in the browser.
 */

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Offset of the zone from UTC at the given instant, in milliseconds. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? NaN);

  const wallClockAsUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute"),
    read("second"),
  );
  const instantWholeSeconds = Math.floor(instant.getTime() / 1000) * 1000;
  return wallClockAsUtc - instantWholeSeconds;
}

/**
 * Parses "YYYY-MM-DDTHH:mm" (or with seconds) as a wall-clock time in `timeZone`. Returns null for
 * malformed input, impossible dates such as February 30, or an unknown zone.
 */
export function zonedLocalToUtc(local: string, timeZone: string): Date | null {
  const match = LOCAL_DATE_TIME.exec(local.trim());
  if (!match || !isValidTimeZone(timeZone)) {
    return null;
  }

  const [year, month, day, hour, minute, second] = match.slice(1).map((part) => Number(part ?? 0));
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    return null;
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) {
    return null;
  }

  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  // Two passes settle the offset when the zone's offset differs between the guess and the answer.
  const firstGuess = wallClockAsUtc - zoneOffsetMs(new Date(wallClockAsUtc), timeZone);
  const corrected = wallClockAsUtc - zoneOffsetMs(new Date(firstGuess), timeZone);
  return new Date(corrected);
}
