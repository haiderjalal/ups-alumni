"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  approvePaymentAction,
  decideRefundAction,
  markRefundFailedAction,
  markRefundProcessedAction,
  rejectPaymentAction,
  retryFailedRefundAction,
} from "@/features/payments/actions/finance.actions";

import { decideApplicationAction, decideBatchChangeAction, decideReportAction } from "../actions/admin.actions";
import type { ReviewDecision } from "../services/application-admin.service";

type Feedback = { tone: "error" | "success"; message: string } | null;

interface TaskResult {
  ok: boolean;
  message?: string;
}

/** Runs one server action, shows its outcome, and refreshes the page data on success. */
function useActionRunner() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const run = (task: () => Promise<TaskResult>, successMessage: string) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setFeedback({ tone: "error", message: result.message ?? "The action could not be completed." });
        return;
      }
      setFeedback({ tone: "success", message: successMessage });
      router.refresh();
    });
  };

  return { isPending, feedback, run };
}

/** Approve, request changes, reject, or add a private note. The version check rejects stale decisions. */
export function ApplicationDecisionForm({
  userId,
  expectedVersion,
  hasConfirmedFee,
}: {
  userId: string;
  expectedVersion: number;
  hasConfirmedFee: boolean;
}) {
  const [note, setNote] = useState("");
  const { isPending, feedback, run } = useActionRunner();

  const decide = (decision: ReviewDecision) =>
    run(async () => {
      const result = await decideApplicationAction({ userId, decision, note, expectedVersion });
      return result.ok ? { ok: true } : { ok: false, message: result.message };
    }, decision === "NOTE" ? "Note saved." : "Decision recorded.");

  return (
    <div className="space-y-5">
      <FormAlert tone={feedback?.tone ?? "info"} message={feedback?.message ?? null} />
      <FormField
        id="decisionNote"
        label="Reviewer note"
        hint="Private notes are visible only to staff. Reasons for rejection or change requests are shown to the applicant."
      >
        <Textarea id="decisionNote" rows={4} value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} />
      </FormField>
      {hasConfirmedFee ? (
        <p className="text-sm text-brand-muted">
          A fee is already confirmed for this applicant. Rejecting here opens a refund request in the finance queue.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending} onClick={() => decide("APPROVE")}>
          Approve application
        </Button>
        <Button variant="outline" disabled={isPending} onClick={() => decide("REQUEST_CHANGES")}>
          Request changes
        </Button>
        <Button variant="destructive" disabled={isPending} onClick={() => decide("REJECT")}>
          Reject application
        </Button>
        <Button variant="ghost" disabled={isPending || note.trim().length === 0} onClick={() => decide("NOTE")}>
          Save private note
        </Button>
      </div>
    </div>
  );
}

/** Confirms or rejects one transfer. Confirmation needs the statement reference, so the record can be reconciled. */
export function PaymentDecisionForm({ attemptId }: { attemptId: string }) {
  const [reconciliationReference, setReconciliationReference] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const { isPending, feedback, run } = useActionRunner();

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <form
        className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-6"
        onSubmit={(event) => {
          event.preventDefault();
          run(async () => {
            const result = await approvePaymentAction({ attemptId, reconciliationReference, note });
            return result.ok ? { ok: true } : { ok: false, message: result.message };
          }, "Payment confirmed. The receipt is now available to the member.");
        }}
      >
        <h2 className="font-display text-2xl font-semibold">Confirm payment</h2>
        <FormField id="reconciliation" label="Statement reference" required hint="The reference on the receiving-account statement line you matched.">
          <Input id="reconciliation" value={reconciliationReference} onChange={(event) => setReconciliationReference(event.target.value)} maxLength={120} required />
        </FormField>
        <FormField id="confirmNote" label="Note (optional)">
          <Input id="confirmNote" value={note} onChange={(event) => setNote(event.target.value)} maxLength={600} />
        </FormField>
        <Button type="submit" disabled={isPending || reconciliationReference.trim().length < 4}>
          Confirm payment
        </Button>
      </form>

      <form
        className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-6"
        onSubmit={(event) => {
          event.preventDefault();
          run(async () => {
            const result = await rejectPaymentAction({ attemptId, reason });
            return result.ok ? { ok: true } : { ok: false, message: result.message };
          }, "Evidence rejected. The member can send corrected evidence.");
        }}
      >
        <h2 className="font-display text-2xl font-semibold">Reject evidence</h2>
        <FormField id="rejectReason" label="Reason for the member" required hint="At least 10 characters. Shown to the member.">
          <Textarea id="rejectReason" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={600} required />
        </FormField>
        <Button type="submit" variant="destructive" disabled={isPending || reason.trim().length < 10}>
          Reject evidence
        </Button>
      </form>

      <div className="md:col-span-2">
        <FormAlert tone={feedback?.tone ?? "info"} message={feedback?.message ?? null} />
      </div>
    </div>
  );
}

