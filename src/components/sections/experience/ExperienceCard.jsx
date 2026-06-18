import { memo } from 'react'

const getBadgeColor = (badge) => {
  switch (badge) {
    case 'Current':
      return 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400'
    case 'Active':
      return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400'
    case 'Leadership':
      return 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400'
    default:
      return 'from-accent/20 to-accent-hover/20 border-accent/30 text-accent'
  }
}

/**
 * Experience Card - Vertical cards displayed on mobile viewport.
 * Represents a single career milestone.
 * 
 * @param {{
 *   exp: Object,
 *   index: number,
 *   total: number
 * }} props
 */
const ExperienceCard = memo(function ExperienceCard({ exp, index, total }) {
  return (
    <article
      className="group relative rounded-3xl p-8 md:p-10 bg-gradient-to-br from-surface/80 via-raised/60 to-surface/80 backdrop-blur-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/40"
      aria-label={`${exp.role} at ${exp.company}`}
    >
      {/* Animated gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent-hover/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Animated glowing border */}
      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'gradientShift 3s linear infinite',
          backgroundImage: 'linear-gradient(45deg, var(--accent), var(--accent-hover), var(--accent))',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 3s linear infinite',
        }}
      >
        <div className="absolute inset-[1px] rounded-3xl bg-surface/90" />
      </div>

      {/* Card number indicator */}
      <div className="absolute top-6 right-6 font-mono text-xs tracking-widest text-muted/40" aria-hidden="true">
        <span className="text-accent/60">{String(index + 1).padStart(2, '0')}</span>
        <span className="text-muted/30 mx-2">/</span>
        <span className="text-muted/40">{String(total).padStart(2, '0')}</span>
      </div>

      <div className="relative z-10">
        {/* Header section */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-3xl md:text-4xl font-bold text-[var(--text-heading)] mb-3 leading-tight group-hover:text-accent transition-colors duration-300">
              {exp.role}
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              <p className="text-accent font-bold text-xl md:text-2xl">{exp.company}</p>
              {exp.badge && (
                <span
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r ${getBadgeColor(exp.badge)} text-sm font-semibold border backdrop-blur-sm`}
                >
                  <span
                    className="w-2 h-2 rounded-full bg-current animate-pulse"
                  />
                  {exp.badge}
                </span>
              )}
            </div>
          </div>

          {/* Duration badge */}
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-accent/10 to-accent-hover/10 border border-accent/20 text-secondary text-sm font-mono flex-shrink-0 self-start backdrop-blur-xl">
            <svg
              className="w-5 h-5 text-accent animate-[wiggle_4s_ease-in-out_infinite]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <time dateTime={exp.duration} className="font-medium">{exp.duration}</time>
          </div>
        </div>

        {/* Divider */}
        <div className="h-1 rounded-full bg-gradient-to-r from-transparent via-accent/30 to-transparent mb-8" aria-hidden="true" />

        {/* Bullet points */}
        <ul className="space-y-4 mb-8" role="list">
          {exp.bullets.map((bullet, idx) => (
            <li key={bullet} className="flex items-start gap-4 text-secondary text-base md:text-lg leading-relaxed">
              <div
                className="flex-shrink-0 mt-1"
                style={{ animationDelay: `${idx * 0.1 + 0.3}s` }}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center animate-[scaleIn_0.6s_ease-out_forwards]">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span className="group-hover:text-[var(--text-heading)] transition-colors duration-300">{bullet}</span>
            </li>
          ))}
        </ul>

        {/* Technologies */}
        <div className="flex flex-wrap gap-3" role="list" aria-label="Technologies used">
          {exp.tech.map((tech, idx) => (
            <span
              key={tech}
              role="listitem"
              style={{ animationDelay: `${idx * 0.05 + 0.5}s` }}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-accent/10 to-accent-hover/10 text-accent text-sm font-medium rounded-xl border border-accent/20 backdrop-blur-sm hover:border-accent/40 animate-[scaleIn_0.6s_ease-out_forwards]"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
})

export default ExperienceCard
