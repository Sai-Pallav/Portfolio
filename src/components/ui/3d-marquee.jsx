import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
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

const DEFAULT_DIRECTION_PATTERN = [-1, 1, -1, 1, -1];

// ─── Single card component with tactile key states & full accessibility ─────
const MarqueeCard = memo(({
  item,
  colIndex,
  slotIndex,
  copyIndex,
  chunkSize,
  isInView,
  prefersReducedMotion,
  onSkillHover,
  subarrayLength,
  onPause,
  onResume,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isKeyPressed, setIsKeyPressed] = useState(false);

  const image = item.url;
  const skill = item.skill;
  const stableKey = `c${colIndex}-s${slotIndex}-x${copyIndex}`;
  const isFirstCopy = copyIndex === 0;
  const globalIndex = colIndex * chunkSize + (slotIndex % subarrayLength);
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
        onPause();
        if (skill) onSkillHover(skill, 'mouse', e);
      }}
      onPointerLeave={() => {
        onResume();
        onSkillHover(null, 'mouse');
      }}
      onFocus={(e) => {
        setIsFocused(true);
        onPause();
        if (skill) onSkillHover(skill, 'keyboard', e);
      }}
      onBlur={() => {
        setIsFocused(false);
        setIsKeyPressed(false);
        onResume();
        onSkillHover(null, 'keyboard');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsKeyPressed(true);
        }
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          setIsKeyPressed(false);
        }
      }}
      tabIndex={copyIndex === 0 ? 0 : -1}
      className="relative cursor-default pointer-events-auto rounded-3xl focus-visible:outline-none"
      style={{
        width: `${SCROLL_CONFIG.TILE_SIZE}px`,
        height: `${SCROLL_CONFIG.TILE_SIZE}px`,
        contain: "layout style",
      }}
      role={copyIndex === 0 ? "listitem" : undefined}
      aria-label={
        copyIndex === 0
          ? (skill
            ? `${skill.name}, ${skill.years} ${skill.years === 1 ? 'year' : 'years'} of experience. Focus: ${skill.project || 'General application'}`
            : `Technology icon ${slotIndex + 1}`)
          : undefined
      }
      aria-hidden={copyIndex > 0 ? "true" : undefined}
    >
      <motion.div
        variants={{
          hover: {
            scale: 1.08,
            z: 0,
            boxShadow: "0 24px 48px -12px var(--border-glow)",
            backgroundColor: "rgba(25, 25, 30, 0.7)",
          },
          active: {
            scale: 1.02,
            z: -20, // push down into the keyboard
            boxShadow: "0 12px 24px -12px var(--border-glow)",
            backgroundColor: "rgba(30, 30, 35, 0.8)",
          }
        }}
        animate={isKeyPressed ? "active" : (isFocused ? "hover" : "normal")}
        style={{
          scale: 1,
          z: 0,
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.4)",
          backgroundColor: "rgba(15, 15, 18, 0.45)",
        }}
        transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", mass: 0.8, stiffness: 250, damping: 22 }}
        whileHover="hover"
        whileTap="active"
        className={`absolute inset-0 overflow-hidden rounded-3xl border border-white/[0.04] ${
          skill?.label ? "flex flex-col items-center justify-center" : "flex items-center justify-center"
        } ${isFocused ? "ring-2 ring-[var(--accent)] ring-offset-4 ring-offset-[#0A0A0C]" : ""}`}
      >
        <div className="absolute inset-0 pointer-events-none bg-white/[0.02]" />

        <motion.div
          variants={{
            hover: { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", opacity: 1 }
          }}
          initial={{ backdropFilter: "none", WebkitBackdropFilter: "none", opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 pointer-events-none"
          style={{ transform: "translateZ(0)" }}
        />

        <motion.div
          variants={{
            hover: {
              scale: skill?.level === "primary" ? 1.15 : 1.05,
              filter: skill?.level === "primary"
                ? "drop-shadow(0 0 20px var(--border-glow))"
                : "drop-shadow(0 0 5px rgba(255,255,255,0.1))",
            }
          }}
          style={{ scale: 1, filter: "drop-shadow(0 0 0px var(--border-glow))" }}
          className={`z-10 ${skill?.label ? "size-12" : "size-20"} flex items-center justify-center`}
        >
          <div className="relative size-full pointer-events-none flex items-center justify-center">
            <motion.img
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              initial={{ opacity: skill?.level === "primary" ? 0.45 : 0.35 }}
              variants={{ hover: { opacity: 0 } }}
              transition={{ duration: prefersReducedMotion ? 0 : SCROLL_CONFIG.ICON_HOVER_DURATION }}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{
                filter: ['express', 'nextjs'].includes(skill?.icon)
                  ? "invert(1) grayscale(1)"
                  : "grayscale(1)",
              }}
            />
            <motion.img
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              initial={{ opacity: 0 }}
              variants={{ hover: { opacity: skill?.level === "primary" ? 1 : 0.75 } }}
              transition={{ duration: prefersReducedMotion ? 0 : SCROLL_CONFIG.ICON_HOVER_DURATION }}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{
                filter: ['express', 'nextjs'].includes(skill?.icon)
                  ? "invert(1)"
                  : "none",
              }}
            />
          </div>
        </motion.div>

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

        <motion.div
          variants={{ hover: { opacity: 1 } }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ border: "1px solid var(--accent)", opacity: 0 }}
        />
      </motion.div>
    </motion.div>
  );
});

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
  const scrollPositionRef = useRef(null);
  const isPausedRef = useRef(false);
  const rafIdRef = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isInView || prefersReducedMotion || !scrollRef.current) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const startScroll = () => {
      const pattern = directionPattern || DEFAULT_DIRECTION_PATTERN;
      const direction = pattern[colIndex] ?? -1;
      const totalHeight = maxItems * SCROLL_CONFIG.ITEM_HEIGHT;
      const pixelsPerMs = (SCROLL_CONFIG.SPEED_PX_PER_S || 40) / 1000;

      if (scrollPositionRef.current === null) {
        scrollPositionRef.current = -totalHeight;
        if (scrollRef.current) {
          scrollRef.current.style.transform = `translate3d(0, ${-totalHeight}px, 0)`;
        }
      }

      let lastTime;
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
        rafIdRef.current = requestAnimationFrame(animate);
      };

      rafIdRef.current = requestAnimationFrame(animate);
    };

    startScroll();

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isInView, prefersReducedMotion, directionPattern, colIndex, maxItems, chunkSize, subarray.length]);

  const duplicatedArray = useMemo(() => {
    const padded = Array.from({ length: maxItems }, (_, i) => subarray[i % subarray.length]);
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
        const stableKey = `c${colIndex}-s${slotIndex}-x${copyIndex}`;
        return (
          <MarqueeCard
            key={stableKey}
            item={item}
            colIndex={colIndex}
            slotIndex={slotIndex}
            copyIndex={copyIndex}
            chunkSize={chunkSize}
            isInView={isInView}
            prefersReducedMotion={prefersReducedMotion}
            onSkillHover={onSkillHover}
            subarrayLength={subarray.length}
            onPause={() => { isPausedRef.current = true; }}
            onResume={() => { isPausedRef.current = false; }}
          />
        );
      })}
    </div>
  );
});

