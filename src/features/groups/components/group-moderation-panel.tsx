"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";

import { moderateMembershipAction } from "../actions/group.actions";

export interface PendingRequestRow {
  userId: string;
  name: string;
  requestedLabel: string;
}

export interface ModerationMemberRow {
  userId: string;
  name: string;
  isModerator: boolean;
}

interface GroupModerationPanelProps {
  groupId: string;
  viewerUserId: string;
  pending: PendingRequestRow[];
  members: ModerationMemberRow[];
}

/** Moderators' tools: decide join requests and remove members. The server re-checks every action. */
export function GroupModerationPanel({ groupId, viewerUserId, pending, members }: GroupModerationPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function moderate(targetUserId: string, action: "APPROVE" | "REMOVE"): void {
    setError(null);
    setActiveUserId(targetUserId);
    startTransition(async () => {
      const result = await moderateMembershipAction({ groupId, targetUserId, action });
      setActiveUserId(null);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  const otherMembers = members.filter((member) => member.userId !== viewerUserId);

  return (
    <div className="space-y-8 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:p-6">
      <section aria-labelledby="join-requests-heading" className="space-y-3">
        <h2 id="join-requests-heading" className="font-display text-xl font-semibold">
          Join requests
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-brand-muted">No requests are waiting for review.</p>
        ) : (
          <ul className="divide-y divide-brand-border">
            {pending.map((row) => (
              <li key={row.userId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words font-semibold">{row.name}</p>
                  <p className="text-sm text-brand-muted">Requested {row.requestedLabel}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => moderate(row.userId, "APPROVE")}
                    disabled={isPending}
                    aria-label={`Approve ${row.name}`}
                  >
                    {isPending && activeUserId === row.userId ? "Saving..." : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => moderate(row.userId, "REMOVE")}
                    disabled={isPending}
                    aria-label={`Decline ${row.name}`}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="manage-members-heading" className="space-y-3">
        <h2 id="manage-members-heading" className="font-display text-xl font-semibold">
          Members
        </h2>
        {otherMembers.length === 0 ? (
          <p className="text-sm text-brand-muted">No other members yet.</p>
        ) : (
          <ul className="divide-y divide-brand-border">
            {otherMembers.map((member) => (
              <li key={member.userId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 break-words">
                  <span className="font-semibold">{member.name}</span>
                  {member.isModerator ? <span className="ml-2 text-sm text-brand-muted">Moderator</span> : null}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moderate(member.userId, "REMOVE")}
                  disabled={isPending}
                  aria-label={`Remove ${member.name} from the group`}
                >
                  {isPending && activeUserId === member.userId ? "Removing..." : "Remove"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FormAlert tone="error" message={error} />
    </div>
  );
}
