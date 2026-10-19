import { z } from "zod";

/** Report reason and optional details. The reason list itself is enforced by createReport on the server. */
export const reportInputSchema = z.object({
  reason: z.string().min(1, "Choose a reason for the report.").max(120),
  details: z.string().max(1000).optional(),
});
export type ReportInput = z.infer<typeof reportInputSchema>;

/** Form schema for the report disclosure. The reason must be one of the reasons passed in from the server. */
export function createReportFormSchema(reasons: readonly string[]) {
  return z.object({
    reason: z.string().refine((value) => reasons.includes(value), { message: "Choose a reason for the report." }),
    details: z.string().max(1000, "Keep details to 1000 characters or fewer."),
  });
}
export type ReportFormValues = z.input<ReturnType<typeof createReportFormSchema>>;