// ─── Main Marquee ─────────────────────────────────────────────────────────────
export const ThreeDMarquee = ({ images, className, directionPattern }) => {
  const [hoveredSkill, setHoveredSkill] = useState(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { type: "spring", mass: 0.8, stiffness: 250, damping: 22 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  const handlePointerMove = useCallback((e) => {
    if (!hoveredSkill) return;
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  }, [mouseX, mouseY, hoveredSkill]);

  const handleSkillHover = useCallback((skillData, source = 'mouse', e = null) => {
    if (skillData) {
      if (source === 'mouse' && e) {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      } else if (source === 'keyboard' && e && e.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set(rect.left + rect.width / 2);
        mouseY.set(rect.top);
      }
      setHoveredSkill(skillData);
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
  const isInView = useInView(ref, { once: true, margin: "-60px 0px" });

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
          x: cursorX,
          y: cursorY,
          translateX: "-50%",
          translateY: "-120%",
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
          className="px-4 py-3 rounded-2xl min-w-[220px] bg-[rgba(10,10,12,0.85)] border border-white/[0.08] backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_24px_48px_-12px_rgba(0,0,0,0.7)]"
        >
          {hoveredSkill && (
            <div className="flex flex-col gap-2 font-body text-left">
              <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
                <span className="font-bold text-sm tracking-tight text-white/95">{hoveredSkill.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    hoveredSkill.level === "primary"
                      ? "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30"
                      : "bg-white/5 text-white/40 border border-white/10"
                  }`}>
                    {hoveredSkill.level === "primary" ? "Core" : "Familiar"}
                  </span>
                  <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[var(--text-secondary)]">
                    {hoveredSkill.years} {hoveredSkill.years === 1 ? 'yr' : 'yrs'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[10px] text-[var(--accent)] font-semibold uppercase tracking-wider font-mono">
                  #{hoveredSkill.tag.split(',')[0]}
                </div>
                {hoveredSkill.project && (
                  <div className="text-[10px] text-white/45 leading-relaxed font-light mt-0.5">
                    Focus: <span className="text-white/75 italic">{hoveredSkill.project}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── The actual 3D grid (overflow-hidden for edge clipping) ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
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
            {["Languages", "CS Concepts", "Frontend", "Backend", "Tools & DBs"].map((header, i) => {
              const topPos = -360 + i * 114;
              return (
                <div key={i} className="flex justify-center relative" style={{ width: SCROLL_CONFIG.TILE_SIZE }}>
                  <div
                    className="absolute transition-opacity duration-300"
                    style={{ top: `${topPos}px`, opacity: hoveredSkill ? 0 : 1 }}
                  >
                    <div 
                      className="flex items-center gap-2.5 px-5 py-2 rounded-full text-[10px] font-mono font-bold tracking-[0.2em] uppercase whitespace-nowrap border transition-all duration-300"
                      style={{
                        background: "rgba(12, 12, 16, 0.98)",
                        color: "var(--text-primary)",
                        borderColor: "color-mix(in srgb, var(--accent) 30%, rgba(255, 255, 255, 0.12))",
                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                        transform: "translate3d(0, 0, 0)",
                        WebkitFontSmoothing: "antialiased",
                        MozOsxFontSmoothing: "grayscale",
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]" />
                      {header}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
