/**
 * Verified institutional facts and platform labels. Only facts supported by the official
 * University of Malakand page belong here. Anything else (founding year, principal, contact details,
 * committee) is admin-managed and stays empty until an operator supplies it.
 *
 * Source: https://www.uom.edu.pk/links/university-public-school-and-college/details
 */
export const SITE = {
  name: "UPS Alumni Network",
  schoolName: "University Public School",
  contextLine: "Chakdara · University of Malakand",
  /** Default governance label. Official endorsement is a separate admin configuration. */
  governanceLabel: "Alumni-led community",
  /** Alumni status is verified by the platform, not by a government or university certification. */
  verificationLabel: "Alumni status verified by the platform",
  registrationFeeLabel: "Rs. 500",
  currency: "PKR",
  defaultTimeZone: "Asia/Karachi",
} as const;

export type SiteConstants = typeof SITE;
