"use client";

import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { startConversationAction } from "@/features/messages/actions/message.actions";

import {
  acceptConnectionRequestAction,
  blockMemberAction,
  declineConnectionRequestAction,
  removeConnectionAction,
  unblockMemberAction,
  withdrawConnectionRequestAction,
} from "../actions/connection.actions";

import { ActionButton } from "./action-button";

interface MemberActionProps {
  memberId: string;
  memberName: string;
}

export function AcceptRequestButton({ memberId, memberName }: MemberActionProps) {
  return (
    <ActionButton
      variant="default"
      label="Accept"
      pendingLabel="Accepting…"
      accessibleLabel={`Accept connection request from ${memberName}`}
      run={() => acceptConnectionRequestAction({ memberId })}
    />
  );
}

export function DeclineRequestButton({ memberId, memberName }: MemberActionProps) {
  return (
    <ActionButton
      label="Decline"
      pendingLabel="Declining…"
      accessibleLabel={`Decline connection request from ${memberName}`}
      run={() => declineConnectionRequestAction({ memberId })}
    />
  );
}

export function WithdrawRequestButton({ memberId, memberName }: MemberActionProps) {
  return (
    <ActionButton
      label="Withdraw request"
      pendingLabel="Withdrawing…"
      accessibleLabel={`Withdraw your connection request to ${memberName}`}
      run={() => withdrawConnectionRequestAction({ memberId })}
    />
  );
}

interface RequestResponseButtonsProps extends MemberActionProps {
  mode: "incoming" | "outgoing";
}

/** Incoming requests can be accepted or declined; outgoing requests can only be withdrawn. */
export function RequestResponseButtons({ memberId, memberName, mode }: RequestResponseButtonsProps) {
  if (mode === "outgoing") {
    return <WithdrawRequestButton memberId={memberId} memberName={memberName} />;
  }
  return (
    <>
      <AcceptRequestButton memberId={memberId} memberName={memberName} />
      <DeclineRequestButton memberId={memberId} memberName={memberName} />
    </>
  );
}

export function RemoveConnectionButton({ memberId, memberName }: MemberActionProps) {
  return (
    <ActionButton
      label="Remove connection"
      pendingLabel="Removing…"
      accessibleLabel={`Remove connection with ${memberName}`}
      confirmation={{
        prompt: `Remove ${memberName} from your connections? Messages with them will no longer be available until you connect again.`,
        confirmLabel: "Remove connection",
      }}
      run={() => removeConnectionAction({ memberId })}
    />
  );
}

/** Blocking asks for confirmation; unblocking does not, because it only restores contact. */
export function BlockMemberButton({ memberId, memberName, blocked }: MemberActionProps & { blocked: boolean }) {
  if (blocked) {
    return (
      <ActionButton
        label="Unblock"
        pendingLabel="Unblocking…"
        accessibleLabel={`Unblock ${memberName}`}
        run={() => unblockMemberAction({ memberId })}
      />
    );
  }
  return (
    <ActionButton
      variant="ghost"
      label="Block"
      pendingLabel="Blocking…"
      accessibleLabel={`Block ${memberName}`}
      confirmation={{
        prompt: `Block ${memberName}? Pending requests between you will be withdrawn, and neither of you will be able to send requests or messages.`,
        confirmLabel: "Block member",
      }}
      run={() => blockMemberAction({ memberId })}
    />
  );
}

export function StartConversationButton({ memberId, memberName }: MemberActionProps) {
  const router = useRouter();
  return (
    <ActionButton
      variant="default"
      label="Message"
      pendingLabel="Opening…"
      accessibleLabel={`Message ${memberName}`}
      run={() => startConversationAction({ memberId })}
      onSuccess={({ conversationId }) => router.push(`${ROUTES.appMessages}/${conversationId}`)}
    />
  );
}
