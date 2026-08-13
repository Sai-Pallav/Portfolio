import React, { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const DECORATIVE_TEXT = "I specialize in backend engineering—API development, database design, and system architecture. Right now I'm looking for summer 2026 internship opportunities where I can work on real-world problems at scale. Whether you have a technical question, a project idea, or an open role, reach out. I'll get back to you within a day."

export default React.memo(function ContactHero() {
  const shouldReduceMotion = useReducedMotion()

  const entryVar01 = useMemo(() => ({
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: shouldReduceMotion ? 0 : 0.1 },
    },
  }), [shouldReduceMotion])

  const entryVar025 = useMemo(() => ({
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: shouldReduceMotion ? 0 : 0.25 },
    },
  }), [shouldReduceMotion])

  return (
    <div className="w-full relative z-20 flex flex-col items-start text-left">
      <motion.h2
        variants={entryVar01}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6"
      >
        <span className="bg-gradient-to-r from-primary via-accent to-accent-hover bg-clip-text text-transparent filter drop-shadow-[0_0_25px_var(--accent-dim)]">
          Engineering Scalable Systems{' '}
        </span>
        <span className="bg-gradient-to-r from-accent-hover via-accent to-primary bg-clip-text text-transparent filter drop-shadow-[0_0_25px_var(--accent-dim)]">
          into Reality
        </span>
      </motion.h2>

      <motion.p
        variants={entryVar025}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        className="text-[15px] md:text-[16px] leading-relaxed text-white/75 font-normal w-full text-justify md:text-left max-w-3xl"
      >
        {DECORATIVE_TEXT}
      </motion.p>
    </div>
  )
})
