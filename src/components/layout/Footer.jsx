import React, { useCallback } from 'react'
import { personal } from '@/data/personal'

function Footer() {
  const currentYear = new Date().getFullYear()

  const handleStartConversation = useCallback(() => {
    const contactSection = document.getElementById('contact')
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' })
      // Focus on the name input field after the scroll animation
      setTimeout(() => {
        const nameInput = document.getElementById('name')
        if (nameInput) nameInput.focus()
      }, 800)
    }
  }, [])

  return (
    <footer className="w-full bg-gradient-to-b from-transparent via-[#020408]/80 to-[#020306] relative z-20 border-t border-white/[0.04]">
      {/* Top CTA Block: Controlled vertical rhythm with zero dead space */}
      <div className="max-w-6xl mx-auto w-full pt-14 pb-12 md:pt-16 md:pb-14 flex flex-col items-center justify-center text-center px-6">
        <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[var(--text-muted)] mb-2.5 select-none">
          Still here?
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-[32px] font-semibold font-heading text-[var(--text-heading)] tracking-tight leading-snug max-w-lg mb-6">
          Let's build something meaningful together.
        </h2>
        <button
          onClick={handleStartConversation}
          className="group inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-6 py-2.5 sm:py-3 text-xs font-semibold text-[var(--text-primary)] transform-gpu transition-[transform,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform hover:bg-white/[0.05] hover:border-white/[0.16] hover:shadow-[0_6px_20px_rgba(0,0,0,0.6)] hover:-translate-y-[1.5px] active:translate-y-0 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020306]"
        >
          <span>Start a Conversation</span>
          <span className="text-[var(--accent)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">
            →
          </span>
        </button>
      </div>

      {/* Primary Structural Divider */}
      <div className="max-w-6xl mx-auto w-full px-6">
        <div className="h-px bg-white/[0.05]" />
      </div>

      {/* Main Footer Identity Row */}
      <div className="max-w-6xl mx-auto w-full py-8 px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
        {/* Left: Brand Identity */}
        <div className="font-mono text-xs font-bold tracking-widest text-[var(--text-heading)] uppercase select-none">
          SAIPALLAV.CORE
        </div>

        {/* Center: Engineering Stack Metadata */}
        <div className="font-mono text-[11px] tracking-wider uppercase text-[var(--text-muted)]">
          Built with:{' '}
          <span className="text-[var(--text-secondary)]/80">
            React • Vite • Three.js • Framer Motion
          </span>
        </div>

        {/* Right: Navigation Cluster */}
        <div className="flex flex-wrap justify-center items-center gap-6 font-mono text-[11px] tracking-wider uppercase text-[var(--text-secondary)]">
          <a
            href={personal.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]/60 focus-visible:rounded px-0.5"
          >
            GitHub
          </a>
          <a
            href={personal.socials.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]/60 focus-visible:rounded px-0.5"
          >
            LinkedIn
          </a>
          <a
            href={`mailto:${personal.email}`}
            className="hover:text-[var(--text-primary)] transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]/60 focus-visible:rounded px-0.5"
          >
            Email
          </a>
          <a
            href={personal.resume}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]/60 focus-visible:rounded px-0.5"
          >
            Resume
          </a>
        </div>
      </div>

      {/* Secondary Structural Divider */}
      <div className="max-w-6xl mx-auto w-full px-6">
        <div className="h-px bg-white/[0.03]" />
      </div>

      {/* Signature & Legal Alignment Row */}
      <div className="max-w-6xl mx-auto w-full py-6 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="font-mono text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
          Designed and developed with precision by Sai Pallav.
        </div>
        <div className="font-mono text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
          © {currentYear} Sai Pallav. Crafted with precision.
        </div>
      </div>
    </footer>
  )
}

export default Footer
