import "server-only";

import { db } from "@/lib/db";

import { OpportunityError } from "../domain/opportunity-errors";
import {
  isDeadlineInFuture,
  type OpportunityStatus,
} from "../domain/opportunity-rules";
import { parseSubmitOpportunity } from "../validation/opportunity.schema";

export interface OwnSubmission {
  id: string;
  title: string;
  status: OpportunityStatus;
  createdAt: Date;
  deadline: Date | null;
}

/**
 * Creates a member's opportunity as PENDING_REVIEW, so it stays hidden until staff publish it.
 * The deadline must still be in the future when the submission is made.
 */
export async function submitOpportunity(
  userId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<{ opportunityId: string }> {
  const data = parseSubmitOpportunity(input);
  if (data.deadline && !isDeadlineInFuture(data.deadline, now)) {
    throw new OpportunityError("The deadline must be a date in the future.");
  }

  const created = await db.opportunity.create({
    data: { ...data, postedById: userId, status: "PENDING_REVIEW" },
    select: { id: true },
  });
  return { opportunityId: created.id };
}

/** The member's own submissions in every state, most recent first. */
export async function listOwnSubmissions(
  userId: string,
): Promise<OwnSubmission[]> {
  return db.opportunity.findMany({
    where: { postedById: userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      deadline: true,
    },
  });
}
