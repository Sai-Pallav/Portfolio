import SocialIcon from "@/components/ui/SocialIcon";

const CATEGORY_LABELS = {
  fullstack: { label: 'Full Stack', icon: '⚡' },
  ml: { label: 'Machine Learning', icon: '🧠' },
  systems: { label: 'Systems', icon: '⚙️' },
  devops: { label: 'DevOps', icon: '🔧' },
};

function TimelineProjectCard({ project, index, isLeft }) {
  const catInfo = CATEGORY_LABELS[project.category] || { label: 'Project', icon: '📁' };

  return (
    <div className="relative">
      {/* Card container */}
      <div
        className="relative rounded-2xl border overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        {/* Connection port indicator on the branch-facing edge */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-2 h-6 rounded-full z-10 ${isLeft ? "-right-1" : "-left-1"}`}
          style={{
            background: "var(--accent)",
            opacity: 0.6,
          }}
        />

        {/* Category badge */}
        <div
          className={`absolute top-3 ${isLeft ? 'right-3' : 'left-3'} z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full`}
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span className="text-[10px]">{catInfo.icon}</span>
          <span className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: 'var(--text-secondary)' }}>
            {catInfo.label}
          </span>
        </div>

        {/* Project image */}
        <div
          className="relative h-52 md:h-58 overflow-hidden"
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Featured badge */}
          {project.featured && (
            <div
              className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 z-20"
              style={{
                background: "var(--accent)",
                color: "var(--accent-contrast)",
              }}
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Featured
            </div>
          )}

          {/* Project number overlay */}
          <div className="absolute bottom-3 left-4 z-20">
            <span className="font-mono text-xs tracking-[0.2em] text-white/40">
              PROJECT {String(index + 1).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="p-5 md:p-6">
          {/* Title with hover color shift */}
          <h3
            className="font-heading text-xl md:text-2xl font-bold mb-2.5"
            style={{ color: "var(--text-primary)" }}
          >
            <span className="group-hover:text-[var(--accent)] transition-colors duration-300">
              {project.title}
            </span>
          </h3>

          {/* Description */}
          <p
            className="text-sm leading-relaxed mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            {project.description}
          </p>

          {/* Highlights */}
          {project.highlights?.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {project.highlights.map((h, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span className="mt-0.5 text-[var(--accent)]">▸</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tech tags with hover glow */}
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-default"
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
        </div>
      </div>
    </div>
  );
}

export default TimelineProjectCard;
