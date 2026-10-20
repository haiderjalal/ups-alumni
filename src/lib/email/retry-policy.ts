/**
 * Resend error names that will fail again on retry: bad configuration (API key, sender domain), malformed
 * requests, or a message that cannot be sent as written. Retrying them only wastes sends, so they fail at once.
 */
const PERMANENT_ERRORS = new Set<string>([
  "invalid_idempotency_key",
  "validation_error",
  "missing_api_key",
  "restricted_api_key",
  "invalid_api_key",
  "not_found",
  "method_not_allowed",
  "invalid_idempotent_request",
  "invalid_attachment",
  "invalid_from_address",
  "invalid_access",
  "invalid_parameter",
  "invalid_region",
  "missing_required_field",
  "security_error",
]);

/**
 * Everything else is retried with backoff: quotas and rate limits, provider outages, and network errors. Unknown
 * names are retried too, because failing a message that might succeed later is the worse mistake.
 */
export function isRetryableEmailError(errorName: string): boolean {
  return !PERMANENT_ERRORS.has(errorName);
}
