import { SITE } from "@/constants/site";

/** Money is stored as integer minor units (paisa). PKR 500 is 50000. Never store floats. */
export const MINOR_UNITS_PER_RUPEE = 100;

/** Converts whole or fractional rupees to minor units, rounding to the nearest paisa. */
export function rupeesToMinor(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new RangeError("Amount must be a finite number.");
  }
  return Math.round(rupees * MINOR_UNITS_PER_RUPEE);
}

/**
 * Formats minor units for display, for example 50000 -> "Rs. 500" and 50050 -> "Rs. 500.50".
 * Whole amounts omit decimals so the registration fee reads consistently across the site.
 */
export function formatRupees(minor: number): string {
  if (!Number.isInteger(minor)) {
    throw new RangeError("Minor-unit amounts must be integers.");
  }
  const sign = minor < 0 ? "-" : "";
  const absolute = Math.abs(minor);
  const rupees = Math.floor(absolute / MINOR_UNITS_PER_RUPEE);
  const paisa = absolute % MINOR_UNITS_PER_RUPEE;
  const grouped = rupees.toLocaleString("en-PK");
  const decimals = paisa === 0 ? "" : `.${paisa.toString().padStart(2, "0")}`;
  return `${sign}Rs. ${grouped}${decimals}`;
}

/** Currency code used in storage and receipts. The product currency is fixed to PKR. */
export const DEFAULT_CURRENCY = SITE.currency;
