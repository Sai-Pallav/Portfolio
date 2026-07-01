import { useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { personal } from '@/data/personal'
import { useCinematicNav } from '@/hooks/useCinematicNav'


const navItems = [
  { label: 'Home',       href: '#hero'       },
  { label: 'About',      href: '#about'      },
  { label: 'Skills',     href: '#skills'     },
  { label: 'Projects',   href: '#projects'   },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact',    href: '#contact'    },
]

/* ─────────────────────────────────────────────
   TRIGGER BUTTON  (top-center, slim pill)
   ───────────────────────────────────────────── */
const FloatingNavTrigger = memo(function FloatingNavTrigger({ isOpen, onClick }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.button
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16, scale: 0.85 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] cursor-pointer"
          aria-label="Open navigation"
        >
          <motion.div
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.25 }}
            className="relative"
          >
            {/* Ambient glow */}
            <motion.div
              animate={{ opacity: [0.25, 0.5, 0.25], scale: [1, 1.15, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 blur-xl rounded-full"
              style={{ background: 'var(--accent)', opacity: 0.35 }}
            />

            {/* Border glow ring */}
            <motion.div
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -inset-[2px] rounded-full blur-sm"
              style={{ background: 'var(--accent)', opacity: 0.5 }}
            />

            {/* Main pill — full pill radius, slim height */}
            <motion.div
              animate={{ y: isHovered ? 0 : [0, -2, 0] }}
              transition={{ y: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
              className="relative flex items-center justify-center px-10 py-3 rounded-full overflow-hidden"
              style={{
                background: 'var(--bg-surface)',
                border: '1.5px solid var(--border-glow)',
              }}
            >
              {/* Light sweep on hover */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: '220%', opacity: [0, 0.6, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: 'easeInOut' }}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)',
                    }}
                  />
                )}
              </AnimatePresence>


              {/* Single dot indicator */}
              <motion.span
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--accent)' }}
              />
            </motion.div>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  )
})


/* ─────────────────────────────────────────────
   HORIZONTAL NAVBAR  (expands from button)
───────────────────────────────────────────── */
const FloatingNavbar = memo(function FloatingNavbar({ activeSection, isOpen, onClose, onNavClick }) {

  const handleClick = (e, href) => {
    onClose()          // Close the navbar panel first
    onNavClick(e, href) // Then trigger scroll/warp navigation
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[90]"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          />

          {/* Expanding nav panel */}
          <motion.nav
            initial={{ width: 130, height: 52, opacity: 0.4, borderRadius: 16 }}
            animate={{ width: 'auto', height: 'auto', opacity: 1, borderRadius: 16 }}
            exit={{ width: 130, height: 52, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[95] overflow-hidden"
            style={{
              background: 'var(--bg-surface)',
              border: '1.5px solid var(--border-glow)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div className="px-5 py-3 flex items-center gap-1 whitespace-nowrap relative">

              {/* Nav links */}
              {navItems.map((item, index) => {
                const isActive = activeSection === item.href.slice(1)
                return (
                  <motion.a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => handleClick(e, item.href)}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.25 }}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 z-10"
                    style={{
                      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute inset-0 rounded-xl -z-10"
                        style={{
                          background: 'var(--accent-dim)',
                        }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </motion.a>
                )
              })}

              {/* Divider */}
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.3 }}
                className="mx-2 w-px h-7 self-center"
                style={{ background: 'var(--border-glow)' }}
              />

              {/* Resume button */}
              <motion.a
                href={personal.resume}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.32, duration: 0.25 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="relative ml-1 px-5 py-2.5 rounded-xl text-sm font-semibold overflow-hidden"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                }}
              >
                {/* Sweep on hover */}
                <motion.div
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.45 }}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.22) 50%, transparent 60%)',
                  }}
                />
                <span className="relative z-10 flex items-center gap-1.5">
                  Resume
                  <motion.span
                    animate={{ y: [0, 3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ↓
                  </motion.span>
                </span>
              </motion.a>

            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  )
})

/* ─────────────────────────────────────────────
   ROOT EXPORT
───────────────────────────────────────────── */
const Navbar = memo(function Navbar({ activeSection }) {
  const [isOpen, setIsOpen] = useState(false)
  const handleNavClick = useCinematicNav(navItems)

  return (
    <>
      <FloatingNavTrigger isOpen={isOpen} onClick={() => setIsOpen(o => !o)} />
      <FloatingNavbar
        activeSection={activeSection}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onNavClick={handleNavClick}
      />
    </>
  )
})

export default Navbar

