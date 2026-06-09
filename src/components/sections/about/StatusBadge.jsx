import { personal } from '@/data/personal'
import { motion } from 'framer-motion'
import { fadeUpSoft } from './aboutVariants'

export default function StatusBadge({ compact = false }) {
  if (!personal.availableNow) return null

  return (
    <motion.div
      variants={fadeUpSoft}
      className={
        compact
          ? 'flex items-center gap-3 rounded-xl border border-success/20 bg-success/[0.06] px-4 py-3 backdrop-blur-sm'
          : 'inline-flex items-center gap-3 rounded-xl border border-success/20 bg-success/[0.06] px-4 py-3'
      }
      role="status"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-30" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
      </span>
      <span className={`font-medium text-[var(--text-heading)] ${compact ? 'text-xs leading-snug' : 'text-sm'}`}>
        {personal.availability}
      </span>
    </motion.div>
  )
}
