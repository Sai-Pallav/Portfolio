import { motion } from 'framer-motion'

/**
 * Ambient background effects for the projects section.
 * Includes animated gradient orbs, subtle grid, and light effects.
 */
export default function AmbientBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Base gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/3 to-transparent" />
      
      {/* Animated gradient orbs */}
      <motion.div
        animate={{ 
          scale: [1, 1.3, 1], 
          opacity: [0.08, 0.15, 0.08],
          x: [0, 50, 0],
          y: [0, -50, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl"
      />
      
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1], 
          opacity: [0.06, 0.12, 0.06],
          x: [0, -30, 0],
          y: [0, 40, 0]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] bg-accent-hover/8 rounded-full blur-3xl"
      />
      
      <motion.div
        animate={{ 
          scale: [1, 1.15, 1], 
          opacity: [0.05, 0.1, 0.05] 
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 10 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-dim/8 rounded-full blur-3xl"
      />
      
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
      
      {/* Vertical light beam effect */}
      <div className="absolute inset-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
      
      {/* Horizontal accent lines */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
        <div className="absolute top-2/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
      </div>
    </div>
  )
}
