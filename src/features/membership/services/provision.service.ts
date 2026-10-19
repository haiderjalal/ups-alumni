import "server-only";

import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { createPublicId } from "@/lib/ids";

/**
 * Creates the alumni records every account needs. Runs when Better Auth creates a user.
 * Each upsert is keyed by userId, so a retry never creates duplicates.
 */
export async function provisionAlumniRecords(userId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.alumniProfile.upsert({
      where: { userId },
      create: {
        userId,
        publicId: createPublicId(),
        contactVisibility: { create: {} },
      },
      update: {},
    });

    await tx.alumniApplication.upsert({
      where: { userId },
      create: { userId, status: "DRAFT", currentStep: 1 },
      update: {},
    });

    await tx.membership.upsert({
      where: { userId },
      create: { userId, cardId: createPublicId(), status: "PENDING" },
      update: {},
    });

    await tx.communicationPreference.upsert({
      where: { userId },
      create: { userId, unsubscribeToken: randomBytes(24).toString("base64url") },
      update: {},
    });
  });
}
