"use client";

import { reportMemberAction } from "../actions/connection.actions";

import { ReportDisclosure } from "./report-disclosure";

interface ReportMemberButtonProps {
  memberId: string;
  memberName: string;
  reasons: readonly string[];
}

export function ReportMemberButton({ memberId, memberName, reasons }: ReportMemberButtonProps) {
  return (
    <ReportDisclosure
      triggerLabel="Report"
      triggerAccessibleLabel={`Report ${memberName}'s profile`}
      reasons={reasons}
      onReport={(values) => reportMemberAction({ memberId, ...values })}
    />
  );
}
