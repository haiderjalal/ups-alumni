import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/constants/routes";

import type { GroupSummary } from "../services/group-query.service";

import { GroupJoinControl } from "./group-join-control";
import { GROUP_KIND_LABELS, JOIN_POLICY_LABELS, membershipLabel } from "./group-labels";

interface GroupCardProps {
  group: GroupSummary;
}

export function GroupCard({ group }: GroupCardProps) {
  const statusLabel = membershipLabel(group.viewerStatus);
  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:p-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{GROUP_KIND_LABELS[group.kind]}</Badge>
          {statusLabel ? <Badge variant="secondary">{statusLabel}</Badge> : null}
          {group.isPrivate ? <Badge variant="outline">Private</Badge> : null}
        </div>
        <h2 className="font-display text-2xl font-semibold leading-tight break-words">
          <Link
            href={`${ROUTES.appGroups}/${group.slug}`}
            className="rounded-md underline-offset-4 hover:text-brand-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
          >
            {group.name}
          </Link>
        </h2>
        <p className="text-sm text-brand-muted">
          {group.memberCount} {group.memberCount === 1 ? "member" : "members"} · {JOIN_POLICY_LABELS[group.joinPolicy]}
        </p>
      </header>
      <p className="line-clamp-3 break-words text-brand-muted">{group.description}</p>
      <div className="mt-auto">
        <GroupJoinControl
          groupId={group.id}
          groupName={group.name}
          joinPolicy={group.joinPolicy}
          viewerStatus={group.viewerStatus}
        />
      </div>
    </article>
  );
}
