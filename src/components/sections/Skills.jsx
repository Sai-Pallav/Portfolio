import { motion, useInView } from "framer-motion";
import { useRef, useState, memo } from "react";
import ThreeDMarqueeDemo from "../3d-marquee-demo";
import SkillsGrid from "./skills/SkillsGrid";

// ─── Premium Animation Variants ──────────────────────────────────────────────
const badgeVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
};

const headingVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  }
};

const subtitleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  }
};

const toggleVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 15 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
};

const marqueeVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
  }
};

function Skills() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-120px 0px" });
  const [view, setView] = useState("3d");

  return (
    <section id="skills" aria-labelledby="skills-heading" className="py-24 relative overflow-hidden bg-[#0A0A0C]">
      {/* 5-Layer Premium Background System */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Layer 1: Dark atmospheric foundation */}
        <div className="absolute inset-0 bg-[#0A0A0C]" />
        
        {/* Layer 2: Subtle technical grid texture */}
        <div 
          className="absolute inset-0 opacity-[0.4]" 
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
            backgroundPosition: "center top",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 95%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 95%)"
          }}
        />

        {/* Layer 3: Large blurred gradient meshes */}
        <div className="absolute -top-[30%] left-[20%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(37,99,235,0.08)_0%,transparent_70%)] blur-[80px]" />
        <div className="absolute -bottom-[20%] right-[10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(59,130,246,0.06)_0%,transparent_70%)] blur-[100px]" />
        
        {/* Layer 4: Soft ambient center glow */}
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04)_0%,transparent_60%)] blur-[60px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10 flex flex-col items-center">
        <motion.div
          ref={ref}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.12 }
            }
          }}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex flex-col items-center w-full"
        >
          {/* Badge */}
          <motion.div
            variants={badgeVariants}
            className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_30px_rgb(0,0,0,0.2)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse" />
            <span className="text-[10px] md:text-xs font-mono font-semibold text-[var(--text-secondary)] tracking-[0.25em] uppercase pl-0.5">
              Expertise
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h2
            id="skills-heading"
            variants={headingVariants}
            className="text-4xl md:text-6xl font-extrabold text-center mb-6 text-[var(--text-heading)] tracking-tighter"
          >
            Tools of the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-[var(--accent)] via-[var(--accent-hover)] to-white/50">
              Trade
            </span>
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            variants={subtitleVariants}
            className="text-[var(--text-secondary)] text-center max-w-2xl mx-auto mb-10 text-lg md:text-xl font-light"
          >
            A comprehensive ecosystem of technologies I leverage to build
            robust, scalable, and exceptional digital experiences.
          </motion.p>

          {/* View Toggle */}
          <motion.div
            variants={toggleVariants}
            className="flex items-center relative bg-[rgba(20,20,22,0.6)] border border-white/[0.06] p-1 rounded-full backdrop-blur-xl mb-16 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02),0_12px_40px_rgba(0,0,0,0.5)]"
          >
            <button
              onClick={() => setView("3d")}
              className="relative z-10 px-5 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors duration-300 rounded-full cursor-pointer flex items-center gap-2"
              style={{ color: view === "3d" ? "var(--bg)" : "var(--text-secondary)" }}
            >
              {view === "3d" && (
                <motion.div
                  layoutId="activeViewTab"
                  className="absolute inset-0 bg-[#FAFAFA] rounded-full -z-10 shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`w-1 h-1 rounded-full transition-colors duration-300 ${view === "3d" ? "bg-[var(--accent)]" : "bg-white/20"}`} />
              3D Canvas
            </button>
            <button
              onClick={() => setView("grid")}
              className="relative z-10 px-5 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors duration-300 rounded-full cursor-pointer flex items-center gap-2"
              style={{ color: view === "grid" ? "var(--bg)" : "var(--text-secondary)" }}
            >
              {view === "grid" && (
                <motion.div
                  layoutId="activeViewTab"
                  className="absolute inset-0 bg-[#FAFAFA] rounded-full -z-10 shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`w-1 h-1 rounded-full transition-colors duration-300 ${view === "grid" ? "bg-[var(--accent)]" : "bg-white/20"}`} />
              Grid View
            </button>
          </motion.div>

          {/* Display Container with transitions */}
          <motion.div
            variants={marqueeVariants}
            className="w-full max-w-[1200px] mx-auto relative rounded-3xl"
          >
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              {view === "3d" ? <ThreeDMarqueeDemo /> : <SkillsGrid />}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default memo(Skills);
