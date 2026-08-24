import React, { useRef, useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

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

  return (
    <div
      ref={cardRef}
      onClick={isInteractive ? handleAction : undefined}
      className={`group relative overflow-hidden rounded-[18px] border p-5 sm:p-5.5 min-h-[220px] h-full flex flex-col justify-between transform-gpu transition-all duration-300 ease-out select-none shadow-[0_6px_20px_rgba(0,0,0,0.45)] ${
        isInteractive ? 'cursor-pointer' : 'cursor-default'
      } ${
        isHighlighted
          ? 'border-[#382e56] bg-[#141024] -translate-y-1 shadow-[0_12px_30px_rgba(0,0,0,0.65)]'
          : 'border-[#221d36] bg-[#0e0c1a] hover:border-[#352c52] hover:bg-[#120f21] hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.65)]'
      }`}
      style={{
        background: isHighlighted
          ? 'linear-gradient(180deg, #161228 0%, #0d0b17 100%)'
          : 'linear-gradient(180deg, #131022 0%, #0c0a15 100%)'
      }}
    >
      {/* Top Meta Row */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          {/* Icon Box */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#1e1738] border border-[#2e2354] text-[#a855f7] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
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
      <div className="flex-1 flex flex-col justify-start my-1">
        <h4 className="text-[15px] sm:text-[16px] font-bold text-white font-heading tracking-tight leading-snug text-left group-hover:text-purple-200 transition-colors duration-200">
          {title}
        </h4>
        <p className="text-[12px] sm:text-[12.5px] leading-[1.6] text-[#8e87ab] font-normal text-left mt-1.5 max-w-[280px]">
          {description}
        </p>
      </div>

      {/* Footer Divider & Action */}
      <div className="flex items-center justify-between border-t border-[#1d1930] pt-3 w-full mt-auto">
        {renderFooter()}
      </div>
    </div>
  )
})





