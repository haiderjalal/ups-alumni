import "server-only";

import { getStaffRoles } from "@/lib/session";
import { db } from "@/lib/db";

import type { EventViewer } from "../domain/event-visibility";

/** The viewer facts that event rules need: matric batch from the profile and current staff roles. */
export async function loadEventViewer(userId: string): Promise<EventViewer> {
  const [profile, roles] = await Promise.all([
    db.alumniProfile.findUnique({ where: { userId }, select: { batchId: true } }),
    getStaffRoles(userId),
  ]);
  return { userId, batchId: profile?.batchId ?? null, roles };
}
