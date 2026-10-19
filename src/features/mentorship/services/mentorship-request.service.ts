import "server-only";

import { ROUTES } from "@/constants/routes";
import { isBlockedBetween } from "@/features/connections/services/connection.service";
import type { DbClient } from "@/features/audit/services/audit.service";
import { createNotification } from "@/features/notifications/services/notification.service";
import { db } from "@/lib/db";

import { MentorshipError } from "../domain/mentorship-errors";
import {
  canRequestMentor,
  canRespondToRequest,
  canTransitionMentorshipRequest,
  canWithdrawRequest,
  evaluateMentorCapacity,
  type MentorshipRequestState,
} from "../domain/mentorship-rules";
import { parseMentorshipRequest } from "../validation/mentorship.schema";

const UNAVAILABLE =
  "This mentor cannot receive requests from your account right now.";
const NOT_FOUND = "This request could not be found.";
const ALREADY_ANSWERED = "This request has already been answered.";

/**
 * Sends a mentorship request. Blocked pairs, inactive profiles, duplicate pending requests and existing
 * active mentorships are refused. The mentor profile row lock serializes requests with acceptances.
 */
export async function sendMentorshipRequest(
  menteeId: string,
  input: unknown,
): Promise<{ requestId: string }> {
  const data = parseMentorshipRequest(input);

  const profile = await db.mentorProfile.findUnique({
    where: { id: data.mentorProfileId },
    select: { userId: true, isActive: true },
  });
  if (
    !profile ||
    !canRequestMentor({
      requesterId: menteeId,
      mentorUserId: profile.userId,
      mentorIsActive: profile.isActive,
    })
  ) {
    throw new MentorshipError(UNAVAILABLE);
  }
  if (await isBlockedBetween(menteeId, profile.userId)) {
    throw new MentorshipError(UNAVAILABLE);
  }

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM mentor_profiles WHERE id = ${data.mentorProfileId} FOR UPDATE`;

    const current = await tx.mentorProfile.findUnique({
      where: { id: data.mentorProfileId },
      select: { userId: true, isActive: true },
    });
    if (!current || !current.isActive) {
      throw new MentorshipError(UNAVAILABLE);
    }

    const pending = await tx.mentorshipRequest.findFirst({
      where: { mentorId: current.userId, menteeId, status: "PENDING" },
      select: { id: true },
    });
    if (pending) {
      throw new MentorshipError(
        "You already have a pending request with this mentor.",
      );
    }

    const active = await tx.mentorship.findFirst({
      where: { mentorId: current.userId, menteeId, status: "ACTIVE" },
      select: { id: true },
    });
    if (active) {
      throw new MentorshipError(
        "You already have an active mentorship with this mentor.",
      );
    }

    const request = await tx.mentorshipRequest.create({
      data: {
        mentorId: current.userId,
        menteeId,
        goal: data.goal,
        preferredFormat: data.preferredFormat,
      },
      select: { id: true },
    });

    await createNotification(tx, {
      userId: current.userId,
      kind: "MENTORSHIP",
      title: "New mentorship request",
      body: "A member asked for mentorship. Review the request on your mentorship requests page.",
      linkPath: `${ROUTES.appMentorship}/requests`,
    });

    return { requestId: request.id };
  });
}

/**
 * Accepts a pending request. Enforces capacity inside the same transaction as the status change and the
 * creation of the Mentorship row, under the mentor profile lock.
 */
export async function acceptMentorshipRequest(
  mentorId: string,
  requestId: string,
): Promise<{ mentorshipId: string }> {
  const request = await db.mentorshipRequest.findUnique({
    where: { id: requestId },
    select: { mentorId: true, menteeId: true },
  });
  if (!request || !canRespondToRequest(mentorId, request.mentorId)) {
    throw new MentorshipError(NOT_FOUND);
  }
  if (await isBlockedBetween(mentorId, request.menteeId)) {
    throw new MentorshipError("This request cannot be accepted.");
  }

  return db.$transaction(async (tx) => {
    const profile = await tx.mentorProfile.findUnique({
      where: { userId: mentorId },
      select: { id: true, capacity: true, isActive: true },
    });
    if (!profile) {
      throw new MentorshipError(
        "Create your mentor profile before accepting requests.",
      );
    }
    await tx.$queryRaw`SELECT id FROM mentor_profiles WHERE id = ${profile.id} FOR UPDATE`;

    if (!profile.isActive) {
      throw new MentorshipError(
        "Turn on your mentor profile before accepting requests.",
      );
    }
    const activeCount = await tx.mentorship.count({
      where: { mentorId, status: "ACTIVE" },
    });
    if (
      !evaluateMentorCapacity({ capacity: profile.capacity, activeCount })
        .allowed
    ) {
      throw new MentorshipError(
        "You are at capacity. End an active mentorship before accepting another mentee.",
      );
    }

    const current = await tx.mentorshipRequest.findUnique({
      where: { id: requestId },
      select: { status: true, mentorId: true, menteeId: true },
    });
    if (!current || current.mentorId !== mentorId) {
      throw new MentorshipError(NOT_FOUND);
    }
    await moveRequest(tx, requestId, current.status, "ACCEPTED");

    const mentorship = await tx.mentorship.create({
      data: {
        requestId,
        mentorId,
        menteeId: current.menteeId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    await createNotification(tx, {
      userId: current.menteeId,
      kind: "MENTORSHIP",
      title: "Mentorship request accepted",
      body: "Your mentor accepted your request. Arrange the first conversation directly, as this site has no calendar or video booking.",
      linkPath: `${ROUTES.appMentorship}/requests`,
    });

    return { mentorshipId: mentorship.id };
  });
}

export async function declineMentorshipRequest(
  mentorId: string,
  requestId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const request = await tx.mentorshipRequest.findUnique({
      where: { id: requestId },
      select: { mentorId: true, menteeId: true, status: true },
    });
    if (!request || !canRespondToRequest(mentorId, request.mentorId)) {
      throw new MentorshipError(NOT_FOUND);
    }
    await moveRequest(tx, requestId, request.status, "DECLINED");

    await createNotification(tx, {
      userId: request.menteeId,
      kind: "MENTORSHIP",
      title: "Mentorship request declined",
      body: "This mentor cannot take your request right now. You can request another mentor.",
      linkPath: ROUTES.appMentorship,
    });
  });
}

export async function withdrawMentorshipRequest(
  menteeId: string,
  requestId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const request = await tx.mentorshipRequest.findUnique({
      where: { id: requestId },
      select: { mentorId: true, menteeId: true, status: true },
    });
    if (!request || !canWithdrawRequest(menteeId, request.menteeId)) {
      throw new MentorshipError(NOT_FOUND);
    }
    await moveRequest(tx, requestId, request.status, "WITHDRAWN");

    await createNotification(tx, {
      userId: request.mentorId,
      kind: "MENTORSHIP",
      title: "Mentorship request withdrawn",
      body: "A mentee withdrew their mentorship request.",
      linkPath: `${ROUTES.appMentorship}/requests`,
    });
  });
}

/** Compare-and-set from the expected status. Fails if the request was answered concurrently. */
async function moveRequest(
  tx: DbClient,
  requestId: string,
  from: MentorshipRequestState,
  to: MentorshipRequestState,
): Promise<void> {
  if (!canTransitionMentorshipRequest(from, to)) {
    throw new MentorshipError(ALREADY_ANSWERED);
  }
  const moved = await tx.mentorshipRequest.updateMany({
    where: { id: requestId, status: from },
    data: { status: to, respondedAt: new Date() },
  });
  if (moved.count !== 1) {
    throw new MentorshipError(ALREADY_ANSWERED);
  }
}
