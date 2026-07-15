import { useEffect, useState, useRef, useMemo, memo } from "react";
import { motion, useTransform, motionValue, useReducedMotion } from "framer-motion";
// Removed PcbFragment import to clean up background circuit elements

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
function ProjectBackground({ scrollYProgress, activeCategory }) {
  const isReducedMotion = useReducedMotion();
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

  // Map scroll progress directly to the center coordinates of the moving energy corridor pulse
  const energyGlowY = useTransform(scrollYProgress || { get: () => 0 }, [0, 1], ["0%", "100%"]);

  const CARD_KEEP_OUT_PX = 110; // within 90–120 spec
  const SPINE_KEEP_OUT_PX = 150; // per spec

  // Keep-out logic and fragments removed to clear background circuit elements

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

        {/* Traveling energy node following viewport center */}
        {!isReducedMotion && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 w-48 h-96 pointer-events-none blur-[45px]"
            style={{
              top: energyGlowY,
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 70%)",
            }}
          />
        )}
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

// Static connection lines removed to clear background circuit elements

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
