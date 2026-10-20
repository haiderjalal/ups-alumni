"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MagneticProps {
  children: ReactNode;
  className?: string;
  /** Fraction of the pointer's distance from the centre that the element follows. Keep it small to stay subtle. */
  strength?: number;
}

/**
 * Lets a primary call to action lean slightly toward the pointer. The wrapped control is unchanged, so its focus
 * ring, link semantics and keyboard behaviour stay exactly as they are. Movement is disabled for reduced motion.
 */
export function Magnetic({ children, className, strength = 0.25 }: MagneticProps) {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 20, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 20, mass: 0.4 });

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
  }

  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      className={cn("inline-flex", className)}
      style={{ x, y }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {children}
    </motion.div>
  );
}
