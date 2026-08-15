import React, { useRef, useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [isHighlighted, setIsHighlighted] = useState(false)
  const [copied, setCopied] = useState(false)

  const isInteractive = Boolean(href || onClick || copyText)

  // Handle Event-Driven Highlight from Globe Platform Hover (Architecture Isolation)
  useEffect(() => {
    if (!platformKey) return
    const handleGlobeHover = (e) => {
      const platform = e.detail?.platform
      const shouldHighlight = Array.isArray(platformKey)
        ? platformKey.includes(platform)
        : platformKey === platform
      setIsHighlighted(Boolean(shouldHighlight))
    }
    window.addEventListener('globe-hover', handleGlobeHover)
    return () => window.removeEventListener('globe-hover', handleGlobeHover)
  }, [platformKey])

  const handleAction = useCallback((e) => {
    if (copyText) {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      navigator.clipboard.writeText(copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } else if (href) {
      if (e) {
        e.stopPropagation()
      }
      if (href.startsWith('http')) {
        window.open(href, '_blank', 'noopener,noreferrer')
      } else {
        window.location.href = href
      }
    } else if (onClick) {
      onClick(e)
    }
  }, [copyText, href, onClick])

  const renderFooter = () => {
    if (!footer) return null

    if (isInteractive) {
      const Component = href ? 'a' : 'button'
      const linkProps = href 
        ? { 
            href, 
            target: href.startsWith('http') ? '_blank' : undefined, 
            rel: href.startsWith('http') ? 'noopener noreferrer' : undefined,
            onClick: (e) => e.stopPropagation()
          }
        : { 
            type: 'button',
            onClick: handleAction
          }

      if (actionType === 'copy') {
        return (
          <Component
            {...linkProps}
            className="group/cta inline-flex items-center gap-1.5 text-xs font-medium transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer text-left w-full border-none bg-transparent p-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] focus-visible:rounded"
            style={{ color: copied ? 'var(--accent)' : 'var(--text-secondary)' }}
            aria-label={copied ? 'Email copied to clipboard' : 'Copy email address'}
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="copied"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex items-center gap-1.5 font-medium text-[var(--accent)]"
                >
                  <span>Copied!</span>
                  <Check className="h-3 w-3 stroke-[2.2]" />
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex items-center gap-1.5 group-hover:text-[var(--text-primary)] transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                >
                  <span className="py-0.5">
                    {footer.replace(' →', '')}
                  </span>
                  <ArrowRight 
                    className="h-3 w-3 text-[var(--accent)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" 
                    strokeWidth={2} 
                  />
                </motion.span>
              )}
            </AnimatePresence>
          </Component>
        )
      }

      return (
        <Component
          {...linkProps}
          className="group/cta inline-flex items-center gap-1.5 text-xs font-medium transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer text-left w-full border-none bg-transparent p-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] focus-visible:rounded text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
        >
          <span className="py-0.5">
            {footer.replace(' →', '')}
          </span>
          <ArrowRight 
            className="h-3 w-3 text-[var(--accent)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1" 
            strokeWidth={2} 
          />
        </Component>
      )
    }

    return (
      <span className="text-[11px] font-mono text-[var(--text-muted)] tracking-tight flex items-center gap-1.5 select-text">
        {footer}
      </span>
    )
  }

  return (
    <div
      ref={cardRef}
      onClick={isInteractive ? handleAction : undefined}
      className={`group relative overflow-hidden rounded-xl border p-5 sm:p-6 min-h-[224px] h-full flex flex-col justify-between transform-gpu transition-[transform,border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform select-none ${
        isInteractive ? 'cursor-pointer' : 'cursor-default'
      } ${
        isHighlighted
          ? 'border-white/[0.18] -translate-y-[1.5px] shadow-[0_8px_24px_-4px_rgba(0,0,0,0.65)]'
          : 'border-white/[0.07] hover:border-white/[0.14] hover:-translate-y-[1.5px] shadow-[0_4px_16px_-4px_rgba(0,0,0,0.45)] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.65)]'
      }`}
      style={{
        background: isHighlighted
          ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 45%, rgba(0, 0, 0, 0.22) 100%), var(--bg-surface)'
          : 'linear-gradient(180deg, rgba(255, 255, 255, 0.024) 0%, rgba(255, 255, 255, 0.005) 45%, rgba(0, 0, 0, 0.26) 100%), var(--bg-surface)'
      }}
    >
      {/* Precision top specular edge highlight */}
      <div 
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.14] to-transparent transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:via-white/[0.22]" 
        style={{ opacity: isHighlighted ? 0.85 : 0.5 }}
      />

      {/* Top Meta Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Engineered System Indicator / Icon Box */}
          <div 
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition-[background-color,border-color,color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] ${
              isHighlighted
                ? 'border-white/[0.16] bg-white/[0.05] text-[var(--text-primary)]'
                : 'border-white/[0.08] bg-white/[0.02] text-[var(--text-secondary)] group-hover:border-white/[0.15] group-hover:bg-white/[0.045] group-hover:text-[var(--text-primary)]'
            }`}
          >
            {typeof icon === 'function' ? icon(isHighlighted) : icon}
          </div>
          <p className="text-[10px] font-mono tracking-widest font-semibold uppercase text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
            {label}
          </p>
        </div>
        <span className="font-mono text-[10px] font-medium text-[var(--text-muted)]/50 tracking-widest group-hover:text-[var(--text-muted)]/80 transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
          0{index}
        </span>
      </div>

      {/* Content Area with Intentional Vertical Rhythm */}
      <div className="flex-1 flex flex-col justify-start my-3.5">
        <h4 className="text-[15px] sm:text-[16px] font-semibold text-[var(--text-heading)] font-heading tracking-tight leading-snug text-left group-hover:text-white transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
          {title}
        </h4>
        <p className="text-[13px] leading-[1.6] text-[var(--text-secondary)] font-normal text-left mt-1.5 max-w-[280px]">
          {description}
        </p>
      </div>

      {/* Footer / Action Baseline Lock */}
      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3.5 w-full mt-auto">
        {renderFooter()}
      </div>
    </div>
  )
})



