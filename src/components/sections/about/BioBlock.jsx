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
    title: 'Full-Stack Engineering',
    description: 'End-to-end web applications with React, modern state management, and robust backend APIs.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    title: 'Distributed Systems',
    description: 'High-performance, language-agnostic architectures engineered for scale and uptime.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    title: 'AI & Open Source',
    description: 'Integrating AI capabilities and actively maintaining systems used by real audiences.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77 5.44 5.44 0 003.5 8.55c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
      </svg>
    ),
  },
]

export default function BioBlock() {
  return (
    <motion.div variants={fadeLeft} className="relative space-y-8">
      {/* Preserved Bio Paragraphs */}
      <div className="space-y-4 max-w-2xl">
        <p className="text-lg sm:text-xl leading-relaxed font-body text-white/90">
          Building production web applications and AI-powered systems with a focus on reliable software architecture, performance, and thoughtful user experiences.
        </p>
        <p className="text-sm sm:text-base leading-relaxed font-body text-white/65">
          Third-year Computer Science & Engineering student at BITS Pilani, specializing in full-stack web development, language-agnostic applications, and distributed architectures.
        </p>
      </div>

      {/* Stats Grid (Reference Image Style) */}
      <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-4 max-w-xl">
        <div>
          <p className="text-2xl sm:text-3xl font-bold font-heading text-white">300+</p>
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-white/50 mt-1">
            CAMPUS USERS
          </p>
        </div>
        <div className="border-l border-white/10 pl-4">
          <p className="text-2xl sm:text-3xl font-bold font-heading text-white">Production</p>
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-white/50 mt-1">
            WEB SYSTEMS
          </p>
        </div>
        <div className="border-l border-white/10 pl-4">
          <p className="text-2xl sm:text-3xl font-bold font-heading text-white">{personal.cgpa} CGPA</p>
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-white/50 mt-1">
            CSE / BITS PILANI
          </p>
        </div>
      </div>

      {/* Location / Campus Detail line */}
      <p className="text-xs sm:text-sm font-body text-white/60">
        <span className="font-semibold text-white/80">{personal.university}</span> · Computer Science & Engineering
      </p>

      {/* Status Badge & Action CTAs */}
      <div className="pt-4 flex flex-wrap items-center justify-between gap-4 max-w-2xl">
        <div className="flex items-center gap-2.5 text-xs sm:text-[13px] font-mono tracking-wider uppercase text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>OPEN TO SWE INTERNSHIPS</span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#skills"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-contrast font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-300 hover:brightness-110 shadow-lg shadow-accent/20"
          >
            <span>EXPLORE THE STACK</span>
            <span>→</span>
          </a>
          <a
            href="#projects"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-mono text-xs font-medium tracking-wider uppercase transition-colors duration-300"
          >
            <span>VIEW PROJECTS</span>
          </a>
        </div>
      </div>

      {/* Focus Areas Section */}
      <div className="pt-8 border-t border-white/10">
        <p className="font-mono text-xs uppercase tracking-widest text-accent font-semibold mb-4">
          Focus Areas
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {FOCUS_AREAS.map((area) => (
            <div
              key={area.title}
              className="p-4 rounded-xl border border-white/10 bg-surface/30 backdrop-blur-sm flex flex-col gap-2 transition-all duration-300 hover:border-accent/40 hover:bg-surface/50"
            >
              <div className="text-accent">{area.icon}</div>
              <p className="font-heading text-sm font-semibold text-white">{area.title}</p>
              <p className="text-xs text-white/60 leading-relaxed">{area.description}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
