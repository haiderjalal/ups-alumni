import "server-only";

import { db } from "@/lib/db";

import { MentorshipError } from "../domain/mentorship-errors";
import { parseMentorProfile } from "../validation/mentorship.schema";

export interface OwnMentorProfile {
  id: string;
  expertise: string;
  topics: string[];
  languages: string[];
  availability: string;
  capacity: number;
  isActive: boolean;
  activeMentorships: number;
}

export async function getOwnMentorProfile(
  userId: string,
): Promise<OwnMentorProfile | null> {
  const profile = await db.mentorProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      expertise: true,
      topics: true,
      languages: true,
      availability: true,
      capacity: true,
      isActive: true,
    },
  });
  if (!profile) {
    return null;
  }
  const activeMentorships = await db.mentorship.count({
    where: { mentorId: userId, status: "ACTIVE" },
  });
  return { ...profile, activeMentorships };
}

/**
 * Creates or updates the member's mentor profile (opt-in). Capacity cannot be lowered below the number
 * of active mentorships. The profile row lock keeps that check consistent with concurrent acceptances.
 */
export async function saveMentorProfile(
  userId: string,
  input: unknown,
): Promise<{ profileId: string }> {
  const data = parseMentorProfile(input);

  return db.$transaction(async (tx) => {
    const existing = await tx.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!existing) {
      const created = await tx.mentorProfile.create({
        data: { userId, ...data },
        select: { id: true },
      });
      return { profileId: created.id };
    }

    await tx.$queryRaw`SELECT id FROM mentor_profiles WHERE id = ${existing.id} FOR UPDATE`;
    const activeCount = await tx.mentorship.count({
      where: { mentorId: userId, status: "ACTIVE" },
    });
    if (data.capacity < activeCount) {
      throw new MentorshipError(
        `You have ${activeCount} active mentorship${activeCount === 1 ? "" : "s"}, so capacity cannot be set below ${activeCount}.`,
      );
    }

    await tx.mentorProfile.update({ where: { id: existing.id }, data });
    return { profileId: existing.id };
  });
}
