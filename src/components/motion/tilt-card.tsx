"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Maximum tilt in degrees. */
  intensity?: number;
}

/**
 * A card that tilts in 3D toward the pointer and springs back when the pointer leaves. Disabled for visitors who
 * prefer reduced motion, and it never affects keyboard focus or the card's content.
 */
export function TiltCard({ children, className, intensity = 9 }: TiltCardProps) {
  const reduce = useReducedMotion();
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-intensity, intensity]), { stiffness: 220, damping: 22 });
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [intensity, -intensity]), { stiffness: 220, damping: 22 });

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width);
    pointerY.set((event.clientY - rect.top) / rect.height);
  }

  function handleLeave() {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }

  return (
    <div className={className} style={{ perspective: 1000 }} onPointerMove={handleMove} onPointerLeave={handleLeave}>
      <motion.div className="h-full" style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
        {children}
      </motion.div>
    </div>
  );
}
