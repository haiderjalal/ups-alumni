"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { log } from "@/lib/logger";
import { requireActiveMember } from "@/lib/session";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { MentorshipError } from "../domain/mentorship-errors";
import { saveMentorProfile } from "../services/mentor-profile.service";
import { endMentorship } from "../services/mentorship.service";
import {
  acceptMentorshipRequest,
  declineMentorshipRequest,
  sendMentorshipRequest,
  withdrawMentorshipRequest,
} from "../services/mentorship-request.service";
import type {
  MentorProfileFormInput,
  MentorshipRequestFormInput,
} from "../validation/mentorship.schema";

const GENERIC_ERROR =
  "We could not complete that right now. Please try again shortly.";

function toFailure(error: unknown, event: string): ActionResult<never> {
  if (error instanceof MentorshipError) {
    return actionError(error.message);
  }
  log("error", event, { error });
  return actionError(GENERIC_ERROR);
}

function revalidateMentorship(): void {
  revalidatePath(ROUTES.appMentorship, "layout");
}

export async function saveMentorProfileAction(
  input: MentorProfileFormInput,
): Promise<ActionResult> {
  const user = await requireActiveMember();
  try {
    await saveMentorProfile(user.id, input);
    revalidateMentorship();
    return actionOk();
  } catch (error) {
    return toFailure(error, "mentorship.profile_save_failed");
  }
}

export async function sendMentorshipRequestAction(
  input: MentorshipRequestFormInput,
): Promise<ActionResult<{ requestId: string }>> {
  const user = await requireActiveMember();
  try {
    const result = await sendMentorshipRequest(user.id, input);
    revalidateMentorship();
    return actionOk(result);
  } catch (error) {
    return toFailure(error, "mentorship.request_failed");
  }
}

export async function acceptMentorshipRequestAction(
  requestId: string,
): Promise<ActionResult<{ mentorshipId: string }>> {
  const user = await requireActiveMember();
  try {
    const result = await acceptMentorshipRequest(user.id, requestId);
    revalidateMentorship();
    return actionOk(result);
  } catch (error) {
    return toFailure(error, "mentorship.accept_failed");
  }
}

export async function declineMentorshipRequestAction(
  requestId: string,
): Promise<ActionResult> {
  const user = await requireActiveMember();
  try {
    await declineMentorshipRequest(user.id, requestId);
    revalidateMentorship();
    return actionOk();
  } catch (error) {
    return toFailure(error, "mentorship.decline_failed");
  }
}

export async function withdrawMentorshipRequestAction(
  requestId: string,
): Promise<ActionResult> {
  const user = await requireActiveMember();
  try {
    await withdrawMentorshipRequest(user.id, requestId);
    revalidateMentorship();
    return actionOk();
  } catch (error) {
    return toFailure(error, "mentorship.withdraw_failed");
  }
}

export async function endMentorshipAction(
  mentorshipId: string,
  outcome: "COMPLETED" | "CANCELLED",
): Promise<ActionResult> {
  const user = await requireActiveMember();
  try {
    await endMentorship(user.id, mentorshipId, outcome);
    revalidateMentorship();
    return actionOk();
  } catch (error) {
    return toFailure(error, "mentorship.end_failed");
  }
}
