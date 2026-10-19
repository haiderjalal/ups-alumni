import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { cn } from "@/lib/utils";

/**
 * Typographic wordmark used until the school approves a logo. It is not an official crest and does
 * not reuse any university seal.
 */
export function Wordmark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href={ROUTES.home}
      className={cn("group inline-flex flex-col leading-none", className)}
      aria-label={`${SITE.name} home`}
    >
      <span
        className={cn(
          "font-display text-2xl font-semibold tracking-tight transition-colors duration-200 sm:text-[1.7rem]",
          inverted ? "text-white" : "text-brand-deep",
        )}
      >
        UPS Alumni Network
      </span>
      <span className={cn("mt-1 text-[0.7rem] uppercase tracking-[0.18em]", inverted ? "text-white/75" : "text-brand-muted")}>
        {SITE.contextLine}
      </span>
    </Link>
  );
}
