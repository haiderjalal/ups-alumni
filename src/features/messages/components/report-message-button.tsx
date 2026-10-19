"use client";

import { ReportDisclosure } from "@/features/connections/components/report-disclosure";

import { reportMessageAction } from "../actions/message.actions";

interface ReportMessageButtonProps {
  messageId: string;
  reasons: readonly string[];
}

export function ReportMessageButton({ messageId, reasons }: ReportMessageButtonProps) {
  return (
    <ReportDisclosure
      triggerLabel="Report"
      triggerAccessibleLabel="Report this message"
      reasons={reasons}
      onReport={(values) => reportMessageAction({ messageId, ...values })}
    />
  );
}
