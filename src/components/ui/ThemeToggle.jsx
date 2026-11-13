import { useEffect, useRef, useState, useCallback } from 'react'
import { useThemeContext } from '@/context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'

function ThemeToggle({ showPicker, setShowPicker }) {
  const { themes, theme, setTheme } = useThemeContext()
  const pickerRef = useRef(null)

  // Find active theme object to style FAB button border/glow
  const activeTheme = themes.find(t => t.key === theme) || themes[0]

  const visibleCount = 4
  const maxScroll = Math.max(0, themes.length - visibleCount)

  const getInitialOffset = useCallback((currentTheme) => {
    const activeIndex = themes.findIndex(t => t.key === currentTheme)
    return activeIndex <= 1 ? 0 : Math.min(activeIndex - 1, maxScroll)
  }, [themes, maxScroll])

  const [scrollOffset, setScrollOffset] = useState(() => getInitialOffset(theme))
  const [hoveredTheme, setHoveredTheme] = useState(null)
  const [isFullyOpen, setIsFullyOpen] = useState(false)
  const [prevShowPicker, setPrevShowPicker] = useState(showPicker)

  const targetOffsetRef = useRef(getInitialOffset(theme))
  const currentOffsetRef = useRef(getInitialOffset(theme))
  const lastWheelTimeRef = useRef(0)

  // Synchronously initialize state to active theme whenever picker opens
  if (showPicker !== prevShowPicker) {
    setPrevShowPicker(showPicker)
    if (showPicker) {
      const initial = getInitialOffset(theme)
      if (scrollOffset !== initial) {
        setScrollOffset(initial)
      }
    } else {
      setIsFullyOpen(false)
      setHoveredTheme(null)
    }
  }

  // Manage entry animation timing and synchronize refs outside render
  useEffect(() => {
    if (showPicker) {
      const initial = getInitialOffset(theme)
      targetOffsetRef.current = initial
      currentOffsetRef.current = initial
      const timer = setTimeout(() => {
        setIsFullyOpen(true)
      }, 450)
      return () => clearTimeout(timer)
    }
  }, [showPicker, theme, getInitialOffset])

  // Dismiss picker on clicking/touching outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [setShowPicker])

  // Smooth momentum lerp loop for bounded carousel scrolling
  useEffect(() => {
    if (!showPicker) return

    let rafId
    const tick = () => {
      const diff = targetOffsetRef.current - currentOffsetRef.current

      if (Math.abs(diff) > 0.001) {
        currentOffsetRef.current += diff * 0.15
        setScrollOffset(currentOffsetRef.current)
      } else if (currentOffsetRef.current !== targetOffsetRef.current) {
        currentOffsetRef.current = targetOffsetRef.current
        setScrollOffset(targetOffsetRef.current)
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [showPicker])

  // Track mouse movement and angle relative to the FAB to rotate/scroll themes
  useEffect(() => {
    if (!showPicker || !isFullyOpen) return

    const handleMouseMove = (e) => {
      if (!pickerRef.current) return
      // Don't interrupt deliberate wheel scrolling with accidental micro-movements
      if (Date.now() - lastWheelTimeRef.current < 600) return

      const rect = pickerRef.current.getBoundingClientRect()
      const fabX = rect.left + rect.width / 2
      const fabY = rect.top + rect.height / 2
      
      const dx = e.clientX - fabX
      const dy = e.clientY - fabY
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // Only track movement when mouse is hovering on the swatches ring (radius 80px ± 25px swatch width)
      if (distance < 55 || distance > 110) return

      let angle = Math.atan2(dy, dx) * (180 / Math.PI)
      if (angle < 0) angle += 360

      // Map mouse angle from 160° to 290° onto scroll range [0, maxScroll]
      const minAngle = 160
      const maxAngle = 290
      
      let targetAngle = angle
      if (angle < 90) {
        targetAngle = maxAngle
      } else if (angle < 130) {
        targetAngle = minAngle
      }

      const clamped = Math.max(minAngle, Math.min(maxAngle, targetAngle))
      const pct = (clamped - minAngle) / (maxAngle - minAngle)
      targetOffsetRef.current = pct * maxScroll
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [showPicker, isFullyOpen, maxScroll])

  // Mouse wheel scroll navigation inside the theme selector
  useEffect(() => {
    if (!showPicker) return

    const handleWheel = (e) => {
      if (pickerRef.current && pickerRef.current.contains(e.target)) {
        e.preventDefault()
        lastWheelTimeRef.current = Date.now()
        setIsFullyOpen(true)
        const step = Math.sign(e.deltaY) * 0.45
        targetOffsetRef.current = Math.max(0, Math.min(maxScroll, targetOffsetRef.current + step))
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [showPicker, maxScroll])

  // Touch swipe support for mobile
  const touchStartY = useRef(null)
  const touchStartOffset = useRef(0)

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStartY.current = e.touches[0].clientY
      touchStartOffset.current = targetOffsetRef.current
      setIsFullyOpen(true)
    }
  }

  const handleTouchMove = (e) => {
    if (touchStartY.current !== null && e.touches.length === 1) {
      const deltaY = e.touches[0].clientY - touchStartY.current
      const offsetDelta = -deltaY / 65
      targetOffsetRef.current = Math.max(0, Math.min(maxScroll, touchStartOffset.current + offsetDelta))
    }
  }

  const handleTouchEnd = () => {
    touchStartY.current = null
  }

  return (
    <div 
      ref={pickerRef} 
      className="fixed bottom-8 right-8 z-[999] w-12 h-12 flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Floating Theme Label Tooltip above the picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="absolute bottom-36 right-0 whitespace-nowrap px-3.5 py-2 rounded-full bg-bg-surface/90 backdrop-blur-md border border-white/10 text-xs font-semibold text-[var(--text-heading)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-none select-none flex items-center gap-2 z-20"
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

      {/* Theme picker swatches (Orbiting Concentric Ring - showing 4 at a time with smooth buffer fade) */}
      <AnimatePresence>
        {showPicker && themes.map((t, index) => {
          const isActive = theme === t.key
          
          // Continuous relative position along the arc (no discontinuous modulo jumps)
          const relPos = index - scrollOffset
          
          // Calculate radial offset: arc sweeps upper-left (169°→281° with clean gaps and symmetric margins)
          const radius = 82 // Orbit radius in pixels
          const angle = 169 + (relPos * 112) / (visibleCount - 1)
          const angleRad = (angle * Math.PI) / 180
          const x = radius * Math.cos(angleRad)
          const y = radius * Math.sin(angleRad)

          // Visibility factor using smooth linear buffer (1 when in [0, 3], fades smoothly in buffer zones)
          let v = 0
          const maxPos = visibleCount - 1
          const buffer = 0.5
          if (relPos >= 0 && relPos <= maxPos) {
            v = 1
          } else if (relPos > -buffer && relPos < 0) {
            v = 1 + relPos / buffer // Smooth linear fade-in
          } else if (relPos > maxPos && relPos < maxPos + buffer) {
            v = 1 - (relPos - maxPos) / buffer // Smooth linear fade-out
          }

          const isActiveSlot = v > 0
          const targetX = x
          const targetY = y
          const targetScale = v > 0 ? (0.7 + v * 0.3) * (isActive ? 1.08 : 1.0) : 0
          const targetOpacity = Math.max(0, Math.min(1, v))

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
                  stiffness: 320,
                  damping: 26,
                  delay: (themes.length - 1 - index) * 0.025
                }
              }}
              transition={
                isFullyOpen
                  ? {
                      x: { duration: 0 },
                      y: { duration: 0 },
                      scale: { type: 'spring', stiffness: 300, damping: 25 },
                      opacity: { duration: 0.12, ease: 'easeOut' },
                    }
                  : {
                      type: 'spring',
                      stiffness: 260,
                      damping: 22,
                      mass: 0.8,
                      delay: index * 0.045,
                    }
              }
              onMouseEnter={() => {
                if (isActiveSlot && v > 0.3) setHoveredTheme(t)
              }}
              onMouseLeave={() => setHoveredTheme(null)}
              onClick={() => { 
                setTheme(t.key)
                const targetOffset = index <= 1 ? 0 : Math.min(index - 1, maxScroll)
                targetOffsetRef.current = targetOffset
                // Tactical delay for visual satisfaction before collapsing
                setTimeout(() => {
                  setShowPicker(false)
                }, 350)
              }}
              whileHover={{ 
                scale: isActiveSlot && v > 0.3 ? (isActive ? 1.15 : 1.1) : targetScale,
                transition: { scale: { type: 'spring', stiffness: 350, damping: 18 } }
              }}
              whileTap={{ scale: isActiveSlot ? 0.92 : 0 }}
              style={{
                width: '40px',
                height: '40px',
                borderColor: isActive ? `${t.preview}aa` : 'rgba(255, 255, 255, 0.1)',
                boxShadow: isActive 
                  ? `0 0 20px ${t.preview}33, 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)`
                  : `0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
                zIndex: isActive ? 100 : 50 - Math.round(Math.abs(relPos) * 10),
                pointerEvents: isActiveSlot && v > 0.3 ? 'auto' : 'none'
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
                  width: isActive ? '18px' : '15px',
                  height: isActive ? '18px' : '15px',
                  boxShadow: isActive 
                    ? `0 0 16px ${t.preview}66, inset 0 1px 1px rgba(255,255,255,0.2)`
                    : `0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`,
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
                animate={isActive ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={isActive ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.3 }}
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
