import "server-only";

import type { ZodType } from "zod";

import { db } from "@/lib/db";
import { log } from "@/lib/logger";

import { type ContentKey } from "../domain/documents";

/**
 * Returns the published version of a CMS document, validated against its schema. If nothing is published
 * or the stored value is malformed, the caller's default is returned. Public pages never fail on bad content.
 */
export async function getPublishedDocument<T>(key: ContentKey, schema: ZodType<T>, fallback: T): Promise<T> {
  const row = await db.contentDocument.findUnique({
    where: { key },
    select: { publishedJson: true },
  });

  if (!row?.publishedJson) {
    return fallback;
  }

  const parsed = schema.safeParse(row.publishedJson);
  if (!parsed.success) {
    log("error", "content.published_document_invalid", { key });
    return fallback;
  }
  return parsed.data;
}
