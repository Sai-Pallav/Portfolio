import { motion, useInView } from "motion/react";
import { useRef } from "react";
import ThreeDMarqueeDemo from "../3d-marquee-demo";

// ─── Stagger variants for the header text ────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};
const marqueeVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 48 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.45 },
  },
};

function Skills() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px 0px" });

  return (
    <section id="skills" className="py-24 relative overflow-hidden bg-[var(--bg)]">
      <div className="absolute inset-0 bg-[image:var(--bg-hover-skills)] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 flex flex-col items-center">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex flex-col items-center w-full"
        >
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md shadow-lg"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse" />
            <span className="text-xs md:text-sm font-medium text-[var(--text-heading)] tracking-[0.2em] uppercase">
              Expertise
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h2
            variants={itemVariants}
            className="text-4xl md:text-6xl font-extrabold text-center mb-6 text-[var(--text-heading)] tracking-tighter"
          >
            Tools of the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-[var(--accent)] via-[var(--accent-hover)] to-white/50">
              Trade
            </span>
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-[var(--text-secondary)] text-center max-w-2xl mx-auto mb-16 text-lg md:text-xl font-light"
          >
            A comprehensive ecosystem of technologies I leverage to build
            robust, scalable, and exceptional digital experiences.
          </motion.p>

          {/* Marquee with diagonal border */}
          <motion.div
            variants={marqueeVariants}
            className="w-full max-w-[1200px] mx-auto relative rounded-3xl"
          >
            <ThreeDMarqueeDemo />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default Skills;
