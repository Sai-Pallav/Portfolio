import { memo } from "react";

const TimelineProjectCard = memo(function TimelineProjectCard({ project, index, isLeft, isHovered = false }) {
  return (
    <div className="relative group/card">
      {/* Card container */}
      <div
        className="relative rounded-[20px] border overflow-hidden transition-all duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.32)] hover:-translate-y-1"
        style={{
          background: 'linear-gradient(135deg, rgba(24, 24, 30, 0.96), rgba(12, 13, 17, 0.98))',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Subtle top highlight */}
        <div 
          className="absolute top-0 left-0 right-0 h-px opacity-60 pointer-events-none"
          style={{ background: 'rgba(255, 255, 255, 0.06)' }}
          aria-hidden="true"
        />

        {/* Subtle atmospheric glow */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-[60%] h-32 opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(130, 90, 255, 0.08), transparent 55%)',
            filter: 'blur(30px)',
          }}
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
              background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(0,0,0,0.3))",
            }}
          />
          <img
            src={project.image}
            alt={`Screenshot of ${project.title}`}
            className="w-full h-full object-cover transition-transform duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[1.025]"
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
              background: 'linear-gradient(to bottom, transparent 55%, rgba(10, 10, 14, 0.45) 78%, rgba(10, 10, 14, 0.95) 100%)',
            }}
          />
        </div>

        {/* Card content */}
        <div className="p-7 relative">
          {/* Project number */}
          <div 
            className="text-[10px] font-mono tracking-[0.2em] uppercase mb-3 transition-colors duration-300"
            style={{ color: 'rgba(255, 255, 255, 0.35)' }}
          >
            {String(index + 1).padStart(2, "0")}
          </div>

          {/* Title */}
          <h3
            className="text-2xl font-bold mb-2 tracking-tight transition-colors duration-300 group-hover/card:brightness-110"
            style={{ color: 'rgba(255, 255, 255, 0.95)' }}
          >
            {project.title}
          </h3>

          {/* Metadata row */}
          <div 
            className="flex items-center gap-2 mb-4 text-[11px] transition-colors duration-300"
            style={{ color: 'rgba(255, 255, 255, 0.4)' }}
          >
            <span>Released</span>
            <span>·</span>
            <span>{project.date}</span>
            {project.highlights[0] && (
              <>
                <span>·</span>
                <span className="transition-colors duration-300 group-hover/card:text-[var(--accent)]">
                  {project.highlights[0]}
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p
            className="text-[15px] leading-relaxed mb-5"
            style={{ color: 'rgba(255, 255, 255, 0.65)' }}
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
                    <div key={i} className="flex items-baseline gap-1.5">
                      <span 
                        className="text-lg font-semibold tracking-tight transition-colors duration-300"
                        style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                      >
                        {number}
                      </span>
                      <span 
                        className="text-[11px] transition-colors duration-300"
                        style={{ color: 'rgba(255, 255, 255, 0.4)' }}
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
          <div 
            className="flex flex-wrap gap-1.5 mb-6 text-[11px] transition-colors duration-300 group-hover/card:brightness-110"
            style={{ color: 'rgba(255, 255, 255, 0.45)' }}
          >
            {project.tags.map((tag, i) => (
              <span key={tag}>
                {tag}
                {i < project.tags.length - 1 && <span className="ml-1.5">·</span>}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div 
            className="h-[1px] w-full mb-5"
            style={{ background: 'rgba(255, 255, 255, 0.07)' }}
          />

          {/* Actions */}
          <div className="flex items-center gap-3">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 rounded-xl text-[11px] font-medium tracking-wide uppercase transition-all duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] text-center flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-black hover:-translate-y-0.5 hover:brightness-125"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "rgba(255, 255, 255, 0.7)",
                  border: '1px solid rgba(255, 255, 255, 0.08)',
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
                className="flex-1 py-2.5 px-4 rounded-xl text-[11px] font-medium tracking-wide uppercase transition-all duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] text-center flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-black hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
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
