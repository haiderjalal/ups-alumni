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
import type { ActionResult } from "@/types/action";

import { signInAction } from "../actions/auth.actions";
import { signInSchema, type SignInInput } from "../validation/auth.schema";

interface SignInFormProps {
  next?: string;
}

export function SignInForm({ next }: SignInFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result: ActionResult<{ redirectTo: string }> = await signInAction({ ...values, next });
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      router.replace(result.data.redirectTo);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormAlert tone="error" message={formError} />

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

      <FormField id="password" label="Password" required error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={describedBy("password", undefined, errors.password?.message)}
          {...form.register("password")}
        />
      </FormField>

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
        <Link href={ROUTES.forgotPassword} className="text-sm font-semibold text-brand-deep underline underline-offset-4">
          Forgot your password?
        </Link>
      </div>
    </form>
  );
}
