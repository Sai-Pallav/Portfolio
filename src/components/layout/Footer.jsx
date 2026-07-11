import React, { useCallback } from 'react'
import { personal } from '@/data/personal'

function Footer() {
  const currentYear = new Date().getFullYear()

  const handleStartConversation = useCallback(() => {
    window.location.href = `mailto:${personal.email}`
  }, [])

  return (
    <footer className="w-full bg-gradient-to-b from-transparent to-[#030712]/95 backdrop-blur-md relative z-20 border-t border-white/[0.04] mt-16 md:mt-24">
      {/* Top CTA Block */}
      <div className="max-w-6xl mx-auto w-full pt-20 pb-16 flex flex-col items-center justify-center text-center px-6">
        <h3 className="text-secondary/50 font-mono text-[10px] uppercase tracking-[0.2em] mb-3">
          Still here?
        </h3>
        <h2 className="text-2xl md:text-3xl font-bold font-heading text-[var(--text-heading)] tracking-tight mb-8 max-w-lg">
          Let's build something meaningful together.
        </h2>
        <button
          onClick={handleStartConversation}
          className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-6 py-3 text-xs font-semibold text-white transition-all duration-300 hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_0_24px_rgba(255,255,255,0.03)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:outline-none"
        >
          <span>Start a Conversation</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </button>
      </div>

      {/* Grid Divider */}
      <div className="max-w-6xl mx-auto w-full px-6">
        <div className="h-px bg-white/[0.04]" />
      </div>

      {/* Main Footer Block */}
      <div className="max-w-6xl mx-auto w-full py-12 px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
        {/* Left Column: Wordmark */}
        <div className="font-sans text-sm font-extrabold tracking-widest text-white uppercase select-none">
          SAIPALLAV.CORE
        </div>

        {/* Center Column: Built with */}
        <div className="font-mono text-[10px] tracking-wider text-secondary/40 uppercase">
          Built with: <span className="text-secondary/65">React • Vite • Three.js • Framer Motion</span>
        </div>

        {/* Right Column: Social Links */}
        <div className="flex flex-wrap justify-center gap-6 font-mono text-[10px] tracking-wider uppercase text-secondary/50">
          <a
            href={personal.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            className="relative py-0.5 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-right after:scale-x-0 after:bg-white after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100 hover:text-white transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded px-1"
          >
            GitHub
          </a>
          <a
            href={personal.socials.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="relative py-0.5 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-right after:scale-x-0 after:bg-white after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100 hover:text-white transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded px-1"
          >
            LinkedIn
          </a>
          <a
            href={`mailto:${personal.email}`}
            className="relative py-0.5 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-right after:scale-x-0 after:bg-white after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100 hover:text-white transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded px-1"
          >
            Email
          </a>
          <a
            href={personal.resume}
            target="_blank"
            rel="noopener noreferrer"
            className="relative py-0.5 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-right after:scale-x-0 after:bg-white after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100 hover:text-white transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded px-1"
          >
            Resume
          </a>
        </div>
      </div>

      {/* Bottom Divider */}
      <div className="max-w-6xl mx-auto w-full px-6">
        <div className="h-px bg-white/[0.02]" />
      </div>

      {/* Signature & Copyright */}
      <div className="max-w-6xl mx-auto w-full py-8 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="font-mono text-[9px] tracking-wider text-secondary/35 uppercase">
          Designed and developed with precision by Sai Pallav.
        </div>
        <div className="font-mono text-[9px] tracking-wider text-secondary/35 uppercase">
          © {currentYear} Sai Pallav. Crafted with precision.
        </div>
      </div>
    </footer>
  )
}

export default Footer
