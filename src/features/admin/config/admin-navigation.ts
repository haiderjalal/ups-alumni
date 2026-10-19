import type { StaffRole } from "@/generated/prisma/client";
import { ROUTES } from "@/constants/routes";

export interface AdminNavItem {
  label: string;
  href: string;
  iconName: string;
  /** Roles that may open this section. SUPER_ADMIN is implied everywhere. */
  roles: readonly StaffRole[];
}

const ADMIN_PATH = ROUTES.admin;

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { label: "Overview", href: ADMIN_PATH, iconName: 'LayoutDashboard', roles: ["MEMBERSHIP_ADMIN", "FINANCE_REVIEWER", "CONTENT_MODERATOR", "BATCH_REPRESENTATIVE", "GROUP_REPRESENTATIVE"] },
  { label: "Applications", href: `${ADMIN_PATH}/applications`, iconName: 'ClipboardCheck', roles: ["MEMBERSHIP_ADMIN"] },
  { label: "Members", href: `${ADMIN_PATH}/members`, iconName: 'Users', roles: ["MEMBERSHIP_ADMIN"] },
  { label: "Payments", href: `${ADMIN_PATH}/payments`, iconName: 'CreditCard', roles: ["FINANCE_REVIEWER"] },
  { label: "Refunds", href: `${ADMIN_PATH}/refunds`, iconName: 'RotateCcw', roles: ["FINANCE_REVIEWER"] },
  { label: "Batches", href: `${ADMIN_PATH}/batches`, iconName: 'Layers', roles: ["MEMBERSHIP_ADMIN"] },
  { label: "Reports", href: `${ADMIN_PATH}/reports`, iconName: 'Flag', roles: ["CONTENT_MODERATOR", "MEMBERSHIP_ADMIN"] },
  { label: "Content", href: `${ADMIN_PATH}/content`, iconName: 'FileText', roles: ["CONTENT_MODERATOR"] },
  { label: "Fees and accounts", href: `${ADMIN_PATH}/settings`, iconName: 'Landmark', roles: ["FINANCE_REVIEWER"] },
  { label: "Roles", href: `${ADMIN_PATH}/roles`, iconName: 'ShieldCheck', roles: [] },
  { label: "Audit log", href: `${ADMIN_PATH}/audit`, iconName: 'History', roles: ["MEMBERSHIP_ADMIN", "FINANCE_REVIEWER"] },
];

/** Navigation entries the signed-in staff member may open. Server-computed; the page guards repeat the check. */
export function adminItemsFor(roles: readonly StaffRole[]): AdminNavItem[] {
  const isSuper = roles.includes("SUPER_ADMIN");
  return ADMIN_NAV.filter((item) => isSuper || item.roles.some((role) => roles.includes(role))).map((item) => ({ ...item }));
}

