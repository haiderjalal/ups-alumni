"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { log } from "@/lib/logger";
import { requireActiveMember } from "@/lib/session";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { OpportunityError } from "../domain/opportunity-errors";
import {
  saveOpportunity,
  unsaveOpportunity,
} from "../services/opportunity-saves.service";
import { submitOpportunity } from "../services/opportunity-submission.service";
import type { SubmitOpportunityInput } from "../validation/opportunity.schema";

const GENERIC_ERROR =
  "We could not complete that right now. Please try again shortly.";

function toFailure(error: unknown, event: string): ActionResult<never> {
  if (error instanceof OpportunityError) {
    return actionError(error.message);
  }
  log("error", event, { error });
  return actionError(GENERIC_ERROR);
}

export async function submitOpportunityAction(
  input: SubmitOpportunityInput,
): Promise<ActionResult<{ opportunityId: string }>> {
  const user = await requireActiveMember();
  try {
    const result = await submitOpportunity(user.id, input);
    revalidatePath(ROUTES.appOpportunities, "layout");
    return actionOk(result);
  } catch (error) {
    return toFailure(error, "opportunity.submit_failed");
  }
}

export async function saveOpportunityAction(
  opportunityId: string,
): Promise<ActionResult> {
  const user = await requireActiveMember();
  try {
    await saveOpportunity(user.id, opportunityId);
    return actionOk();
  } catch (error) {
    return toFailure(error, "opportunity.save_failed");
  }
}

export async function unsaveOpportunityAction(
  opportunityId: string,
): Promise<ActionResult> {
  const user = await requireActiveMember();
  try {
    await unsaveOpportunity(user.id, opportunityId);
    return actionOk();
  } catch (error) {
    return toFailure(error, "opportunity.unsave_failed");
  }
}
