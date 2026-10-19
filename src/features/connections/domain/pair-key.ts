/**
 * Pair identity for two members. Connection requests, connections and conversations are keyed by the
 * sorted "low:high" pair, so (A, B) and (B, A) resolve to the same row. Pure: no framework or database imports.
 */

export interface OrderedPair {
  /** Lexically smaller user id. Stored as Connection.lowUserId. */
  low: string;
  /** Lexically larger user id. Stored as Connection.highUserId. */
  high: string;
}

/** Sorts two member ids so the lower one always comes first. Throws for a self-pair; callers reject that case earlier. */
export function orderPair(a: string, b: string): OrderedPair {
  if (a === b) {
    throw new Error("A member cannot form a pair with themselves.");
  }
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

export function createPairKey(a: string, b: string): string {
  const { low, high } = orderPair(a, b);
  return `${low}:${high}`;
}

/** Returns the member id on the other side of a pair, or null when the user is not part of that pair. */
export function otherMemberFromPairKey(pairKey: string, userId: string): string | null {
  const [low, high, extra] = pairKey.split(":");
  if (!low || !high || extra !== undefined) {
    return null;
  }
  if (userId === low) {
    return high;
  }
  if (userId === high) {
    return low;
  }
  return null;
}

/** Counterpart of a stored Connection row for the given member. */
export function otherMemberOf(low: string, high: string, userId: string): string {
  return userId === low ? high : low;
}
