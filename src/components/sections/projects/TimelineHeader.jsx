import { motion } from 'framer-motion'

/**
 * Futuristic section header for the projects timeline.
 * Features animated badge, gradient text, and subtitle.
 */
export default function TimelineHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="text-center mb-12"
    >
      {/* Animated badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="inline-block mb-6"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="relative px-6 py-3 bg-accent/10 border border-accent/30 rounded-full backdrop-blur-sm overflow-hidden group"
        >
          {/* Animated gradient background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-accent/20 via-accent-hover/20 to-accent/20"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="relative z-10 text-accent text-sm font-semibold tracking-wide uppercase">
            Featured Work
          </span>
        </motion.div>
      </motion.div>
      
      {/* Main title with gradient */}
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text-heading)] mb-6"
      >
        <span className="bg-gradient-to-r from-primary via-accent to-accent-hover bg-clip-text text-transparent">
          Project Timeline
        </span>
      </motion.h2>
      
      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-secondary text-lg md:text-xl max-w-3xl mx-auto leading-relaxed"
      >
        A curated journey through innovative projects showcasing full-stack development,
        system architecture, and creative problem-solving
      </motion.p>
      
      {/* Decorative line */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        whileInView={{ opacity: 1, scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 mx-auto w-24 h-1 bg-gradient-to-r from-transparent via-accent to-transparent rounded-full"
        style={{ transformOrigin: 'center' }}
      />
    </motion.div>
  )
}
