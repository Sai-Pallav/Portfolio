import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import PhotoCard from './PhotoCard'
import { staggerContainer } from './aboutVariants'

export default function About() {
  const sectionRef = useRef(null)
  const contentRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const isInView = true

  return (
    <section
      ref={sectionRef}
      id="about"
      aria-label="About me"
      className="relative min-h-screen flex items-center py-20 md:py-24 lg:py-28 overflow-hidden"
    >
      {/* Premium ambient background */}
      <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 bg-gradient-to-br from-bg via-surface/40 to-bg"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={
            isInView
              ? reduceMotion
                ? { opacity: 0.15, scale: 1 }
                : { opacity: [0.12, 0.2, 0.12], scale: [1, 1.08, 1] }
              : { opacity: 0, scale: 0.85 }
          }
          transition={
            isInView && !reduceMotion
              ? { opacity: { duration: 14, repeat: Infinity, ease: 'easeInOut' }, scale: { duration: 14, repeat: Infinity, ease: 'easeInOut' } }
              : { duration: 1, ease: [0.16, 1, 0.3, 1] }
          }
          className="absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 68%)' }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={
            isInView
              ? reduceMotion
                ? { opacity: 0.08 }
                : { opacity: [0.06, 0.12, 0.06], scale: [1, 1.12, 1] }
              : { opacity: 0 }
          }
          transition={
            isInView && !reduceMotion
              ? { duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 4 }
              : { duration: 1, delay: 0.2 }
          }
          className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[90px]"
          style={{ background: 'radial-gradient(circle, var(--accent-hover) 0%, transparent 70%)' }}
        />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `
              linear-gradient(var(--border) 1px, transparent 1px),
              linear-gradient(90deg, var(--border) 1px, transparent 1px)
            `,
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      <motion.div
        ref={contentRef}
        className="w-full px-6 lg:px-8 relative"
        variants={staggerContainer}
        initial="hidden"
        animate={isInView ? 'show' : 'hidden'}
      >
        <PhotoCard sectionRef={sectionRef} />
      </motion.div>
    </section>
  )
}
