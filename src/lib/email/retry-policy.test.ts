import { describe, expect, it } from "vitest";

import { isRetryableEmailError } from "./retry-policy";

describe("isRetryableEmailError", () => {
  it("fails configuration and request errors at once, because a retry would fail the same way", () => {
    expect(isRetryableEmailError("validation_error")).toBe(false);
    expect(isRetryableEmailError("invalid_from_address")).toBe(false);
    expect(isRetryableEmailError("invalid_api_key")).toBe(false);
    expect(isRetryableEmailError("missing_api_key")).toBe(false);
  });

  it("retries quota, rate limit, provider and network errors", () => {
    expect(isRetryableEmailError("rate_limit_exceeded")).toBe(true);
    expect(isRetryableEmailError("daily_quota_exceeded")).toBe(true);
    expect(isRetryableEmailError("internal_server_error")).toBe(true);
    expect(isRetryableEmailError("TypeError")).toBe(true);
  });
});
