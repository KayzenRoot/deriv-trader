"use client";

/**
 * Minimal Motion integration (foundation smoke only).
 * A subtle fade-in proves the dependency without decorative overbuild.
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";

export function FadeIn({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {children}
    </motion.div>
  );
}
