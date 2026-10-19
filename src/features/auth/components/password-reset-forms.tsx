"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";

import {
  requestPasswordResetAction,
  resetPasswordAction,
  resendVerificationAction,
} from "../actions/auth.actions";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "../validation/auth.schema";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setStatus(null);
    startTransition(async () => {
      const result = await requestPasswordResetAction(values);
      if (!result.ok) {
        setStatus({ tone: "error", message: result.message });
        return;
      }
      setStatus({
        tone: "success",
        message: "If an account exists for that address, a reset link is on its way. The link expires in one hour.",
      });
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormAlert tone={status?.tone ?? "info"} message={status?.message ?? null} />
      <FormField id="email" label="Email address" required error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy("email", undefined, errors.email?.message)}
          {...form.register("email")}
        />
      </FormField>
      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-sm text-brand-muted">
        Remembered it? <Link className="font-semibold text-brand-deep underline" href={ROUTES.login}>Sign in</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: token ?? "", password: "", confirmPassword: "" },
    mode: "onTouched",
  });
  const { errors } = form.formState;

  if (!token) {
    return (
      <div className="space-y-4">
        <FormAlert tone="error" message="This reset link is incomplete. Request a new one." />
        <Button render={<Link href={ROUTES.forgotPassword} />}>Request a new link</Button>
      </div>
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await resetPasswordAction(values);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      router.replace(`${ROUTES.login}?reset=done`);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormAlert tone="error" message={formError} />
      <input type="hidden" {...form.register("token")} />
      <FormField id="password" label="New password" required error={errors.password?.message} hint="Use at least 12 characters.">
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={describedBy("password", "hint", errors.password?.message)}
          {...form.register("password")}
        />
      </FormField>
      <FormField id="confirmPassword" label="Confirm new password" required error={errors.confirmPassword?.message}>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={describedBy("confirmPassword", undefined, errors.confirmPassword?.message)}
          {...form.register("confirmPassword")}
        />
      </FormField>
      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}

/** Asks for the address again rather than reading it from the URL, so no personal data is stored in links. */
export function ResendVerificationForm() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setStatus(null);
    startTransition(async () => {
      const result = await resendVerificationAction({ email: values.email });
      setStatus(
        result.ok
          ? { tone: "success", message: "If the address is waiting for verification, a new link is on its way." }
          : { tone: "error", message: result.message },
      );
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert tone={status?.tone ?? "info"} message={status?.message ?? null} />
      <FormField id="resend-email" label="Email address" required error={errors.email?.message}>
        <Input
          id="resend-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy("resend-email", undefined, errors.email?.message)}
          {...form.register("email")}
        />
      </FormField>
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Sending…" : "Resend verification email"}
      </Button>
    </form>
  );
}
