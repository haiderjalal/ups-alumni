import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ROUTES } from "@/constants/routes";
import { formatDate } from "@/lib/time";

import type { ConnectionRequestItem } from "../services/connection-list.service";
import type { MemberSummary } from "../services/member-summary";

import { MemberIdentity } from "./member-identity";
import { BlockMemberButton, RemoveConnectionButton, RequestResponseButtons, StartConversationButton } from "./member-actions";
import { ReportMemberButton } from "./report-member-button";

interface ConnectionRequestListProps {
  items: ConnectionRequestItem[];
  mode: "incoming" | "outgoing";
  reasons: readonly string[];
}

export function ConnectionRequestList({ items, mode, reasons }: ConnectionRequestListProps) {
  if (items.length === 0) {
    return mode === "incoming" ? (
      <EmptyState title="No incoming requests" description="When a member asks to connect with you, the request appears here." />
    ) : (
      <EmptyState title="No requests sent" description="Requests you send that are still waiting for a response appear here." />
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <MemberIdentity member={item.member} />
            <time dateTime={item.createdAt} className="shrink-0 text-xs text-brand-muted">
              {formatDate(new Date(item.createdAt))}
            </time>
          </div>
          {item.message ? (
            <p className="whitespace-pre-wrap break-words rounded-lg bg-brand-lilac p-3 text-sm leading-relaxed text-brand-ink">
              {item.message}
            </p>
          ) : null}
          <div className="flex flex-wrap items-start gap-2">
            <RequestResponseButtons memberId={item.member.userId} memberName={item.member.name} mode={mode} />
            {mode === "incoming" ? (
              <>
                <BlockMemberButton memberId={item.member.userId} memberName={item.member.name} blocked={false} />
                <ReportMemberButton memberId={item.member.userId} memberName={item.member.name} reasons={reasons} />
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

interface ConnectionMemberListProps {
  members: MemberSummary[];
  reasons: readonly string[];
}

export function ConnectionMemberList({ members, reasons }: ConnectionMemberListProps) {
  if (members.length === 0) {
    return (
      <EmptyState
        title="No connections yet"
        description="Accepted connections appear here. Find alumni in the directory and send a request from their profile."
        action={
          <Button render={<Link href={ROUTES.appDirectory} />} variant="outline" size="lg">
            Browse the directory
          </Button>
        }
      />
    );
  }

  return (
    <ul className="space-y-4">
      {members.map((member) => (
        <li key={member.userId} className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-5">
          <MemberIdentity member={member} />
          <div className="flex flex-wrap items-start gap-2">
            <StartConversationButton memberId={member.userId} memberName={member.name} />
            <RemoveConnectionButton memberId={member.userId} memberName={member.name} />
            <BlockMemberButton memberId={member.userId} memberName={member.name} blocked={false} />
            <ReportMemberButton memberId={member.userId} memberName={member.name} reasons={reasons} />
          </div>
        </li>
      ))}
    </ul>
  );
}

interface BlockedMemberListProps {
  members: MemberSummary[];
}

export function BlockedMemberList({ members }: BlockedMemberListProps) {
  if (members.length === 0) {
    return <EmptyState title="No blocked members" description="Members you block cannot send you requests or messages. You can lift a block at any time." />;
  }

  return (
    <ul className="space-y-4">
      {members.map((member) => (
        <li key={member.userId} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5">
          <MemberIdentity member={member} />
          <BlockMemberButton memberId={member.userId} memberName={member.name} blocked />
        </li>
      ))}
    </ul>
  );
}
