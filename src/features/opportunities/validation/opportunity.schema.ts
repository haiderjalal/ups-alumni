import { z } from "zod";

import { cleanSingleLine, cleanText } from "@/lib/security/text";

import {
  OPPORTUNITY_CATEGORIES,
  REMOTE_TYPES,
  type OpportunityCategoryValue,
  type RemoteTypeValue,
} from "../constants";
import { OpportunityError } from "../domain/opportunity-errors";
import {
  APPLICATION_URL_MAX_LENGTH,
  deadlineFromDateInput,
  parseApplicationUrl,
} from "../domain/opportunity-rules";

export const submitOpportunitySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Enter a title of at least 3 characters.")
      .max(120, "Use 120 characters or fewer."),
    organization: z
      .string()
      .trim()
      .min(2, "Enter the organization name.")
      .max(120, "Use 120 characters or fewer."),
    category: z.enum(OPPORTUNITY_CATEGORIES, { error: "Choose a category." }),
    remoteType: z.enum(REMOTE_TYPES, { error: "Choose a work arrangement." }),
    locationCity: z.string().trim().max(80, "Use 80 characters or fewer."),
    description: z
      .string()
      .trim()
      .min(1, "Describe the opportunity.")
      .max(3000, "Use 3000 characters or fewer."),
    applicationUrl: z
      .string()
      .trim()
      .max(
        APPLICATION_URL_MAX_LENGTH,
        `Use ${APPLICATION_URL_MAX_LENGTH} characters or fewer.`,
      ),
    deadline: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (value.remoteType !== "REMOTE" && value.locationCity === "") {
      ctx.addIssue({
        code: "custom",
        path: ["locationCity"],
        message: "Enter the city for on-site and hybrid roles.",
      });
    }
    const url = parseApplicationUrl(value.applicationUrl);
    if (!url.ok) {
      ctx.addIssue({
        code: "custom",
        path: ["applicationUrl"],
        message: url.message,
      });
    }
    if (
      value.deadline !== "" &&
      deadlineFromDateInput(value.deadline) === null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["deadline"],
        message: "Enter a valid deadline date.",
      });
    }
  });

/** Form values before validation. Optional fields are empty strings when left blank. */
export type SubmitOpportunityInput = z.input<typeof submitOpportunitySchema>;

export interface OpportunitySubmission {
  title: string;
  organization: string;
  category: OpportunityCategoryValue;
  remoteType: RemoteTypeValue;
  locationCity: string | null;
  description: string;
  applicationUrl: string;
  deadline: Date | null;
}

/** Validates and normalizes a submission. The deadline must still be checked against the current time. */
export function parseSubmitOpportunity(input: unknown): OpportunitySubmission {
  const parsed = submitOpportunitySchema.safeParse(input);
  if (!parsed.success) {
    throw new OpportunityError(
      parsed.error.issues[0]?.message ?? "Check the highlighted fields.",
    );
  }
  const data = parsed.data;
  const url = parseApplicationUrl(data.applicationUrl);
  if (!url.ok) {
    throw new OpportunityError(url.message);
  }
  return {
    title: cleanSingleLine(data.title),
    organization: cleanSingleLine(data.organization),
    category: data.category,
    remoteType: data.remoteType,
    locationCity: data.locationCity ? cleanSingleLine(data.locationCity) : null,
    description: cleanText(data.description),
    applicationUrl: url.url,
    deadline: data.deadline ? deadlineFromDateInput(data.deadline) : null,
  };
}

export interface OpportunityQuery {
  q: string | null;
  category: OpportunityCategoryValue | null;
  remoteType: RemoteTypeValue | null;
  savedOnly: boolean;
  page: number;
}

/** Unknown filter values are ignored rather than rejected, so stale links still load. */
export function parseOpportunityQuery(
  raw: Record<string, string | string[] | undefined>,
): OpportunityQuery {
  const q = firstValue(raw.q)?.trim().slice(0, 100) ?? "";
  const category =
    OPPORTUNITY_CATEGORIES.find(
      (value) => value === firstValue(raw.category),
    ) ?? null;
  const remoteType =
    REMOTE_TYPES.find((value) => value === firstValue(raw.remote)) ?? null;
  const page = Number.parseInt(firstValue(raw.page) ?? "1", 10);
  return {
    q: q ? cleanSingleLine(q) : null,
    category,
    remoteType,
    savedOnly: firstValue(raw.saved) === "1",
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, 500) : 1,
  };
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
