import { useEffect, useState, useRef, useMemo, memo } from "react";
import { motion, useTransform, motionValue } from "framer-motion";
import PcbFragment from "./pcbFragments/PcbFragment";

/* ─────────────────────────────────────────────────────────────
   DOT GRID LAYER
   Uniform 28px-spaced dot grid. Opacity: ~5%. Atmospheric only.
───────────────────────────────────────────────────────────── */
const DotGridLayer = memo(function DotGridLayer() {
  return (
    <div
      className="absolute inset-0 pointer-events-none select-none"
      style={{ zIndex: -35 }}
      aria-hidden="true"
    >
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="pcb-dot-grid"
            x="0"
            y="0"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1.5" cy="1.5" r="0.75" fill="var(--accent)" opacity="0.05" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pcb-dot-grid)" />
      </svg>
    </div>
  );
});

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
function ProjectBackground({ activeCategory }) {
  const [itemPositions, setItemPositions] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 2000 });
  const [isMobileView, setIsMobileView] = useState(false);
  const cardsRef = useRef([]);

  const [focusValues, setFocusValues] = useState([]);

  // Detect card positions in DOM relative to our parent section container
  useEffect(() => {
    const updatePositions = () => {
      const section = document.getElementById("projects");
      if (!section) return;

      const sectionRect = section.getBoundingClientRect();
      const mobileStatus = window.innerWidth < 768;
      
      setDimensions({ width: sectionRect.width, height: sectionRect.height });
      setIsMobileView(mobileStatus);

      const cards = document.querySelectorAll(".group\\/item");
      cardsRef.current = Array.from(cards);
      const positions = cardsRef.current.map((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenterY = rect.top - sectionRect.top + rect.height / 2;
        const cardCenterX = rect.left - sectionRect.left + rect.width / 2;
        
        // Find whether the card is to the left or right of the timeline spine
        const isLeft = !mobileStatus && (rect.left - sectionRect.left + rect.width < sectionRect.width / 2 + 10);
        
        return {
          top: rect.top - sectionRect.top,
          left: rect.left - sectionRect.left,
          width: rect.width,
          height: rect.height,
          centerY: cardCenterY,
          centerX: cardCenterX,
          isLeft,
        };
      });

      setItemPositions(positions);
      setFocusValues((prev) => {
        const next = [...prev];
        while (next.length < positions.length) {
          next.push(motionValue(0));
        }
        return next.slice(0, positions.length);
      });
    };

    updatePositions();
    
    // Periodically re-measure to handle images loading in or layout adjustments
    const timer = setTimeout(updatePositions, 300);
    window.addEventListener("resize", updatePositions);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePositions);
    };
  }, [activeCategory, isMobileView]);

  // Compute card proximity focus values on scroll (Selective static illumination)
  useEffect(() => {
    let ticking = false;

    const checkProximity = () => {
      const section = document.getElementById("projects");
      if (!section) {
        ticking = false;
        return;
      }
      
      const centerY = window.innerHeight / 2;

      // Use pre-measured itemPositions to calculate vertical centers
      if (itemPositions && itemPositions.length > 0) {
        const sectionTop = section.offsetTop;
        const scrollTop = window.scrollY;
        const currentSectionRelativeTop = sectionTop - scrollTop;

        itemPositions.forEach((pos, index) => {
          const focusVal = focusValues[index];
          if (!focusVal) return;
          
          const cardCenter = currentSectionRelativeTop + pos.top + pos.height / 2;
          const falloffRange = window.innerHeight * 0.55;
          const distance = Math.abs(cardCenter - centerY);
          const focusFactor = Math.max(0, 1 - distance / falloffRange);
          const easedFocus = Math.pow(focusFactor, 2.5);
          focusVal.set(easedFocus);
        });
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(checkProximity);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    checkProximity();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [itemPositions, focusValues]);

  // Coordinates for the timeline spine axis
  const spineX = isMobileView ? 20 : dimensions.width / 2;

  const CARD_KEEP_OUT_PX = 110; // within 90–120 spec
  const SPINE_KEEP_OUT_PX = 150; // per spec

  const pcbKeepOutRects = useMemo(() => {
    const keep = [];
    // Card halos
    for (const pos of itemPositions) {
      keep.push({
        x: Math.max(0, pos.left - CARD_KEEP_OUT_PX),
        y: Math.max(0, pos.top - CARD_KEEP_OUT_PX),
        w: Math.min(dimensions.width, pos.left + pos.width + CARD_KEEP_OUT_PX) - Math.max(0, pos.left - CARD_KEEP_OUT_PX),
        h: Math.min(dimensions.height, pos.top + pos.height + CARD_KEEP_OUT_PX) - Math.max(0, pos.top - CARD_KEEP_OUT_PX),
      });
    }
    // Timeline corridor keep-out (full height)
    keep.push({
      x: Math.max(0, spineX - SPINE_KEEP_OUT_PX),
      y: 0,
      w: Math.min(dimensions.width, spineX + SPINE_KEEP_OUT_PX) - Math.max(0, spineX - SPINE_KEEP_OUT_PX),
      h: dimensions.height,
    });
    return keep;
  }, [itemPositions, dimensions.width, dimensions.height, spineX]);

  const pcbFragments = useMemo(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return [];

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const overlapsAny = (box) =>
      pcbKeepOutRects.some((r) => {
        const x1 = Math.max(box.x, r.x);
        const y1 = Math.max(box.y, r.y);
        const x2 = Math.min(box.x + box.w, r.x + r.w);
        const y2 = Math.min(box.y + box.h, r.y + r.h);
        return x2 > x1 && y2 > y1;
      });

    const leftLimit = isMobileView ? Math.max(0, spineX + SPINE_KEEP_OUT_PX) : Math.max(0, spineX - SPINE_KEEP_OUT_PX);
    const rightStart = Math.max(0, spineX + SPINE_KEEP_OUT_PX);

    const leftMaxW = isMobileView ? Math.max(0, dimensions.width - rightStart) : Math.max(0, leftLimit);
    const rightMaxW = Math.max(0, dimensions.width - rightStart);

    const base = [
      { side: "left", edge: "left", density: "medium", yT: 0.13, wT: 0.28, hT: 0.18, opacity: 0.95 },
      { side: "left", edge: "left", density: "light", yT: 0.40, wT: 0.22, hT: 0.16, opacity: 0.85 },
      { side: "left", edge: "left", density: "dense", yT: 0.72, wT: 0.26, hT: 0.20, opacity: 0.95 },
      { side: "right", edge: "right", density: "light", yT: 0.18, wT: 0.22, hT: 0.16, opacity: 0.85 },
      { side: "right", edge: "right", density: "medium", yT: 0.52, wT: 0.26, hT: 0.19, opacity: 0.92 },
      { side: "right", edge: "right", density: "light", yT: 0.84, wT: 0.20, hT: 0.15, opacity: 0.82 },
    ];

    // Mobile: only show subtle right-side fragments (avoid left spine).
    const templates = isMobileView ? base.filter((t) => t.side === "right").map((t) => ({ ...t, density: "light", opacity: 0.75 })) : base;

    const out = [];
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      const maxW = t.side === "left" ? leftMaxW : rightMaxW;
      if (maxW < 140) continue;

      const w = clamp(Math.round(dimensions.width * t.wT), 180, Math.min(420, Math.round(maxW - 18)));
      const h = clamp(Math.round(dimensions.height * t.hT), 160, 340);

      const x = t.side === "left" ? 0 : rightStart;
      let y = clamp(Math.round(dimensions.height * t.yT - h / 2), 0, Math.max(0, dimensions.height - h));

      // Nudge down until we find negative space not colliding with keep-out.
      let tries = 0;
      while (tries < 10 && overlapsAny({ x, y, w, h })) {
        y = clamp(y + 80, 0, Math.max(0, dimensions.height - h));
        tries++;
      }
      if (overlapsAny({ x, y, w, h })) continue;

      out.push({
        id: `${activeCategory}-frag-${i}`,
        x,
        y,
        w,
        h,
        edge: t.edge,
        density: t.density,
        opacity: t.opacity,
        seedKey: `${activeCategory}-${i}-${t.side}-${t.density}`,
      });
    }
    return out;
  }, [dimensions.width, dimensions.height, pcbKeepOutRects, spineX, SPINE_KEEP_OUT_PX, isMobileView, activeCategory]);

  return (
    <>
      {/* ─── Layer 0: Film Grain Noise Texture (Premium Matte Effect) ─── */}
      <div 
        className="absolute inset-0 -z-45 pointer-events-none opacity-[0.012] mix-blend-overlay select-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ─── Layer 0.5: Elegant Static Ambient Mesh Orbs ─── */}
      <div className="absolute inset-0 -z-40 pointer-events-none overflow-hidden select-none opacity-40">
        <div 
          className="absolute rounded-full blur-[150px]"
          style={{
            width: "600px",
            height: "600px",
            left: "-10%",
            top: "15%",
            background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 70%)",
          }}
        />
        <div 
          className="absolute rounded-full blur-[180px]"
          style={{
            width: "700px",
            height: "700px",
            right: "-15%",
            top: "55%",
            background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 4.5%, transparent) 0%, transparent 70%)",
          }}
        />
        <div 
          className="absolute rounded-full blur-[150px]"
          style={{
            width: "500px",
            height: "500px",
            left: "20%",
            bottom: "10%",
            background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 5%, transparent) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ─── Layer 1: Atmospheric Dot Grid ─── */}
      <DotGridLayer />

      {/* ─── Layer 1.5: Independent PCB fragments (positioned in negative space) ─── */}
      {pcbFragments.map((f) => (
        <PcbFragment
          key={f.id}
          id={f.id}
          x={f.x}
          y={f.y}
          w={f.w}
          h={f.h}
          edge={f.edge}
          density={f.density}
          keepOutRects={pcbKeepOutRects}
          opacity={f.opacity}
          seedKey={f.seedKey}
        />
      ))}

      {/* ─── Layer 2: Timeline Spine Corridor ─── */}
      <div 
        className="absolute inset-y-0 -z-20 pointer-events-none overflow-hidden select-none bg-transparent"
        style={{
          left: isMobileView ? "10px" : "50%",
          transform: isMobileView ? "none" : "translateX(-50%)",
          width: isMobileView ? "20px" : "180px",
        }}
      >
        {/* Soft spine gradient glow corridor */}
        <div
          className="absolute inset-0 w-full"
          style={{
            background: `linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 4.5%, transparent) 50%, transparent)`,
          }}
        />
      </div>

      {/* ─── Layer 3: Connection Network (Static connections) ─── */}
      <div className="absolute inset-0 -z-15 pointer-events-none overflow-hidden select-none">
        <motion.svg
          className="w-full h-full"
          style={{
            opacity: 0.25,
          }}
        >
          {itemPositions.map((pos, index) => {
            const focusVal = focusValues[index];
            if (!focusVal) return null;
            return (
              <ProjectConnectionLine
                key={`network-group-${index}`}
                focusVal={focusVal}
                pos={pos}
                index={index}
                spineX={spineX}
                isMobileView={isMobileView}
              />
            );
          })}
        </motion.svg>
      </div>

      {/* ─── Layer 4: Static Focus Zone Lights ─── */}
      <div className="absolute inset-0 -z-25 pointer-events-none overflow-hidden select-none">
        {itemPositions.map((pos, index) => {
          const focusVal = focusValues[index];
          if (!focusVal) return null;
          return (
            <ProjectLightVolume
              key={`light-volume-${index}`}
              focusVal={focusVal}
              pos={pos}
              isMobileView={isMobileView}
            />
          );
        })}
      </div>
    </>
  );
}

