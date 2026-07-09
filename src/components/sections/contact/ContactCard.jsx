import React, { useRef, useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'

export default memo(function ContactCard({
  index,
  label,
  title,
  description,
  footer,
  href,
  onClick,
  icon,
  copyText,
  platformKey,
  actionType
}) {
  const cardRef = useRef(null)
  const cardRectRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isHighlighted, setIsHighlighted] = useState(false)
  const [copied, setCopied] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  // Handle Event-Driven Highlight from Globe Platform Hover (Architecture Isolation)
  useEffect(() => {
    if (!platformKey) return
    const handleGlobeHover = (e) => {
      const platform = e.detail.platform
      const shouldHighlight = Array.isArray(platformKey)
        ? platformKey.includes(platform)
        : platformKey === platform
      setIsHighlighted(shouldHighlight)
    }
    window.addEventListener('globe-hover', handleGlobeHover)
    return () => window.removeEventListener('globe-hover', handleGlobeHover)
  }, [platformKey])

  const handleMouseMove = useCallback((e) => {
    if (!cardRectRef.current && cardRef.current) {
      cardRectRef.current = cardRef.current.getBoundingClientRect()
    }
    const rect = cardRectRef.current
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    cardRef.current.style.setProperty('--card-mouse-x', `${x}px`)
    cardRef.current.style.setProperty('--card-mouse-y', `${y}px`)
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    if (cardRef.current) {
      cardRectRef.current = cardRef.current.getBoundingClientRect()
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    cardRectRef.current = null
  }, [])

  const handleCardClick = useCallback((e) => {
    if (copyText) {
      e.preventDefault()
      e.stopPropagation()
      navigator.clipboard.writeText(copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } else if (onClick) {
      onClick(e)
    }
  }, [copyText, onClick])

  const effectiveHovered = isHovered || isHighlighted

  const accentConfigs = {
    default: {
      glow: 'var(--accent-glow)',
      borderHover: 'hover:border-[var(--accent)]/25',
      iconText: 'text-[var(--accent)]',
      iconBg: 'bg-[var(--accent)]/10 border-[var(--accent)]/10',
      iconGlow: 'group-hover:shadow-[0_0_16px_var(--accent-glow)]',
      textAccent: 'text-[var(--accent)]/80',
    }
  }

  const config = accentConfigs.default

  const renderFooter = () => {
    if (!footer) return null

    const isLink = href || onClick || copyText

    if (isLink) {
      const Component = href ? 'a' : 'button'
      const props = href 
        ? { 
            href, 
            target: href.startsWith('http') ? '_blank' : undefined, 
            rel: href.startsWith('http') ? 'noopener noreferrer' : undefined 
          }
        : { onClick: handleCardClick }

      if (actionType === 'copy') {
        return (
          <Component
            {...props}
            className="inline-flex items-center text-xs font-semibold transition-all duration-300 group/cta mt-4 cursor-pointer text-left w-full border-none bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none rounded px-1"
            style={{ color: copied ? 'var(--accent)' : 'var(--text-heading)' }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="copied"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeInOut" }}
                  className="inline-flex items-center gap-1.5"
                >
                  <span aria-live="polite" className="font-semibold text-[var(--accent)]">Copied!</span>
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeInOut" }}
                  className="inline-flex items-center gap-1.5"
                >
                  <span className="relative py-0.5 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-right after:scale-x-0 after:bg-[var(--accent)] after:transition-transform after:duration-300 group-hover/cta:after:origin-left group-hover/cta:after:scale-x-100 group-hover/cta:text-white">
                    {footer.replace(' →', '')}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:translate-x-1" strokeWidth={2} />
                </motion.span>
              )}
            </AnimatePresence>
          </Component>
        )
      }

      if (actionType === 'navigate') {
        return (
          <Component
            {...props}
            className="inline-flex items-center gap-1.5 text-xs font-semibold transition-all duration-300 group/cta mt-4 cursor-pointer text-left w-full border-none bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none rounded px-1"
            style={{ color: 'var(--text-heading)' }}
          >
            <span className="relative py-0.5 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-right after:scale-x-0 after:bg-[var(--accent)] after:transition-transform after:duration-300 group-hover/cta:after:origin-left group-hover/cta:after:scale-x-100 group-hover/cta:text-white">
              {footer.replace(' →', '')}
            </span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:translate-x-1" strokeWidth={2} />
          </Component>
        )
      }

      // Default fallback
      return (
        <Component
          {...props}
          className="inline-flex items-center gap-1.5 text-xs font-semibold transition-all duration-300 group/cta mt-4 cursor-pointer text-left w-full border-none bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none rounded px-1"
          style={{ color: copied ? 'var(--accent)' : 'var(--text-heading)' }}
        >
          <span className="relative py-0.5 after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:origin-right after:scale-x-0 after:bg-[var(--accent)] after:transition-transform after:duration-300 group-hover/cta:after:origin-left group-hover/cta:after:scale-x-100 group-hover/cta:text-white">
            {copied ? "Copied!" : footer.replace(' →', '')}
          </span>
          {copied ? (
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
          ) : (
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:translate-x-1" strokeWidth={2} />
          )}
        </Component>
      )
    }

    return (
      <span className="text-xs font-normal text-secondary/50 tracking-normal mt-4">
        {footer}
      </span>
    )
  }

  const hasAction = Boolean(href || onClick || copyText || actionType)

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-surface/80 via-raised/60 to-surface/80 backdrop-blur-2xl p-6 md:p-8 min-h-[240px] h-full flex flex-col justify-between transition-all duration-200 ease-out select-none shadow-[0_16px_36px_-8px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.02)] ${
        effectiveHovered
          ? hasAction
            ? 'border-[var(--accent)]/40 -translate-y-[2px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.45)]'
            : 'border-white/20'
          : 'border-white/10'
      }`}
    >
      {/* Glossy top highlight */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/[0.005] to-white/[0.03] pointer-events-none" />

      {/* Local mouse glow radial overlay */}
      {!shouldReduceMotion && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(150px circle at var(--card-mouse-x, 0px) var(--card-mouse-y, 0px), ${config.glow}, transparent 100%)`
          }}
        />
      )}

      {/* Top Meta Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Rounded Glass Icon Box with Soft Accents */}
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border transition-all duration-500 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.05)] ${config.iconBg} ${config.iconText} ${config.iconGlow} ${
            effectiveHovered ? 'scale-105' : ''
          }`}>
            {typeof icon === 'function' ? icon(effectiveHovered) : icon}
          </div>
          <p className="text-[11px] font-mono tracking-[0.08em] font-medium uppercase text-[var(--text-muted)]">
            {label}
          </p>
        </div>
        <span className="font-mono text-[9px] text-secondary/20 tracking-wider">0{index}</span>
      </div>

      {/* Content Area */}
      <div className="flex-grow flex flex-col justify-start mt-4">
        <h4 className="text-base md:text-lg font-bold text-[var(--text-heading)] font-heading tracking-tight mb-2 text-left">
          {title}
        </h4>
        <p className="text-sm md:text-[15px] leading-[1.55] text-secondary/65 font-normal text-left">
          {description}
        </p>
      </div>

      {/* Footer / CTA Area */}
      <div className="flex items-center justify-between border-t border-white/[0.03] mt-4 pt-3.5 w-full">
        {renderFooter()}
      </div>
    </motion.div>
  )
})
