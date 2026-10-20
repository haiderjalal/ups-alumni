import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";

import type { GroupMemberView } from "../services/group-query.service";

interface GroupMemberListProps {
  members: GroupMemberView[];
}

/** Names and roles only. Contact details are never part of group views. */
export function GroupMemberList({ members }: GroupMemberListProps) {
  if (members.length === 0) {
    return <EmptyState title="No members to show yet" description="Members who join this group will appear here." />;
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {members.map((member) => (
        <li key={member.userId} className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-brand-lilac px-4 py-3">
          <span className="min-w-0 break-words font-semibold">{member.name}</span>
          {member.role === "MODERATOR" ? <Badge variant="secondary">Moderator</Badge> : null}
        </li>
      ))}
    </ul>
  );
}
