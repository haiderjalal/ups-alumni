"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";

import { changePasswordAction, requestAccountClosureAction, requestBatchChangeAction } from "../actions/profile.actions";

type Status = { tone: "error" | "success"; message: string } | null;

interface PasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const form = useForm<PasswordValues>({ defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={form.handleSubmit((values) => {
        setStatus(null);
        startTransition(async () => {
          const result = await changePasswordAction(values);
          if (!result.ok) {
            setStatus({ tone: "error", message: result.message });
            return;
          }
          form.reset();
          setStatus({ tone: "success", message: "Your password has been changed. Other devices have been signed out." });
        });
      })}
    >
      <FormAlert tone={status?.tone ?? "info"} message={status?.message ?? null} />
      <FormField id="currentPassword" label="Current password" required error={errors.currentPassword?.message}>
        <Input id="currentPassword" type="password" autoComplete="current-password" aria-describedby={describedBy("currentPassword", undefined, errors.currentPassword?.message)} {...form.register("currentPassword", { required: "Enter your current password." })} />
      </FormField>
      <FormField id="newPassword" label="New password" required hint="At least 12 characters." error={errors.newPassword?.message}>
        <Input id="newPassword" type="password" autoComplete="new-password" aria-describedby={describedBy("newPassword", "hint", errors.newPassword?.message)} {...form.register("newPassword", { required: "Enter a new password." })} />
      </FormField>
      <FormField id="confirmPassword" label="Confirm new password" required error={errors.confirmPassword?.message}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-describedby={describedBy("confirmPassword", undefined, errors.confirmPassword?.message)} {...form.register("confirmPassword", { required: "Confirm the new password." })} />
      </FormField>
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Changing password…" : "Change password"}
      </Button>
    </form>
  );
}

export function BatchCorrectionForm({ currentYear }: { currentYear: number | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const [requestedYear, setRequestedYear] = useState(currentYear ? String(currentYear) : "");
  const [reason, setReason] = useState("");

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setStatus(null);
        startTransition(async () => {
          const result = await requestBatchChangeAction({ requestedYear, reason });
          if (!result.ok) {
            setStatus({ tone: "error", message: result.message });
            return;
          }
          setStatus({ tone: "success", message: "Your correction was sent for review. Your current batch stays in place until it is decided." });
          router.refresh();
        });
      }}
    >
      <FormAlert tone={status?.tone ?? "info"} message={status?.message ?? null} />
      <FormField id="requestedYear" label="Correct matric completion year" required>
        <Input id="requestedYear" inputMode="numeric" value={requestedYear} onChange={(event) => setRequestedYear(event.target.value)} />
      </FormField>
      <FormField id="batchReason" label="Why is the correction needed?" required hint="At least 20 characters. Reviewers may ask for supporting information.">
        <Textarea id="batchReason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} aria-describedby="batchReason-hint" />
      </FormField>
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Sending…" : "Send for review"}
      </Button>
    </form>
  );
}

export function ClosureRequestButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-4">
      <FormAlert tone={status?.tone ?? "info"} message={status?.message ?? null} />
      {confirming ? (
        <div className="space-y-3 rounded-xl border border-brand-danger/30 bg-brand-danger/5 p-4">
          <p className="text-sm leading-relaxed">
            Closing your account removes your access and personal profile. Payment and receipt records are kept for the
            period set in the retention policy. The network team completes the request.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await requestAccountClosureAction({ kind: "CLOSURE" });
                  setConfirming(false);
                  setStatus(
                    result.ok
                      ? { tone: "success", message: "Your closure request has been sent to the network team." }
                      : { tone: "error", message: result.message },
                  );
                  router.refresh();
                })
              }
            >
              {isPending ? "Sending…" : "Send closure request"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep my account
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setConfirming(true)}>
          Request account closure
        </Button>
      )}
      <p className="text-sm text-brand-muted">
        <a className="underline underline-offset-4" href={ROUTES.privacy}>
          Read the privacy notice
        </a>{" "}
        before you request closure.
      </p>
    </div>
  );
}
