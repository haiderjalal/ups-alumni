import type { ZodError } from "zod";

/** Maps the first message per field, for display next to each control. Form-level issues use the key "form". */
export function toFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

export function firstIssueMessage(error: ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}
