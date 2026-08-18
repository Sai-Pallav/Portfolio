import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { forwardRef, memo, useCallback } from 'react'

/**
 * Experience Details Panel - Expanded view with holographic effects.
 * Reveals when a node becomes active.
 * 
 * @param {{
 *   exp: Object,
 *   position: 'left' | 'right',
 *   onClose: () => void
 * }} props
 */
const ExperienceDetails = memo(forwardRef(function ExperienceDetails({ exp, position, onClose }, ref) {
  const slideDirection = position === 'right' ? 60 : -60
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  }
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  }

  // Memoize the close click handler to prevent inline recreation
  const handleCloseClick = useCallback((e) => {
    e.stopPropagation()
    onClose()
  }, [onClose])
  
  return (
    <motion.div
      initial={{ opacity: 0, x: slideDirection, scale: 0.9, filter: 'blur(8px)' }}
      animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: slideDirection, scale: 0.9, filter: 'blur(8px)' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-[0%] md:top-[1%] lg:top-[2%] w-full max-w-[390px] md:max-w-[420px] lg:max-w-[440px]"
      style={{
        left: position === 'right' ? 'auto' : '0%',
        right: position === 'right' ? '0%' : 'auto',
        zIndex: 60
      }}
    >
      {/* Main panel */}
      <div 
        ref={ref} 
        tabIndex={-1} 
        className="relative overflow-hidden rounded-3xl bg-[rgba(15,15,19,0.85)] backdrop-blur-2xl border border-white/[0.12] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_var(--accent-dim)] outline-none focus-visible:ring-2 focus-visible:ring-accent/50 transition-all duration-300 max-h-[88vh] overflow-y-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.15) transparent'
        }}
      >
        {/* Animated border glow sweep */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, transparent 30%, var(--accent) 50%, transparent 70%)',
            opacity: 0.12,
            mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            maskComposite: 'exclude',
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            padding: '1px'
          }}
          aria-hidden="true"
        />
        
        {/* Holographic scan line */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ 
            y: ['0%', '100%', '0%'],
            opacity: [0, 0.8, 0]
          }}
          transition={{ 
            duration: 3.5,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
          style={{ zIndex: 1 }}
          aria-hidden="true"
        />
        
        {/* Ambient background lighting */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{
            background: `
              radial-gradient(ellipse 90% 60% at 0% 0%, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 60%),
              radial-gradient(ellipse 70% 50% at 100% 100%, color-mix(in srgb, var(--accent-secondary, var(--accent)) 10%, transparent) 0%, transparent 50%)
            `
          }}
        />
        
        {/* Close button */}
        <motion.button
          onClick={handleCloseClick}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center transition-colors z-20 text-white/70 hover:text-white"
          aria-label="Close details panel"
          type="button"
          data-custom-cursor-ignore
        >
          <X className="w-4 h-4" />
        </motion.button>
        
        {/* Content Container */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative p-6 sm:p-7 space-y-5"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="space-y-2 pr-8">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl flex-shrink-0">
                {exp.icon || '💼'}
              </span>
              {exp.badge && (
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30 font-semibold shadow-[0_0_8px_var(--accent-dim)]">
                  {exp.badge}
                </span>
              )}
            </div>
            
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-heading)] leading-snug tracking-tight">
              {exp.role}
            </h3>
            
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
              <span className="text-[var(--accent)] font-semibold">
                {exp.company}
              </span>
              <span className="text-white/30">·</span>
              <span className="text-[var(--text-secondary)] font-mono text-xs">
                {exp.duration}
              </span>
            </div>
          </motion.div>
          
          {/* Divider */}
          <div 
            className="h-[1px] w-full"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 15%, rgba(255, 255, 255, 0.1) 85%, transparent 100%)' }}
            aria-hidden="true"
          />
          
          {/* Key Achievements */}
          {exp.bullets && exp.bullets.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-2.5">
              <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Key Contributions & Impact
              </h4>
              <ul className="space-y-2.5">
                {exp.bullets.map((bullet, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="flex items-start gap-2.5 text-[13px] sm:text-[13.5px] leading-relaxed text-white/80"
                  >
                    <span className="text-[var(--accent)] font-bold text-sm mt-0.5 flex-shrink-0 leading-none">▸</span>
                    <span>{bullet}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
          
          {/* Project Impact Cards Grid */}
          {exp.projects && exp.projects.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-2">
              <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Key Highlights
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {exp.projects.map((project) => (
                  <div
                    key={project.name}
                    className="flex flex-col justify-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                  >
                    <span className="text-xs font-medium text-white/90 truncate">
                      {project.name}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--accent)] font-semibold mt-0.5">
                      {project.impact}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tech Stack */}
          {exp.tech && exp.tech.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-2 pt-1">
              <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Technologies
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {exp.tech.map((tech) => (
                  <span
                    key={tech}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/75 hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors cursor-default"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
        
        {/* Bottom edge glow */}
        <div 
          className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-40"
          aria-hidden="true"
        />
      </div>
    </motion.div>
  )
}))

export default ExperienceDetails
