import { memo } from "react";

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

const TimelineProjectCard = memo(function TimelineProjectCard({ project, index, isLeft }) {
  const catInfo = CATEGORY_LABELS[project.category] || { label: 'Project', icon: null };

  return (
    <div className="relative group/card">
      {/* Card container */}
      <div
        className="relative rounded-2xl border overflow-hidden transition-all duration-500 bg-gradient-to-br from-zinc-900/[0.35] to-zinc-950/[0.05] hover:from-zinc-900/[0.45] hover:to-zinc-950/[0.15] border-white/[0.05] hover:border-white/[0.12] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7),0_0_20px_-5px_var(--accent-dim)]"
        style={{
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Connection port indicator on the branch-facing edge */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full z-10 transition-all duration-500 opacity-50 group-hover/card:opacity-90 group-hover/card:shadow-[0_0_10px_var(--accent)] ${isLeft ? "-right-0.75" : "-left-0.75"}`}
          style={{
            background: "var(--accent)",
          }}
          aria-hidden="true"
        />

        {/* Category badge */}
        <div
          className={`absolute top-11 ${isLeft ? 'right-3' : 'left-3'} z-20 flex items-center gap-1 px-2.5 py-0.5 rounded border transition-colors duration-300`}
          style={{
            background: 'rgba(10, 10, 12, 0.7)',
            borderColor: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {catInfo.icon}
          <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-white/50">
            {catInfo.label}
          </span>
        </div>

        {/* Project image & overlays */}
        <div
          className="relative h-48 overflow-hidden border-b border-white/[0.04]"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-dim), rgba(0,0,0,0.3))",
          }}
        >
          {/* macOS Style HUD Mockup Bar */}
          <div className="absolute top-0 left-0 right-0 h-7 bg-black/40 backdrop-blur-md border-b border-white/[0.03] flex items-center justify-between px-3.5 z-20">
            {/* macOS Window dots */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
              <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
              <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
            </div>

            {/* Secure URL Bar Capsule */}
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded border border-white/[0.04] bg-white/[0.01] text-[8px] font-mono text-white/30 max-w-[60%] truncate">
              <svg className="w-2 h-2 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="truncate">saipallav.dev/projects/{project.title.toLowerCase().replace(/\s+/g, '-')}</span>
            </div>

            {/* Window Right control placeholder */}
            <div className="w-10 h-1" aria-hidden="true" />
          </div>

          <img
            src={project.image}
            alt={`Screenshot of ${project.title}`}
            className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover/card:scale-102"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Featured badge with pulsing indicator */}
          {project.featured && (
            <div
              className="absolute top-11 left-3 px-2.5 py-0.5 rounded text-[8px] font-mono tracking-[0.12em] uppercase flex items-center gap-1.5 z-20 border border-[var(--accent)]/20"
              style={{
                background: "rgba(10, 10, 12, 0.7)",
                color: "var(--accent)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]"></span>
              </span>
              Featured
            </div>
          )}

          {/* Project number overlay */}
          <div className="absolute bottom-3 left-4 z-20">
            <span className="font-mono text-[10px] tracking-[0.15em] text-white/30">
              PROJECT {String(index + 1).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="p-6">
          {/* Title with hover color shift */}
          <h3
            className="font-heading text-xl md:text-2xl font-bold mb-2 transition-colors duration-300 text-[var(--text-primary)] group-hover/card:text-[var(--accent)]"
          >
            {project.title}
          </h3>

          {/* Date & Core Case-Study Outcome Badge */}
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span className="text-[10px] font-mono tracking-widest uppercase text-white/40">
              Released: {project.date}
            </span>
            <span className="text-white/20 select-none">•</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border border-[var(--accent)]/20 bg-[var(--accent-dim)] text-[var(--accent)] shadow-[0_0_8px_var(--accent-dim)]">
              <svg className="w-2.5 h-2.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Outcome: {project.highlights[0]}
            </span>
          </div>

          {/* Description */}
          <p
            className="text-sm leading-relaxed mb-4 text-[var(--text-secondary)] opacity-90"
          >
            {project.description}
          </p>

          {/* Secondary Highlights list */}
          {project.highlights?.length > 1 && (
            <div className="grid grid-cols-1 gap-2 mb-5">
              {project.highlights.slice(1).map((h, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-2 rounded-lg border border-white/[0.03] transition-all duration-300 hover:border-white/[0.06] hover:bg-white/[0.005]"
                  style={{
                    background: 'rgba(255, 255, 255, 0.005)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full border border-[var(--accent)] mt-1.5 flex-shrink-0 bg-[var(--accent)]/10" />
                  <span className="text-[11px] leading-relaxed text-zinc-300">
                    {h}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tech tags */}
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 text-[10px] font-mono rounded border transition-colors duration-300 hover:border-[var(--accent)]/30 hover:text-[var(--accent-hover)] cursor-default"
                style={{
                  color: "var(--text-secondary)",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderColor: "rgba(255, 255, 255, 0.05)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div className="h-[1px] w-full bg-white/[0.04] my-5" />

          {/* Persistent CTA Actions */}
          <div className="flex items-center gap-3">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold font-mono tracking-wider uppercase transition-all duration-300 border border-white/[0.05] hover:border-white/15 text-center flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-black hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "var(--text-secondary)",
                }}
                data-custom-cursor-ignore
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
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold font-mono tracking-wider uppercase transition-all duration-300 text-center flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-black hover:bg-[var(--accent-hover)]"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                  boxShadow: "0 2px 8px var(--accent-dim)",
                }}
                data-custom-cursor-ignore
                aria-label={`View live demo of ${project.title}`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Live Demo
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TimelineProjectCard;
