import { useState, useEffect, useRef } from 'react'
import { useThemeContext } from '@/context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'

function ThemeToggle() {
  const { themes, theme, setTheme } = useThemeContext()
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef(null)

  // Close picker on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <div ref={pickerRef} className="fixed bottom-8 right-8 z-[999] flex flex-col items-end gap-3">
      {/* Theme picker tray */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-1.5 bg-bg-surface/85 backdrop-blur-xl border border-white/5 rounded-2xl p-2.5 shadow-[0_16px_48px_rgba(0,0,0,0.9)] w-52"
          >
            <div className="px-3 py-1.5 border-b border-white/5 mb-1.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-secondary">Select Interface Style</span>
            </div>
            
            {themes.map((t) => {
              const isActive = theme === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => { 
                    setTheme(t.key) 
                    setShowPicker(false)
                  }}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 text-sm font-medium text-left w-full group relative ${
                    isActive ? 'text-accent bg-accent/5' : 'text-secondary hover:text-[var(--text-heading)]'
                  }`}
                >
                  {/* Glowing preview dot */}
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 relative"
                    style={{ 
                      background: t.preview,
                      boxShadow: isActive ? `0 0 10px ${t.preview}` : 'none' 
                    }}
                  />
                  <span className="font-mono text-xs tracking-wide">{t.label}</span>
                  
                  {isActive && (
                    <motion.span 
                      layoutId="activeThemeCheck" 
                      className="ml-auto text-accent text-xs font-bold"
                    >
                      ✓
                    </motion.span>
                  )}

                  {/* Micro-hover glow border */}
                  <div className="absolute inset-0 border border-transparent rounded-xl group-hover:border-white/5 transition-colors pointer-events-none" />
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) */}
      <motion.button
        onClick={() => setShowPicker(p => !p)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="w-13 h-13 md:w-14 md:h-14 rounded-full bg-bg-surface/85 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.8)] hover:border-accent/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.9),0_0_15px_rgba(0,229,160,0.15)] transition-all duration-300 group text-xl"
        aria-label="Change color theme"
        title="Change color theme"
      >
        <motion.div
          animate={showPicker ? { rotate: 90 } : { rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative w-5 h-5 flex items-center justify-center text-[var(--text-heading)] group-hover:text-accent transition-colors"
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
