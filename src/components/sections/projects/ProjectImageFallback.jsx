import { motion } from 'framer-motion'

/**
 * Fallback component displayed when project image fails to load.
 * Shows a gradient background with project icon.
 */
export default function ProjectImageFallback({ title, cardVisible }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={cardVisible ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/30 via-accent-dim/20 to-accent-hover/30"
    >
      {/* Decorative grid pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(var(--accent) 1px, transparent 1px),
            linear-gradient(90deg, var(--accent) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />
      
      {/* Project icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={cardVisible ? { scale: 1, rotate: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.2, ease: "backOut" }}
        className="relative z-10"
      >
        <svg
          className="w-20 h-20 text-accent/60"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      </motion.div>
      
      {/* Animated glow */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent blur-2xl"
      />
    </motion.div>
  )
}
