import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { buildMemberHeadline } from "../domain/member-headline";

/**
 * The only fields selected for another member. Email, phone and every private profile field stay out of
 * this select, so they cannot leak into lists, actions or serialized props.
 */
export const MEMBER_SUMMARY_SELECT = {
  id: true,
  name: true,
  membership: { select: { status: true } },
  profile: {
    select: {
      jobTitle: true,
      organization: true,
      batch: { select: { year: true } },
    },
  },
} satisfies Prisma.UserSelect;

export type MemberSummaryRow = Prisma.UserGetPayload<{ select: typeof MEMBER_SUMMARY_SELECT }>;

/** What a client component may receive about another member. */
export interface MemberSummary {
  userId: string;
  name: string;
  batchYear: number | null;
  headline: string | null;
}

export function isActiveMemberRow(row: MemberSummaryRow): boolean {
  return row.membership?.status === "ACTIVE";
}

export function buildMemberSummary(row: MemberSummaryRow): MemberSummary {
  return {
    userId: row.id,
    name: row.name,
    batchYear: row.profile?.batch?.year ?? null,
    headline: row.profile ? buildMemberHeadline(row.profile) : null,
  };
}
