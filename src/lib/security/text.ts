const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes text before it is placed in HTML (emails, generated receipts). */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/**
 * Removes control characters (except tab and newline) and collapses runs of whitespace.
 * Apply to every free-text input before storing it.
 */
export function cleanText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Returns the value as a single line with no control characters. Use for names, titles and headers. */
export function cleanSingleLine(value: string): string {
  return cleanText(value).replace(/\s*\n\s*/g, " ");
}

/**
 * Allows only http and https links. Rejects javascript:, data:, and malformed values.
 * Returns the normalized URL, or null when the input is not an acceptable external link.
 */
export function toSafeHttpUrl(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) {
    return null;
  }
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    if (url.username || url.password) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Prefixes values that spreadsheet software would evaluate as formulas (=, +, -, @, tab, CR).
 * Use on every CSV cell that holds user-provided text.
 */
export function neutralizeSpreadsheetFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}
