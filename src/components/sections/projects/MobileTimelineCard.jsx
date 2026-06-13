import { useRef, useState, useEffect, memo } from "react";
import { motion, useScroll } from "framer-motion";
import TimelineNode from "./TimelineNode";
import { getMobileJunctionProgress } from "./timelineAnimation";

const CATEGORY_LABELS = {
  fullstack: {
    label: 'Full Stack',
    icon: (
      <svg className="w-3 h-3 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    )
  },
  ml: {
    label: 'Machine Learning',
    icon: (
      <svg className="w-3 h-3 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
        <path d="M12 6v12M6 12h12" />
      </svg>
    )
  },
  systems: {
    label: 'Systems',
    icon: (
      <svg className="w-3 h-3 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  },
  devops: {
    label: 'DevOps',
    icon: (
      <svg className="w-3 h-3 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    )
  }
};

const MobileTimelineCard = memo(function MobileTimelineCard({
  project,
  index,
  totalProjects,
  timelineInView,
  lineProgress,
}) {
  const cardRef = useRef(null);
  const [hasAwakened, setHasAwakened] = useState(false);
  const catInfo = CATEGORY_LABELS[project.category] || { label: 'Project', icon: null };

  // Trigger mobile card and orb activation exactly when the drawing mobile spine passes this node
  useEffect(() => {
    if (!timelineInView) {
      Promise.resolve().then(() => {
        setHasAwakened((prev) => (prev ? false : prev));
      });
      return;
    }
    if (lineProgress) {
      const junctionProgress = getMobileJunctionProgress(index, totalProjects);
      
      const checkProgress = (latest) => {
        if (latest >= junctionProgress) {
          setHasAwakened(true);
        }
      };

      // Check the initial progress value
      checkProgress(lineProgress.get());

      const unsubscribe = lineProgress.on("change", checkProgress);
      return unsubscribe;
    }
  }, [timelineInView, lineProgress, index, totalProjects]);

  // Track scroll position of this item relative to the viewport
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });

  return (
    <div ref={cardRef} className="relative pl-10 group/item">
      {/* Clickable Orb Smooth-Scroll Navigation Point */}
      <button
        onClick={() => {
          cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
        className="absolute left-[10px] top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-black rounded-full transition-transform hover:scale-110 active:scale-95"
        aria-label={`Scroll to ${project.title}`}
      >
        <TimelineNode scrollYProgress={scrollYProgress} hasAwakened={hasAwakened} />
      </button>

      {/* Branch connector with viewport entrance animation */}
      <motion.div
        className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none z-10"
        style={{
          width: "28px",
          height: "4px",
          originX: 0,
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={hasAwakened ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
        transition={{
          duration: hasAwakened ? 0.4 : 0,
          delay: hasAwakened ? 0.05 : 0,
          ease: [0.22, 1, 0.36, 1],
        }}
        aria-hidden="true"
      >
        <svg
          style={{ width: "28px", height: "4px", overflow: "visible", display: "block" }}
          viewBox="0 0 28 4"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1="2"
            x2="28"
            y2="2"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ opacity: 0.6 }}
          />
        </svg>
      </motion.div>

      {/* Card with viewport entrance animation */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, x: 20, scale: 0.96 }}
        animate={hasAwakened ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 20, scale: 0.96 }}
        transition={{
          duration: hasAwakened ? 0.5 : 0,
          delay: hasAwakened ? 0.2 : 0,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <div
          className="relative rounded-xl border overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-[var(--accent-dim)]/10"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          {/* Connection edge accent line */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -left-1 w-1.5 h-5 rounded-full z-10"
            style={{ background: "var(--accent)", opacity: 0.5 }}
          />

          {/* Category badge */}
          <div
            className="absolute top-11 right-3 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full"
            style={{
              background: 'rgba(10, 10, 12, 0.8)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {catInfo.icon}
            <span className="font-mono text-[8px] tracking-[0.15em] uppercase" style={{ color: 'var(--text-secondary)' }}>
              {catInfo.label}
            </span>
          </div>

          {/* Project Image Container */}
          <div
            className="relative h-40 overflow-hidden border-b border-white/[0.04]"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-dim), rgba(0,0,0,0.3))",
            }}
          >
            {/* macOS Style HUD Mockup Bar */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-black/40 backdrop-blur-md border-b border-white/[0.04] flex items-center justify-between px-3 z-20">
              {/* macOS Window dots */}
              <div className="flex items-center gap-1.2" aria-hidden="true">
                <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
                <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
                <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
              </div>

              {/* Secure URL Bar Capsule */}
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-[8px] font-mono text-white/40 max-w-[60%] truncate">
                <svg className="w-2 h-2 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="truncate">saipallav.dev/projects/{project.title.toLowerCase().replace(/\s+/g, '-')}</span>
              </div>

              {/* Spacer */}
              <div className="w-8 h-1" aria-hidden="true" />
            </div>

            <img
              src={project.image}
              alt={`Screenshot of ${project.title}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-105"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Featured badge */}
            {project.featured && (
              <div
                className="absolute top-11 left-3 px-2.5 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-1 z-20 shadow-[0_2px_10px_rgba(0,0,0,0.3)] border border-[var(--accent)]/20"
                style={{
                  background: "rgba(10, 10, 12, 0.8)",
                  color: "var(--accent)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <span className="relative flex h-1.2 w-1.2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.2 w-1.2 bg-[var(--accent)]"></span>
                </span>
                Featured
              </div>
            )}
          </div>

          <div className="p-4">
            <span className="font-mono text-[9px] tracking-[0.2em] text-white/40">
              PROJECT {String(index + 1).padStart(2, "0")} — {project.date}
            </span>
            <h3
              className="font-heading text-lg font-bold mt-1 mb-1.5 transition-colors duration-300 group-hover/item:text-[var(--accent)]"
              style={{ color: "var(--text-primary)" }}
            >
              {project.title}
            </h3>
            <p
              className="text-xs leading-relaxed mb-3.5"
              style={{ color: "var(--text-muted)" }}
            >
              {project.description}
            </p>

            {/* Tech tags */}
            <div className="flex flex-wrap gap-1 mb-4">
              {project.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[9px] font-mono font-medium rounded-md border"
                  style={{
                    color: "var(--accent)",
                    background: "var(--accent-dim)",
                    borderColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Divider */}
            <div className="h-[1px] w-full bg-white/[0.04] my-4" />

            {/* CTA Buttons */}
            <div className="flex gap-2">
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold font-mono tracking-wider uppercase transition-all duration-300 border border-white/[0.05] hover:border-white/15 text-center flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    color: "var(--text-secondary)",
                    borderColor: "rgba(255,255,255,0.05)",
                  }}
                  aria-label={`View source code for ${project.title}`}
                >
                  <svg className="w-3.5 h-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                  Code
                </a>
              )}
              {project.live && (
                <a
                  href={project.live}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold font-mono tracking-wider uppercase transition-all duration-300 text-center flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-contrast)",
                  }}
                  aria-label={`View live demo of ${project.title}`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Live
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

export default MobileTimelineCard;
