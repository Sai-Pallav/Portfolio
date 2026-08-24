import { motion, useReducedMotion } from 'framer-motion'
import { personal } from '@/data/personal'
import { drawLineX, fadeUp, fadeUpSoft, staggerFast } from './aboutVariants'

export default function SectionTitle() {
  const reduceMotion = useReducedMotion()

  return (
    <motion.header variants={staggerFast} className="max-w-3xl relative mb-8 sm:mb-10">
      {/* Section Tag */}
      <motion.div
        variants={fadeUpSoft}
        className="inline-flex items-center gap-3 font-mono text-xs sm:text-[13px] font-medium tracking-[0.2em] uppercase text-accent mb-4"
      >
        <motion.span
          variants={drawLineX}
          className="h-[1.5px] w-8 rounded-full bg-accent/60 origin-left"
          aria-hidden="true"
        />
        <span>01 — ABOUT · BITS PILANI</span>
      </motion.div>

      {/* Main Name Heading */}
      <motion.h2
        variants={fadeUp}
        className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight text-white/95"
      >
        {personal.name}
      </motion.h2>

      {/* Role / Subtitle */}
      <motion.p
        variants={fadeUpSoft}
        className="mt-3 font-mono text-sm sm:text-base tracking-wider uppercase font-semibold text-accent/90"
      >
        FULL-STACK & SYSTEMS ENGINEER
      </motion.p>
    </motion.header>
  )
}
