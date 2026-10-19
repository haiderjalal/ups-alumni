import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ROUTES } from "@/constants/routes";
import { MemberIdentity } from "@/features/connections/components/member-identity";
import { formatDate } from "@/lib/time";

import type { ConversationListItem } from "../services/conversation.service";

interface ConversationListProps {
  items: ConversationListItem[];
}

export function ConversationList({ items }: ConversationListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No conversations yet"
        description="You can message a member once you are connected. Open a connection and choose Message to start."
        action={
          <Button render={<Link href={ROUTES.appConnections} />} variant="outline" size="lg">
            View connections
          </Button>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-brand-border overflow-hidden rounded-2xl border border-brand-border bg-brand-surface">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`${ROUTES.appMessages}/${item.id}`}
            className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-brand-sage focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-deep"
          >
            <span className="min-w-0 flex-1 space-y-1">
              <MemberIdentity member={item.other} nameAs="p" />
              <span className="block truncate text-sm text-brand-muted">
                {item.preview === null ? "No messages yet" : `${item.previewIsOwn ? "You: " : ""}${item.preview}`}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-2 text-xs text-brand-muted">
              {item.lastMessageAt ? <time dateTime={item.lastMessageAt}>{formatDate(new Date(item.lastMessageAt))}</time> : null}
              {item.unread ? (
                <span className="rounded-full bg-brand-deep px-2 py-0.5 font-semibold text-white">
                  New<span className="sr-only"> messages</span>
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
