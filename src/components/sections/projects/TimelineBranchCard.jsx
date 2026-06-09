import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import ProjectImageFallback from './ProjectImageFallback'

/**
 * Futuristic glassmorphic project card for the branching timeline.
 * Displays project information with enhanced styling and animations.
 * 
 * @param {Object} props
 * @param {Object} props.project - Project data
 * @param {number} props.index - Project index
 * @param {string} props.direction - 'left' or 'right'
 * @param {Object} props.branchState - Animation state from timeline hook
 */
export default function TimelineBranchCard({ project, index, direction, branchState }) {
  const cardVisible = branchState?.cardVisible || false
  const [imageError, setImageError] = useState(false)

  return (
    <motion.article
      initial={{ opacity: 0, y: 50, scale: 0.92 }}
      animate={cardVisible ? {
        opacity: 1,
        y: 0,
        scale: 1
      } : {}}
      transition={{
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94], // circOut easing
        delay: 0.08
      }}
      className={`group relative w-full max-w-md ${direction === 'left' ? 'ml-auto' : 'mr-auto'
        }`}
      style={{ zIndex: 10 + index }}
      aria-labelledby={`project-title-${project.id}`}
    >
      {/* Card container with glassmorphism */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 backdrop-blur-xl transition-all duration-500 hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/20 hover:-translate-y-2">

        {/* Animated border glow on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/20 via-transparent to-accent/20 blur-xl" />
        </div>

        {/* Project number indicator */}
        <div className="absolute -top-3 -left-3 z-20">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={cardVisible ? { scale: 1, rotate: 0 } : {}}
            transition={{ duration: 0.5, ease: "backOut", delay: 0.2 }}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-hover text-white font-bold text-sm shadow-lg shadow-accent/40"
          >
            {String(index + 1).padStart(2, '0')}
          </motion.div>
        </div>

        {/* Image Section */}
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-accent/20 to-accent-dim/20">
          {!imageError ? (
            <motion.img
              src={project.image}
              alt={`${project.title} project screenshot`}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={cardVisible ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.15 }}
              onError={() => setImageError(true)}
            />
          ) : (
            <ProjectImageFallback title={project.title} cardVisible={cardVisible} />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent opacity-80" />

          {/* Featured badge */}
          {project.featured && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={cardVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-accent/90 backdrop-blur-sm text-white rounded-full text-xs font-semibold shadow-lg"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Featured
            </motion.div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <motion.h3
            id={`project-title-${project.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={cardVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
            className="font-heading text-xl font-bold text-[var(--text-heading)] group-hover:text-accent transition-colors duration-300"
          >
            {project.title}
          </motion.h3>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={cardVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="text-secondary text-sm leading-relaxed line-clamp-3"
          >
            {project.description}
          </motion.p>

          {/* Highlights */}
          {project.highlights && project.highlights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={cardVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
              className="space-y-2"
            >
              {project.highlights.slice(0, 2).map((highlight, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-secondary">
                  <span className="text-accent mt-0.5 text-lg">▸</span>
                  <span className="line-clamp-1">{highlight}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Tech Stack Tags */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={cardVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            className="flex flex-wrap gap-2"
          >
            {project.tags.map((tag, tagIndex) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={cardVisible ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.3, delay: 0.4 + (tagIndex * 0.05) }}
                className="px-3 py-1 bg-accent/10 text-accent text-xs font-semibold rounded-full border border-accent/20 hover:bg-accent/20 transition-all duration-300 hover:scale-105"
              >
                {tag}
              </motion.span>
            ))}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={cardVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
            className="flex items-center gap-3 pt-2"
          >
            {/* GitHub Button */}
            <motion.a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 hover:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg transition-all duration-300 group/btn"
              aria-label={`View ${project.title} source code on GitHub`}
            >
              {/* GitHub icon */}
              <svg className="w-4 h-4 transition-transform duration-300 group-hover/btn:rotate-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="text-sm font-medium">Code</span>
            </motion.a>

            {/* Live Demo Button */}
            <motion.a
              href={project.live}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-white rounded-xl hover:shadow-lg hover:shadow-accent/30 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg transition-all duration-300 group/btn"
              aria-label={`View ${project.title} live demo`}
            >
              <ExternalLink className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              <span className="text-sm font-medium">Live</span>
            </motion.a>
          </motion.div>
        </div>

        {/* Bottom glow effect */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
    </motion.article>
  )
}
