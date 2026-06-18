import { useEffect, useState, useRef } from "react";
import { motion, useTransform, useVelocity, useSpring, useReducedMotion, useMotionTemplate, animate, motionValue, useMotionValue } from "framer-motion";

function ProjectBackground({ scrollYProgress, activeCategory }) {
  const isReducedMotion = useReducedMotion();
  const [itemPositions, setItemPositions] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 2000 });
  const [isMobileView, setIsMobileView] = useState(false);
  const cardsRef = useRef([]);

  const [focusValues, setFocusValues] = useState([]);

  // Track scroll velocity to dynamically illuminate the network
  const scrollVelocity = useVelocity(scrollYProgress || { get: () => 0 });
  const absVelocity = useTransform(scrollVelocity, (v) => Math.abs(v));
  
  // Resting opacity is very low (0.15), scaling up to 0.85 during fast scrolls for a premium shimmer
  const networkOpacityRaw = useTransform(
    absVelocity,
    [0, 0.002, 0.015],
    [0.15, 0.45, 0.85]
  );
  const networkOpacity = useSpring(networkOpacityRaw, { stiffness: 100, damping: 20 });

  // Map scroll progress directly to the center coordinates of the moving energy corridor pulse
  const energyGlowY = useTransform(scrollYProgress || { get: () => 0 }, [0, 1], ["0%", "100%"]);

  // Motion values to track pointer location for premium interactive spotlight glow
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const hoverOpacity = useMotionValue(0);

  // Track cursor position on parent section container
  useEffect(() => {
    const section = document.getElementById("projects");
    if (!section) return;

    let rect = null;

    const handleMouseMove = (e) => {
      if (!rect) {
        rect = section.getBoundingClientRect();
      }
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    };

    const handleMouseEnter = () => {
      rect = section.getBoundingClientRect();
      animate(hoverOpacity, 1, { duration: 0.3 });
    };

    const handleMouseLeave = () => {
      rect = null;
      animate(hoverOpacity, 0, { duration: 0.4 });
    };

    section.addEventListener("mousemove", handleMouseMove);
    section.addEventListener("mouseenter", handleMouseEnter);
    section.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      section.removeEventListener("mousemove", handleMouseMove);
      section.removeEventListener("mouseenter", handleMouseEnter);
      section.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [mouseX, mouseY, hoverOpacity]);

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

  // Compute card proximity focus values at 60fps using requestAnimationFrame (No React re-renders!)
  useEffect(() => {
    let ticking = false;

    const checkProximity = () => {
      const section = document.getElementById("projects");
      if (!section) {
        ticking = false;
        return;
      }
      
      const centerY = window.innerHeight / 2;

      // Use pre-measured itemPositions to calculate vertical centers to avoid card getBoundingClientRect calls
      if (itemPositions && itemPositions.length > 0) {
        const sectionRect = section.getBoundingClientRect();

        itemPositions.forEach((pos, index) => {
          const focusVal = focusValues[index];
          if (!focusVal) return;
          
          // Math-based card center: section top + static vertical offset + half height
          const cardCenter = sectionRect.top + pos.top + pos.height / 2;
          
          // Target vertical falloff range (focused within 55% of viewport height)
          const falloffRange = window.innerHeight * 0.55;
          const distance = Math.abs(cardCenter - centerY);
          const focusFactor = Math.max(0, 1 - distance / falloffRange);
          
          // Sharp cubic curve for selective lighting
          const easedFocus = Math.pow(focusFactor, 2.5);
          focusVal.set(isReducedMotion ? 1 : easedFocus);
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
  }, [isReducedMotion, itemPositions, focusValues]);

  // Coordinates for the timeline spine axis
  const spineX = isMobileView ? 20 : dimensions.width / 2;

  return (
    <>
      {/* isolated CSS Keyframes for GPU-driven flow & particles */}
      <style>{`
        @keyframes data-flow-forward {
          0% { stroke-dashoffset: 240; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes particle-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
          50% { transform: translate(15px, -35px) scale(1.3); opacity: 0.35; }
        }
        @keyframes particle-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1.1); opacity: 0.1; }
          50% { transform: translate(-25px, 20px) scale(0.85); opacity: 0.3; }
        }
        @keyframes particle-float-3 {
          0%, 100% { transform: translate(0, 0) scale(0.9); opacity: 0.2; }
          50% { transform: translate(30px, 15px) scale(1.2); opacity: 0.4; }
        }
        @keyframes grid-glow-breath {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.15; }
        }
        @keyframes float-orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -45px) scale(1.05); }
        }
        @keyframes float-orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 30px) scale(0.95); }
        }
        @keyframes float-orb-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(25px, 40px) scale(1.03); }
        }
      `}</style>

      {/* ─── Layer 0: Film Grain Noise Texture (Premium Matte Effect) ─── */}
      <div 
        className="absolute inset-0 -z-45 pointer-events-none opacity-[0.012] mix-blend-overlay select-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ─── Layer 0.5: Elegant Slow-Drifting Ambient Mesh Orbs ─── */}
      {!isReducedMotion && (
        <div className="absolute inset-0 -z-40 pointer-events-none overflow-hidden select-none opacity-40">
          <div 
            className="absolute rounded-full blur-[150px]"
            style={{
              width: "600px",
              height: "600px",
              left: "-10%",
              top: "15%",
              background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 70%)",
              animation: "float-orb-1 25s ease-in-out infinite",
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
              animation: "float-orb-2 32s ease-in-out infinite",
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
              animation: "float-orb-3 28s ease-in-out infinite",
            }}
          />
        </div>
      )}

      {/* ─── Layer 1: Depth-Varied Ultra-Subtle Grid ─── */}
      <div 
        className="absolute inset-0 -z-30 pointer-events-none overflow-hidden select-none bg-transparent"
        style={{
          backgroundImage: `
            linear-gradient(color-mix(in srgb, var(--accent) 1.2%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--accent) 1.2%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: isMobileView ? "60px 60px" : "100px 100px",
          maskImage: "linear-gradient(to bottom, transparent, black 150px, black calc(100% - 150px), transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 150px, black calc(100% - 150px), transparent)",
        }}
      />
      <div 
        className="absolute inset-0 -z-30 pointer-events-none overflow-hidden select-none bg-transparent"
        style={{
          backgroundImage: `
            linear-gradient(color-mix(in srgb, var(--accent) 0.4%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--accent) 0.4%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: isMobileView ? "15px 15px" : "25px 25px",
          maskImage: "linear-gradient(to bottom, transparent, black 150px, black calc(100% - 150px), transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 150px, black calc(100% - 150px), transparent)",
        }}
      />

      {/* ─── Layer 1.5: Interactive Cursor Spotlight Glow ─── */}
      {!isReducedMotion && (
        <motion.div
          className="absolute inset-0 -z-28 pointer-events-none select-none"
          style={{
            opacity: hoverOpacity,
            background: useMotionTemplate`radial-gradient(450px circle at ${mouseX}px ${mouseY}px, color-mix(in srgb, var(--accent) 7.5%, transparent) 0%, transparent 80%)`,
          }}
        />
      )}

      {/* ─── Layer 2: Timeline Energy Field ─── */}
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

      {/* ─── Layer 3 & 5: Connection Network & Dynamic Data Flow Pipelines ─── */}
      <div className="absolute inset-0 -z-15 pointer-events-none overflow-hidden select-none">
        <motion.svg
          className="w-full h-full"
          style={{
            opacity: isReducedMotion ? 0.3 : networkOpacity,
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
                isReducedMotion={isReducedMotion}
              />
            );
          })}
        </motion.svg>
      </div>

      {/* ─── Layer 4 & 6: Atmospheric Light Volumes & Focus Zone ─── */}
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

      {/* ─── Layer 5: Slow-Moving Floating Data Particles ─── */}
      <div className="absolute inset-0 -z-20 pointer-events-none overflow-hidden select-none bg-transparent">
        {/* Floating Particle 1 */}
        <div
          className="absolute rounded-full"
          style={{
            left: "15%",
            top: "20%",
            width: "3px",
            height: "3px",
            background: "var(--accent)",
            animation: isReducedMotion ? "none" : "particle-float-1 9s ease-in-out infinite",
          }}
        />

        {/* Floating Particle 2 */}
        <div
          className="absolute rounded-full"
          style={{
            right: "20%",
            top: "45%",
            width: "2.5px",
            height: "2.5px",
            background: "rgba(255, 255, 255, 0.4)",
            animation: isReducedMotion ? "none" : "particle-float-2 12s ease-in-out infinite",
          }}
        />

        {/* Floating Particle 3 */}
        <div
          className="absolute rounded-full"
          style={{
            left: "25%",
            top: "70%",
            width: "3px",
            height: "3px",
            background: "var(--accent)",
            animation: isReducedMotion ? "none" : "particle-float-3 10s ease-in-out infinite",
          }}
        />

        {/* Floating Particle 4 */}
        <div
          className="absolute rounded-full"
          style={{
            right: "15%",
            top: "85%",
            width: "2px",
            height: "2px",
            background: "rgba(255, 255, 255, 0.3)",
            animation: isReducedMotion ? "none" : "particle-float-1 11s ease-in-out infinite",
            animationDelay: "-3s",
          }}
        />
      </div>
    </>
  );
}

function ProjectConnectionLine({ focusVal, pos, index, spineX, isMobileView, isReducedMotion }) {
  const opacity_line = useTransform(focusVal, (f) => 0.04 + f * 0.15);
  const opacity_pulse = useTransform(focusVal, (f) => 0.08 + f * 0.35);
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

      {/* Animated data pulse dash flowing along path */}
      {!isReducedMotion && (
        <motion.path
          d={pathData}
          stroke="var(--accent)"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="6 45"
          style={{
            opacity: opacity_pulse,
            animation: `data-flow-forward ${6 + index * 1.5}s linear infinite`,
            animationDelay: `${index * 0.4}s`,
          }}
        />
      )}

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
}

function ProjectLightVolume({ focusVal, pos, isMobileView }) {
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
}

export default ProjectBackground;
