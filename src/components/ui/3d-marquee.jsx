"use client";

import { motion, useInView, AnimatePresence } from "motion/react";
import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// ─── Constants for configuration ─────────────────────────────────────────────
const SCROLL_CONFIG = {
  TILE_SIZE: 140,
  TILE_GAP: 24,
  ITEM_HEIGHT: 164,
  SCROLL_DURATION: 20,
  TILE_STAGGER: 90,
  SCROLL_DELAY_BUFFER: 700,
  ENTRANCE_DURATION: 0.55,
  HOVER_DURATION: 0.35,
  ICON_HOVER_DURATION: 0.4,
};

// ─── Skill Info Modal ─────────────────────────────────────────────────────────
const SkillModal = ({ skill, imageUrl, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const levelColor =
    skill.level >= 85 ? "var(--accent)" :
    skill.level >= 70 ? "#f59e0b" :
    "#94a3b8";

  const levelLabel =
    skill.level >= 85 ? "Expert" :
    skill.level >= 70 ? "Proficient" :
    "Learning";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 12 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm rounded-3xl overflow-hidden"
          style={{
            background: "rgba(15,15,20,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
            aria-label="Close skill info"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Header */}
          <div
            className="px-7 pt-7 pb-6 flex items-center gap-5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <img src={imageUrl} alt={skill.name} className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white leading-tight">{skill.name}</h3>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{skill.tag}</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-7 py-6 space-y-5">
            {/* Proficiency bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Proficiency
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: levelColor }}>
                  {levelLabel}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${skill.level}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(to right, ${levelColor}, ${levelColor}88)` }}
                />
              </div>
              <div className="flex justify-end mt-1">
                <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{skill.level}%</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="text-2xl font-bold text-white">{skill.years}+</div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Years Experience</div>
              </div>
              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="text-2xl font-bold" style={{ color: levelColor }}>
                  {skill.level >= 85 ? "★★★" : skill.level >= 70 ? "★★☆" : "★☆☆"}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Skill Rating</div>
              </div>
            </div>

            {/* Notable project */}
            <div
              className="rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9 2.5 10.5 3 7 .5 4.5 4 4z" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Notable Project
                </div>
                <div className="text-sm font-semibold text-white">{skill.project}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Single column: scrolls forever once isInView fires ──────────────────────
const MarqueeColumn = ({
  subarray, colIndex, chunkSize, isInView, maxItems,
  directionPattern, isPaused, onSkillClick, onSkillHover,
}) => {
  const [scrolling, setScrolling] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const scrollRef = useRef(null);
  const timeoutRef = useRef(null);
  const scrollPositionRef = useRef(null);
  const isPausedRef = useRef(isPaused);

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isInView || prefersReducedMotion) {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      setScrolling(false);
      return;
    }
    try {
      const lastCardGlobalIndex = colIndex * chunkSize + subarray.length - 1;
      const totalDelay = lastCardGlobalIndex * SCROLL_CONFIG.TILE_STAGGER + SCROLL_CONFIG.SCROLL_DELAY_BUFFER;
      timeoutRef.current = setTimeout(() => { setScrolling(true); timeoutRef.current = null; }, totalDelay);
    } catch (error) {
      console.error('Error setting up scroll animation:', error);
      setScrolling(false);
    }
    return () => { if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; } };
  }, [isInView, colIndex, chunkSize, subarray.length, prefersReducedMotion]);

  useEffect(() => {
    if (!scrolling || prefersReducedMotion || !scrollRef.current) return;

    const pattern = directionPattern || [-1, 1, -1, 1, -1];
    const direction = pattern[colIndex] ?? -1;
    const totalHeight = maxItems * SCROLL_CONFIG.ITEM_HEIGHT;
    const durationMultiplier = direction === 1 ? 1.8 : 0.85;
    const adjustedDuration = SCROLL_CONFIG.SCROLL_DURATION * durationMultiplier;
    const pixelsPerMs = totalHeight / (adjustedDuration * 1000);

    if (scrollPositionRef.current === null) {
      scrollPositionRef.current = -totalHeight;
      if (scrollRef.current) scrollRef.current.style.transform = `translate3d(0, ${-totalHeight}px, 0)`;
    }

    let rafId, lastTime;
    const animate = (time) => {
      if (lastTime === undefined) lastTime = time;
      const deltaTime = time - lastTime;
      lastTime = time;

      if (!isPausedRef.current) {
        const clampedDelta = Math.min(deltaTime, 50);
        scrollPositionRef.current += direction * pixelsPerMs * clampedDelta;
        if (scrollPositionRef.current <= -2 * totalHeight) scrollPositionRef.current += totalHeight;
        else if (scrollPositionRef.current >= 0) scrollPositionRef.current -= totalHeight;
        if (scrollRef.current) scrollRef.current.style.transform = `translate3d(0, ${scrollPositionRef.current}px, 0)`;
      }
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(rafId); };
  }, [scrolling, prefersReducedMotion, directionPattern, colIndex, maxItems]);

  const totalHeight = maxItems * SCROLL_CONFIG.ITEM_HEIGHT;
  const paddedArray = Array.from({ length: maxItems }, (_, i) => subarray[i % subarray.length]);
  // The scroll position oscillates between 0 and -2*totalHeight, so three
  // stacked copies fully cover the visible window at every wrap point.
  // Six copies (the previous value) just doubled the tile/DOM count and the
  // number of animated surfaces with no visual difference.
  const duplicatedArray = [...paddedArray, ...paddedArray, ...paddedArray];

  return (
    <div
      ref={scrollRef}
      className="flex flex-col items-start"
      style={{ gap: `${SCROLL_CONFIG.TILE_GAP}px`, willChange: "transform" }}
      role="list"
      aria-label={`Technology icons column ${colIndex + 1}`}
    >
      {duplicatedArray.map((item, imageIndex) => {
        const image = typeof item === "string" ? item : item.url;
        const skill = typeof item === "object" ? item.skill : null;
        const originalIndex = imageIndex % paddedArray.length;
        const globalIndex = colIndex * chunkSize + (originalIndex % subarray.length);
        const tileDelay = globalIndex * (SCROLL_CONFIG.TILE_STAGGER / 1000);

        return (
          <motion.div
            key={`${imageIndex}-${image}`}
            initial={{ opacity: 0, scale: 0.6, filter: "blur(12px)" }}
            animate={
              isInView
                ? { opacity: 1, scale: 1, filter: "blur(0px)" }
                : { opacity: 0, scale: 0.6, filter: "blur(12px)" }
            }
            transition={{
              duration: prefersReducedMotion ? 0 : SCROLL_CONFIG.ENTRANCE_DURATION,
              delay: prefersReducedMotion ? 0 : tileDelay,
              ease: [0.16, 1, 0.3, 1],
            }}
            whileHover="hover"
            onHoverStart={() => skill && onSkillHover(skill.name)}
            onHoverEnd={() => onSkillHover(null)}
            onClick={() => skill && onSkillClick({ skill, imageUrl: image })}
            className="relative cursor-pointer pointer-events-auto"
            style={{
              width: `${SCROLL_CONFIG.TILE_SIZE}px`,
              height: `${SCROLL_CONFIG.TILE_SIZE}px`,
              // Don't permanently promote every tile to its own layer. Only the
              // scrolling column needs `will-change: transform`; individual tiles
              // animate only on hover/entrance, so a persistent hint here just
              // created dozens of extra compositor layers.
            }}
            role="listitem"
            aria-label={skill ? `${skill.name} — click for details` : `Technology icon ${originalIndex + 1}`}
          >
            <motion.div
              variants={{
                hover: {
                  scale: 1.08,
                  boxShadow: "0 24px 48px -12px var(--border-glow)",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
              }}
              style={{
                scale: 1,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                // Solid translucent fill instead of backdrop-filter: blur().
                // A live backdrop blur on every tile forces the compositor to
                // re-render each surface on every scroll frame — multiplied by
                // dozens of tiles inside a 3D-rotated, masked container, that
                // was the main cause of the dropped frames. The flat fill looks
                // the same against the dark grid but is essentially free.
                backgroundColor: "rgba(255, 255, 255, 0.06)",
              }}
              transition={{ duration: prefersReducedMotion ? 0 : SCROLL_CONFIG.HOVER_DURATION, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-3xl border border-white/10"
            >
              <motion.div
                variants={{ hover: { scale: 1.15, filter: "drop-shadow(0 0 20px var(--border-glow))" } }}
                style={{ scale: 1, filter: "drop-shadow(0 0 0px var(--border-glow))" }}
                className="size-16"
              >
                <div className="relative size-full">
                  {/* Default (muted) icon */}
                  <motion.div
                    variants={{ hover: { opacity: 0 } }}
                    transition={{ duration: prefersReducedMotion ? 0 : SCROLL_CONFIG.ICON_HOVER_DURATION }}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      opacity: 1,
                      background: "var(--text-muted)",
                      maskImage: `url(${image})`,
                      maskSize: "contain",
                      maskRepeat: "no-repeat",
                      maskPosition: "center",
                      WebkitMaskImage: `url(${image})`,
                      WebkitMaskSize: "contain",
                      WebkitMaskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                    }}
                  />
                  {/* Hover (colored) icon */}
                  <motion.div
                    variants={{ hover: { opacity: 1 } }}
                    transition={{ duration: prefersReducedMotion ? 0 : SCROLL_CONFIG.ICON_HOVER_DURATION }}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      opacity: 0,
                      background: "linear-gradient(to right, var(--accent), var(--accent-hover))",
                      maskImage: `url(${image})`,
                      maskSize: "contain",
                      maskRepeat: "no-repeat",
                      maskPosition: "center",
                      WebkitMaskImage: `url(${image})`,
                      WebkitMaskSize: "contain",
                      WebkitMaskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                    }}
                  />
                </div>
              </motion.div>

              {/* Accent ring on hover */}
              <motion.div
                variants={{ hover: { opacity: 1 } }}
                style={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ border: "1px solid var(--accent)", opacity: 0 }}
              />
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ─── Main Marquee ─────────────────────────────────────────────────────────────
export const ThreeDMarquee = ({ images, className, directionPattern }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [activeSkill, setActiveSkill] = useState(null);
  // Tooltip state: lifted out of the overflow-hidden container so it's never clipped
  const [hoveredSkillName, setHoveredSkillName] = useState(null);

  const columns = 5;
  const chunkSize = Math.ceil(images.length / columns);
  const chunks = Array.from({ length: columns }, (_, colIndex) => {
    const start = colIndex * chunkSize;
    return images.slice(start, start + chunkSize);
  });

  const maxItems = Math.max(...chunks.map(chunk => chunk.length));
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px 0px" });

  const handleSkillClick = useCallback((data) => {
    setActiveSkill(data);
    setIsPaused(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setActiveSkill(null);
    setIsPaused(false);
  }, []);

  return (
    // Outer wrapper: NOT overflow-hidden so the tooltip can escape upward
    <div ref={ref} className={cn("relative w-full", className)}>
      {/* Skill Info Modal (fixed, always escapes any overflow) */}
      {activeSkill && (
        <SkillModal
          skill={activeSkill.skill}
          imageUrl={activeSkill.imageUrl}
          onClose={handleModalClose}
        />
      )}

      {/* ── Tooltip: rendered ABOVE the overflow-hidden marquee box ── */}
      <AnimatePresence>
        {hoveredSkillName && (
          <motion.div
            key={hoveredSkillName}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none"
          >
            <div
              className="px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap"
              style={{
                background: "rgba(10,10,15,0.92)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
              }}
            >
              {hoveredSkillName}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── The actual 3D grid (overflow-hidden for edge clipping) ── */}
      <div
        className="mx-auto block h-[600px] w-full overflow-hidden rounded-3xl max-sm:h-[400px] relative"
        style={{ maskImage: "radial-gradient(ellipse at center, black 20%, transparent 80%)" }}
      >
        {/* Pause/Resume button */}
        <motion.button
          onClick={() => setIsPaused(p => !p)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-5 right-5 z-50 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold"
          style={{
            background: "rgba(15,15,20,0.85)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(8px)",
          }}
          aria-label={isPaused ? "Resume animation" : "Pause animation"}
        >
          {isPaused ? (
            <>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1.5l7 3.5-7 3.5z"/></svg>
              Resume
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <rect x="1.5" y="1.5" width="2.5" height="7" rx="0.5"/>
                <rect x="6" y="1.5" width="2.5" height="7" rx="0.5"/>
              </svg>
              Pause
            </>
          )}
        </motion.button>

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            style={{ transform: "rotateX(55deg) rotateY(0deg) rotateZ(-45deg)", gap: `${SCROLL_CONFIG.TILE_GAP}px` }}
            className="relative grid grid-cols-5 scale-75 sm:scale-90 lg:scale-100 transform-3d origin-center pointer-events-none"
          >
            {chunks.map((subarray, colIndex) => (
              <MarqueeColumn
                key={colIndex}
                subarray={subarray}
                colIndex={colIndex}
                chunkSize={chunkSize}
                isInView={isInView}
                maxItems={maxItems}
                directionPattern={directionPattern}
                isPaused={isPaused}
                onSkillClick={handleSkillClick}
                onSkillHover={setHoveredSkillName}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
