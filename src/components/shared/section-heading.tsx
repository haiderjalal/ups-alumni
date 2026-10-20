import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Use `h1` only once per page; sections default to `h2`. */
  as?: "h1" | "h2";
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, as = "h2", align = "left", className }: SectionHeadingProps) {
  const Heading = as;
  return (
    <header className={cn("max-w-2xl space-y-4", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-violet">{eyebrow}</p>
      ) : null}
      <Heading
        className={cn(
          "font-display font-semibold leading-tight",
          as === "h1" ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl lg:text-[2.75rem]",
        )}
      >
        {title}
      </Heading>
      {description ? <div className="text-base leading-relaxed text-brand-muted sm:text-lg">{description}</div> : null}
    </header>
  );
}
