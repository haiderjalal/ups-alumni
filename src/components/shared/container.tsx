import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Constrains page content to the design's maximum width with a 16px mobile gutter. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}
