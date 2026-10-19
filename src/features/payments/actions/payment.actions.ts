"use server";

import { requireUser } from "@/lib/session";
import type { ActionResult } from "@/types/action";
import { actionError } from "@/types/action";

import { createRegistrationOrder } from "../services/order.service";
import { submitPaymentAttempt, type AttemptFieldErrors } from "../services/attempt.service";

/** Creates the member's single registration order and snapshots the chosen receiving account onto it. */
export async function createOrderAction(receivingAccountId: string): Promise<ActionResult<{ orderId: string }>> {
  const user = await requireUser();
  if (typeof receivingAccountId !== "string" || receivingAccountId.length === 0 || receivingAccountId.length > 64) {
    return actionError("Choose a receiving account.");
  }
  return createRegistrationOrder({ userId: user.id, receivingAccountId });
}

/** Records payment evidence. The receipt must already be uploaded through the private upload route. */
export async function submitPaymentAttemptAction(
  values: unknown,
): Promise<ActionResult<{ attemptId: string }> & { fieldErrors?: AttemptFieldErrors }> {
  const user = await requireUser();
  return submitPaymentAttempt({ userId: user.id, values });
}
