/**
 * Unread state for a conversation. A conversation is unread for a viewer when the newest message was written
 * by the other member and arrived after the viewer's lastReadAt. The viewer's own messages never make a
 * conversation unread.
 */
export interface LatestMessageFacts {
  senderId: string;
  createdAt: Date;
}

export interface UnreadInput {
  viewerId: string;
  lastReadAt: Date | null;
  latest: LatestMessageFacts | null;
}

export function isConversationUnread(input: UnreadInput): boolean {
  const { viewerId, lastReadAt, latest } = input;
  if (!latest || latest.senderId === viewerId) {
    return false;
  }
  if (!lastReadAt) {
    return true;
  }
  return latest.createdAt.getTime() > lastReadAt.getTime();
}
