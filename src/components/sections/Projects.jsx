import { useRef, useEffect, useState, useMemo, memo } from "react";
import { motion, useReducedMotion, useScroll, useMotionValue, animate, useInView } from "framer-motion";
import { projects } from "@/data/projects";
import { personal } from "@/data/personal.jsx";
import SocialIcon from "@/components/ui/SocialIcon";
import MobileTimelineCard from "./projects/MobileTimelineCard";
import TimelineItem from "./projects/TimelineItem";
import ProjectBackground from "./projects/ProjectBackground";
import ProjectsErrorBoundary from "./projects/ProjectsErrorBoundary";
import {
  TIMELINE_ANIM,
  getTimelineHeight,
} from "./projects/timelineAnimation";

const { HEADER_SPACING, ITEM_GAP } = TIMELINE_ANIM;

/* ─────────────────────────────────────────────────────────────────
   MAIN PROJECTS SECTION
───────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { id: "all", label: "All Work" },
  { id: "fullstack", label: "Full Stack" },
  { id: "systems", label: "Systems" },
];

const Projects = memo(function Projects() {
  const sectionRef = useRef(null);
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const timelineInView = useInView(sectionRef, { once: true, margin: "-100px 0px" });

  const [activeCategory, setActiveCategory] = useState("all");

  const filteredProjects = useMemo(() => {
    if (activeCategory === "all") return projects;
    return projects.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  const lineProgress = useMotionValue(0);
  const mobileLineProgress = useMotionValue(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      lineProgress.set(1);
      return;
    }
    if (timelineInView) {
      lineProgress.set(0);
      const controls = animate(lineProgress, 1, {
        duration: 1.5,
        delay: 0.8,
        ease: "easeInOut",
      });
      return () => controls.stop();
    } else {
      lineProgress.set(0);
    }
  }, [timelineInView, lineProgress, prefersReducedMotion, activeCategory]);

  useEffect(() => {
    if (prefersReducedMotion) {
      mobileLineProgress.set(1);
      return;
    }
    if (timelineInView) {
      mobileLineProgress.set(0);
      const controls = animate(mobileLineProgress, 1, {
        duration: 1.2,
        delay: 0.8,
        ease: "easeOut",
      });
      return () => controls.stop();
    } else {
      mobileLineProgress.set(0);
    }
  }, [timelineInView, mobileLineProgress, prefersReducedMotion, activeCategory]);


  // Scroll tracking to drift background layers
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  useEffect(() => {
    let resizeTimer;
    const check = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 150);
    };
    check();
    window.addEventListener("resize", check);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", check);
    };
  }, []);

  const timelineHeight = getTimelineHeight(filteredProjects.length);

  const stats = useMemo(() => [
    { value: projects.length, label: 'Projects' },
    { value: projects.filter(p => p.featured).length, label: 'Featured' },
    { value: new Set(projects.flatMap(p => p.tags)).size + '+', label: 'Technologies' },
  ], []);

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="relative overflow-hidden bg-transparent"
      aria-labelledby="projects-heading"
    >
      {/* ─── Background Layers ─── */}
      <ProjectBackground scrollYProgress={scrollYProgress} activeCategory={activeCategory} />

      {/* ─── Section Header ─── */}
      <div className="max-w-7xl mx-auto px-6 pt-28 md:pt-32 pb-8 text-center animate-fade-in">

        <h2
          id="projects-heading"
          className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight"
        >
          <span className="bg-gradient-to-r from-primary via-accent to-accent-hover bg-clip-text text-transparent">
            Projects
          </span>
          <br />
          <span className="bg-gradient-to-r from-accent-hover via-accent to-primary bg-clip-text text-transparent">
            Timeline
          </span>
        </h2>
        <p
          className="text-base md:text-lg max-w-xl mx-auto leading-relaxed opacity-80"
          style={{ color: "var(--text-secondary)" }}
        >
          A cinematic journey through innovative solutions and technical
          challenges
        </p>

        {/* Stats Row Redesigned as Glassmorphic Cards */}
        <div
          className="flex flex-wrap items-center justify-center gap-4 mt-10"
          role="group"
          aria-label="Project statistics"
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className="relative group px-6 py-4 rounded-xl border border-white/[0.04] transition-all duration-300 hover:border-[var(--accent)]/35 hover:bg-white/[0.03] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.5),_0_0_12px_var(--accent-dim)] min-w-[130px] text-center backdrop-blur-md overflow-hidden"
              style={{
                background: 'rgba(10, 10, 12, 0.45)',
              }}
            >
              {/* Micro tech corners */}
              <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l border-white/20 transition-colors duration-300 group-hover:border-[var(--accent)]" />
              <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r border-white/20 transition-colors duration-300 group-hover:border-[var(--accent)]" />

              <div
                className="font-heading text-2xl md:text-3xl font-bold mb-0.5 transition-transform duration-300 group-hover:scale-105"
                style={{
                  color: 'var(--accent)',
                }}
              >
                {stat.value}
              </div>
              <div
                className="font-mono text-[9px] md:text-[10px] tracking-[0.15em] uppercase transition-colors duration-300 group-hover:text-white"
                style={{ color: 'var(--text-secondary)' }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex justify-center items-center mt-12 mb-8 animate-fade-in">
        <div 
          className="inline-flex p-1 rounded-full border border-white/[0.05] backdrop-blur-md relative"
          style={{
            background: "rgba(10, 10, 11, 0.45)",
          }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="relative px-4 py-2 font-mono text-[9px] md:text-[10px] tracking-[0.12em] uppercase rounded-full transition-colors duration-300 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30 focus:ring-offset-1 focus:ring-offset-black z-10 text-[var(--text-secondary)] hover:text-white"
                style={{
                  color: isActive ? "var(--accent-contrast)" : undefined,
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryTab"
                    className="absolute inset-0 rounded-full z-[-1]"
                    style={{
                      background: "var(--accent)",
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Timeline Container ─── */}
      <div className="relative max-w-7xl mx-auto px-6" ref={containerRef}>
        {isMobile ? (
          /* ─── Mobile: Single column with left spine ─── */
          <div className="relative">
            {/* Mobile spine line container */}
            <div className="absolute left-[10px] top-0 bottom-0 w-[2px] z-0 overflow-hidden pointer-events-none">
              <motion.div
                className="w-full h-full origin-top"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, var(--accent) 10%, var(--accent) 90%, transparent)",
                  opacity: 0.25,
                  scaleY: mobileLineProgress,
                }}
                aria-hidden="true"
              />
            </div>

            <div className="space-y-48 py-8">
              {filteredProjects.map((project, i) => (
                <MobileTimelineCard
                  key={`${activeCategory}-${project.id}`}
                  project={project}
                  index={i}
                  totalProjects={filteredProjects.length}
                  timelineInView={timelineInView}
                  lineProgress={mobileLineProgress}
                />
              ))}
            </div>
          </div>
        ) : (
          /* ─── Desktop: Alternating branching timeline ─── */
          <motion.div
            className="relative"
            animate={{ height: timelineHeight }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
          >
            {/* Track line — faint full-height guide */}
            <motion.div
              className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none z-0 origin-top"
              style={{
                width: "1px",
                height: `${timelineHeight}px`,
                background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.06) 5%, rgba(255,255,255,0.06) 95%, transparent 100%)",
                scaleY: lineProgress,
              }}
              aria-hidden="true"
            />

            {/* Main energy beam — draws top to bottom when container enters viewport */}
            <motion.div
              className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none z-0 origin-top"
              style={{
                width: "2px",
                height: `${timelineHeight}px`,
                background: "linear-gradient(to bottom, var(--accent), var(--accent-hover), var(--accent))",
                opacity: 0.9,
                scaleY: lineProgress,
              }}
              aria-hidden="true"
            />

            {/* Project items */}
            {filteredProjects.map((project, index) => {
              const isLeft = index % 2 === 0;
              const topOffset = HEADER_SPACING + index * ITEM_GAP;

              return (
                <div key={`${activeCategory}-${project.id}`}>
                  <TimelineItem
                    project={project}
                    index={index}
                    isLeft={isLeft}
                    topOffset={topOffset}
                    totalProjects={filteredProjects.length}
                    timelineInView={timelineInView}
                    lineProgress={lineProgress}
                  />
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* ─── Section Edge Transitions ─── */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none z-50 bg-gradient-to-b from-[var(--bg)] to-transparent"
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-50 bg-gradient-to-t from-[var(--bg)] to-transparent"
      />

      {/* ─── GitHub CTA ─── */}
      <div className="max-w-3xl mx-auto px-6 py-28 md:py-32 text-center">
        <div
          className="relative rounded-2xl border p-8 md:p-12 overflow-hidden group/cta transition-all duration-500 hover:border-white/15"
          style={{
            background:
              "linear-gradient(135deg, rgba(15, 15, 18, 0.6) 0%, rgba(10, 10, 12, 0.35) 100%)",
            borderColor: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Ambient background glow inside card */}
          <div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover/cta:opacity-100 transition-opacity duration-700 z-0"
            style={{
              background: "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--accent) 7%, transparent) 0%, transparent 65%)",
            }}
          />

          {/* Icon Wrapper */}
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-2xl border border-white/[0.04] bg-white/[0.01] transition-all duration-500 group-hover/cta:border-[var(--accent)]/30 group-hover/cta:bg-[var(--accent-dim)] group-hover/cta:shadow-[0_0_20px_var(--accent-dim)] z-10">
            <SocialIcon
              platform="github"
              className="w-10 h-10 text-[var(--accent)] transition-transform duration-500 group-hover/cta:scale-110"
            />
          </div>

          <h3
            className="font-heading text-2xl md:text-3xl font-bold mb-3 relative z-10"
            style={{ color: "var(--text-primary)" }}
          >
            More on GitHub
          </h3>
          <p
            className="mb-6 max-w-lg mx-auto text-sm relative z-10 opacity-75"
            style={{ color: "var(--text-secondary)" }}
          >
            Explore additional projects, open-source contributions, and
            experimental work
          </p>
          <a
            href={personal.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm relative z-10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-transparent hover:bg-[var(--accent-hover)] hover:-translate-y-0.5 hover:scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.45),_0_0_15px_var(--accent)]"
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
            }}
            data-custom-cursor-ignore
            aria-label="Visit GitHub profile to see more projects"
          >
            <SocialIcon platform="github" className="w-4 h-4" aria-hidden="true" />
            Visit GitHub Profile
            <svg
              className="w-4 h-4 transition-transform duration-300 transform group-hover/cta:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
});

const ProjectsWithErrorBoundary = memo(function ProjectsWithErrorBoundary() {
  return (
    <ProjectsErrorBoundary>
      <Projects />
    </ProjectsErrorBoundary>
  );
});

export default ProjectsWithErrorBoundary;
