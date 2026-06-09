import { motion, useReducedMotion } from 'framer-motion'
import { personal } from '@/data/personal'
import { drawLineX, fadeUp, fadeUpSoft, staggerFast } from './aboutVariants'

export default function SectionTitle() {
  const reduceMotion = useReducedMotion()

  return (
    <motion.header variants={staggerFast} className="max-w-3xl relative">
      <motion.span
        variants={fadeUpSoft}
        className="inline-flex items-center gap-3 font-mono text-xs font-medium tracking-[0.22em] uppercase text-accent mb-5"
      >
        <motion.span
          variants={drawLineX}
          className="h-1 w-10 rounded-full bg-gradient-to-r from-accent to-accent/20 origin-left"
          aria-hidden="true"
        />
        About
      </motion.span>

      <motion.h2
        variants={fadeUp}
        className="font-heading text-4xl sm:text-5xl lg:text-[3.35rem] font-bold leading-[1.08] tracking-tight"
      >
        <span className="text-[var(--text-heading)]">Building software that </span>
        <motion.span
          className="inline-block bg-gradient-to-r from-accent via-accent-hover to-accent bg-clip-text text-transparent"
          animate={
            reduceMotion
              ? {}
              : { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }
          }
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ backgroundSize: '200% auto' }}
        >
          reaches real users
        </motion.span>
      </motion.h2>

      <motion.p
        variants={fadeUpSoft}
        className="mt-6 text-lg sm:text-xl text-secondary/90 leading-relaxed max-w-2xl font-light"
      >
        {personal.tagline}
      </motion.p>
    </motion.header>
  )
}
