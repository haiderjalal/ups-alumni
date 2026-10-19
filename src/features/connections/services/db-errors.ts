/** True when Prisma rejected a write because a unique key (for example pairKey) already exists. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "P2002";
}
