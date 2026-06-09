import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { personal } from '@/data/personal'

const navItems = [
  { label: 'Home', href: '#hero' },
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Projects', href: '#projects' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact', href: '#contact' },
]

function PremiumNavbar({ activeSection }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef(null)
  const menuButtonRef = useRef(null)

  // Handle scroll state
  useEffect(() => {
    const main = document.getElementById('main-content')
    if (!main) return

    const handleScroll = () => {
      setIsScrolled(main.scrollTop > 50)
    }

    main.addEventListener('scroll', handleScroll, { passive: true })
    return () => main.removeEventListener('scroll', handleScroll)
  }, [])

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isMobileMenuOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const handleNavClick = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      {/* Desktop & Mobile Navbar */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'py-3'
            : 'py-6'
        }`}
      >
        <nav
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
            isScrolled
              ? 'bg-surface/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/10'
              : 'bg-transparent'
          }`}
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.a
              href="#hero"
              className="flex items-center gap-3 group cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Go to home"
            >
              <div className="relative">
                <span className="font-mono text-lg font-bold bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
                  {personal.firstName.toLowerCase()}.dev
                </span>
                {/* Animated underline */}
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-accent-hover origin-left"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>

              {/* Available status indicator */}
              {personal.availableNow && (
                <div className="flex items-center gap-1.5">
                  <motion.span
                    className="relative flex h-2 w-2"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </motion.span>
                  <span className="hidden sm:inline text-xs font-medium text-secondary">
                    Available
                  </span>
                </div>
              )}
            </motion.a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = activeSection === item.href.slice(1)
                return (
                  <motion.a
                    key={item.label}
                    href={item.href}
                    className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'text-accent'
                        : 'text-secondary hover:text-[var(--text-heading)] hover:bg-white/5'
                    }`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-accent to-accent-hover rounded-full"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </motion.a>
                )
              })}

              {/* Resume Button */}
              <motion.a
                href={personal.resume}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 relative px-5 py-2 text-sm font-semibold text-white rounded-lg overflow-hidden group cursor-pointer"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent-hover transition-all duration-300 group-hover:from-accent-hover group-hover:to-accent" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10 flex items-center gap-2">
                  Resume
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </span>
              </motion.a>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              ref={menuButtonRef}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden relative w-10 h-10 rounded-lg border border-border/50 bg-surface/50 backdrop-blur-sm flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <motion.span
                  className="w-full h-0.5 bg-accent rounded-full"
                  animate={{
                    rotate: isMobileMenuOpen ? 45 : 0,
                    y: isMobileMenuOpen ? 7 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                />
                <motion.span
                  className="w-full h-0.5 bg-accent rounded-full"
                  animate={{
                    opacity: isMobileMenuOpen ? 0 : 1,
                    scale: isMobileMenuOpen ? 0 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                />
                <motion.span
                  className="w-full h-0.5 bg-accent rounded-full"
                  animate={{
                    rotate: isMobileMenuOpen ? -45 : 0,
                    y: isMobileMenuOpen ? -7 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </motion.button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Mobile Menu Panel */}
            <motion.div
              ref={mobileMenuRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm z-50 bg-surface/95 backdrop-blur-xl border-l border-border/50 shadow-2xl md:hidden"
            >
              <div className="flex flex-col h-full">
                {/* Mobile Menu Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/50">
                  <span className="font-mono text-sm font-bold text-accent">
                    Navigation
                  </span>
                  <motion.button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-10 h-10 rounded-lg border border-border/50 bg-white/5 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50"
                    whileHover={{ scale: 1.05, rotate: 90 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Close menu"
                  >
                    <svg
                      className="w-5 h-5 text-[var(--text-heading)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </motion.button>
                </div>

                {/* Mobile Menu Items */}
                <nav className="flex-1 overflow-y-auto p-6">
                  <ul className="space-y-2">
                    {navItems.map((item, index) => {
                      const isActive = activeSection === item.href.slice(1)
                      return (
                        <motion.li
                          key={item.label}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.3 }}
                        >
                          <a
                            href={item.href}
                            onClick={handleNavClick}
                            className={`block px-4 py-3 text-base font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                              isActive
                                ? 'text-accent bg-accent/10 border-l-4 border-accent'
                                : 'text-secondary hover:text-[var(--text-heading)] hover:bg-white/5'
                            }`}
                          >
                            {item.label}
                          </a>
                        </motion.li>
                      )
                    })}
                  </ul>
                </nav>

                {/* Mobile Menu Footer */}
                <div className="p-6 border-t border-border/50 space-y-4">
                  <motion.a
                    href={personal.resume}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white rounded-lg overflow-hidden group cursor-pointer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent-hover transition-all duration-300 group-hover:from-accent-hover group-hover:to-accent" />
                    <span className="relative z-10 flex items-center gap-2">
                      Download Resume
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </span>
                  </motion.a>

                  <p className="text-center text-xs text-muted font-mono">
                    {personal.email}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default PremiumNavbar
