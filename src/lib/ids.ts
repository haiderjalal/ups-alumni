import { randomBytes } from "node:crypto";

/** Non-sequential, URL-safe identifier with roughly 96 bits of entropy. Used for public member and card ids. */
export function createPublicId(): string {
  return randomBytes(12).toString("base64url");
}

/** Crockford base32 alphabet: no I, L, O or U, so references read unambiguously aloud and in print. */
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Payment reference quoted in the transfer narration, for example UPS-7K2M9QXD. */
export function createOrderReference(): string {
  const bytes = randomBytes(8);
  let body = "";
  for (const byte of bytes) {
    body += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  }
  return `UPS-${body}`;
}

/** Normalizes a reference typed by a payer or reviewer so that comparisons ignore case, spaces and punctuation. */
export function normalizeTransactionReference(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
