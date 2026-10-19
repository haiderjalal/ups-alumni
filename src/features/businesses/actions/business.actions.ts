"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { log } from "@/lib/logger";
import { requireActiveMember } from "@/lib/session";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { BusinessError } from "../domain/business-errors";
import {
  saveOwnedBusiness,
  submitBusinessForReview,
} from "../services/business-owner.service";
import { sendCollaborationRequest } from "../services/collaboration.service";
import type { OwnedBusinessInput } from "../validation/business.schema";

const GENERIC_ERROR =
  "We could not save your changes right now. Please try again shortly.";

function toFailure(error: unknown, event: string): ActionResult<never> {
  if (error instanceof BusinessError) {
    return actionError(error.message);
  }
  log("error", event, { error });
  return actionError(GENERIC_ERROR);
}

export async function saveOwnedBusinessAction(
  input: OwnedBusinessInput,
): Promise<ActionResult<{ businessId: string }>> {
  const user = await requireActiveMember();
  try {
    const result = await saveOwnedBusiness(user.id, input);
    revalidatePath(ROUTES.appBusinesses, "layout");
    return actionOk(result);
  } catch (error) {
    return toFailure(error, "business.save_failed");
  }
}

export async function submitBusinessForReviewAction(input: {
  businessId: string;
  publishContact: boolean;
}): Promise<ActionResult> {
  const user = await requireActiveMember();
  try {
    await submitBusinessForReview(user.id, input);
    revalidatePath(ROUTES.appBusinesses, "layout");
    return actionOk();
  } catch (error) {
    return toFailure(error, "business.submit_failed");
  }
}

export async function sendCollaborationRequestAction(input: {
  businessId: string;
  message: string;
}): Promise<ActionResult<{ requestId: string }>> {
  const user = await requireActiveMember();
  try {
    const result = await sendCollaborationRequest(user.id, input);
    return actionOk(result);
  } catch (error) {
    return toFailure(error, "business.collaboration_failed");
  }
}
