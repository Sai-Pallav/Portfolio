"use client";

import { motion, useInView, useMotionValue, useSpring } from "motion/react";
import { useRef, useState, useEffect, useCallback, useMemo, memo } from "react";
import { cn } from "@/lib/utils";

// ─── Constants for configuration ─────────────────────────────────────────────
const SCROLL_CONFIG = {
  SPEED_PX_PER_S: 40,
  TILE_SIZE: 160,
  TILE_GAP: 60,
  ITEM_HEIGHT: 220,
  ENTRANCE_DURATION: 0.8,
  TILE_STAGGER: 40,
  HOVER_DURATION: 0.3,
  ICON_HOVER_DURATION: 0.2,
};


// ─── Single column: scrolls forever once isInView fires ──────────────────────
const MarqueeColumn = memo(({
  subarray, colIndex, chunkSize, isInView, maxItems,
  directionPattern, onSkillHover,
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });
  const scrollRef = useRef(null);
  const timeoutRef = useRef(null);
  const scrollPositionRef = useRef(null);
  const isPausedRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isInView || prefersReducedMotion || !scrollRef.current) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const startScroll = () => {
      const pattern = directionPattern || [-1, 1, -1, 1, -1];
      const direction = pattern[colIndex] ?? -1;
      const totalHeight = maxItems * SCROLL_CONFIG.ITEM_HEIGHT;
      const pixelsPerMs = (SCROLL_CONFIG.SPEED_PX_PER_S || 40) / 1000;

      if (scrollPositionRef.current === null) {
        scrollPositionRef.current = -totalHeight;
        if (scrollRef.current) {
          scrollRef.current.style.transform = `translate3d(0, ${-totalHeight}px, 0)`;
        }
      }

      let rafId, lastTime;
      const animate = (time) => {
        if (lastTime === undefined) lastTime = time;
        const deltaTime = time - lastTime;
        lastTime = time;

        if (!isPausedRef.current) {
          const clampedDelta = Math.min(deltaTime, 50);
          scrollPositionRef.current += direction * pixelsPerMs * clampedDelta;
          if (scrollPositionRef.current <= -2 * totalHeight) {
            scrollPositionRef.current += totalHeight;
          } else if (scrollPositionRef.current >= 0) {
            scrollPositionRef.current -= totalHeight;
          }
          if (scrollRef.current) {
            scrollRef.current.style.transform = `translate3d(0, ${scrollPositionRef.current}px, 0)`;
          }
        }
        rafId = requestAnimationFrame(animate);
      };

      rafId = requestAnimationFrame(animate);
      return rafId;
    };

    const lastCardGlobalIndex = colIndex * chunkSize + subarray.length - 1;
    const totalDelay = lastCardGlobalIndex * SCROLL_CONFIG.TILE_STAGGER + 700; // delay based on stagger

    let activeRafId;
    timeoutRef.current = setTimeout(() => {
      activeRafId = startScroll();
      timeoutRef.current = null;
    }, totalDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (activeRafId) {
        cancelAnimationFrame(activeRafId);
      }
    };
  }, [isInView, prefersReducedMotion, directionPattern, colIndex, maxItems, chunkSize, subarray.length]);

  // Build stable arrays with useMemo so they never recreate on re-render
  const duplicatedArray = useMemo(() => {
    const padded = Array.from({ length: maxItems }, (_, i) => subarray[i % subarray.length]);
    // 5 copies: the scroll wraps over exactly 1 copy height, so 3 would suffice,
    // but 5 gives extra room for fast scrollers without visual gaps.
    return [
      ...padded.map((item, i) => ({ item, copyIndex: 0, slotIndex: i })),
      ...padded.map((item, i) => ({ item, copyIndex: 1, slotIndex: i })),
      ...padded.map((item, i) => ({ item, copyIndex: 2, slotIndex: i })),
      ...padded.map((item, i) => ({ item, copyIndex: 3, slotIndex: i })),
      ...padded.map((item, i) => ({ item, copyIndex: 4, slotIndex: i })),
    ];
  }, [subarray, maxItems]);

  return (
    <div
      ref={scrollRef}
      className="flex flex-col items-start"
      style={{ gap: `${SCROLL_CONFIG.TILE_GAP}px`, willChange: "transform" }}
      role="list"
      aria-label={`Technology icons column ${colIndex + 1}`}
    >
      {duplicatedArray.map(({ item, copyIndex, slotIndex }) => {
        const image = item.url;
        const skill = item.skill;
        // Globally unique + stable key: won't change across re-renders
        const stableKey = `c${colIndex}-s${slotIndex}-x${copyIndex}`;

        // Only the very first copy of each slot plays the entrance animation.
        // All duplicate copies start fully visible so they never flicker or
        // appear to "swap" when the scroll container is translated.
        const isFirstCopy = copyIndex === 0;
        const globalIndex = colIndex * chunkSize + (slotIndex % subarray.length);
        const tileDelay = isFirstCopy ? globalIndex * (SCROLL_CONFIG.TILE_STAGGER / 1000) : 0;

        return (
          <motion.div
            key={stableKey}
            initial={isFirstCopy ? { opacity: 0, scale: 0.6, filter: "blur(12px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
            animate={
              isFirstCopy
                ? (isInView
                  ? { opacity: 1, scale: 1, filter: "blur(0px)" }
                  : { opacity: 0, scale: 0.6, filter: "blur(12px)" })
                : { opacity: 1, scale: 1, filter: "blur(0px)" }
            }
            transition={{
              duration: (isFirstCopy && !prefersReducedMotion) ? SCROLL_CONFIG.ENTRANCE_DURATION : 0,
              delay: (isFirstCopy && !prefersReducedMotion) ? tileDelay : 0,
              ease: [0.16, 1, 0.3, 1],
            }}
            whileHover="hover"
            onPointerEnter={(e) => {
              isPausedRef.current = true;
              if (skill) onSkillHover(skill, 'mouse', e);
            }}
            onPointerLeave={() => {
              isPausedRef.current = false;
              onSkillHover(null, 'mouse');
            }}
            onFocus={() => {
              isPausedRef.current = true;
              if (skill) onSkillHover(skill, 'keyboard');
            }}
            onBlur={() => {
              isPausedRef.current = false;
              onSkillHover(null, 'keyboard');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // We can trigger an active press via keyboard if we added a state,
                // but just handling focus is enough for tooltip visibility.
              }
            }}
            tabIndex={0}
            className="relative cursor-default pointer-events-auto rounded-3xl focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-4"
            style={{
              width: `${SCROLL_CONFIG.TILE_SIZE}px`,
              height: `${SCROLL_CONFIG.TILE_SIZE}px`,
              contain: "layout style",
              willChange: prefersReducedMotion ? "auto" : "transform, opacity",
            }}
            role="listitem"
            aria-label={skill ? skill.name : `Technology icon ${slotIndex + 1}`}
          >
            <motion.div
              variants={{
                hover: {
                  scale: 1.08,
                  z: 0,
                  boxShadow: "0 24px 48px -12px var(--border-glow)",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
                active: {
                  scale: 1.02,
                  z: -20, // push down into the keyboard
                  boxShadow: "0 12px 24px -12px var(--border-glow)",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                }
              }}
              style={{
                scale: 1,
                z: 0,
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.2)",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
              }}
              transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", mass: 0.8, stiffness: 250, damping: 22 }}
              whileHover="hover"
              whileTap="active"
              className={`absolute inset-0 overflow-hidden rounded-3xl border border-white/5 ${skill?.label ? "flex flex-col items-center justify-center" : "flex items-center justify-center"}`}
            >
              {/* Static Fallback Background for performance (no blur) */}
              <div
                className="absolute inset-0 pointer-events-none bg-white/[0.02]"
              />
              
              {/* Animated Blur - ONLY on hover to save GPU */}
              <motion.div
                variants={{ 
                  hover: { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", opacity: 1 } 
                }}
                initial={{ backdropFilter: "blur(0px)", WebkitBackdropFilter: "blur(0px)", opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 pointer-events-none"
                style={{ transform: "translateZ(0)" }}
              />

              <motion.div
                variants={{ hover: { scale: 1.15, filter: "drop-shadow(0 0 20px var(--border-glow))" } }}
                style={{ scale: 1, filter: "drop-shadow(0 0 0px var(--border-glow))" }}
                className={`z-10 ${skill?.label ? "size-12" : "size-20"}`}
              >
                <div className="relative size-full pointer-events-none">
                  {/* Default (muted) icon */}
                  <motion.div
                    variants={{ hover: { opacity: 0 } }}
                    transition={{ duration: prefersReducedMotion ? 0 : SCROLL_CONFIG.ICON_HOVER_DURATION }}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      opacity: 1,
                      transform: "translateZ(0)",
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
                      transform: "translateZ(0)",
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

              {/* Text label for concept tiles */}
              {skill?.label && (
                <div
                  className="z-10 px-2 text-center leading-tight mt-1.5 pointer-events-none"
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.65)",
                    maxWidth: `${SCROLL_CONFIG.TILE_SIZE - 16}px`,
                    wordBreak: "break-word",
                  }}
                >
                  {skill.label}
                </div>
              )}

              {/* Accent ring on hover */}
              <motion.div
                variants={{ hover: { opacity: 1 } }}
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
});

// ─── Main Marquee ─────────────────────────────────────────────────────────────
export const ThreeDMarquee = ({ images, className, directionPattern }) => {
  const [hoveredSkill, setHoveredSkill] = useState(null);
  const [focusSource, setFocusSource] = useState('mouse');

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { type: "spring", mass: 0.8, stiffness: 250, damping: 22 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  const handlePointerMove = useCallback((e) => {
    if (!hoveredSkill) return;
    setFocusSource('mouse');
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  }, [mouseX, mouseY, hoveredSkill]);

  const handleSkillHover = useCallback((skillData, source = 'mouse', e = null) => {
    if (skillData) {
      if (source === 'mouse' && e) {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      }
      setHoveredSkill(skillData);
      if (source === 'keyboard') setFocusSource('keyboard');
    } else {
      setHoveredSkill(null);
    }
  }, [mouseX, mouseY]);
  const { chunks, maxItems, chunkSize } = useMemo(() => {
    // Support explicitly grouped columns (2D array)
    if (images.length > 0 && Array.isArray(images[0])) {
      const max = Math.max(...images.map(col => col.length), 4);
      return { chunks: images, maxItems: max, chunkSize: max };
    }

    // Fallback: auto-distribute flat array
    const columns = 5;
    // Enforce minimum 4 items per column to ensure the scroll container has enough height
    const max = Math.max(Math.ceil(images.length / columns), 4);

    const generatedChunks = Array.from({ length: columns }, (_, colIndex) => {
      return Array.from({ length: max }, (_, itemIndex) => {
        // Flat index across the entire grid
        const globalIndex = colIndex * max + itemIndex;
        // Wrap around the available images pool gracefully
        return images[globalIndex % images.length];
      });
    });

    return { chunks: generatedChunks, maxItems: max, chunkSize: max };
  }, [images]);
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-60px 0px" });

  return (
    <div 
      ref={ref} 
      className={cn("relative w-full", className)}
      onPointerMove={handlePointerMove}
    >
      {/* ── Tooltip: Cursor-following Tech Card ── */}
      <motion.div
        className="fixed top-0 left-0 z-[100] pointer-events-none select-none"
        style={{
          x: focusSource === 'mouse' ? cursorX : "50vw",
          y: focusSource === 'mouse' ? cursorY : "20vh",
          translateX: "-50%",
          translateY: focusSource === 'mouse' ? "-120%" : "0%", // Offset above cursor
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: hoveredSkill ? 1 : 0, 
          scale: hoveredSkill ? 1 : 0.9,
          filter: hoveredSkill ? "blur(0px)" : "blur(4px)"
        }}
        transition={{ duration: 0.2 }}
      >
        <div 
          className="px-3 py-2.5 rounded-[14px] min-w-[180px]"
          style={{
            background: "rgba(10, 10, 12, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 20px 40px -10px rgba(0,0,0,0.6)"
          }}
        >
          {hoveredSkill && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-[15px] tracking-tight text-white/95">{hoveredSkill.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-white/10 uppercase tracking-widest text-white/50">
                  {hoveredSkill.years} {hoveredSkill.years === 1 ? 'yr' : 'yrs'}
                </span>
              </div>
              <div className="text-[11px] text-[var(--accent)] font-medium mt-0.5">#{hoveredSkill.tag}</div>
              <div className="text-[11px] text-white/50 leading-tight mt-0.5">{hoveredSkill.project}</div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── The actual 3D grid (overflow-hidden for edge clipping) ── */}
      <div
        className="mx-auto block h-[500px] w-full overflow-hidden rounded-3xl max-sm:h-[350px] relative"
        style={{ maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)" }}
      >

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
                onSkillHover={handleSkillHover}
              />
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div
            style={{ 
              transform: "rotateX(55deg) rotateY(0deg) rotateZ(-45deg) translateZ(30px)", 
              gap: `${SCROLL_CONFIG.TILE_GAP}px` 
            }}
            className="relative grid grid-cols-5 scale-75 sm:scale-90 lg:scale-100 transform-3d origin-center"
          >
            {["Core", "OOP", "Web Dev", "Data & ML", "Tools"].map((header, i) => (
              <div key={i} className="flex justify-center relative" style={{ width: SCROLL_CONFIG.TILE_SIZE }}>
                <div 
                  className="absolute transition-opacity duration-300"
                  style={{ top: "-280px", opacity: hoveredSkill ? 0 : 1 }}
                >
                  <div className="bg-[rgba(15,15,20,0.8)] backdrop-blur-xl border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] text-white/90 uppercase shadow-[0_16px_32px_rgba(0,0,0,0.8)] whitespace-nowrap">
                    {header}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
