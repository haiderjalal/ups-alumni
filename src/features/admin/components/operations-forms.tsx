"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ContentKey } from "@/features/content/domain/documents";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type ManualPaymentMethod } from "@/features/payments/domain/payment-rules";
import {
  addBatchAction,
  grantRoleAction,
  publishContentAction,
  reinstateMemberAction,
  revokeRoleAction,
  saveContentDraftAction,
  saveReceivingAccountAction,
  scheduleFeeAction,
  setBatchListedAction,
  suspendMemberAction,
} from "../actions/admin.actions";

type Feedback = { tone: "error" | "success"; message: string } | null;

interface TaskResult {
  ok: boolean;
  message?: string;
}

function useRunner() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const run = (task: () => Promise<TaskResult>, successMessage: string) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await task();
      setFeedback(result.ok ? { tone: "success", message: successMessage } : { tone: "error", message: result.message ?? "The action could not be completed." });
      if (result.ok) {
        router.refresh();
      }
    });
  };
  return { isPending, feedback, run };
}

export function AddBatchForm() {
  const [year, setYear] = useState("");
  const [label, setLabel] = useState("");
  const { isPending, feedback, run } = useRunner();
  return (
    <form
      className="grid gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        run(async () => {
          const result = await addBatchAction({ year: Number(year), label });
          return result.ok ? { ok: true } : { ok: false, message: result.message };
        }, "Batch added to the catalog.");
      }}
    >
      <FormField id="newBatchYear" label="Matric year" required>
        <Input id="newBatchYear" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} />
      </FormField>
      <FormField id="newBatchLabel" label="Label (optional)">
        <Input id="newBatchLabel" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} />
      </FormField>
      <Button type="submit" disabled={isPending || !year}>
        Add batch
      </Button>
      <div className="sm:col-span-3">
        <FormAlert tone={feedback?.tone ?? "info"} message={feedback?.message ?? null} />
      </div>
    </form>
  );
}

export function BatchListToggle({ batchId, listed }: { batchId: string; listed: boolean }) {
  const { isPending, feedback, run } = useRunner();
  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          run(async () => {
            const result = await setBatchListedAction({ batchId, listed: !listed });
            return result.ok ? { ok: true } : { ok: false, message: result.message };
          }, listed ? "Batch hidden from the sign-up choices." : "Batch listed for sign-up.")
        }
      >
        {listed ? "Hide from choices" : "List for sign-up"}
      </Button>
      <FormAlert tone={feedback?.tone ?? "info"} message={feedback?.message ?? null} />
    </div>
  );
}

export function RoleGrantForm({ batches }: { batches: Array<{ id: string; year: number }> }) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("MEMBERSHIP_ADMIN");
  const [batchId, setBatchId] = useState("");
  const { isPending, feedback, run } = useRunner();
  const needsBatch = role === "BATCH_REPRESENTATIVE";
  return (
    <form
      className="grid gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(async () => {
          const result = await grantRoleAction({ userId, role, batchId: needsBatch ? batchId : undefined });
          return result.ok ? { ok: true } : { ok: false, message: result.message };
        }, "Role granted and recorded in the audit log.");
      }}
    >
      <FormField id="roleUser" label="Member user ID" hint="Copy the user ID from the member's record. Roles are never granted to yourself." required>
        <Input id="roleUser" value={userId} onChange={(event) => setUserId(event.target.value)} />
      </FormField>
      <FormField id="roleName" label="Role" required>
        <select id="roleName" value={role} onChange={(event) => setRole(event.target.value)} className="h-11 w-full rounded-lg border border-brand-border bg-brand-surface px-3">
          <option value="MEMBERSHIP_ADMIN">Membership administrator</option>
          <option value="FINANCE_REVIEWER">Finance reviewer</option>
          <option value="CONTENT_MODERATOR">Content moderator</option>
          <option value="BATCH_REPRESENTATIVE">Batch representative</option>
          <option value="GROUP_REPRESENTATIVE">Group representative</option>
          <option value="SUPER_ADMIN">Super administrator</option>
        </select>
      </FormField>
      {needsBatch ? (
        <FormField id="roleBatch" label="Batch" required>
          <select id="roleBatch" value={batchId} onChange={(event) => setBatchId(event.target.value)} className="h-11 w-full rounded-lg border border-brand-border bg-brand-surface px-3">
            <option value="">Choose a batch</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                Batch {batch.year}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending || userId.trim().length < 5}>
          Grant role
        </Button>
      </div>
      <div className="sm:col-span-2">
        <FormAlert tone={feedback?.tone ?? "info"} message={feedback?.message ?? null} />
      </div>
    </form>
  );
}

