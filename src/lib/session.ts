import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROUTES } from "@/constants/routes";
import type { StaffRole } from "@/generated/prisma/client";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

export interface MemberStatus {
  userId: string;
  membershipStatus: "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED";
}

/**
 * Returns the signed-in user for this request, or null. Cached per request so layouts and pages
 * share one database lookup. Better Auth validates the session token against the database.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
  };
});

/** Use in Server Components and Route Handlers that require any signed-in user. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.login);
  }
  return user;
}

/** Membership status is re-read from the database on every call. Cookies and caches are not trusted for access. */
export const getMemberStatus = cache(async (userId: string): Promise<MemberStatus | null> => {
  const membership = await db.membership.findUnique({
    where: { userId },
    select: { userId: true, status: true },
  });
  return membership ? { userId: membership.userId, membershipStatus: membership.status } : null;
});

/** Pages for active members only. Pending users are sent to their onboarding status page. */
export async function requireActiveMember(): Promise<CurrentUser> {
  const user = await requireUser();
  const status = await getMemberStatus(user.id);
  if (status?.membershipStatus !== "ACTIVE") {
    redirect(ROUTES.appStatus);
  }
  return user;
}

/**
 * Returns the staff roles held by a user, excluding revoked assignments. Role checks always run on the
 * server, never from client state.
 */
export const getStaffRoles = cache(async (userId: string): Promise<StaffRole[]> => {
  const assignments = await db.roleAssignment.findMany({
    where: { userId, revokedAt: null },
    select: { role: true },
  });
  return [...new Set(assignments.map((assignment) => assignment.role))];
});

/** Returns the signed-in staff member with the required role, or redirects. */
export async function requireStaffRole(allowed: readonly StaffRole[]): Promise<CurrentUser & { roles: StaffRole[] }> {
  const user = await requireUser();
  const roles = await getStaffRoles(user.id);
  if (!roles.some((role) => allowed.includes(role))) {
    redirect(ROUTES.accessDenied);
  }
  return { ...user, roles };
}
