"use client";
import { motion } from "framer-motion";

export function FootballSpinner({ size = 80 }: { size?: number }) {
  return (
    <motion.div
      aria-hidden
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, ease: "linear", duration: 3 }}
      style={{ width: size, height: size, fontSize: size }}
      className="leading-none"
    >
      ⚽
    </motion.div>
  );
}
