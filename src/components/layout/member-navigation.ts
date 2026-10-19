
import { ROUTES } from "@/constants/routes";

/** Icon names are resolved inside the client shell. Functions cannot cross the server-to-client boundary. */
export interface MemberNavItem {
  label: string;
  href: string;
  iconName: string;
}

/** Items every signed-in person can open, including applicants who are still pending. */
export const PENDING_NAV: MemberNavItem[] = [
  { label: "Status", href: ROUTES.appStatus, iconName: 'ClipboardList' },
  { label: "Registration", href: ROUTES.appOnboarding, iconName: 'GraduationCap' },
  { label: "Payment", href: ROUTES.appPayment, iconName: 'CreditCard' },
  { label: "Notifications", href: ROUTES.appNotifications, iconName: 'Bell' },
  { label: "Profile", href: ROUTES.appProfile, iconName: 'UserRound' },
  { label: "Settings", href: ROUTES.appSettings, iconName: 'Settings' },
];

/** Full member navigation, shown only once membership is active. */
export const ACTIVE_NAV: MemberNavItem[] = [
  { label: "Dashboard", href: ROUTES.app, iconName: 'LayoutDashboard' },
  { label: "Directory", href: ROUTES.appDirectory, iconName: 'Users' },
  { label: "Batches", href: ROUTES.appBatches, iconName: 'Layers' },
  { label: "Connections", href: ROUTES.appConnections, iconName: 'Handshake' },
  { label: "Messages", href: ROUTES.appMessages, iconName: 'MessageSquare' },
  { label: "Feed", href: ROUTES.appFeed, iconName: 'Newspaper' },
  { label: "Groups", href: ROUTES.appGroups, iconName: 'Building2' },
  { label: "Events", href: ROUTES.appEvents, iconName: 'CalendarDays' },
  { label: "Businesses", href: ROUTES.appBusinesses, iconName: 'Briefcase' },
  { label: "Opportunities", href: ROUTES.appOpportunities, iconName: 'BookOpen' },
  { label: "Mentorship", href: ROUTES.appMentorship, iconName: 'Home' },
  { label: "Notifications", href: ROUTES.appNotifications, iconName: 'Bell' },
  { label: "Profile", href: ROUTES.appProfile, iconName: 'UserRound' },
  { label: "Settings", href: ROUTES.appSettings, iconName: 'Settings' },
];
