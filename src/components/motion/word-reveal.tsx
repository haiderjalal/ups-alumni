"use client";

import { motion } from "motion/react";
import { Fragment } from "react";

interface WordRevealProps {
  text: string;
  className?: string;
  /** Seconds before the first word starts. */
  delay?: number;
}

/**
 * Splits a heading into words and rotates each one into place in 3D. The full text stays available to screen
 * readers, and the animated copy is hidden from them so it is not read twice.
 */
export function WordReveal({ text, className, delay = 0 }: WordRevealProps) {
  const words = text.split(" ");

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-block" style={{ perspective: 900 }}>
        {words.map((word, index) => (
          <Fragment key={`${word}-${index}`}>
            <motion.span
              className="inline-block"
              style={{ transformOrigin: "50% 100%" }}
              initial={{ opacity: 0, y: "0.6em", rotateX: -75 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.9, delay: delay + index * 0.09, ease: [0.22, 1, 0.36, 1] }}
            >
              {word}
            </motion.span>
            {index < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </span>
  );
}
