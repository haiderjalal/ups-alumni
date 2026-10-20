import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

import { REGISTRATION_STEPS, type RegistrationStepSlug, stepIndex } from "../domain/steps";

interface OnboardingProgressProps {
  currentSlug: RegistrationStepSlug;
  /** Number of steps (0 to 5) the applicant has completed. Later steps are not clickable until reached. */
  completedCount: number;
}

/** Step list with accessible state: the current step is marked with aria-current, not colour alone. */
export function OnboardingProgress({ currentSlug, completedCount }: OnboardingProgressProps) {
  const currentIndex = stepIndex(currentSlug);

  return (
    <nav aria-label="Registration progress">
      <ol className="grid gap-3 sm:grid-cols-5">
        {REGISTRATION_STEPS.map((step, index) => {
          const isComplete = index < completedCount;
          const isCurrent = index === currentIndex;
          const isReachable = index <= completedCount;
          const content = (
            <span className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  isComplete && "border-brand-success bg-brand-success text-white",
                  isCurrent && !isComplete && "border-brand-deep bg-brand-deep text-white",
                  !isComplete && !isCurrent && "border-brand-border bg-brand-surface text-brand-muted",
                )}
              >
                {isComplete ? <CheckCircle2 aria-hidden="true" className="size-4" /> : index + 1}
              </span>
              <span className="pt-1 text-sm leading-snug">
                <span className="sr-only">{isComplete ? "Completed: " : isCurrent ? "Current step: " : ""}</span>
                {step.label}
              </span>
            </span>
          );

          return (
            <li key={step.slug} aria-current={isCurrent ? "step" : undefined}>
              {isReachable && !isCurrent ? (
                <Link
                  href={`${ROUTES.appOnboarding}/${step.slug}`}
                  className="block rounded-lg p-2 hover:bg-brand-lilac focus-visible:outline-brand-deep"
                >
                  {content}
                </Link>
              ) : (
                <div className={cn("p-2", !isReachable && "opacity-60")}>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
