import "server-only";

import { db } from "@/lib/db";

import { OpportunityError } from "../domain/opportunity-errors";
import { isOpportunityLive } from "../domain/opportunity-rules";

/** Saving is idempotent: saving an item that is already saved changes nothing. */
export async function saveOpportunity(
  userId: string,
  opportunityId: string,
  now: Date = new Date(),
): Promise<void> {
  const opportunity = await db.opportunity.findUnique({
    where: { id: opportunityId },
    select: { status: true, deadline: true },
  });
  if (!opportunity || !isOpportunityLive(opportunity, now)) {
    throw new OpportunityError(
      "This opportunity is no longer open, so it cannot be saved.",
    );
  }

  await db.savedOpportunity.createMany({
    data: [{ userId, opportunityId }],
    skipDuplicates: true,
  });
}

export async function unsaveOpportunity(
  userId: string,
  opportunityId: string,
): Promise<void> {
  await db.savedOpportunity.deleteMany({ where: { userId, opportunityId } });
}
