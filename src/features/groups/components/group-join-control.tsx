"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";

import { joinGroupAction, leaveGroupAction } from "../actions/group.actions";
import type { GroupJoinPolicy, GroupMembershipStatus } from "../domain/group-rules";

interface GroupJoinControlProps {
  groupId: string;
  groupName: string;
  joinPolicy: GroupJoinPolicy;
  viewerStatus: GroupMembershipStatus | null;
}

export function GroupJoinControl({ groupId, groupName, joinPolicy, viewerStatus }: GroupJoinControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isMember = viewerStatus === "ACTIVE";
  const isRequested = viewerStatus === "PENDING";
  const joinLabel = joinPolicy === "OPEN" ? "Join group" : "Request to join";

  function handleJoin(): void {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await joinGroupAction({ groupId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(
        result.data.status === "ACTIVE"
          ? `You have joined ${groupName}.`
          : "Your request has been sent to the group's moderators.",
      );
      router.refresh();
    });
  }

  function handleLeave(): void {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await leaveGroupAction({ groupId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(`You have left ${groupName}.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {isMember ? (
        <Button variant="outline" onClick={handleLeave} disabled={isPending}>
          {isPending ? "Leaving..." : "Leave group"}
        </Button>
      ) : isRequested ? (
        <Button variant="outline" disabled>
          Request pending
        </Button>
      ) : (
        <Button onClick={handleJoin} disabled={isPending}>
          {isPending ? "Sending..." : joinLabel}
        </Button>
      )}
      <FormAlert tone="error" message={error} />
      <FormAlert tone="success" message={notice} />
    </div>
  );
}