export function RevokeRoleButton({ assignmentId }: { assignmentId: string }) {
  const { isPending, feedback, run } = useRunner();
  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(async () => {
        const result = await revokeRoleAction(assignmentId);
        return result.ok ? { ok: true } : { ok: false, message: result.message };
      }, "Role removed.")}>
        Remove
      </Button>
      <FormAlert tone={feedback?.tone ?? "info"} message={feedback?.message ?? null} />
    </div>
  );
}

export function MemberStatusActions({ userId, status }: { userId: string; status: "ACTIVE" | "SUSPENDED" }) {
  const [reason, setReason] = useState("");
  const { isPending, feedback, run } = useRunner();
  return (
    <div className="space-y-3">
      {status === "ACTIVE" ? (
        <>
          <FormField id={`suspend-${userId}`} label="Reason for suspension" hint="At least 10 characters. Recorded in the audit log; the member's sessions end immediately.">
            <Input id={`suspend-${userId}`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={600} />
          </FormField>
          <Button variant="destructive" size="sm" disabled={isPending || reason.trim().length < 10} onClick={() => run(async () => {
            const result = await suspendMemberAction({ userId, reason });
            return result.ok ? { ok: true } : { ok: false, message: result.message };
          }, "Member suspended and signed out.")}>
            Suspend membership
          </Button>
        </>
      ) : (
        <Button size="sm" disabled={isPending} onClick={() => run(async () => {
          const result = await reinstateMemberAction({ userId });
          return result.ok ? { ok: true } : { ok: false, message: result.message };
        }, "Membership reinstated.")}>
          Reinstate membership
        </Button>
      )}
      <FormAlert tone={feedback?.tone ?? "info"} message={feedback?.message ?? null} />
    </div>
  );
}

/** Draft and publish a CMS document. Public pages change only when the publish button is used. */
export function ContentEditor({
  contentKey,
  initialText,
  draftUpdated,
  publishedAt,
}: {
  contentKey: ContentKey;
  initialText: string;
  draftUpdated: string | null;
  publishedAt: string | null;
}) {
  const [text, setText] = useState(initialText);
  const { isPending, feedback, run } = useRunner();
  const [isPublishing, setIsPublishing] = useState(false);

  return (
    <div className="space-y-4">
      <FormField id={`content-${contentKey}`} label="Content" hint="Separate blocks with a blank line. For FAQ: first line is the question, the rest is the answer. For contact: one value per line, in the order shown on the form.">
        <Textarea id={`content-${contentKey}`} rows={12} value={text} onChange={(event) => setText(event.target.value)} />
      </FormField>
      <p className="text-sm text-brand-muted">
        Draft saved {draftUpdated ?? "never"} · Published {publishedAt ?? "never"}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setIsPublishing(false);
            run(async () => {
              const result = await saveContentDraftAction({ key: contentKey, value: parseContentText(contentKey, text) });
              return result.ok ? { ok: true } : { ok: false, message: result.message };
            }, "Draft saved. It is not public yet.");
          }}
        >
          Save draft
        </Button>
        <Button
          disabled={isPending}
          onClick={() => {
            setIsPublishing(true);
            run(async () => {
              const saved = await saveContentDraftAction({ key: contentKey, value: parseContentText(contentKey, text) });
              if (!saved.ok) return { ok: false, message: saved.message };
              const published = await publishContentAction(contentKey);
              return published.ok ? { ok: true } : { ok: false, message: published.message };
            }, "Published. The public page now shows this content.");
          }}
        >
          {isPending && isPublishing ? "Publishing…" : "Publish"}
        </Button>
      </div>
      <FormAlert tone={feedback?.tone ?? "info"} message={feedback?.message ?? null} />
    </div>
  );
}

