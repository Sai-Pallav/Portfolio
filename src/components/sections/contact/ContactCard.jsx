import React, { useRef, useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

/**
 * Per-card atmospheric lighting offsets.
 * Each card gets a subtly different focal point so the four cards
 * look like a system rather than four identical rectangles.
 *
 *  index 0 → illumination pulled slightly left + upper
 *  index 1 → illumination centered top
 *  index 2 → illumination centered (slightly right)
 *  index 3 → illumination pulled right + lower-mid
 */
const CARD_LIGHT_CONFIGS = [
  // Card 0 — STATUS: upper-left bias
  { primary: '38% 28%', secondary: '72% 78%', highlight: '20% 0%' },
  // Card 1 — EMAIL: upper-center bias
  { primary: '52% 22%', secondary: '28% 80%', highlight: '50% 0%' },
  // Card 2 — LINKEDIN: center-right bias
  { primary: '62% 45%', secondary: '20% 72%', highlight: '62% 0%' },
  // Card 3 — LOCATION: right + lower-mid bias
  { primary: '72% 55%', secondary: '18% 30%', highlight: '82% 0%' },
]

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
  const cfg = CARD_LIGHT_CONFIGS[index] ?? CARD_LIGHT_CONFIGS[0]

  // Handle Event-Driven Highlight from Globe Platform Hover
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
            className="group/cta inline-flex items-center gap-1 text-xs font-semibold text-white transition-colors duration-200 cursor-pointer text-left w-full border-none bg-transparent p-0 outline-none hover:text-purple-300"
            aria-label={copied ? 'Email copied to clipboard' : 'Copy email address'}
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="copied"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.18 }}
                  className="inline-flex items-center gap-1 font-semibold text-purple-300"
                >
                  <span>Copied!</span>
                  <Check className="h-3 w-3 stroke-[2.5]" />
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.18 }}
                  className="inline-flex items-center gap-1 text-white group-hover/cta:text-purple-300 transition-colors"
                >
                  <span>Copy Email →</span>
                </motion.span>
              )}
            </AnimatePresence>
          </Component>
        )
      }

      return (
        <Component
          {...linkProps}
          className="group/cta inline-flex items-center gap-1 text-xs font-semibold text-white transition-colors duration-200 cursor-pointer text-left border-none bg-transparent p-0 outline-none hover:text-purple-300"
        >
          <span>{footer}</span>
        </Component>
      )
    }

    return (
      <span className="text-[11px] text-[#554f73] font-normal text-left select-text">
        {footer}
      </span>
    )
  }

  // ── GLASS SURFACE SYSTEM ────────────────────────────────────────────────────────────────────────────
  // Four gradient layers (bottom to top):
  //  L1 — Vertical luminance spine  (dark obsidian base with tonal depth)
  //  L2 — Primary atmospheric lobe  (accent, large, per-card positioned)
  //  L3 — Secondary fill lobe       (accent, softer, opposite corner)
  //  L4 — Top-edge glass sheen      (neutral white, simulates light on glass)

  const lobeIntensity     = isHighlighted ? '18%' : '12%'
  const lobeMidIntensity  = isHighlighted ? '9%'  : '6%'
  const lobeFillIntensity = isHighlighted ? '8%'  : '5%'
  const sheenOpacity      = isHighlighted ? 0.09  : 0.06
  const sheenMidOpacity   = isHighlighted ? 0.032 : 0.022

  const glassBackground = [
    // L4 — Top-edge glass sheen (narrowband, simulates reflected light on glass surface)
    `radial-gradient(ellipse 85% 22% at ${cfg.highlight}, rgba(255,255,255,${sheenOpacity}) 0%, rgba(255,255,255,${sheenMidOpacity}) 45%, transparent 75%)`,
    // L3 — Secondary atmospheric fill lobe (opposite corner, softer)
    `radial-gradient(ellipse 72% 58% at ${cfg.secondary}, color-mix(in srgb, var(--accent) ${lobeFillIntensity}, transparent) 0%, color-mix(in srgb, var(--accent) 1.2%, transparent) 48%, transparent 74%)`,
    // L2 — Primary atmospheric lobe (main "light through glass" effect, per-card positioned)
    `radial-gradient(ellipse 100% 78% at ${cfg.primary}, color-mix(in srgb, var(--accent) ${lobeIntensity}, transparent) 0%, color-mix(in srgb, var(--accent) ${lobeMidIntensity}, transparent) 35%, color-mix(in srgb, var(--accent) 1.8%, transparent) 62%, transparent 84%)`,
    // L1 — Vertical luminance spine (obsidian base with subtle tonal variation, not flat black)
    `linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 62%, var(--bg)) 0%, color-mix(in srgb, var(--bg-surface) 50%, var(--bg)) 25%, color-mix(in srgb, var(--bg-surface) 44%, var(--bg)) 55%, color-mix(in srgb, var(--bg-surface) 36%, var(--bg)) 82%, color-mix(in srgb, var(--bg-surface) 28%, var(--bg)) 100%)`,
  ].join(', ')

  return (
    <div
      ref={cardRef}
      onClick={isInteractive ? handleAction : undefined}
      className={`group relative overflow-hidden rounded-[18px] p-5 sm:p-5.5 min-h-[220px] h-full flex flex-col justify-between transform-gpu select-none ${
        isInteractive ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{
        border: isHighlighted
          ? `1px solid color-mix(in srgb, var(--accent) 24%, rgba(255,255,255,0.10))`
          : `1px solid color-mix(in srgb, var(--accent) 13%, rgba(255,255,255,0.06))`,
        background: glassBackground,
        boxShadow: isHighlighted
          ? `0 14px 36px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.07)`
          : `0 6px 22px rgba(0,0,0,0.42), 0 1px 4px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.04)`,
        transform: isHighlighted ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'background 0.32s ease, border-color 0.32s ease, box-shadow 0.32s ease, transform 0.28s ease',
      }}
    >
      {/* Hover brightening overlay — "glass catches more light" effect */}
      <div
        className="absolute inset-0 rounded-[17px] opacity-0 group-hover:opacity-100 pointer-events-none"
        style={{
          background: [
            `radial-gradient(ellipse 85% 22% at ${cfg.highlight}, rgba(255,255,255,0.035) 0%, transparent 68%)`,
            `radial-gradient(ellipse 80% 60% at ${cfg.primary}, color-mix(in srgb, var(--accent) 5%, transparent) 0%, transparent 72%)`,
          ].join(', '),
          transition: 'opacity 0.32s ease',
        }}
        aria-hidden="true"
      />
      {/* Top Meta Row */}
      <div className="flex items-center justify-between mb-3.5 relative z-10">
        <div className="flex items-center gap-2.5">
          {/* Icon Box — glass language: accent-tinted translucent surface */}
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
            style={{
              background: `color-mix(in srgb, var(--accent) 12%, color-mix(in srgb, var(--bg-surface) 65%, transparent))`,
              border: `1px solid color-mix(in srgb, var(--accent) 22%, rgba(255,255,255,0.08))`,
              boxShadow: `inset 0 1px 1px rgba(255,255,255,0.06)`,
            }}
          >
            {typeof icon === 'function' ? icon(isHighlighted) : icon}
          </div>
          <span className="text-[10.5px] font-mono font-bold tracking-[0.18em] text-[#766f98] uppercase">
            {label}
          </span>
        </div>
        <span className="font-mono text-[10.5px] font-medium text-[#463f63] tracking-wider">
          0{index}
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-start my-1 relative z-10">
        <h4 className="text-[15px] sm:text-[16px] font-bold text-white font-heading tracking-tight leading-snug text-left group-hover:text-purple-200 transition-colors duration-200">
          {title}
        </h4>
        <p className="text-[12px] sm:text-[12.5px] leading-[1.6] text-[#8e87ab] font-normal text-left mt-1.5 max-w-[280px]">
          {description}
        </p>
      </div>

      {/* Footer Divider & Action */}
      <div
        className="flex items-center justify-between pt-3 w-full mt-auto relative z-10"
        style={{ borderTop: `1px solid color-mix(in srgb, var(--accent) 9%, rgba(255,255,255,0.05))` }}
      >
        {renderFooter()}
      </div>
    </div>
  )
})





