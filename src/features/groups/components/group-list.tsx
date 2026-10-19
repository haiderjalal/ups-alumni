import { EmptyState } from "@/components/shared/empty-state";

import type { GroupSummary } from "../services/group-query.service";

import { GroupCard } from "./group-card";

interface GroupListProps {
  heading: string;
  groups: GroupSummary[];
  emptyTitle: string;
  emptyDescription: string;
}

export function GroupList({ heading, groups, emptyTitle, emptyDescription }: GroupListProps) {
  const headingId = `${heading.replace(/\s+/g, "-").toLowerCase()}-heading`;
  return (
    <section aria-labelledby={headingId} className="space-y-6">
      <h2 id={headingId} className="font-display text-2xl font-semibold">
        {heading}
      </h2>
      {groups.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id} className="min-w-0">
              <GroupCard group={group} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
