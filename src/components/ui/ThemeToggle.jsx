import { useEffect, useRef, useState } from 'react'
import { useThemeContext } from '@/context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'

function ThemeToggle({ showPicker, setShowPicker }) {
  const { themes, theme, setTheme } = useThemeContext()
  const pickerRef = useRef(null)

  // Find active theme object to style FAB button border/glow
  const activeTheme = themes.find(t => t.key === theme) || themes[0]

  const [scrollOffset, setScrollOffset] = useState(0)
  const [isFullyOpen, setIsFullyOpen] = useState(false)
  const [hoveredTheme, setHoveredTheme] = useState(null)
  const prevShowPickerRef = useRef(false)
  const targetOffsetRef = useRef(0)
  const currentOffsetRef = useRef(0)

  // Stagger reveal delay helper: set to fully open after entry spring ends
  useEffect(() => {
    if (showPicker) {
      const timer = setTimeout(() => setIsFullyOpen(true), 500)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => setIsFullyOpen(false), 0)
      return () => clearTimeout(timer)
    }
  }, [showPicker])

  // Center scroll position on active theme upon opening (with loop wrap)
  useEffect(() => {
    if (showPicker && !prevShowPickerRef.current) {
      const activeIndex = themes.findIndex(t => t.key === theme)
      const initialOffset = (activeIndex - 1.5 + themes.length) % themes.length
      setScrollOffset(initialOffset)
      targetOffsetRef.current = initialOffset
      currentOffsetRef.current = initialOffset
    }
    prevShowPickerRef.current = showPicker
  }, [showPicker, theme, themes])

  // Dismiss picker on clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [setShowPicker])

  // Smooth lerp loop for the scrollOffset (momentum effect)
  useEffect(() => {
    if (!showPicker) return

    let rafId
    const tick = () => {
      const N = themes.length
      let diff = targetOffsetRef.current - currentOffsetRef.current

      // Shortest path wrap
      diff = ((diff + N / 2) % N)
      if (diff < 0) diff += N
      diff -= N / 2

      if (Math.abs(diff) > 0.0001) {
        currentOffsetRef.current = (currentOffsetRef.current + diff * 0.15) % N
        if (currentOffsetRef.current < 0) currentOffsetRef.current += N
        setScrollOffset(currentOffsetRef.current)
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [showPicker, themes.length])

  // Track mouse angle relative to the FAB to rotate/scroll themes
  useEffect(() => {
    if (!showPicker || !isFullyOpen) return

    const handleMouseMove = (e) => {
      if (!pickerRef.current) return
      const rect = pickerRef.current.getBoundingClientRect()
      const fabX = rect.left + rect.width / 2
      const fabY = rect.top + rect.height / 2
      
      const dx = e.clientX - fabX
      const dy = e.clientY - fabY
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Only track movement when mouse is hovering exactly on the swatches ring (radius 80px ± 22px swatch width)
      if (distance < 55 || distance > 105) return

      let angle = Math.atan2(dy, dx) * (180 / Math.PI)
      if (angle < 0) angle += 360

      // Map mouse angle from 185° to 315° onto scroll range [0, themes.length - 4]
      const minAngle = 185
      const maxAngle = 315
      
      let targetAngle = angle
      if (angle < 90) {
        // Bottom-right quadrant
        targetAngle = maxAngle
      } else if (angle < 135) {
        // Bottom-left quadrant
        targetAngle = minAngle
      }

      const clamped = Math.max(minAngle, Math.min(maxAngle, targetAngle))
      const pct = (clamped - minAngle) / (maxAngle - minAngle)
      targetOffsetRef.current = pct * (themes.length - 4)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [showPicker, isFullyOpen, themes.length])

  // Support scroll wheel behavior inside the theme selector for extra control
  useEffect(() => {
    if (!showPicker) return

    const handleWheel = (e) => {
      if (pickerRef.current && pickerRef.current.contains(e.target)) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.35 : -0.35
        targetOffsetRef.current = (targetOffsetRef.current + delta) % themes.length
        if (targetOffsetRef.current < 0) {
          targetOffsetRef.current += themes.length
        }
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [showPicker, themes.length])

  return (
    <div ref={pickerRef} className="fixed bottom-8 right-8 z-[999] w-12 h-12 flex items-center justify-center">
      {/* Floating Theme Label Tooltip above the picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="absolute bottom-36 whitespace-nowrap px-3.5 py-2 rounded-full bg-bg-surface/90 backdrop-blur-md border border-white/10 text-xs font-semibold text-[var(--text-heading)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-none select-none flex items-center gap-2 z-20"
          >
            <span 
              className="w-2.5 h-2.5 rounded-full transition-all duration-300" 
              style={{ 
                background: hoveredTheme ? hoveredTheme.preview : activeTheme.preview,
                boxShadow: `0 0 10px ${hoveredTheme ? hoveredTheme.preview : activeTheme.preview}`
              }} 
            />
            <span>{hoveredTheme ? hoveredTheme.label : activeTheme.label}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme picker swatches (Orbiting Concentric Ring - showing 4 at a time with overlap) */}
      <AnimatePresence>
        {showPicker && themes.map((t, index) => {
          const isActive = theme === t.key
          
          const visibleCount = 4
          const N = themes.length
          
          // Wrap relative position using modular arithmetic around the closest viewport center
          let relPos = index - scrollOffset
          relPos = ((relPos + N / 2) % N)
          if (relPos < 0) relPos += N
          relPos -= N / 2
          
          // Calculate radial offset: arc sweeps upper-left (195°→305° with clean gaps)
          const radius = 80 // Orbit radius in pixels
          const angle = 195 + (relPos * 110) / (visibleCount - 1)
          const angleRad = (angle * Math.PI) / 180
          const x = radius * Math.cos(angleRad)
          const y = radius * Math.sin(angleRad)

          // Visibility factor using trapezoidal function (1 when in [0, 3], fades to 0 as it approaches -0.3 or 3.3)
          let v = 0
          if (relPos >= 0 && relPos <= 3) {
            v = 1
          } else if (relPos > -0.3 && relPos < 0) {
            v = 1 + relPos / 0.3 // Fast linear fade-out in a 0.3 buffer zone
          } else if (relPos > 3 && relPos < 3.3) {
            v = 1 - (relPos - 3) / 0.3 // Fast linear fade-out in a 0.3 buffer zone
          }

          const isActiveSlot = v > 0
          const targetX = x
          const targetY = y
          // Clamp target scale so it doesn't shrink to a tiny dot before fading out
          const targetScale = v > 0 ? (0.65 + v * 0.35) * (isActive ? 1.12 : 1.0) : 0
          const targetOpacity = v

          return (
            <motion.button
              key={t.key}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
              animate={{
                opacity: targetOpacity,
                scale: targetScale,
                x: targetX,
                y: targetY,
              }}
              exit={{
                opacity: 0,
                x: 0,
                y: 0,
                scale: 0,
                transition: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  delay: (themes.length - 1 - index) * 0.03
                }
              }}
              transition={{
                type: 'spring',
                stiffness: 220,
                damping: 18,
                mass: 0.8,
                delay: isFullyOpen ? 0 : index * 0.05,
              }}
              onMouseEnter={() => {
                if (isActiveSlot) setHoveredTheme(t)
              }}
              onMouseLeave={() => setHoveredTheme(null)}
              onClick={() => { 
                setTheme(t.key) 
                // Tactical delay for visual satisfaction before collapsing
                setTimeout(() => {
                  setShowPicker(false)
                }, 350)
              }}
              whileHover={{ 
                scale: isActiveSlot ? (isActive ? 1.2 : 1.15) : 0,
                transition: { type: 'spring', stiffness: 400, damping: 15 }
              }}
              whileTap={{ scale: isActiveSlot ? 0.9 : 0 }}
              style={{
                width: '44px',
                height: '44px',
                borderColor: isActive ? `${t.preview}aa` : 'rgba(255, 255, 255, 0.1)',
                boxShadow: isActive 
                  ? `0 0 20px ${t.preview}33, 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)`
                  : `0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
                zIndex: isActive ? 100 : 50 - Math.round(Math.abs(relPos) * 10),
                pointerEvents: isActiveSlot && v > 0.2 ? 'auto' : 'none'
              }}
              aria-current={isActive ? "true" : undefined}
              aria-label={`Switch to ${t.label}`}
              className="absolute rounded-full flex items-center justify-center bg-bg-surface/85 backdrop-blur-md border cursor-pointer group transition-colors duration-300"
            >
              {/* Glowing preview dot */}
              <motion.span
                className="rounded-full flex-shrink-0 relative transition-all duration-300"
                style={{ 
                  background: t.preview,
                  width: isActive ? '20px' : '16px',
                  height: isActive ? '20px' : '16px',
                  boxShadow: isActive 
                    ? `0 0 16px ${t.preview}66, inset 0 1px 1px rgba(255,255,255,0.2)`
                    : `0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`,
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
                animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                transition={isActive ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : {}}
              />
              
              {/* Animated outer ring */}
              {isActive && (
                <motion.div
                  layoutId="activeThemeRing"
                  className="absolute -inset-0.5 border-2 rounded-full pointer-events-none"
                  style={{ 
                    borderColor: t.preview,
                  }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                />
              )}

              {/* Soft color-aware hover glow */}
              <span 
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  boxShadow: `0 0 14px 4px ${t.preview}22`,
                  background: `radial-gradient(circle, ${t.preview}08 0%, transparent 70%)`
                }}
              />
            </motion.button>
          )
        })}
      </AnimatePresence>

      {/* Floating Action Button (FAB) */}
      <motion.button
        onClick={() => setShowPicker(p => !p)}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          borderColor: showPicker ? activeTheme.preview : 'rgba(255, 255, 255, 0.1)',
          boxShadow: showPicker
            ? `0 12px 40px rgba(0,0,0,0.8), 0 0 20px ${activeTheme.preview}40`
            : `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)`
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-12 h-12 rounded-full bg-bg-surface/80 backdrop-blur-md border flex items-center justify-center group text-xl cursor-pointer relative overflow-hidden z-10"
        aria-label="Change color theme"
      >
        {/* Micro-highlight hover shine reflection */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
        
        <motion.div
          animate={showPicker ? { rotate: 180, scale: 0.9 } : { rotate: 0, scale: 1 }}
          whileHover={!showPicker ? { rotate: 30, scale: 1.15 } : {}}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="relative w-5 h-5 flex items-center justify-center text-[var(--text-heading)] group-hover:text-accent transition-colors"
          style={{ color: showPicker ? activeTheme.preview : undefined }}
        >
          <svg
            className="w-5 h-5 fill-none stroke-current"
            viewBox="0 0 24 24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
            <path d="M12 2V22" />
            <path d="M12 12H22" />
            <path d="M12 12V22" />
            <path d="M20.66 17C20.66 17 17.5 15.5 15 15.5" />
            <path d="M12 12L4.92999 4.92999" />
          </svg>
        </motion.div>
      </motion.button>
    </div>
  )
}

export default ThemeToggle

