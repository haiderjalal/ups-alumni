import "server-only";

import { db } from "@/lib/db";

/** Batch years administrators have listed. Public pages use this to show which batches can be chosen. */
export async function listListedBatchYears(): Promise<number[]> {
  const rows = await db.batch.findMany({
    where: { isListed: true },
    orderBy: { year: "desc" },
    select: { year: true },
  });
  return rows.map((row) => row.year);
}
