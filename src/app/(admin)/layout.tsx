import type { Metadata } from "next";

import { MemberShell } from "@/components/layout/member-shell";
import { adminItemsFor } from "@/features/admin/config/admin-navigation";
import { getStaffRoles, requireUser } from "@/lib/session";
import { ROUTES } from "@/constants/routes";
import { redirect } from "next/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Admin area. Any staff role opens the shell; each page then checks the role it needs. Members without a staff role
 * are sent to the access-denied page.
 */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const roles = await getStaffRoles(user.id);
  if (roles.length === 0) {
    redirect(ROUTES.accessDenied);
  }

  return (
    <MemberShell items={adminItemsFor(roles)} userName={`${user.name} · staff`} unreadNotifications={0}>
      {children}
    </MemberShell>
  );
}
