import { motion } from 'framer-motion'

export function ProjectCard({ project, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative"
    >
      <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm transition-all duration-300 hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/10">
        {/* Image Section */}
        <div className="relative aspect-video overflow-hidden">
          <img
            src={project.image}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent opacity-60" />
          
          {/* Featured Badge */}
          {project.featured && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-contrast rounded-full text-xs font-semibold shadow-lg">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Featured
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-bg/80 backdrop-blur-sm">
            <motion.a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
              aria-label="View source code"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="text-sm font-medium">Code</span>
            </motion.a>
            <motion.a
              href={project.live}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-contrast rounded-lg hover:bg-accent-hover transition-colors"
              aria-label="View live demo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="text-sm font-medium">Live</span>
            </motion.a>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6">
          <h3 className="font-heading text-xl font-bold text-[var(--text-heading)] mb-2 group-hover:text-accent transition-colors">
            {project.title}
          </h3>
          
          <p className="text-secondary text-sm leading-relaxed mb-4 line-clamp-2">
            {project.description}
          </p>

          {/* Highlights */}
          <div className="space-y-2 mb-4">
            {project.highlights.slice(0, 2).map((highlight, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-secondary">
                <span className="text-accent mt-0.5 text-lg">▸</span>
                <span className="line-clamp-1">{highlight}</span>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 bg-accent-dim text-accent text-xs font-semibold rounded-lg border border-accent/20 hover:bg-accent/10 transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Glow Effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/0 via-accent/0 to-accent/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none" />
      </div>
    </motion.div>
  )
}
