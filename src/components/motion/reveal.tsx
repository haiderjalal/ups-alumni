"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Seconds to wait after the element enters the viewport. */
  delay?: number;
  /** Starting distance in pixels; the element rises into place. */
  distance?: number;
  className?: string;
}

/** Fades and rises content into view once, when it first scrolls into view. */
export function Reveal({ children, delay = 0, distance = 36, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
