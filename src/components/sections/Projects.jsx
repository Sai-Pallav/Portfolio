import { useRef, useEffect, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
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
import { useProjectTimelineAnimation } from "./projects/useProjectTimelineAnimation";

const { HEADER_SPACING, ITEM_GAP, CARD_CENTER_Y } = TIMELINE_ANIM;

/* ─────────────────────────────────────────────────────────────────
   MAIN PROJECTS SECTION
───────────────────────────────────────────────────────────────── */
function Projects() {
  const sectionRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });
  const prefersReducedMotion = useReducedMotion();
  const { lineProgress, branchRevealed, cardRevealed } = useProjectTimelineAnimation(
    projects.length,
    isInView,
    prefersReducedMotion,
    isMobile,
  );

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

  const timelineHeight = getTimelineHeight(projects.length);

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="relative overflow-hidden bg-transparent"
      aria-labelledby="projects-heading"
    >
      {/* ─── Background Layers ─── */}
      <ProjectBackground />

      {/* ─── Section Header ─── */}
      <div className="max-w-7xl mx-auto px-6 pt-28 md:pt-32 pb-8 text-center">
        {/* Animated badge */}
        <div className="inline-flex items-center gap-3 mb-6">
          <div
            className="h-[1px] rounded-full"
            style={{ width: '32px', background: 'var(--accent)' }}
          />
          <span
            className="font-mono text-[10px] md:text-xs tracking-[0.3em] uppercase px-4 py-1.5 rounded-full border"
            style={{
              color: "var(--accent)",
              borderColor: 'var(--border)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            Featured Work
          </span>
          <div
            className="h-[1px] rounded-full"
            style={{ width: '32px', background: 'var(--accent)' }}
          />
        </div>

        <h2
          id="projects-heading"
          className="font-heading text-4xl md:text-5xl lg:text-7xl font-bold mb-5 tracking-tight"
        >
          <span style={{ color: "var(--text-primary)" }}>
            Projects{' '}
          </span>
          <span className="relative inline-block" style={{ color: "var(--accent)" }}>
            Timeline
            <span
              className="absolute -bottom-1 left-0 h-[2px] rounded-full"
              style={{ width: '100%', background: 'var(--accent)' }}
            />
          </span>
        </h2>
        <p
          className="text-base md:text-lg max-w-xl mx-auto"
          style={{ color: "var(--text-muted)" }}
        >
          A cinematic journey through innovative solutions and technical
          challenges
        </p>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-8 mt-8">
          {[
            { value: projects.length, label: 'Projects' },
            { value: projects.filter(p => p.featured).length, label: 'Featured' },
            { value: new Set(projects.flatMap(p => p.tags)).size + '+', label: 'Technologies' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-heading text-2xl md:text-3xl font-bold" style={{ color: 'var(--accent)' }}>
                {stat.value}
              </div>
              <div className="font-mono text-[9px] md:text-[10px] tracking-[0.2em] uppercase mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Timeline Container ─── */}
      <div className="relative max-w-7xl mx-auto px-6">
        {isMobile ? (
          /* ─── Mobile: Single column with left spine ─── */
          <div className="relative">
            {/* Mobile spine line — draws top to bottom on section visit */}
            <motion.div
              className="absolute left-[10px] top-0 bottom-0 w-[2px] z-0 origin-top"
              style={{
                scaleY: lineProgress,
                background:
                  "linear-gradient(to bottom, transparent, var(--accent) 10%, var(--accent) 90%, transparent)",
                opacity: 0.2,
              }}
            />

            <div className="space-y-16 py-8">
              {projects.map((project, i) => (
                <MobileTimelineCard
                  key={project.id}
                  project={project}
                  index={i}
                  prefersReducedMotion={prefersReducedMotion}
                  branchRevealed={branchRevealed[i]}
                  cardRevealed={cardRevealed[i]}
                />
              ))}
            </div>
          </div>
        ) : (
          /* ─── Desktop: Alternating branching timeline ─── */
          <div
            className="relative"
            style={{ height: `${timelineHeight}px` }}
          >
            {/* Track line — faint full-height guide */}
            <motion.div
              className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none z-0 origin-top"
              style={{
                scaleY: lineProgress,
                width: "1px",
                height: `${timelineHeight}px`,
                background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.06) 5%, rgba(255,255,255,0.06) 95%, transparent 100%)",
              }}
            />

            {/* Main energy beam — draws top to bottom on section visit */}
            <motion.div
              className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none z-0 origin-top"
              style={{
                scaleY: lineProgress,
                width: "2px",
                height: `${timelineHeight}px`,
                background: "linear-gradient(to bottom, var(--accent), var(--accent-hover), var(--accent))",
                opacity: 0.9,
              }}
            />

            {/* Horizontal dividers — centered between consecutive projects */}
            {projects.map((project, index) =>
              index < projects.length - 1 ? (
                <div
                  key={`divider-${project.id}`}
                  className="absolute left-0 right-0 pointer-events-none z-[1]"
                  style={{
                    top: `${HEADER_SPACING + index * ITEM_GAP + CARD_CENTER_Y + ITEM_GAP / 2}px`,
                    height: "1px",
                    background: "var(--accent)",
                    opacity: 0.35,
                  }}
                />
              ) : null
            )}

            {/* Project items */}
            {projects.map((project, index) => {
              const isLeft = index % 2 === 0;
              const topOffset = HEADER_SPACING + index * ITEM_GAP;

              return (
                <div key={`item-${project.id}`}>
                  <TimelineItem
                    project={project}
                    index={index}
                    isLeft={isLeft}
                    topOffset={topOffset}
                    prefersReducedMotion={prefersReducedMotion}
                    branchRevealed={branchRevealed[index]}
                    cardRevealed={cardRevealed[index]}
                  />
                </div>
              );
            })}
          </div>
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
          className="relative rounded-2xl border p-8 md:p-12 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <SocialIcon
            platform="github"
            className="w-14 h-14 mx-auto mb-5 text-[var(--accent)]"
          />
          <h3
            className="font-heading text-2xl md:text-3xl font-bold mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            More on GitHub
          </h3>
          <p
            className="mb-6 max-w-lg mx-auto text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Explore additional projects, open-source contributions, and
            experimental work
          </p>
          <a
            href={personal.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-transparent"
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
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function ProjectsWithErrorBoundary() {
  return (
    <ProjectsErrorBoundary>
      <Projects />
    </ProjectsErrorBoundary>
  );
}
