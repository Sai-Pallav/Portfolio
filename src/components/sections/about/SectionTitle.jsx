import { motion } from 'framer-motion'
import { personal } from '@/data/personal'
import { drawLineX, fadeUp, fadeUpSoft, staggerFast } from './aboutVariants'

export default function SectionTitle() {
  return (
    <motion.header variants={staggerFast} className="max-w-3xl relative mb-4 lg:mb-5">
      {/* Section Tag */}
      <motion.div
        variants={fadeUpSoft}
        className="inline-flex items-center gap-3 font-mono text-xs sm:text-[13px] font-medium tracking-[0.2em] uppercase text-accent mb-2"
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
        className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-white/95"
      >
        {personal.name}
      </motion.h2>

      {/* Role / Subtitle */}
      <motion.p
        variants={fadeUpSoft}
        className="mt-1 font-mono text-xs sm:text-sm tracking-wider uppercase font-semibold text-accent/90"
      >
        FULL-STACK & SYSTEMS ENGINEER
      </motion.p>
    </motion.header>
  )
}
