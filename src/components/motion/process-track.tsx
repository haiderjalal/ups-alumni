"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

/** A vertical line that draws itself in step with scrolling through the steps it wraps. */
export function ProcessTrack({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const height = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className="relative">
      <div aria-hidden="true" className="absolute bottom-2 left-[calc(1rem-0.5px)] top-2 w-px bg-brand-border" />
      <motion.div
        aria-hidden="true"
        className="absolute left-[calc(1rem-0.5px)] top-2 w-px origin-top bg-brand-vermilion"
        style={{ height }}
      />
      {children}
    </div>
  );
}
