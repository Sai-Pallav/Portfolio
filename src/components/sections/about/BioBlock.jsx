import { motion } from 'framer-motion'
import { personal } from '@/data/personal'
import {
  fadeLeft,
  drawLineY,
  fadeUpSoft,
  slideMaskUp,
  staggerFast,
} from './aboutVariants'

const FOCUS_AREAS = [
  {
    title: 'Full-Stack',
    description: 'End-to-end web apps — from React interfaces to Node.js APIs.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    title: 'Distributed Systems',
    description: 'Language-agnostic architectures built for scale and reliability.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    title: 'Open Source',
    description: 'Contributing to and maintaining systems used beyond the classroom.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77 5.44 5.44 0 003.5 8.55c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
      </svg>
    ),
  },
]

function splitBio(text) {
  const trimmed = text.trim()
  const firstBreak = trimmed.indexOf('. ')
  if (firstBreak === -1) return [trimmed]
  return [trimmed.slice(0, firstBreak + 1), trimmed.slice(firstBreak + 2)]
}

export default function BioBlock() {
  const [lead, ...rest] = splitBio(personal.bio)
  const body = rest.join(' ')

  return (
    <motion.div variants={fadeLeft} className="relative space-y-12 lg:col-span-8">
      <motion.div
        variants={drawLineY}
        className="hidden lg:block absolute -left-8 top-0 bottom-0 w-px origin-top bg-gradient-to-b from-transparent via-accent/40 to-transparent"
        aria-hidden="true"
      />

      <motion.div variants={slideMaskUp} className="relative rounded-2xl border border-border/70 bg-surface/40 backdrop-blur-sm p-6 sm:p-8 lg:p-10 overflow-hidden">
        <div
          className="absolute top-0 right-0 w-48 h-48 opacity-[0.07] pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
          aria-hidden="true"
        />

        <motion.div
          variants={drawLineY}
          className="absolute left-0 top-8 bottom-8 w-[3px] origin-top rounded-full bg-gradient-to-b from-accent via-accent-hover to-transparent"
          aria-hidden="true"
        />

        <div className="relative pl-5 sm:pl-6 space-y-6">
          <p className="text-xl sm:text-2xl lg:text-[1.65rem] font-medium text-[var(--text-heading)] leading-snug tracking-tight">
            {lead}
          </p>
          {body && (
            <p className="text-base sm:text-lg text-secondary/90 leading-[1.9] max-w-prose">
              {body}
            </p>
          )}
        </div>
      </motion.div>

      <motion.div variants={fadeUpSoft} className="flex items-center gap-3 mb-6">
        <div className="flex-1 max-w-[3rem] h-1 rounded-full bg-gradient-to-r from-accent/60 to-transparent" aria-hidden="true" />
        <h3 className="font-mono text-xs font-semibold tracking-[0.2em] uppercase text-muted">
          What I focus on
        </h3>
        <div className="flex-1 h-1 rounded-full bg-gradient-to-l from-border to-transparent" aria-hidden="true" />
      </motion.div>

      <motion.ul variants={staggerFast} className="grid sm:grid-cols-3 gap-4">
          {FOCUS_AREAS.map((area) => (
            <motion.li
              key={area.title}
              variants={fadeUpSoft}
              whileHover={{ y: -6, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
              className="group relative rounded-2xl p-[1px] overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover), transparent)' }}
                aria-hidden="true"
              />
              <div className="relative h-full rounded-2xl border border-border/60 bg-surface/50 backdrop-blur-md p-5 transition-all duration-300 group-hover:border-transparent group-hover:bg-surface/80 group-hover:shadow-xl group-hover:shadow-accent/5">
                <motion.span
                  className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-accent mb-4"
                  style={{
                    background: 'linear-gradient(145deg, var(--accent-dim), rgba(255,255,255,0.02))',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                  whileHover={{ scale: 1.08, rotate: 3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                >
                  {area.icon}
                </motion.span>
                <p className="font-heading text-base font-semibold text-[var(--text-heading)] mb-2">{area.title}</p>
                <p className="text-sm text-secondary/85 leading-relaxed">{area.description}</p>
              </div>
            </motion.li>
          ))}
      </motion.ul>
    </motion.div>
  )
}
