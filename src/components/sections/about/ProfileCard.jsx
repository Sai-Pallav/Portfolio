import { motion } from 'framer-motion'
import { personal } from '@/data/personal'
import StatusBadge from './StatusBadge'
import {
  drawLineX,
  fadeUpSoft,
  profileReveal,
  scaleIn,
  staggerFast,
} from './aboutVariants'

const METRICS = [
  { value: personal.cgpa, label: 'CGPA' },
  { value: '300+', label: 'Users shipped' },
  { value: personal.year, label: 'Year' },
  { value: '5+', label: 'Projects' },
]

export default function ProfileCard() {
  const initials = personal.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <motion.aside
      variants={profileReveal}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className="group relative flex flex-col gap-7 rounded-2xl overflow-hidden border border-border/80 bg-surface/70 backdrop-blur-xl shadow-2xl shadow-black/20 p-6 sm:p-8 lg:col-span-4 lg:sticky lg:top-28"
      aria-label="Profile summary"
    >
      <div
        className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(135deg, var(--accent), transparent 45%, var(--accent-hover))',
        }}
        aria-hidden="true"
      />

      <motion.div
        variants={drawLineX}
        className="absolute top-0 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-accent via-accent-hover to-transparent"
        aria-hidden="true"
      />

      <motion.div variants={scaleIn} className="flex items-center gap-4">
        <div
          className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl font-heading text-2xl font-bold text-accent"
          style={{
            background: 'linear-gradient(145deg, var(--accent-dim), rgba(255,255,255,0.03))',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.25)',
          }}
          aria-hidden="true"
        >
          {initials}
          <span className="absolute inset-0 rounded-2xl border border-accent/30" />
        </div>
        <div className="min-w-0">
          <p className="font-heading text-xl font-bold text-[var(--text-heading)] truncate">{personal.name}</p>
          <p className="text-sm text-secondary/90 mt-1 leading-snug">{personal.role}</p>
        </div>
      </motion.div>

      <motion.div variants={staggerFast} className="space-y-3.5 pt-2 border-t border-border/60">
        <motion.div variants={fadeUpSoft} className="flex items-start gap-3 text-sm text-secondary">
          <span className="mt-0.5 text-accent shrink-0" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </span>
          <span>{personal.university}</span>
        </motion.div>
        <motion.div variants={fadeUpSoft} className="flex items-start gap-3 text-sm text-secondary">
          <span className="mt-0.5 text-accent shrink-0" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <span>{personal.location}</span>
        </motion.div>
      </motion.div>

      <motion.div variants={staggerFast} className="grid grid-cols-2 gap-3">
        {METRICS.map((metric) => (
          <motion.div
            key={metric.label}
            variants={scaleIn}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="group/metric relative rounded-xl border border-border/60 bg-bg/60 px-4 py-3.5 overflow-hidden transition-colors duration-300 hover:border-accent/25 hover:bg-surface/80"
          >
            <div
              className="absolute inset-0 opacity-0 group-hover/metric:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, var(--accent-dim), transparent)' }}
              aria-hidden="true"
            />
            <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-muted mb-1.5">
              {metric.label}
            </p>
            <p className="relative font-heading text-2xl sm:text-[1.65rem] font-bold text-[var(--text-heading)] tabular-nums leading-none">
              {metric.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <StatusBadge compact />
    </motion.aside>
  )
}
