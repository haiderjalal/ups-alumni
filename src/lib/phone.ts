const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

/**
 * Normalizes a phone number to E.164. Pakistani mobile numbers entered in local form
 * (03xx..., 0092..., +92...) are converted. Other countries must include their international prefix.
 * Returns null when the value cannot be normalized to a plausible number.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }

  let candidate: string;
  if (hasPlus) {
    candidate = `+${digits}`;
  } else if (trimmed.startsWith("00")) {
    candidate = `+${digits.slice(2)}`;
  } else if (digits.startsWith("0") && digits.length === 11) {
    // National trunk prefix: 03001234567 -> +923001234567
    candidate = `+92${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith("3")) {
    // Pakistani mobile without the trunk prefix: 3001234567 -> +923001234567.
    // Overseas numbers must include their country code, so this rule never guesses for them.
    candidate = `+92${digits}`;
  } else {
    candidate = `+${digits}`;
  }

  return E164_PATTERN.test(candidate) ? candidate : null;
}

/** Masks all but the last four digits for logs and support screens. */
export function maskPhone(e164: string): string {
  const visible = e164.slice(-4);
  return `${e164.slice(0, 3)}${"•".repeat(Math.max(0, e164.length - 7))}${visible}`;
}
