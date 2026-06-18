import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function BackToTop({ isThemePickerOpen }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      const scrollY = window.lenis?.scroll ?? window.scrollY
      setIsVisible(scrollY > 400)
    }

    toggleVisibility()

    let lenis = window.lenis
    let waitId

    const bindLenis = () => {
      lenis = window.lenis
      if (!lenis) return false
      lenis.on('scroll', toggleVisibility)
      return true
    }

    // Lenis may not be initialized yet — poll briefly until it is
    if (!bindLenis()) {
      waitId = setInterval(() => {
        if (bindLenis()) clearInterval(waitId)
      }, 32)
    }

    // Native scroll listener as fallback
    window.addEventListener('scroll', toggleVisibility, { passive: true })

    return () => {
      if (waitId) clearInterval(waitId)
      if (lenis) lenis.off('scroll', toggleVisibility)
      window.removeEventListener('scroll', toggleVisibility)
    }
  }, [])

  const scrollToTop = () => {
    if (window.lenis) {
      window.lenis.scrollTo(0, { duration: 1.2 })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AnimatePresence>
      {isVisible && !isThemePickerOpen && (
        <motion.button
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-24 right-8 z-[999] w-12 h-12 rounded-full bg-surface border border-border text-accent hover:border-accent backdrop-blur-md grid place-items-center shadow-lg transition-colors duration-300"
          aria-label="Back to top"
          title="Back to top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export default BackToTop
