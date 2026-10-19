import { describe, expect, it } from "vitest";

import { maskPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("converts Pakistani mobile numbers in local form to E.164", () => {
    expect(normalizePhone("03001234567")).toBe("+923001234567");
    expect(normalizePhone("0300 123 4567")).toBe("+923001234567");
  });

  it("accepts the 00 and + international forms", () => {
    expect(normalizePhone("00923001234567")).toBe("+923001234567");
    expect(normalizePhone("+92 300-123-4567")).toBe("+923001234567");
  });

  it("accepts a 10-digit Pakistani mobile without the trunk prefix", () => {
    expect(normalizePhone("3001234567")).toBe("+923001234567");
  });

  it("keeps overseas numbers that include their country code", () => {
    expect(normalizePhone("+44 7700 900123")).toBe("+447700900123");
  });

  it("rejects values that cannot be a phone number", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("call me")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
  });

  it("masks all but the last four digits for display", () => {
    expect(maskPhone("+923001234567")).toBe("+92••••••4567");
  });
});
