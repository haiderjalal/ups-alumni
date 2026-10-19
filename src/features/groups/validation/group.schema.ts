import { z } from "zod";

const identifier = z.string().min(1).max(64);

export const groupTargetSchema = z.object({
  groupId: identifier,
});

export const moderateMembershipSchema = z.object({
  groupId: identifier,
  targetUserId: identifier,
  action: z.enum(["APPROVE", "REMOVE"]),
});
