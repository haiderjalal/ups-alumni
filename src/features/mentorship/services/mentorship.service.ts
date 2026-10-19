import "server-only";

import { ROUTES } from "@/constants/routes";
import { createNotification } from "@/features/notifications/services/notification.service";
import { db } from "@/lib/db";

import { MentorshipError } from "../domain/mentorship-errors";
import {
  canEndMentorship,
  canTransitionMentorship,
  type MentorshipState,
} from "../domain/mentorship-rules";

export interface IncomingRequestView {
  id: string;
  goal: string;
  preferredFormat: string;
  createdAt: Date;
  menteeName: string;
}

export interface OutgoingRequestView {
  id: string;
  status: string;
  preferredFormat: string;
  createdAt: Date;
  mentorName: string;
}

export interface MentorshipSummaryView {
  id: string;
  status: MentorshipState;
  startedAt: Date;
  endedAt: Date | null;
  role: "MENTOR" | "MENTEE";
  partnerName: string;
}

export interface MentorshipActivity {
  incoming: IncomingRequestView[];
  outgoing: OutgoingRequestView[];
  mentorships: MentorshipSummaryView[];
}

/** Either party completes or cancels an active mentorship. The status change is a compare-and-set. */
export async function endMentorship(
  actorId: string,
  mentorshipId: string,
  outcome: "COMPLETED" | "CANCELLED",
): Promise<void> {
  await db.$transaction(async (tx) => {
    const mentorship = await tx.mentorship.findUnique({
      where: { id: mentorshipId },
      select: { mentorId: true, menteeId: true, status: true },
    });
    if (!mentorship || !canEndMentorship(actorId, mentorship)) {
      throw new MentorshipError("This mentorship could not be found.");
    }
    if (!canTransitionMentorship(mentorship.status, outcome)) {
      throw new MentorshipError("This mentorship has already ended.");
    }

    const moved = await tx.mentorship.updateMany({
      where: { id: mentorshipId, status: mentorship.status },
      data: { status: outcome, endedAt: new Date() },
    });
    if (moved.count !== 1) {
      throw new MentorshipError("This mentorship has already ended.");
    }

    const otherUserId =
      actorId === mentorship.mentorId
        ? mentorship.menteeId
        : mentorship.mentorId;
    await createNotification(tx, {
      userId: otherUserId,
      kind: "MENTORSHIP",
      title:
        outcome === "COMPLETED"
          ? "Mentorship marked complete"
          : "Mentorship ended",
      body:
        outcome === "COMPLETED"
          ? "Your mentorship partner marked the mentorship as complete."
          : "Your mentorship partner ended the mentorship.",
      linkPath: `${ROUTES.appMentorship}/requests`,
    });
  });
}

/** Requests waiting for the viewer as mentor, the viewer's own requests, and their mentorships. */
export async function listMentorshipActivity(
  userId: string,
): Promise<MentorshipActivity> {
  const [incoming, outgoing, mentorships] = await Promise.all([
    db.mentorshipRequest.findMany({
      where: { mentorId: userId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        goal: true,
        preferredFormat: true,
        createdAt: true,
        mentee: { select: { name: true } },
      },
    }),
    db.mentorshipRequest.findMany({
      where: { menteeId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        preferredFormat: true,
        createdAt: true,
        mentor: { select: { name: true } },
      },
    }),
    db.mentorship.findMany({
      where: { OR: [{ mentorId: userId }, { menteeId: userId }] },
      orderBy: { startedAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,
        mentorId: true,
        mentor: { select: { name: true } },
        mentee: { select: { name: true } },
      },
    }),
  ]);

  return {
    incoming: incoming.map((row) => ({
      id: row.id,
      goal: row.goal,
      preferredFormat: row.preferredFormat,
      createdAt: row.createdAt,
      menteeName: row.mentee.name,
    })),
    outgoing: outgoing.map((row) => ({
      id: row.id,
      status: row.status,
      preferredFormat: row.preferredFormat,
      createdAt: row.createdAt,
      mentorName: row.mentor.name,
    })),
    mentorships: mentorships.map((row) => {
      const isMentor = row.mentorId === userId;
      return {
        id: row.id,
        status: row.status,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        role: isMentor ? "MENTOR" : "MENTEE",
        partnerName: isMentor ? row.mentee.name : row.mentor.name,
      };
    }),
  };
}
