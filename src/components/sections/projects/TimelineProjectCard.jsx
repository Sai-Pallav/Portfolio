import { memo } from "react";

const TimelineProjectCard = memo(function TimelineProjectCard({ project, index, isLeft, isHovered = false }) {
  return (
    <div className="relative group/card">
      {/* Card container */}
      <div
        className="relative rounded-[22px] border overflow-hidden transition-all duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_12px_36px_-6px_rgba(0,0,0,0.65)] hover:shadow-[0_24px_55px_-10px_rgba(0,0,0,0.85)] hover:-translate-y-1"
        style={{
          background: `
            radial-gradient(ellipse 110% 70% at 0% 0%, color-mix(in srgb, var(--accent) 18%, transparent) 0%, color-mix(in srgb, var(--accent-secondary, var(--accent)) 8%, transparent) 45%, transparent 100%),
            radial-gradient(ellipse 85% 60% at 90% 10%, color-mix(in srgb, var(--accent-secondary, var(--accent)) 5%, transparent) 0%, transparent 60%),
            radial-gradient(ellipse 90% 40% at 50% 100%, color-mix(in srgb, var(--accent) 9%, transparent) 0%, transparent 80%),
            radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.45) 100%),
            color-mix(in srgb, var(--bg-surface) 78%, #000)
          `,
          borderColor: 'var(--border)',
          backdropFilter: "blur(12px)",
          boxShadow: "0 12px 36px -6px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Directional top-left rim highlight */}
        <div 
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--text-primary) 14%, transparent) 10%, color-mix(in srgb, var(--text-primary) 4%, transparent) 55%, transparent 100%)' }}
          aria-hidden="true"
        />

        {/* Connection port indicator */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-2 h-7 rounded-full z-10 transition-all duration-250 border border-[var(--accent)]/30 ${
            isLeft ? "-right-1" : "-left-1"
          }`}
          style={{
            background: "linear-gradient(to bottom, var(--accent), var(--accent-hover))",
            boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.3)",
          }}
          aria-hidden="true"
        />

        {/* Project image */}
        <div className="relative h-48 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, var(--accent-dim), rgba(0,0,0,0.3))",
            }}
          />
          <img
            src={project.image}
            alt={`Screenshot of ${project.title}`}
            className="w-full h-full object-cover transition-transform duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[1.03]"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          {/* Smooth image-to-content transition */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, transparent 40%, color-mix(in srgb, var(--bg-surface) 40%, transparent) 70%, color-mix(in srgb, var(--bg-surface) 78%, #000) 100%)',
            }}
          />
        </div>

        {/* Card content */}
        <div 
          className="p-7 relative"
          style={{
            background: 'radial-gradient(ellipse 90% 70% at 0% 0%, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 65%)',
          }}
        >
          {/* Project number */}
          <div 
            className="text-[10px] font-mono tracking-[0.22em] uppercase mb-2.5 transition-colors duration-300"
            style={{ color: 'rgba(255, 255, 255, 0.4)' }}
          >
            PROJECT {String(index + 1).padStart(2, "0")}
          </div>

          {/* Title */}
          <h3
            className="text-2xl font-bold mb-2 tracking-tight transition-colors duration-300 group-hover/card:text-[var(--accent)]"
            style={{ color: 'rgba(255, 255, 255, 0.95)' }}
          >
            {project.title}
          </h3>

          {/* Metadata row */}
          <div 
            className="flex items-center gap-2 mb-4 text-[11px] transition-colors duration-300 font-mono"
            style={{ color: 'rgba(255, 255, 255, 0.45)' }}
          >
            <span>Released</span>
            <span className="opacity-40">·</span>
            <span>{project.date}</span>
            {project.highlights[0] && (
              <>
                <span className="opacity-40">·</span>
                <span className="text-[var(--accent)] font-medium">
                  {project.highlights[0]}
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p
            className="text-[14px] leading-relaxed mb-5"
            style={{ color: 'rgba(255, 255, 255, 0.68)' }}
          >
            {project.description}
          </p>

          {/* Metrics */}
          {project.highlights?.length > 1 && (
            <div className="flex flex-wrap items-center gap-4 mb-5">
              {project.highlights.slice(1, 3).map((metric, i) => {
                const parts = metric.match(/^([\d<>+]+)\s*(.+)$/);
                if (parts) {
                  const [, number, label] = parts;
                  return (
                    <div key={i} className="flex items-baseline gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                      <span 
                        className="text-base font-semibold tracking-tight transition-colors duration-300"
                        style={{ color: 'rgba(255, 255, 255, 0.95)' }}
                      >
                        {number}
                      </span>
                      <span 
                        className="text-[11px] transition-colors duration-300"
                        style={{ color: 'rgba(255, 255, 255, 0.45)' }}
                      >
                        {label}
                      </span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Tech stack */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 text-[10px] font-mono tracking-wide rounded-md border transition-all duration-300"
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  background: 'rgba(255, 255, 255, 0.025)',
                  borderColor: 'rgba(255, 255, 255, 0.06)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div 
            className="h-[1px] w-full mb-5"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 15%, rgba(255, 255, 255, 0.08) 85%, transparent 100%)' }}
          />

          {/* Actions */}
          <div className="flex items-center gap-3">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 rounded-xl text-[11px] font-mono font-medium tracking-wider uppercase transition-all duration-[300ms] ease-[cubic-bezier(0.22,1,0.36,1)] text-center flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-black hover:-translate-y-0.5 hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-white"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  color: "rgba(255, 255, 255, 0.75)",
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
                data-custom-cursor-ignore
                aria-label={`View source code for ${project.title}`}
              >
                <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
                Source
              </a>
            )}
            {project.live && (
              <a
                href={project.live}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 rounded-xl text-[11px] font-mono font-semibold tracking-wider uppercase transition-all duration-[300ms] ease-[cubic-bezier(0.22,1,0.36,1)] text-center flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-black hover:-translate-y-0.5 hover:brightness-110 shadow-[0_4px_16px_var(--accent-dim)] hover:shadow-[0_6px_22px_var(--accent-dim)]"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                }}
                data-custom-cursor-ignore
                aria-label={`View live demo of ${project.title}`}
              >
                Live Demo
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TimelineProjectCard;
