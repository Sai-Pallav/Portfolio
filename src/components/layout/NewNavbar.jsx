import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { personal } from '@/data/personal'

const navItems = [
  { label: 'Home',       href: '#hero',       bgVar: 'var(--bg-hover-about)'    },
  { label: 'About',      href: '#about',      bgVar: 'var(--bg-hover-about)'    },
  { label: 'Skills',     href: '#skills',     bgVar: 'var(--bg-hover-skills)'   },
  { label: 'Projects',   href: '#projects',   bgVar: 'var(--bg-hover-projects)' },
  { label: 'Experience', href: '#experience', bgVar: 'var(--bg-hover-skills)'   },
  { label: 'Contact',    href: '#contact',    bgVar: 'var(--bg-hover-contact)'  },
]

function NewNavbar({ activeSection }) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState(null)
  const toggleButtonRef = useRef(null)
  const closeButtonRef = useRef(null)

  // Focus management
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (closeButtonRef.current) closeButtonRef.current.focus()
      }, 100)
      return () => clearTimeout(timer)
    } else {
      if (toggleButtonRef.current) toggleButtonRef.current.focus()
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  return (
    <>
      {/* Liquid Glass Effect SVG Filter */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ position: 'fixed', zIndex: 49 }}>
        <defs>
          <filter id="liquid-glass-navbar" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.01"
              numOctaves="4"
              result="noise"
              seed="1"
            >
              <animate
                attributeName="baseFrequency"
                values="0.01;0.015;0.01"
                dur="8s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="6"
              xChannelSelector="R"
              yChannelSelector="G"
            />
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              in="blur"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Toggle Button - Theme Color Rounded Rectangle */}
      <motion.button
        ref={toggleButtonRef}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-16 h-10 bg-accent rounded-2xl shadow-2xl shadow-accent/30 border-2 border-accent-hover backdrop-blur-sm text-accent-contrast focus:outline-none focus:ring-2 focus:ring-accent/50"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
      >
        <motion.span
          animate={{ 
            opacity: isOpen ? 1 : 0,
            scale: isOpen ? 1 : 0.5
          }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="text-xl"
        >
          ✕
        </motion.span>
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Liquid Glass Navbar */}
      <AnimatePresence>
        {isOpen && (
          <motion.header
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-6 left-6 right-6 z-50 rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/30 overflow-hidden"
            style={{ filter: 'url(#liquid-glass-navbar)' }}
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0 opacity-30">
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.1, 0.2, 0.1],
                  x: [0, 50, 0],
                  y: [0, -30, 0],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl"
              />
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.08, 0.15, 0.08],
                  x: [0, -40, 0],
                  y: [0, 40, 0],
                }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                className="absolute bottom-0 left-0 w-80 h-80 bg-accent-hover/20 rounded-full blur-3xl"
              />
            </div>

            {/* Background morphing layer */}
            <AnimatePresence>
              {hoveredItem && (
                <motion.div
                  key={hoveredItem.label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  style={{ background: hoveredItem.bgVar }}
                  className="absolute inset-0 pointer-events-none"
                />
              )}
            </AnimatePresence>

            <div className="relative z-10 p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                {/* Logo */}
                <motion.a
                  href="#"
                  className="flex items-center gap-3 font-mono text-base text-accent tracking-widest font-bold group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
                    {personal.firstName.toLowerCase()}.dev
                  </span>
                  {personal.availableNow && (
                    <motion.span
                      className="flex h-2 w-2 relative"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-lg shadow-green-500/50"></span>
                    </motion.span>
                  )}
                </motion.a>

                {/* Close Button */}
                <motion.button
                  ref={closeButtonRef}
                  onClick={() => setIsOpen(false)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm grid place-items-center text-[var(--text-heading)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 hover:bg-accent/10 transition-colors"
                  aria-label="Close menu"
                >
                  ✕
                </motion.button>
              </div>

              {/* Navigation Links */}
              <nav>
                <ul className="flex flex-col gap-2">
                  {navItems.map((item, index) => {
                    const isActive = activeSection === item.href.slice(1)
                    return (
                      <li key={item.label}>
                        <motion.a
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          onMouseEnter={() => setHoveredItem(item)}
                          onMouseLeave={() => setHoveredItem(null)}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.3 }}
                          whileHover={{ x: 8, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`block py-4 px-5 text-lg font-medium rounded-xl transition-all duration-300 relative overflow-hidden ${
                            isActive
                              ? 'text-accent font-semibold bg-accent/10 border-l-4 border-l-accent shadow-lg shadow-accent/20'
                              : 'text-secondary hover:text-[var(--text-heading)] hover:bg-white/5'
                          }`}
                        >
                          {item.label}
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 bg-accent/5"
                              animate={{ opacity: [0.3, 0.5, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </motion.a>
                      </li>
                    )
                  })}
                </ul>
              </nav>

              {/* Resume Button */}
              <div className="mt-8">
                <motion.a
                  href={personal.resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full flex items-center justify-center gap-2 py-4 text-white font-semibold rounded-xl overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent-hover transition-all duration-300 group-hover:from-accent-hover group-hover:to-accent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative z-10 flex items-center gap-2">
                    Download Resume
                    <motion.span
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ↓
                    </motion.span>
                  </span>
                </motion.a>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>
    </>
  )
}

export default NewNavbar
