import { motion } from 'framer-motion'
import { useState, useEffect, memo } from 'react'

/**
 * Experience Node - Orbiting capsule representing a career milestone.
 * Features glassmorphic design with magnetic hover effects.
 * 
 * @param {{
 *   exp: Object,
 *   index: number,
 *   isActive: boolean,
 *   isDimmed: boolean,
 *   onSelect: (index: number) => void,
 *   nodeRef: React.Ref
 * }} props
 */
const ExperienceNode = memo(function ExperienceNode({ 
  exp, 
  index, 
  isActive, 
  isDimmed = false,
  onSelect,
  nodeRef 
}) {
  // Hover state for conditional scan line and scale interactions
  const [isHovered, setIsHovered] = useState(false)
  const isHoverDisabled = isActive || isDimmed

  useEffect(() => {
    if (isHoverDisabled) {
      setIsHovered(false)
    }
  }, [isHoverDisabled])
  
  return (
    <motion.button
      ref={nodeRef}
      onClick={() => onSelect(index)}
      onMouseEnter={() => !isHoverDisabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-48 md:w-56 group transition-opacity duration-300 ${isDimmed ? 'opacity-15 pointer-events-none' : ''} ${isActive ? 'cursor-default' : 'cursor-pointer'}`}
      style={{ willChange: 'transform, opacity' }}
      animate={{
        scale: isDimmed ? 0.85 : (isActive ? 1.15 : 1),
        opacity: isDimmed ? 0.15 : (isActive ? 1 : 0.75)
      }}
      transition={{
        scale: {
          type: 'spring',
          stiffness: 280,
          damping: 24,
          mass: 0.8
        },
        opacity: {
          duration: 0.35,
          ease: 'easeInOut'
        }
      }}
      whileHover={
        isDimmed
          ? undefined
          : {
              scale: isActive ? 1.15 : 1.1,
              opacity: 1,
              transition: {
                type: 'spring',
                stiffness: 280,
                damping: 24,
                mass: 0.8
              }
            }
      }
      whileTap={
        isDimmed
          ? undefined
          : {
              scale: isActive ? 1.15 : 1.05,
              transition: {
                type: 'spring',
                stiffness: 350,
                damping: 25
              }
            }
      }
      aria-label={`View details for ${exp.role} at ${exp.company}`}
      aria-expanded={isActive}
      disabled={isDimmed}
    >
      {/* Node card */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border shadow-2xl transition-all duration-400 ease-out ${
          isActive
            ? 'border-accent/60 shadow-[0_0_35px_var(--accent-dim)]'
            : `border-white/20 ${isDimmed ? '' : 'group-hover:border-accent/60 group-hover:shadow-accent/30'}`
        }`}
      >
        
        {/* Glow effect when active */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
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
        <div className="absolute inset-0 rounded-2xl opacity-0 group-focus-visible:opacity-100 group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-bg transition-opacity pointer-events-none" />
      </div>
    </motion.button>
  )
})

export default ExperienceNode
