import { z } from "zod";

import { cleanText } from "@/lib/security/text";

import {
  MESSAGE_BODY_MAX_LENGTH,
  evaluateMessageBody,
  type MessageBodyProblem,
} from "../domain/message-rules";

const recordIdSchema = z.string().min(1).max(64);

const MESSAGE_PROBLEM_TEXT: Record<MessageBodyProblem, string> = {
  EMPTY: "Write a message before sending.",
  TOO_LONG: `Keep messages to ${MESSAGE_BODY_MAX_LENGTH} characters or fewer.`,
};

/** Composer form schema. Runs the same cleanup and length rules the server applies. */
export const messageComposerSchema = z.object({
  body: z.string().superRefine((value, ctx) => {
    const result = evaluateMessageBody(cleanText(value));
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: MESSAGE_PROBLEM_TEXT[result.problem] });
    }
  }),
});
export type MessageComposerValues = z.input<typeof messageComposerSchema>;

/** Cursor that identifies one message: (createdAt, id). Used for both older and newer pagination. */
export const messageCursorSchema = z.object({
  createdAt: z.iso.datetime(),
  id: recordIdSchema,
});
export type MessageCursorInput = z.infer<typeof messageCursorSchema>;

/** Raw cap before cleanup. Whitespace collapses during cleanText, so this is deliberately looser than the 2000 limit. */
export const sendMessageInputSchema = z.object({
  conversationId: recordIdSchema,
  body: z.string().max(10_000),
});
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export const loadOlderMessagesInputSchema = z.object({
  conversationId: recordIdSchema,
  before: messageCursorSchema,
});
export type LoadOlderMessagesInput = z.infer<typeof loadOlderMessagesInputSchema>;

export const fetchNewerMessagesInputSchema = z.object({
  conversationId: recordIdSchema,
  after: messageCursorSchema.nullable(),
});
export type FetchNewerMessagesInput = z.infer<typeof fetchNewerMessagesInputSchema>;

export const markConversationReadInputSchema = z.object({
  conversationId: recordIdSchema,
  readThrough: z.iso.datetime().nullable(),
});
export type MarkConversationReadInput = z.infer<typeof markConversationReadInputSchema>;

export const startConversationInputSchema = z.object({ memberId: recordIdSchema });
export type StartConversationInput = z.infer<typeof startConversationInputSchema>;

export const reportMessageInputSchema = z.object({
  messageId: recordIdSchema,
  reason: z.string().min(1).max(120),
  details: z.string().max(1000).optional(),
});
export type ReportMessageInput = z.infer<typeof reportMessageInputSchema>;
