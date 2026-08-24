import React, { useRef, useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

/**
 * Per-card subtle environmental lighting & material depth configs.
 * Base surfaces are layered near-black (#0e0b1c -> #080612 -> #04030a), with soft, asymmetric
 * ambient violet reflections and crisp upper edge highlights.
 */
const CARD_LIGHT_CONFIGS = [
  // Card 0 — STATUS: upper-left environmental light bleed
  {
    gradient: 'linear-gradient(150deg, #0e0b1c 0%, #080613 50%, #04030a 100%)',
    sheen: 'radial-gradient(ellipse 110% 80% at 15% -10%, rgba(167, 139, 250, 0.085) 0%, rgba(139, 92, 246, 0.02) 55%, transparent 80%)',
    borderDefault: '#231c38',
    borderHover: '#3d315d',
    topHighlight: 'rgba(167, 139, 250, 0.22)',
  },
  // Card 1 — EMAIL: top-center balanced environmental light bleed
  {
    gradient: 'linear-gradient(155deg, #0e0b1c 0%, #080613 50%, #04030a 100%)',
    sheen: 'radial-gradient(ellipse 100% 75% at 50% -10%, rgba(167, 139, 250, 0.095) 0%, rgba(139, 92, 246, 0.025) 55%, transparent 80%)',
    borderDefault: '#231c38',
    borderHover: '#3d315d',
    topHighlight: 'rgba(167, 139, 250, 0.24)',
  },
  // Card 2 — LINKEDIN: upper-right environmental light bleed
  {
    gradient: 'linear-gradient(145deg, #0e0b1c 0%, #080613 50%, #04030a 100%)',
    sheen: 'radial-gradient(ellipse 110% 80% at 85% -10%, rgba(167, 139, 250, 0.09) 0%, rgba(139, 92, 246, 0.02) 55%, transparent 80%)',
    borderDefault: '#231c38',
    borderHover: '#3d315d',
    topHighlight: 'rgba(167, 139, 250, 0.22)',
  },
  // Card 3 — LOCATION: soft right environmental light bleed
  {
    gradient: 'linear-gradient(140deg, #0e0b1c 0%, #080613 50%, #04030a 100%)',
    sheen: 'radial-gradient(ellipse 100% 75% at 90% 0%, rgba(167, 139, 250, 0.08) 0%, rgba(139, 92, 246, 0.018) 55%, transparent 80%)',
    borderDefault: '#231c38',
    borderHover: '#3d315d',
    topHighlight: 'rgba(167, 139, 250, 0.20)',
  },
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
            className="group/cta inline-flex items-center gap-1 text-xs font-semibold text-white transition-colors duration-200 cursor-pointer text-left w-full border-none bg-transparent p-0 outline-none hover:text-[#a78bfa]"
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
                  className="inline-flex items-center gap-1 font-semibold text-[#a78bfa]"
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
                  className="inline-flex items-center gap-1 text-white group-hover/cta:text-[#a78bfa] transition-colors"
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
          className="group/cta inline-flex items-center gap-1 text-xs font-semibold text-white transition-colors duration-200 cursor-pointer text-left border-none bg-transparent p-0 outline-none hover:text-[#a78bfa]"
        >
          <span>{footer}</span>
        </Component>
      )
    }

    return (
      <span className="text-[11px] text-[#6e6785] font-normal text-left select-text">
        {footer}
      </span>
    )
  }

  // Multi-layered dark surface: Environmental Sheen overlay atop base gradient
  const cardBackground = `${cfg.sheen}, ${cfg.gradient}`

  return (
    <div className="relative h-full w-full group">
      <div
        ref={cardRef}
        onClick={isInteractive ? handleAction : undefined}
        className={`relative overflow-hidden rounded-[18px] p-5 sm:p-5.5 min-h-[215px] h-full flex flex-col justify-between transform-gpu select-none ${
          isInteractive ? 'cursor-pointer' : 'cursor-default'
        }`}
        style={{
          border: `1px solid ${isHighlighted ? cfg.borderHover : cfg.borderDefault}`,
          background: cardBackground,
          boxShadow: isHighlighted
            ? `0 18px 40px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 1px 1px ${cfg.topHighlight}`
            : `0 10px 28px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 1px 1px ${cfg.topHighlight}`,
          transform: isHighlighted ? 'translateY(-3px)' : 'translateY(0)',
          transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease',
        }}
      >
        {/* Crisp Precision Upper Chamfer Light Reflection */}
        <div
          className="absolute inset-x-0 top-0 h-[1px] pointer-events-none z-10"
          style={{
            background: `linear-gradient(90deg, transparent 5%, ${cfg.topHighlight} 30%, rgba(255, 255, 255, 0.15) 50%, ${cfg.topHighlight} 70%, transparent 95%)`,
          }}
        />

        {/* Top Meta Row */}
        <div className="flex items-center justify-between mb-3.5 relative z-10">
          <div className="flex items-center gap-2.5">
            {/* Inset Control Surface Icon Container */}
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200"
              style={{
                background: '#0d0a1b',
                border: '1px solid #251e3a',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              }}
            >
              {typeof icon === 'function' ? icon(isHighlighted) : icon}
            </div>

            <span className="text-[10px] font-mono font-semibold tracking-[0.18em] text-[#938ba8] uppercase">
              {label}
            </span>
          </div>

          <span className="font-mono text-[10px] font-medium text-[#5c5473] tracking-wider">
            0{index}
          </span>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col justify-start my-1 relative z-10">
          <h4 className="text-[15px] font-bold text-white tracking-tight leading-snug text-left group-hover:text-white transition-colors duration-200">
            {title}
          </h4>
          <p className="text-xs leading-relaxed text-[#938ba8] font-normal text-left mt-1.5 max-w-[270px]">
            {description}
          </p>
        </div>

        {/* Footer Divider & Action */}
        <div
          className="flex items-center justify-between pt-3 w-full mt-auto relative z-10 border-t border-[#1e1932]"
        >
          {renderFooter()}
        </div>
      </div>
    </div>
  )
})
