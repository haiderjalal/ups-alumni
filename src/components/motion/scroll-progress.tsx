"use client";

import { motion, useScroll } from "motion/react";

/** A thin vermilion bar across the top of the page that fills as the visitor scrolls. Decorative only. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-brand-vermilion"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
