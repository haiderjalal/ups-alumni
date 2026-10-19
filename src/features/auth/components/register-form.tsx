"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import type { ActionResult } from "@/types/action";

import { registerAction } from "../actions/auth.actions";
import { registerSchema, type RegisterFormValues } from "../validation/auth.schema";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "", acceptTerms: false },
    mode: "onTouched",
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result: ActionResult<{ email: string }> = await registerAction(values);
      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof RegisterFormValues, { type: "server", message });
          }
        }
        setFormError(result.message);
        return;
      }
      router.push(ROUTES.verifyEmail);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6" aria-describedby={formError ? "register-form-error" : undefined}>
      <FormAlert tone="error" message={formError} className="" />

      <FormField id="fullName" label="Full name" required error={errors.fullName?.message} hint="As you would like it to appear to classmates.">
        <Input
          id="fullName"
          autoComplete="name"
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={describedBy("fullName", "hint", errors.fullName?.message)}
          {...form.register("fullName")}
        />
      </FormField>

      <FormField id="email" label="Email address" required error={errors.email?.message} hint="We send a verification link to this address.">
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy("email", "hint", errors.email?.message)}
          {...form.register("email")}
        />
      </FormField>

      <FormField
        id="password"
        label="Password"
        required
        error={errors.password?.message}
        hint="Use at least 12 characters. A passphrase of several words works well."
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={describedBy("password", "hint", errors.password?.message)}
          {...form.register("password")}
        />
      </FormField>

      <FormField id="confirmPassword" label="Confirm password" required error={errors.confirmPassword?.message}>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={describedBy("confirmPassword", undefined, errors.confirmPassword?.message)}
          {...form.register("confirmPassword")}
        />
      </FormField>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Checkbox
            id="acceptTerms"
            checked={form.watch("acceptTerms")}
            onCheckedChange={(checked) => form.setValue("acceptTerms", checked === true, { shouldValidate: true })}
            aria-invalid={Boolean(errors.acceptTerms)}
            aria-describedby={describedBy("acceptTerms", undefined, errors.acceptTerms?.message)}
            className="mt-1"
          />
          <label htmlFor="acceptTerms" className="text-sm leading-relaxed text-brand-muted">
            I accept the <a className="font-semibold text-brand-deep underline" href={ROUTES.terms}>terms of use</a> and
            have read the <a className="font-semibold text-brand-deep underline" href={ROUTES.privacy}>privacy notice</a>.
          </label>
        </div>
        {errors.acceptTerms ? (
          <p id="acceptTerms-error" role="alert" className="text-sm font-medium text-brand-danger">
            {errors.acceptTerms.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isPending}>
        {isPending ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}
