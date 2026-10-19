import { z } from "zod";

import { normalizePhone } from "@/lib/phone";
import { cleanSingleLine, cleanText, toSafeHttpUrl } from "@/lib/security/text";

import { BusinessError } from "../domain/business-errors";
import type { BusinessContent } from "../domain/business-rules";

const optionalWebsite = z
  .string()
  .trim()
  .max(300, "Use 300 characters or fewer.")
  .refine(
    (value) => value === "" || toSafeHttpUrl(value) !== null,
    "Enter a valid web address.",
  )
  .optional();

const optionalEmail = z
  .string()
  .trim()
  .max(254, "Use 254 characters or fewer.")
  .refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Enter a valid email address.",
  )
  .optional();

const optionalPhone = z
  .string()
  .trim()
  .max(30, "Use 30 characters or fewer.")
  .refine(
    (value) => value === "" || normalizePhone(value) !== null,
    "Enter a valid phone number, for example 0300 1234567.",
  )
  .optional();

export const ownedBusinessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the business name.")
    .max(120, "Use 120 characters or fewer."),
  sector: z
    .string()
    .trim()
    .min(2, "Enter the sector.")
    .max(80, "Use 80 characters or fewer."),
  city: z
    .string()
    .trim()
    .min(2, "Enter the city.")
    .max(80, "Use 80 characters or fewer."),
  description: z
    .string()
    .trim()
    .min(1, "Describe the business.")
    .max(1500, "Use 1500 characters or fewer."),
  productsServices: z
    .string()
    .trim()
    .min(1, "Describe the products or services.")
    .max(800, "Use 800 characters or fewer."),
  websiteUrl: optionalWebsite,
  contactEmail: optionalEmail,
  contactPhone: optionalPhone,
});

/** Form and service input for a business listing. Optional contact fields may be omitted or empty. */
export type OwnedBusinessInput = z.input<typeof ownedBusinessSchema>;

export const submitBusinessSchema = z.object({
  businessId: z.string().min(1).max(64),
  publishContact: z.boolean(),
});
export type SubmitBusinessInput = z.input<typeof submitBusinessSchema>;

export const collaborationRequestSchema = z.object({
  businessId: z.string().min(1).max(64),
  message: z
    .string()
    .trim()
    .min(1, "Write a message before sending.")
    .max(1000, "Use 1000 characters or fewer."),
});
export type CollaborationRequestInput = z.input<
  typeof collaborationRequestSchema
>;

export const businessDirectoryQuerySchema = z.object({
  sector: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});

/** Returns the parsed value or throws a BusinessError carrying the first validation message. */
export function parseOrThrow<Output>(
  schema: z.ZodType<Output>,
  input: unknown,
): Output {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new BusinessError(
      parsed.error.issues[0]?.message ?? "Check the highlighted fields.",
    );
  }
  return parsed.data;
}

/** Validates and normalizes listing content before it is stored. */
export function parseOwnedBusiness(input: unknown): BusinessContent {
  const data = parseOrThrow(ownedBusinessSchema, input);
  return {
    name: cleanSingleLine(data.name),
    sector: cleanSingleLine(data.sector),
    city: cleanSingleLine(data.city),
    description: cleanText(data.description),
    productsServices: cleanText(data.productsServices),
    websiteUrl: data.websiteUrl ? toSafeHttpUrl(data.websiteUrl) : null,
    contactEmail: data.contactEmail ? data.contactEmail.toLowerCase() : null,
    contactPhone: data.contactPhone ? normalizePhone(data.contactPhone) : null,
  };
}

export function parseCollaborationRequest(input: unknown): {
  businessId: string;
  message: string;
} {
  const data = parseOrThrow(collaborationRequestSchema, input);
  return { businessId: data.businessId, message: cleanText(data.message) };
}

export function parseBusinessDirectoryQuery(
  raw: Record<string, string | string[] | undefined>,
): {
  sector: string | null;
  city: string | null;
  page: number;
} {
  const parsed = businessDirectoryQuerySchema.safeParse({
    sector: firstValue(raw.sector),
    city: firstValue(raw.city),
    page: firstValue(raw.page),
  });
  const data = parsed.success ? parsed.data : {};
  return {
    sector: data.sector ? cleanSingleLine(data.sector) || null : null,
    city: data.city ? cleanSingleLine(data.city) || null : null,
    page: data.page ?? 1,
  };
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
