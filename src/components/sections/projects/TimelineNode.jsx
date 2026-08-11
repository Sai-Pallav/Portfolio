import { memo, useEffect } from "react";
import { motion, useTransform, useMotionValue, animate } from "framer-motion";

const TimelineNode = memo(function TimelineNode({ scrollYProgress, hasAwakened, isHovered = false }) {
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
    ([base, ao]) => ((base * ao) + (isHovered ? 0.25 : 0)) * ao
  );
  const haloScale = useTransform(focusStrength, v => (0.9 + v * 0.35) * (isHovered ? 1.15 : 1));

  if (!hasAwakened) return null;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center select-none pointer-events-none" aria-hidden="true">
      <style>
        {`
          @keyframes spin-ring {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes breathe-core {
            0%, 100% {
              opacity: 0.25;
              transform: scale(1);
            }
            50% {
              opacity: 0.7;
              transform: scale(1.3);
            }
          }
          @keyframes breathe-pin {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.03);
            }
          }
          .outer-dashed-ring {
            animation: spin-ring 22s linear infinite;
            transition: animation-duration 0.25s ease;
          }
          .group\\/item:hover .outer-dashed-ring {
            animation-duration: 5s;
          }
          .core-glow {
            animation: breathe-core 3.5s ease-in-out infinite;
            transition: animation-duration 0.25s ease;
          }
          .group\\/item:hover .core-glow {
            animation-duration: 1.2s;
          }
          .core-pin {
            animation: breathe-pin 3.5s ease-in-out infinite;
            transition: all 0.25s ease;
          }
          .group\\/item:hover .core-pin {
            animation-duration: 1.2s;
            box-shadow: 0 0 14px var(--accent);
          }
        `}
      </style>

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
        className="absolute inset-0 rounded-full transition-transform duration-250 group-hover/item:scale-108"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={hasAwakened ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-full h-full outer-dashed-ring">
          <div
            className="w-full h-full rounded-full border border-dashed border-[var(--accent)]/35 transition-colors duration-250 group-hover/item:border-[var(--accent)]"
          />
        </div>
      </motion.div>

      {/* 3. Middle Ring: Soft translucent glass-like ring with slight blur */}
      <motion.div
        className="absolute inset-2 rounded-full border bg-white/[0.02] backdrop-blur-[2px] border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] transition-all duration-250 group-hover/item:scale-105 group-hover/item:border-[var(--accent)] group-hover/item:shadow-[0_0_12px_var(--accent-dim),_inset_0_1px_1px_rgba(255,255,255,0.12)]"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={hasAwakened ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
      />

      {/* 4. Core: Bright violet center, sharp focus point, breathing idle state */}
      <div className="relative w-5 h-5">
        {/* Breathing glow overlay behind the core (GPU-composited blur) */}
        <motion.div
          className="absolute inset-0 rounded-full bg-[var(--accent)] blur-[4px] core-glow"
          initial={{ opacity: 0 }}
          animate={hasAwakened ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ pointerEvents: "none" }}
        />

        <motion.div
          className="relative w-full h-full rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] core-pin"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={hasAwakened ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            border: "1.5px solid rgba(255, 255, 255, 0.55)",
            boxShadow: "0 0 8px var(--accent-dim)",
          }}
        >
          {/* Specular high-contrast center pin dot */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white transition-all duration-250 shadow-[0_0_4px_#ffffff] group-hover/item:shadow-[0_0_6px_2px_#ffffff]"
          />
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
