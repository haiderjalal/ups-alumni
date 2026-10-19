import "server-only";

type LogLevel = "info" | "warn" | "error";

/** Keys whose values are never written to logs, however deeply they are nested. */
const REDACTED_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "accessToken",
  "refreshToken",
  "receiptUrl",
  "email",
  "phone",
  "phoneE164",
  "transactionReference",
  "accountIdentifier",
]);

const MAX_DEPTH = 4;

function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) {
    return "[truncated]";
  }
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = REDACTED_KEYS.has(key) ? "[redacted]" : redact(nested, depth + 1);
    }
    return output;
  }
  return value;
}

/**
 * Writes one JSON line per event. Use for business events and failures only.
 * Pass identifiers (user or order ids), never personal details.
 */
export function log(level: LogLevel, event: string, context: Record<string, unknown> = {}): void {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    event,
    ...(redact(context) as Record<string, unknown>),
  });

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}
