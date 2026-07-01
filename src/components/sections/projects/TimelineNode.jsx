import { memo, useEffect } from "react";
import { motion, useTransform, useMotionValue, animate } from "framer-motion";

const TimelineNode = memo(function TimelineNode({ scrollYProgress, hasAwakened }) {
  // Always call useMotionValue unconditionally to satisfy the Rules of Hooks
  const fallback = useMotionValue(0.5);
  const progress = scrollYProgress || fallback;

  // Track the fade-in of the atmospheric glow upon awakening
  const awakenedOpacity = useMotionValue(0);

  useEffect(() => {
    if (hasAwakened) {
      const controls = animate(awakenedOpacity, 1, { duration: 0.5, ease: "easeOut" });
      return () => controls.stop();
    } else {
      awakenedOpacity.set(0);
    }
  }, [hasAwakened, awakenedOpacity]);

  // Advanced Scroll Enhancement: calculate focus strength based on viewport position
  // Focus peaks exactly at 0.5 (when the item is in the center of the screen)
  const focusStrength = useTransform(
    progress,
    [0.15, 0.5, 0.85],
    [0.3, 1.0, 0.3]
  );

  // Dynamic atmospheric glow properties driven by viewport focus, masked by the awakening progress
  const baseHaloOpacity = useTransform(focusStrength, v => v * 0.15);
  const haloOpacity = useTransform(
    [baseHaloOpacity, awakenedOpacity],
    ([base, ao]) => base * ao
  );
  const haloScale = useTransform(focusStrength, v => 0.9 + v * 0.35);

  return (
    <div className="relative w-12 h-12 flex items-center justify-center select-none pointer-events-none" aria-hidden="true">
      {/* 1. Multi-Layer Glow (Atmospheric blur halo linked to viewport center focus and masked until awakened) */}
      <motion.div
        className="absolute w-14 h-14 rounded-full bg-[var(--accent)] blur-[10px]"
        style={{
          opacity: haloOpacity,
          scale: haloScale,
        }}
      />

      {/* 2. Outer Ring: Thin precision dashed ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={hasAwakened ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div
          className="w-full h-full rounded-full border border-dashed border-[var(--accent)]/30"
        />
      </motion.div>

      {/* 3. Middle Ring: Soft translucent glass-like ring with slight blur */}
      <motion.div
        className="absolute inset-2 rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-[2px]"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={hasAwakened ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        style={{
          boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.08)",
        }}
      />

      {/* 4. Core: Bright violet center, sharp focus point, breathing idle state */}
      <div className="relative w-5 h-5">
        {/* Breathing glow overlay behind the core (GPU-composited blur) */}
        <motion.div
          className="absolute inset-0 rounded-full bg-[var(--accent)] blur-[4px]"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={hasAwakened ? {
            opacity: [0.25, 0.7, 0.25],
            scale: [1, 1.3, 1],
          } : { opacity: 0, scale: 0.85 }}
          transition={hasAwakened ? {
            opacity: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
          } : {}}
          style={{ pointerEvents: "none" }}
        />

        <motion.div
          className="relative w-full h-full rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)]"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={hasAwakened ? {
            scale: [1, 1.03, 1],
            opacity: 1,
          } : { scale: 0.85, opacity: 0 }}
          transition={hasAwakened ? {
            scale: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 0.3 }
          } : {}}
          style={{
            border: "1.5px solid rgba(255, 255, 255, 0.45)",
            boxShadow: "0 0 8px var(--accent-dim)",
          }}
        >
          {/* Specular high-contrast center pin dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_4px_#ffffff]" />
        </motion.div>
      </div>

      {/* 5. Energy Ripple (Single-shot wave expanding outward on wake-up) */}
      {hasAwakened && (
        <motion.div
          className="absolute rounded-full border border-[var(--accent)]/50 pointer-events-none"
          initial={{ width: 18, height: 18, opacity: 0.8 }}
          animate={{ width: 44, height: 44, opacity: 0 }}
          transition={{ duration: 1.0, ease: "easeOut" }}
        />
      )}
    </div>
  );
});

export default TimelineNode;
