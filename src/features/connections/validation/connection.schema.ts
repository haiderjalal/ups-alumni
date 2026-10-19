import { z } from "zod";

import { countCharacters } from "@/features/messages/domain/message-rules";
import { cleanText } from "@/lib/security/text";

import { CONNECTION_NOTE_MAX_LENGTH } from "../domain/connection-rules";

const recordIdSchema = z.string().min(1).max(64);

/** Server-side input for actions that act on another member. */
export const memberActionInputSchema = z.object({ memberId: recordIdSchema });
export type MemberActionInput = z.infer<typeof memberActionInputSchema>;

/** Raw cap before cleanup, so an oversized payload is rejected cheaply. The cleaned length is checked in the service. */
export const sendConnectionRequestInputSchema = z.object({
  memberId: recordIdSchema,
  note: z.string().max(1000).optional(),
});
export type SendConnectionRequestInput = z.infer<typeof sendConnectionRequestInputSchema>;

/** Form schema for the optional note on a connection request. Input and output types match. */
export const connectionNoteFormSchema = z.object({
  note: z.string().superRefine((value, ctx) => {
    if (countCharacters(cleanText(value)) > CONNECTION_NOTE_MAX_LENGTH) {
      ctx.addIssue({
        code: "custom",
        message: `Keep the note to ${CONNECTION_NOTE_MAX_LENGTH} characters or fewer.`,
      });
    }
  }),
});
export type ConnectionNoteFormValues = z.input<typeof connectionNoteFormSchema>;
