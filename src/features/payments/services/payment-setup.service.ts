import "server-only";

import type { Prisma, PaymentMethod } from "@/generated/prisma/client";
import { recordAudit } from "@/features/audit/services/audit.service";
import { db } from "@/lib/db";
import { cleanSingleLine, cleanText } from "@/lib/security/text";
import { rupeesToMinor } from "@/lib/money";
import type { ActionResult } from "@/types/action";
import { actionError, actionOk } from "@/types/action";

import { REGISTRATION_FEE_CODE } from "./fee.service";

export interface ReceivingAccountInput {
  method: PaymentMethod;
  label: string;
  accountTitle: string;
  accountIdentifier: string;
  instructions: string;
  isActive: boolean;
  sortOrder: number;
}

/**
 * Only accounts with a title, an identifier and an explicit activation flag may receive payments.
 * Nothing is invented: until an administrator enters real details, live payment submission stays disabled.
 */
export async function listActiveReceivingAccounts(): Promise<
  Array<{ id: string; method: PaymentMethod; label: string; accountTitle: string; accountIdentifier: string; instructions: string | null }>
> {
  return db.receivingAccount.findMany({
    where: { isActive: true, accountTitle: { not: "" }, accountIdentifier: { not: "" } },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: { id: true, method: true, label: true, accountTitle: true, accountIdentifier: true, instructions: true },
  });
}

export async function listAllReceivingAccounts() {
  return db.receivingAccount.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: { id: true, method: true, label: true, accountTitle: true, accountIdentifier: true, instructions: true, isActive: true, sortOrder: true },
  });
}

/** Creates or updates a receiving account. Activation requires the title and identifier to be filled in. */
export async function saveReceivingAccount(input: {
  id: string | null;
  data: ReceivingAccountInput;
  actorId: string;
}): Promise<ActionResult<{ id: string }>> {
  const title = cleanSingleLine(input.data.accountTitle);
  const identifier = cleanSingleLine(input.data.accountIdentifier);
  if (input.data.isActive && (!title || !identifier)) {
    return actionError("Add the account title and number before activating this account.");
  }

  const data: Prisma.ReceivingAccountUncheckedCreateInput = {
    method: input.data.method,
    label: cleanSingleLine(input.data.label).slice(0, 80),
    accountTitle: title,
    accountIdentifier: identifier,
    instructions: input.data.instructions ? cleanText(input.data.instructions).slice(0, 1000) : null,
    isActive: input.data.isActive,
    sortOrder: input.data.sortOrder,
  };

  const saved = await db.$transaction(async (tx) => {
    const row = input.id
      ? await tx.receivingAccount.update({ where: { id: input.id }, data, select: { id: true } })
      : await tx.receivingAccount.create({ data, select: { id: true } });
    await recordAudit(tx, {
      action: input.id ? "receiving_account.updated" : "receiving_account.created",
      entityType: "receiving_account",
      entityId: row.id,
      actorId: input.actorId,
      metadata: { method: input.data.method, isActive: input.data.isActive },
    });
    return row;
  });
  return actionOk({ id: saved.id });
}

/**
 * Adds a fee schedule row. Existing rows are never edited, so orders keep the amount that was in force when
 * they were created. Changes take effect at the given time; the default is immediately.
 */
export async function scheduleRegistrationFee(input: {
  amountRupees: number;
  effectiveFrom: Date | null;
  note: string;
  actorId: string;
}): Promise<ActionResult<{ id: string }>> {
  if (!Number.isFinite(input.amountRupees) || input.amountRupees <= 0 || input.amountRupees > 100_000) {
    return actionError("Enter a fee between Rs. 1 and Rs. 100,000.");
  }
  const effectiveFrom = input.effectiveFrom ?? new Date();
  const schedule = await db.$transaction(async (tx) => {
    const row = await tx.feeSchedule.create({
      data: {
        code: REGISTRATION_FEE_CODE,
        amountMinor: rupeesToMinor(input.amountRupees),
        currency: "PKR",
        effectiveFrom,
        note: input.note ? cleanText(input.note).slice(0, 300) : null,
        createdById: input.actorId,
      },
      select: { id: true },
    });
    await recordAudit(tx, {
      action: "fee_schedule.created",
      entityType: "fee_schedule",
      entityId: row.id,
      actorId: input.actorId,
      metadata: { amountMinor: rupeesToMinor(input.amountRupees), effectiveFrom: effectiveFrom.toISOString() },
    });
    return row;
  });
  return actionOk({ id: schedule.id });
}
