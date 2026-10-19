/**
 * Event slugs are readable URL paths built from the title, plus a random suffix that keeps them unique.
 * Pure: the caller supplies the suffix, so tests stay deterministic.
 */

const MAX_TITLE_SLUG_LENGTH = 60;
const FALLBACK_SLUG = "event";

export function slugifyEventTitle(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_TITLE_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return slug || FALLBACK_SLUG;
}

/** The suffix must be lowercase letters and digits, for example eight characters from randomBytes(4). */
export function buildEventSlug(title: string, suffix: string): string {
  if (!/^[a-z0-9]{6,16}$/.test(suffix)) {
    throw new Error("Event slug suffix must be 6 to 16 lowercase letters or digits.");
  }
  return `${slugifyEventTitle(title)}-${suffix}`;
}
