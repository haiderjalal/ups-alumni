"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent } from "react";

import { PhotoPlaceholder } from "@/components/shared/photo-placeholder";

/**
 * Decorative 3D stack for the hero: layered cards that drift, with a medallion that turns. The whole stage follows
 * the pointer. It is purely visual, so it is hidden from assistive technology.
 */
export function HeroStage() {
  const reduce = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-14, 14]), { stiffness: 120, damping: 18 });
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [10, -10]), { stiffness: 120, damping: 18 });

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function handleLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-[4/5] w-full max-w-md select-none"
      style={{ perspective: 1400 }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <motion.div className="absolute inset-0" style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
        <motion.div
          className="absolute left-[6%] top-[9%] h-[68%] w-[72%] rounded-[1.6rem] bg-brand-tint shadow-[0_30px_60px_-30px_rgba(8,44,37,0.45)]"
          style={{ translateZ: -90, rotate: -8 }}
          animate={reduce ? undefined : { y: [0, -14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-x-[10%] bottom-[8%] top-[18%] overflow-hidden rounded-[1.6rem] shadow-[0_40px_80px_-35px_rgba(8,44,37,0.6)]"
          style={{ translateZ: 40, rotate: 3 }}
          animate={reduce ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <PhotoPlaceholder label="Campus photography, coming soon" className="h-full w-full" />
        </motion.div>
        <motion.div
          className="absolute -right-3 top-[4%] size-28 sm:size-32"
          style={{ translateZ: 120 }}
          animate={reduce ? undefined : { y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Medallion />
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Abstract rings and dots with no lettering or crest shape, so it never resembles an official emblem. */
function Medallion() {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 120 120" className="size-full drop-shadow-xl" focusable="false">
      <motion.g
        style={{ transformOrigin: "60px 60px", transformBox: "view-box" }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="60" cy="60" r="54" fill="none" stroke="#B78A42" strokeWidth="1.5" strokeDasharray="4 10" />
      </motion.g>
      <circle cx="60" cy="60" r="40" fill="#123E35" />
      <motion.g
        style={{ transformOrigin: "60px 60px", transformBox: "view-box" }}
        animate={reduce ? undefined : { rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="60" cy="60" r="30" fill="none" stroke="#B78A42" strokeOpacity="0.6" strokeWidth="1" strokeDasharray="2 6" />
        <circle cx="60" cy="30" r="3.5" fill="#B78A42" />
        <circle cx="90" cy="60" r="2.5" fill="#F8F6EF" fillOpacity="0.8" />
      </motion.g>
    </svg>
  );
}
