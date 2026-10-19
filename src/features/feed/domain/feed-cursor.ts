/**
 * Feed pagination uses the creation time of the oldest post on the current page as the cursor.
 * Only canonical UTC timestamps are accepted, so a hand-edited URL cannot shape the query.
 */

const ISO_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

export function parseFeedCursor(value: string | undefined): Date | null {
  if (!value || !ISO_UTC_TIMESTAMP.test(value)) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
