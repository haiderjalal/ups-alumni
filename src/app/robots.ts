import type { MetadataRoute } from "next";

/** Private member, admin, auth and API paths are excluded from search engines. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/admin", "/api", "/login", "/register", "/verify-email", "/forgot-password", "/reset-password", "/access-denied"],
    },
  };
}
