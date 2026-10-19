"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/action";

import { saveOwnedBusinessAction } from "../actions/business.actions";
import type { OwnedBusinessView } from "../services/business-owner.service";
import {
  ownedBusinessSchema,
  type OwnedBusinessInput,
} from "../validation/business.schema";

interface BusinessOwnerFormProps {
  initial: OwnedBusinessView | null;
  /** True while staff are reviewing the listing. The server rejects edits too; this only avoids a dead form. */
  locked: boolean;
}

interface FormMessage {
  tone: "error" | "success";
  text: string;
}

function toFormValues(initial: OwnedBusinessView | null): OwnedBusinessInput {
  return {
    name: initial?.name ?? "",
    sector: initial?.sector ?? "",
    city: initial?.city ?? "",
    description: initial?.description ?? "",
    productsServices: initial?.productsServices ?? "",
    websiteUrl: initial?.websiteUrl ?? "",
    contactEmail: initial?.contactEmail ?? "",
    contactPhone: initial?.contactPhone ?? "",
  };
}

export function BusinessOwnerForm({ initial, locked }: BusinessOwnerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<FormMessage | null>(null);

  const form = useForm<OwnedBusinessInput>({
    resolver: zodResolver(ownedBusinessSchema),
    defaultValues: toFormValues(initial),
    mode: "onTouched",
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result: ActionResult<{ businessId: string }> =
        await saveOwnedBusinessAction(values);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      setMessage({
        tone: "success",
        text: initial
          ? "Your changes are saved."
          : "Your listing is saved as a draft. Submit it for review when it is ready.",
      });
      router.refresh();
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-6"
      aria-busy={isPending}
    >
      <FormAlert
        tone={message?.tone ?? "info"}
        message={message?.text ?? null}
      />

      <fieldset disabled={locked || isPending} className="min-w-0 space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            id="name"
            label="Business name"
            required
            error={errors.name?.message}
          >
            <Input
              id="name"
              autoComplete="organization"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy(
                "name",
                undefined,
                errors.name?.message,
              )}
              {...form.register("name")}
            />
          </FormField>

          <FormField
            id="sector"
            label="Sector"
            required
            error={errors.sector?.message}
            hint="For example: Education, Food, Software."
          >
            <Input
              id="sector"
              aria-invalid={Boolean(errors.sector)}
              aria-describedby={describedBy(
                "sector",
                "hint",
                errors.sector?.message,
              )}
              {...form.register("sector")}
            />
          </FormField>

          <FormField
            id="city"
            label="City"
            required
            error={errors.city?.message}
          >
            <Input
              id="city"
              autoComplete="address-level2"
              aria-invalid={Boolean(errors.city)}
              aria-describedby={describedBy(
                "city",
                undefined,
                errors.city?.message,
              )}
              {...form.register("city")}
            />
          </FormField>

          <FormField
            id="websiteUrl"
            label="Website"
            error={errors.websiteUrl?.message}
            hint="Optional. Start with https://."
          >
            <Input
              id="websiteUrl"
              type="url"
              inputMode="url"
              autoComplete="url"
              aria-invalid={Boolean(errors.websiteUrl)}
              aria-describedby={describedBy(
                "websiteUrl",
                "hint",
                errors.websiteUrl?.message,
              )}
              {...form.register("websiteUrl")}
            />
          </FormField>
        </div>

        <FormField
          id="description"
          label="About the business"
          required
          error={errors.description?.message}
          hint="Up to 1500 characters."
        >
          <Textarea
            id="description"
            rows={5}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={describedBy(
              "description",
              "hint",
              errors.description?.message,
            )}
            {...form.register("description")}
          />
        </FormField>

        <FormField
          id="productsServices"
          label="Products and services"
          required
          error={errors.productsServices?.message}
          hint="Up to 800 characters."
        >
          <Textarea
            id="productsServices"
            rows={4}
            aria-invalid={Boolean(errors.productsServices)}
            aria-describedby={describedBy(
              "productsServices",
              "hint",
              errors.productsServices?.message,
            )}
            {...form.register("productsServices")}
          />
        </FormField>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            id="contactEmail"
            label="Business email"
            error={errors.contactEmail?.message}
            hint="Optional. Shown publicly only if you choose to publish contact details."
          >
            <Input
              id="contactEmail"
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.contactEmail)}
              aria-describedby={describedBy(
                "contactEmail",
                "hint",
                errors.contactEmail?.message,
              )}
              {...form.register("contactEmail")}
            />
          </FormField>

          <FormField
            id="contactPhone"
            label="Business phone"
            error={errors.contactPhone?.message}
            hint="Optional. For example 0300 1234567."
          >
            <Input
              id="contactPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={Boolean(errors.contactPhone)}
              aria-describedby={describedBy(
                "contactPhone",
                "hint",
                errors.contactPhone?.message,
              )}
              {...form.register("contactPhone")}
            />
          </FormField>
        </div>

        <Button type="submit" size="lg" className="w-full sm:w-auto">
          {isPending ? "Saving…" : initial ? "Save changes" : "Create listing"}
        </Button>
      </fieldset>
    </form>
  );
}