/** Converts the plain-text editor into the structured document shape the schema expects. Validation runs on the server. */
export function parseContentText(contentKey: ContentKey, text: string): unknown {
  const blocks = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  if (contentKey === "faq") {
    return {
      items: blocks.map((block) => {
        const [question = "", ...answer] = block.split("\n");
        return { question: question.trim(), answer: answer.join(" ").trim() };
      }),
    };
  }
  if (contentKey === "contact") {
    const [email = "", phone = "", postalAddress = "", responseTimeNote = ""] = text.split("\n").map((line) => line.trim());
    return { email, phone, postalAddress, responseTimeNote };
  }
  const [title = "", reviewLine = "", ...rest] = text.split("\n");
  const reviewStatus = reviewLine.trim().toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "PENDING_SCHOOL_REVIEW";
  return { title: title.trim(), reviewStatus, paragraphs: [rest.join("\n").trim()].flatMap((body) => body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) };
}

export function ReceivingAccountForm({
  initial,
}: {
  initial: { id: string | null; method: ManualPaymentMethod; label: string; accountTitle: string; accountIdentifier: string; instructions: string; isActive: boolean; sortOrder: number };
}) {
  const [values, setValues] = useState(initial);
  const { isPending, feedback, run } = useRunner();
  return (
    <form
      className="grid gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(async () => {
          const result = await saveReceivingAccountAction({ id: values.id, data: { ...values, label: values.label, sortOrder: Number(values.sortOrder) } });
          return result.ok ? { ok: true } : { ok: false, message: result.message };
        }, "Receiving account saved.");
      }}
    >
      <FormField id={`method-${values.method}-${values.label}`} label="Method">
        <select value={values.method} onChange={(event) => setValues({ ...values, method: event.target.value as ManualPaymentMethod })} className="h-11 w-full rounded-lg border border-brand-border bg-brand-surface px-3">
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>
          ))}
        </select>
      </FormField>
      <FormField id={`label-${values.method}`} label="Label shown to members">
        <Input id={`label-${values.method}`} value={values.label} onChange={(event) => setValues({ ...values, label: event.target.value })} maxLength={80} />
      </FormField>
      <FormField id={`title-${values.method}`} label="Account title">
        <Input id={`title-${values.method}`} value={values.accountTitle} onChange={(event) => setValues({ ...values, accountTitle: event.target.value })} maxLength={160} />
      </FormField>
      <FormField id={`identifier-${values.method}`} label="Account number, IBAN or wallet">
        <Input id={`identifier-${values.method}`} value={values.accountIdentifier} onChange={(event) => setValues({ ...values, accountIdentifier: event.target.value })} maxLength={80} />
      </FormField>
      <FormField id={`instructions-${values.method}`} label="Instructions" hint="Optional. Shown on the payment page." className="sm:col-span-2">
        <Textarea id={`instructions-${values.method}`} rows={3} value={values.instructions} onChange={(event) => setValues({ ...values, instructions: event.target.value })} maxLength={1000} />
      </FormField>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input type="checkbox" checked={values.isActive} onChange={(event) => setValues({ ...values, isActive: event.target.checked })} className="size-4 accent-brand-deep" />
        Accept payments into this account
      </label>
      <div className="sm:col-span-2 flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>Save account</Button>
      </div>
      <div className="sm:col-span-2">
        <FormAlert tone={feedback?.tone ?? "info"} message={feedback?.message ?? null} />
      </div>
    </form>
  );
}

export function FeeScheduleForm({ currentLabel }: { currentLabel: string }) {
  const [amount, setAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [note, setNote] = useState("");
  const { isPending, feedback, run } = useRunner();
  return (
    <form
      className="grid gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(async () => {
          const result = await scheduleFeeAction({ amountRupees: Number(amount), effectiveFrom: effectiveFrom || null, note });
          return result.ok ? { ok: true } : { ok: false, message: result.message };
        }, "New fee scheduled. Existing orders keep the amount they were created with.");
      }}
    >
      <p className="sm:col-span-2 text-sm text-brand-muted">Current fee: {currentLabel}. Changes add a new schedule row and never edit an existing one.</p>
      <FormField id="feeAmount" label="New fee (PKR)" required>
        <Input id="feeAmount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </FormField>
      <FormField id="feeFrom" label="Takes effect" hint="Leave empty to take effect now.">
        <Input id="feeFrom" type="datetime-local" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} />
      </FormField>
      <FormField id="feeNote" label="Reason for the change" className="sm:col-span-2">
        <Input id="feeNote" value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} />
      </FormField>
      <div className="sm:col-span-2 flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending || !amount}>Schedule fee</Button>
      </div>
      <div className="sm:col-span-2">
        <FormAlert tone={feedback?.tone ?? "info"} message={feedback?.message ?? null} />
      </div>
    </form>
  );
}
