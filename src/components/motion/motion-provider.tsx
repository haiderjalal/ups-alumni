"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Honours each visitor's reduced-motion setting for every motion component rendered beneath it. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
