import type { ConnectionViewState } from "../domain/connection-rules";

import { AcceptRequestButton, BlockMemberButton, DeclineRequestButton, RemoveConnectionButton, StartConversationButton, WithdrawRequestButton } from "./member-actions";
import { ConnectRequestForm } from "./connect-request-form";
import { ReportMemberButton } from "./report-member-button";

interface ConnectionActionsProps {
  memberId: string;
  memberName: string;
  state: ConnectionViewState;
  reasons: readonly string[];
}

/**
 * Relationship actions for one member, chosen from the server-computed state. Use on profile pages.
 * BLOCKED_BY_OTHER and SELF render nothing: the viewer is never told that another member blocked them.
 */
export function ConnectionActions({ memberId, memberName, state, reasons }: ConnectionActionsProps) {
  if (state === "SELF" || state === "BLOCKED_BY_OTHER") {
    return null;
  }

  return (
    <div className="flex flex-wrap items-start gap-3">
      {state === "NONE" ? <ConnectRequestForm memberId={memberId} memberName={memberName} /> : null}
      {state === "PENDING_OUTGOING" ? <WithdrawRequestButton memberId={memberId} memberName={memberName} /> : null}
      {state === "PENDING_INCOMING" ? (
        <>
          <AcceptRequestButton memberId={memberId} memberName={memberName} />
          <DeclineRequestButton memberId={memberId} memberName={memberName} />
        </>
      ) : null}
      {state === "CONNECTED" ? (
        <>
          <StartConversationButton memberId={memberId} memberName={memberName} />
          <RemoveConnectionButton memberId={memberId} memberName={memberName} />
        </>
      ) : null}
      <BlockMemberButton memberId={memberId} memberName={memberName} blocked={state === "BLOCKED_BY_VIEWER"} />
      <ReportMemberButton memberId={memberId} memberName={memberName} reasons={reasons} />
    </div>
  );
}
