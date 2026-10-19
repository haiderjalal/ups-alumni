import "server-only";

import { SITE } from "@/constants/site";
import type { DbClient } from "@/features/audit/services/audit.service";
import { db } from "@/lib/db";

export const REGISTRATION_FEE_CODE = "registration";

/** Launch default from the project brief: a one-time PKR 500 registration fee. Used only when no schedule exists. */
export const DEFAULT_REGISTRATION_FEE_MINOR = 50_000;

export interface EffectiveFee {
  feeScheduleId: string | null;
  amountMinor: number;
  currency: string;
  effectiveFrom: Date | null;
}

/**
 * The fee in force right now. Schedules are append-only: a change adds a new row with a future effective
 * date, and orders keep the amount that was in force when they were created.
 */
export async function getEffectiveRegistrationFee(client: DbClient = db, now: Date = new Date()): Promise<EffectiveFee> {
  const schedule = await client.feeSchedule.findFirst({
    where: { code: REGISTRATION_FEE_CODE, effectiveFrom: { lte: now } },
    orderBy: { effectiveFrom: "desc" },
    select: { id: true, amountMinor: true, currency: true, effectiveFrom: true },
  });

  if (!schedule) {
    return {
      feeScheduleId: null,
      amountMinor: DEFAULT_REGISTRATION_FEE_MINOR,
      currency: SITE.currency,
      effectiveFrom: null,
    };
  }

  return {
    feeScheduleId: schedule.id,
    amountMinor: schedule.amountMinor,
    currency: schedule.currency,
    effectiveFrom: schedule.effectiveFrom,
  };
}
