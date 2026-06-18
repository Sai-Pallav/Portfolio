import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useCinematicNav } from '@/hooks/useCinematicNav'

const sections = [
  { id: 'hero', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' }
]

const navItems = sections.map(s => ({ label: s.label, href: `#${s.id}` }))

export default function SectionIndicator({ activeSection }) {
  const [hoveredId, setHoveredId] = useState(null)
  const handleNavClick = useCinematicNav(navItems)

  const handleClick = (e, id) => {
    handleNavClick(e, `#${id}`)
  }

  return (
    <div
      className="fixed right-6 top-1/2 -translate-y-1/2 z-[80] flex flex-col items-end gap-[6px] select-none"
    >
      {sections.map((section) => {
        const isActive = activeSection === section.id
        const isHovered = hoveredId === section.id

        return (
          <button
            key={section.id}
            onClick={(e) => handleClick(e, section.id)}
            onMouseEnter={() => setHoveredId(section.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="group relative flex items-center justify-end gap-2.5 bg-transparent border-none outline-none cursor-pointer p-0"
            style={{ height: 16 }}
            aria-label={`Scroll to ${section.label}`}
          >
            {/* Label — slides in on hover */}
            <AnimatePresence>
              {isHovered && (
                <motion.span
                  key="label"
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="text-[9px] font-mono tracking-[0.2em] uppercase pointer-events-none whitespace-nowrap"
                  style={{ color: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.5)' }}
                >
                  {section.label}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Dash */}
            <motion.div
              className="relative rounded-full overflow-hidden"
              animate={{
                width: isActive ? 28 : isHovered ? 20 : 14,
                height: 2,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              {/* Accent fill — only for active */}
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  scaleX: isActive ? 1 : 0,
                  background: 'var(--accent)',
                }}
                initial={false}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'left' }}
              />
              {/* Hover highlight — only for inactive hovered */}
              {!isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ background: 'rgba(255,255,255,0.35)' }}
                  style={{ opacity: isHovered ? 1 : 0 }}
                  transition={{ duration: 0.15 }}
                />
              )}
            </motion.div>
          </button>
        )
      })}
    </div>
  )
}
