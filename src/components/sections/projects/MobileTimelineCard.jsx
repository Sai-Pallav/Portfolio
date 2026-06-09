import { motion } from "framer-motion";
import TimelineNode from "./TimelineNode";
import { TIMELINE_ANIM } from "./timelineAnimation";

function MobileTimelineCard({
  project,
  index,
  prefersReducedMotion,
  branchRevealed,
  cardRevealed,
}) {
  return (
    <div className="relative pl-10">
      <div className="absolute left-[10px] top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <motion.div
          initial={false}
          animate={
            branchRevealed
              ? { scale: 1, opacity: 1 }
              : { scale: 0, opacity: 0 }
          }
          transition={{
            duration: prefersReducedMotion ? 0 : 0.5,
            ease: TIMELINE_ANIM.ORB_EASE,
          }}
        >
          <TimelineNode />
        </motion.div>
      </div>

      <motion.div
        className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none z-10 origin-left"
        style={{ width: "28px", height: "4px" }}
        initial={false}
        animate={
          branchRevealed
            ? { scaleX: 1, opacity: 1 }
            : { scaleX: 0, opacity: 0 }
        }
        transition={{
          duration: prefersReducedMotion ? 0 : TIMELINE_ANIM.BRANCH_DRAW_DURATION,
          ease: TIMELINE_ANIM.BRANCH_EASE,
        }}
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

      <motion.div
        className="relative group"
        initial={false}
        animate={
          cardRevealed
            ? { opacity: 1, x: 0, scale: 1 }
            : { opacity: 0, x: 24, scale: 0.96 }
        }
        transition={{
          duration: prefersReducedMotion ? 0 : TIMELINE_ANIM.CARD_REVEAL_DURATION,
          ease: TIMELINE_ANIM.CARD_EASE,
        }}
      >
        <div
          className="relative rounded-xl border overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="absolute top-1/2 -translate-y-1/2 -left-1 w-1.5 h-5 rounded-full"
            style={{ background: "var(--accent)", opacity: 0.5 }}
          />

          <div
            className="relative h-40 overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-dim), rgba(0,0,0,0.3))",
            }}
          >
            <img
              src={project.image}
              alt={`Screenshot of ${project.title}`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {project.featured && (
              <div
                className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                }}
              >
                Featured
              </div>
            )}
          </div>

          <div className="p-4">
            <span className="font-mono text-[10px] tracking-[0.15em] text-[var(--text-muted)]">
              PROJECT {String(index + 1).padStart(2, "0")}
            </span>
            <h3
              className="font-heading text-lg font-bold mt-1 mb-1.5"
              style={{ color: "var(--text-primary)" }}
            >
              {project.title}
            </h3>
            <p
              className="text-xs leading-relaxed mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              {project.description}
            </p>
            <div className="flex flex-wrap gap-1 mb-3">
              {project.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-md border"
                  style={{
                    color: "var(--accent)",
                    background: "var(--accent-dim)",
                    borderColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-transparent"
                  style={{
                    color: "var(--text-primary)",
                    borderColor: "var(--border)",
                  }}
                  aria-label={`View source code for ${project.title}`}
                >
                  Code
                </a>
              )}
              {project.live && (
                <a
                  href={project.live}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-transparent"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-contrast)",
                  }}
                  aria-label={`View live demo of ${project.title}`}
                >
                  Live
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default MobileTimelineCard;
