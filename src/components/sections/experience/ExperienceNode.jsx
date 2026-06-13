import { motion } from 'framer-motion'
import { useState, memo } from 'react'

/**
 * Experience Node - Orbiting capsule representing a career milestone.
 * Features glassmorphic design with magnetic hover effects.
 * 
 * @param {{
 *   exp: Object,
 *   index: number,
 *   angle: number,
 *   radius: number,
 *   isActive: boolean,
 *   orbitAngle: number,
 *   onSelect: (index: number) => void
 * }} props
 */
const ExperienceNode = memo(function ExperienceNode({ 
  exp, 
  index, 
  angle, 
  radius, 
  isActive, 
  isDimmed = false,
  onSelect,
  nodeRef 
}) {
  // Hover state for conditional scan line and scale interactions
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <motion.button
      ref={nodeRef}
      onClick={() => onSelect(index)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(index)}
      onMouseEnter={() => !isDimmed && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-48 md:w-56 group transition-opacity duration-300 ${isDimmed ? 'opacity-15 pointer-events-none' : ''}`}
      animate={{
        scale: isDimmed ? 0.85 : (isActive ? 1.15 : 1),
        opacity: isDimmed ? 0.15 : (isActive ? 1 : 0.7)
      }}
      transition={{
        scale: {
          duration: 0.4,
          ease: [0.16, 1, 0.3, 1]
        },
        opacity: {
          duration: 0.4
        }
      }}
      whileHover={{ scale: isDimmed ? 0.85 : (isActive ? 1.2 : 1.1), cursor: isDimmed ? 'default' : 'pointer' }}
      whileTap={{ scale: isDimmed ? 0.85 : 0.98 }}
      aria-label={`View details for ${exp.role} at ${exp.company}`}
      aria-expanded={isActive}
      disabled={isDimmed}
    >
      {/* Node card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl transition-all duration-300 group-hover:border-accent/60 group-hover:shadow-accent/30">
        
        {/* Glow effect when active */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 rounded-2xl"
            style={{
              boxShadow: '0 0 40px var(--accent), inset 0 0 20px var(--accent)',
              opacity: 0.4
            }}
            aria-hidden="true"
          />
        )}
        
        {/* Content */}
        <div className="relative p-4 flex items-center gap-3">
          {/* Icon */}
          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-accent/40 to-accent-hover/40 flex items-center justify-center flex-shrink-0 border border-accent/30 shadow-lg shadow-accent/20">
            <span className="text-2xl">{exp.icon || '💼'}</span>
            
            {/* Pulse ring on active */}
            {isActive && (
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.6, 0, 0.6]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity
                }}
                className="absolute inset-0 rounded-xl border-2 border-accent"
                aria-hidden="true"
              />
            )}
          </div>
          
          {/* Text content */}
          <div className="flex-1 min-w-0 text-left">
            <h3 className="font-bold text-sm text-[var(--text-heading)] truncate">
              {exp.role}
            </h3>
            <p className="text-xs text-secondary truncate mt-0.5">
              {exp.company}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-secondary/80">
                {exp.duration}
              </span>
              {exp.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30 font-semibold">
                  {exp.badge}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Holographic scan effect — only on active or hovered nodes */}
        {(isActive || isHovered) && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: '200%' }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              repeatDelay: 2.5,
              ease: 'linear'
            }}
            className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-40"
            aria-hidden="true"
          />
        )}
        
        {/* Focus indicator */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-focus:opacity-100 focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg transition-opacity" />
      </div>
    </motion.button>
  )
})

export default ExperienceNode
