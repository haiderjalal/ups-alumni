"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Corner radius utility. The spotlight uses the same radius, so the glow never spills past the corners. */
  radius?: string;
  /** Maximum tilt in degrees. */
  intensity?: number;
}

/**
 * A card that tilts in 3D toward the pointer and springs back when the pointer leaves, with a soft lavender spotlight that
 * follows the pointer. Tilt is disabled for visitors who prefer reduced motion. The spotlight is decorative and sits
 * above the content without intercepting clicks, so it never affects keyboard focus or readability.
 */
export function TiltCard({ children, className, radius = "rounded-2xl", intensity = 9 }: TiltCardProps) {
  const reduce = useReducedMotion();
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-intensity, intensity]), { stiffness: 220, damping: 22 });
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [intensity, -intensity]), { stiffness: 220, damping: 22 });

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
    if (reduce) return;
    pointerX.set((event.clientX - rect.left) / rect.width);
    pointerY.set((event.clientY - rect.top) / rect.height);
  }

  function handleLeave() {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }

  return (
    <div
      className={cn("ups-spotlight-host", className)}
      style={{ perspective: 1000 }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <motion.div
        className={cn("relative h-full", radius)}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        {children}
        <div aria-hidden="true" className={cn("ups-spotlight", radius)} />
      </motion.div>
    </div>
  );
}
