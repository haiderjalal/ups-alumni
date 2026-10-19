/** Every internal path is defined once here. Use these instead of string literals in links and redirects. */
export const ROUTES = {
  home: "/",
  about: "/about",
  membership: "/membership",
  events: "/events",
  stories: "/stories",
  contact: "/contact",
  faq: "/faq",
  privacy: "/privacy",
  terms: "/terms",
  refundPolicy: "/refund-policy",

  register: "/register",
  login: "/login",
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  accessDenied: "/access-denied",

  app: "/app",
  appStatus: "/app/status",
  appOnboarding: "/app/onboarding",
  appPayment: "/app/payment",
  appProfile: "/app/profile",
  appSettings: "/app/settings",
  appDirectory: "/app/directory",
  appBatches: "/app/batches",
  appNotifications: "/app/notifications",
  appConnections: "/app/connections",
  appMessages: "/app/messages",
  appGroups: "/app/groups",
  appFeed: "/app/feed",
  appEvents: "/app/events",
  appBusinesses: "/app/businesses",
  appOpportunities: "/app/opportunities",
  appMentorship: "/app/mentorship",
  appStories: "/app/stories",
  appResources: "/app/resources",

  admin: "/admin",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