const ProjectConnectionLine = memo(function ProjectConnectionLine({ focusVal, pos, index, spineX, isMobileView }) {
  const opacity_line = useTransform(focusVal, (f) => 0.04 + f * 0.15);
  const opacity_node1 = useTransform(focusVal, (f) => 0.15 + f * 0.55);
  const opacity_node2 = useTransform(focusVal, (f) => 0.05 + f * 0.25);
  const scale_node2 = useTransform(focusVal, (f) => 0.9 + f * 0.3);

  const centerY = pos.centerY;
  const pathData = isMobileView
    ? `M ${spineX} ${centerY} L ${pos.left} ${centerY}`
    : pos.isLeft
      ? `M ${spineX} ${centerY} L ${spineX - 15} ${centerY} L ${spineX - 35} ${centerY - 15} L ${pos.left + pos.width} ${centerY - 15}`
      : `M ${spineX} ${centerY} L ${spineX + 15} ${centerY} L ${spineX + 35} ${centerY + 15} L ${pos.left} ${centerY + 15}`;

  const nodeX = isMobileView ? 0 : pos.isLeft ? spineX - 35 : spineX + 35;
  const nodeY = isMobileView ? 0 : pos.isLeft ? centerY - 15 : centerY + 15;

  return (
    <g>
      {/* Thin connection path */}
      <motion.path
        d={pathData}
        stroke="var(--accent)"
        strokeWidth="1"
        fill="none"
        style={{
          opacity: opacity_line,
        }}
      />

      {/* Micro-nodes (connection junctions) */}
      {!isMobileView && (
        <>
          <motion.circle
            cx={nodeX}
            cy={nodeY}
            r="2"
            fill="var(--accent)"
            style={{
              opacity: opacity_node1,
            }}
          />
          <motion.circle
            cx={nodeX}
            cy={nodeY}
            r="4.5"
            stroke="var(--accent)"
            strokeWidth="1"
            fill="none"
            style={{
              opacity: opacity_node2,
              scale: scale_node2,
            }}
          />
        </>
      )}
    </g>
  );
});

const ProjectLightVolume = memo(function ProjectLightVolume({ focusVal, pos, isMobileView }) {
  const opacity_volume = useTransform(focusVal, (f) => 0.012 + f * 0.035);
  const scale_volume = useTransform(focusVal, (f) => 0.9 + f * 0.15);

  const size = isMobileView ? 280 : 520;
  const left = pos.centerX - size / 2;
  const top = pos.centerY - size / 2;

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none blur-[120px] will-change-transform"
      style={{
        left,
        top,
        width: `${size}px`,
        height: `${size}px`,
        background: `radial-gradient(circle, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 70%)`,
        opacity: opacity_volume,
        scale: scale_volume,
      }}
    />
  );
});

export default memo(ProjectBackground);