/** Refund steps: decide the request, record the transfer that returned the money, or retry a failed transfer. */
export function RefundActions({ refundId, status }: { refundId: string; status: "REQUESTED" | "APPROVED" | "FAILED" }) {
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState("");
  const { isPending, feedback, run } = useActionRunner();

  return (
    <div className="space-y-4">
      <FormAlert tone={feedback?.tone ?? "info"} message={feedback?.message ?? null} />

      {status === "REQUESTED" ? (
        <>
          <FormField id="refund-note" label="Decision note" hint="Explain the decision. Approving removes access while the refund is processed.">
            <Input id="refund-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={600} />
          </FormField>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={isPending || note.trim().length < 5}
              onClick={() =>
                run(async () => {
                  const result = await decideRefundAction({ refundId, decision: "APPROVED", note });
                  return result.ok ? { ok: true } : { ok: false, message: result.message };
                }, "Refund approved. Access is suspended until it is processed.")
              }
            >
              Approve refund
            </Button>
            <Button
              variant="outline"
              disabled={isPending || note.trim().length < 5}
              onClick={() =>
                run(async () => {
                  const result = await decideRefundAction({ refundId, decision: "REJECTED", note });
                  return result.ok ? { ok: true } : { ok: false, message: result.message };
                }, "Refund request declined.")
              }
            >
              Decline
            </Button>
          </div>
        </>
      ) : null}

      {status === "APPROVED" ? (
        <>
          <FormField id="evidence" label="Transfer reference that returned the money" hint="Record this only after the transfer has actually been made.">
            <Input id="evidence" value={evidence} onChange={(event) => setEvidence(event.target.value)} maxLength={200} />
          </FormField>
          <FormField id="failure-note" label="Failure reason (only if the transfer failed)" hint="Enter a reason here to record a failed transfer.">
            <Input id="failure-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={600} />
          </FormField>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={isPending || evidence.trim().length < 6}
              onClick={() =>
                run(async () => {
                  const result = await markRefundProcessedAction({ refundId, transactionEvidence: evidence });
                  return result.ok ? { ok: true } : { ok: false, message: result.message };
                }, "Refund recorded as processed. The membership is now closed.")
              }
            >
              Mark as processed
            </Button>
            <Button
              variant="outline"
              disabled={isPending || note.trim().length < 5}
              onClick={() =>
                run(async () => {
                  const result = await markRefundFailedAction({ refundId, reason: note });
                  return result.ok ? { ok: true } : { ok: false, message: result.message };
                }, "Recorded as failed. It stays open for another attempt.")
              }
            >
              Record a failed transfer
            </Button>
          </div>
        </>
      ) : null}

      {status === "FAILED" ? (
        <div className="space-y-3">
          <FormField id="retry-note" label="Retry note" hint="Say what has changed before the transfer is attempted again.">
            <Input id="retry-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={600} />
          </FormField>
          <Button
            variant="outline"
            disabled={isPending || note.trim().length < 5}
            onClick={() =>
              run(async () => {
                const result = await retryFailedRefundAction({ refundId, note });
                return result.ok ? { ok: true } : { ok: false, message: result.message };
              }, "Refund returned to approved. You can attempt the transfer again.")
            }
          >
            Retry transfer
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ReportActions({ reportId }: { reportId: string }) {
  const { isPending, feedback, run } = useActionRunner();
  return (
    <div className="space-y-3">
      <FormAlert tone={feedback?.tone ?? "info"} message={feedback?.message ?? null} />
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            run(async () => {
              const result = await decideReportAction({ reportId, decision: "ACTIONED" });
              return result.ok ? { ok: true } : { ok: false, message: result.message };
            }, "Marked as actioned.")
          }
        >
          Action
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            run(async () => {
              const result = await decideReportAction({ reportId, decision: "DISMISSED" });
              return result.ok ? { ok: true } : { ok: false, message: result.message };
            }, "Report dismissed.")
          }
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export function BatchChangeActions({ requestId }: { requestId: string }) {
  const { isPending, feedback, run } = useActionRunner();
  return (
    <div className="space-y-3">
      <FormAlert tone={feedback?.tone ?? "info"} message={feedback?.message ?? null} />
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            run(async () => {
              const result = await decideBatchChangeAction({ requestId, decision: "APPROVED" });
              return result.ok ? { ok: true } : { ok: false, message: result.message };
            }, "Batch corrected.")
          }
        >
          Approve correction
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            run(async () => {
              const result = await decideBatchChangeAction({ requestId, decision: "REJECTED" });
              return result.ok ? { ok: true } : { ok: false, message: result.message };
            }, "Correction declined. The current batch stays.")
          }
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
