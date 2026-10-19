import type { Metadata } from "next";

import { MemberShell } from "@/components/layout/member-shell";
import { ACTIVE_NAV, PENDING_NAV } from "@/components/layout/member-navigation";
import { countUnreadNotifications } from "@/features/notifications/services/notification.service";
import { getMemberStatus, requireUser } from "@/lib/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Every member route is protected here and again in each page. Pending applicants see the registration and
 * payment tools; only active members see the directory and community spaces.
 */
export default async function MemberLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const [membership, unreadNotifications] = await Promise.all([
    getMemberStatus(user.id),
    countUnreadNotifications(user.id),
  ]);

  const isActive = membership?.membershipStatus === "ACTIVE";
  return (
    <MemberShell
      items={isActive ? ACTIVE_NAV : PENDING_NAV}
      userName={user.name}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </MemberShell>
  );
}
