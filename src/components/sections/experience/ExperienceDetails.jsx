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
      initial={{ opacity: 0, x: slideDirection, scale: 0.85, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: slideDirection, scale: 0.85, filter: 'blur(10px)' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-[5%] w-full max-w-md md:max-w-lg"
      style={{
        left: position === 'right' ? 'auto' : '5%',
        right: position === 'right' ? '5%' : 'auto',
        zIndex: 60
      }}
    >
      {/* Main panel */}
      <div ref={ref} tabIndex={-1} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-accent/20 outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:border-accent/50 transition-all duration-300">
        
        {/* Animated border glow sweep */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, transparent 30%, var(--accent) 50%, transparent 70%)',
            opacity: 0.1,
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
            opacity: [0, 1, 0]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
          style={{ zIndex: 1 }}
          aria-hidden="true"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent-hover/5 pointer-events-none" />
        
        {/* Close button */}
        <motion.button
          onClick={handleCloseClick}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors z-20"
          aria-label="Close details panel"
          type="button"
          data-custom-cursor-ignore
        >
          <X className="w-4 h-4 text-[var(--text-heading)]" />
        </motion.button>
        
        {/* Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative p-6 md:p-8 space-y-5"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="space-y-2">
            <motion.div 
              className="flex items-center gap-2 mb-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 15 }}
            >
              <motion.span 
                className="text-3xl"
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 12 }}
              >
                {exp.icon || '💼'}
              </motion.span>
              {exp.badge && (
                <motion.span 
                  className="text-xs px-3 py-1 rounded-full bg-accent/20 text-accent border border-accent/30 font-semibold"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {exp.badge}
                </motion.span>
              )}
            </motion.div>
            
            <motion.h3 
              className="font-heading text-2xl md:text-3xl font-bold text-[var(--text-heading)] leading-tight"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {exp.role}
            </motion.h3>
            
            <motion.p 
              className="text-lg text-accent font-semibold"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {exp.company}
            </motion.p>
            
            <motion.p 
              className="text-sm text-secondary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
            >
              {exp.duration}
            </motion.p>
          </motion.div>
          
          {/* Divider */}
          <motion.div
            variants={itemVariants}
            className="h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent"
            aria-hidden="true"
          />
          
          {/* Achievements */}
          {exp.bullets && exp.bullets.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h4 className="text-sm font-semibold text-[var(--text-heading)] uppercase tracking-wider">
                Key Achievements
              </h4>
              <ul className="space-y-2">
                {exp.bullets.map((bullet, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-start gap-3 text-sm text-secondary leading-relaxed"
                  >
                    <span className="text-accent mt-1 flex-shrink-0">▸</span>
                    <span>{bullet}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
          
          {/* Tech Stack */}
          {exp.tech && exp.tech.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h4 className="text-sm font-semibold text-[var(--text-heading)] uppercase tracking-wider">
                Technologies
              </h4>
              <div className="flex flex-wrap gap-2">
                {exp.tech.map((tech, i) => (
                  <motion.span
                    key={tech}
                    initial={{ opacity: 0, scale: 0.5, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.7 + i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-secondary hover:border-accent/40 hover:text-accent transition-colors cursor-default"
                  >
                    {tech}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* Project Contributions */}
          {exp.projects && exp.projects.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              <h4 className="text-sm font-semibold text-[var(--text-heading)] uppercase tracking-wider">
                Project Impact
              </h4>
              <div className="space-y-2">
                {exp.projects.map((project) => (
                  <motion.div
                    key={project.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <span className="text-sm text-[var(--text-heading)] font-medium">
                      {project.name}
                    </span>
                    <span className="text-xs text-accent font-semibold">
                      {project.impact}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
        
        {/* Bottom glow accent with reveal animation */}
        <motion.div 
          className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.5 }}
          transition={{ delay: 0.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        />
      </div>
    </motion.div>
  )
}))

export default ExperienceDetails
