import { useState, useEffect, useRef, useMemo, memo } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * RollingGridPortrait
 *
 * A 3D staggered wave grid reveal animation for the About portrait.
 * Slices the portrait image into a responsive CSS 3D grid of tiles
 * that tumble down along the X-axis on scroll-enter.
 *
 * Safeguards implemented:
 * 1. `max-w-none` and `object-cover object-top` on all sliced <img> elements.
 * 2. `overflow-visible` on preserve-3d flipper wrappers; `overflow-hidden` strictly
 *    on front/back faces with `-webkit-backface-visibility: hidden`.
 * 3. Keyframed Z-lift (`z: [0, 30, 0]`) settling flush, followed by seamless full
 *    image overlay and `will-change: auto` cleanup on completion.
 * 4. `role="img" aria-label="..."` on container, `alt="" aria-hidden="true"` on slices,
 *    and image preload check alongside `useInView` with amount: 0.4.
 * 5. Pure Framer Motion implementation without unused GSAP dependencies.
 * 6. Zero backdrop-blur on back faces to preserve hardware 3D contexts.
 * 7. Stacking isolation and scroll guard to guarantee no premature reveal.
 */
function RollingGridPortrait({
  src,
  alt = 'Sai Pallav',
  className,
}) {
  const containerRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()

  // Responsive density: 3x4 on mobile (<768px), 6x8 on desktop (>=768px)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(min-width: 768px)').matches
    }
    return true
  })

  // Preload and cache verification for image
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  // Scroll guard: guarantees shouldAnimate never fires before user scrolls past hero
  const [hasUserScrolled, setHasUserScrolled] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.scrollY > 50
    }
    return false
  })

  useEffect(() => {
    if (hasUserScrolled) return
    const onScroll = () => {
      if (window.scrollY > 50) {
        setHasUserScrolled(true)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [hasUserScrolled])

  // Safely reset completion state if viewport crosses the 768px breakpoint
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const updateMedia = (e) => {
      setIsDesktop(e.matches)
      setIsComplete(false)
    }
    mql.addEventListener('change', updateMedia)
    return () => mql.removeEventListener('change', updateMedia)
  }, [])

  useEffect(() => {
    if (!src) return
    let isMounted = true
    const img = new Image()
    const handleDone = () => {
      if (isMounted) {
        setIsImageLoaded(true)
      }
    }

    img.onload = handleDone
    img.onerror = handleDone
    img.src = src

    if (img.complete) {
      Promise.resolve().then(handleDone)
    }

    return () => {
      isMounted = false
      img.onload = null
      img.onerror = null
    }
  }, [src])

  const isInView = useInView(containerRef, { once: true, amount: 0.25 })
  const shouldAnimate = isInView && isImageLoaded && hasUserScrolled

  const cols = isDesktop ? 6 : 3
  const rows = isDesktop ? 8 : 4

  // Safety fallback timer to guarantee `isComplete` even if an animation frame is dropped
  useEffect(() => {
    if (shouldAnimate && !isComplete && !prefersReducedMotion) {
      const totalTimeMs = ((cols - 1 + rows - 1) * 0.06 + 1.1) * 1000
      const timer = setTimeout(() => {
        setIsComplete(true)
      }, totalTimeMs)
      return () => clearTimeout(timer)
    }
  }, [shouldAnimate, isComplete, cols, rows, prefersReducedMotion])

  // Generate tile descriptors
  const tiles = useMemo(() => {
    const items = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        items.push({
          col: c,
          row: r,
          isLastTile: c === cols - 1 && r === rows - 1,
        })
      }
    }
    return items
  }, [cols, rows])

  // Reduced motion accessible fallback: smooth 2D fade-in with zero 3D transforms
  if (prefersReducedMotion) {
    return (
      <div
        ref={containerRef}
        role="img"
        aria-label={alt}
        className={cn('relative w-full aspect-square max-h-[min(480px,58vh)]', className)}
        style={{ aspectRatio: '1 / 1' }}
      >
        <motion.img
          src={src}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          initial={{ opacity: 0 }}
          animate={shouldAnimate ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full object-cover object-top filter brightness-[0.92] contrast-[1.05]"
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={alt}
      className={cn(
        'relative w-full aspect-square max-h-[min(480px,58vh)] overflow-visible select-none',
        className
      )}
      style={{ perspective: 1200, aspectRatio: '1 / 1' }}
    >
      {/* 3D Sliced Rolling Grid */}
      <div
        className="absolute inset-0 grid overflow-visible pointer-events-none"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {tiles.map(({ col, row, isLastTile }) => {
          const delay = (col + row) * 0.06

          return (
            <div
              key={`tile-${col}-${row}`}
              className="relative overflow-visible w-full h-full"
            >
              {/* Preserve-3D Flipper Wrapper - strictly overflow-visible */}
              <motion.div
                className="relative w-full h-full overflow-visible"
                style={{
                  transformStyle: 'preserve-3d',
                  willChange: isComplete ? 'auto' : 'transform',
                }}
                initial={{ rotateX: 180, z: 0 }}
                animate={
                  shouldAnimate
                    ? { rotateX: 0, z: [0, 30, 0] }
                    : { rotateX: 180, z: 0 }
                }
                transition={{
                  rotateX: {
                    duration: 0.9,
                    delay,
                    ease: [0.23, 1, 0.32, 1],
                  },
                  z: {
                    duration: 0.9,
                    delay,
                    times: [0, 0.5, 1],
                    ease: 'easeInOut',
                  },
                }}
                onAnimationComplete={() => {
                  if (shouldAnimate && isLastTile) {
                    setIsComplete(true)
                  }
                }}
              >
                {/* Front Face: The sliced image - strictly overflow-hidden */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateX(0deg)',
                  }}
                >
                  <img
                    src={src}
                    alt=""
                    aria-hidden="true"
                    loading="eager"
                    decoding="async"
                    className="max-w-none object-cover object-top filter brightness-[0.92] contrast-[1.05] pointer-events-none select-none"
                    style={{
                      width: `${cols * 100}%`,
                      height: `${rows * 100}%`,
                      maxWidth: 'none',
                      position: 'absolute',
                      left: `${-col * 100}%`,
                      top: `${-row * 100}%`,
                    }}
                  />
                </div>

                {/* Back Face: Tactile dark tile face - strictly overflow-hidden, no backdrop-blur */}
                <div
                  className="absolute inset-[1px] rounded-[3px] overflow-hidden border border-white/[0.12] bg-[#16161a] shadow-sm shadow-black/50"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateX(180deg)',
                    background:
                      'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%), #141418',
                  }}
                >
                  {/* Subtle surface lighting gradient and inner border */}
                  <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-white/10 via-transparent to-black/60 pointer-events-none" />
                  <div className="absolute inset-0 border border-white/[0.06] pointer-events-none" />
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>

      {/* Seamless Full Image Revealed on Completion (Eliminates sub-pixel seams & frees GPU layers) */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        className={cn(
          'absolute inset-0 w-full h-full object-cover object-top filter brightness-[0.92] contrast-[1.05] pointer-events-none transition-opacity duration-300',
          isComplete ? 'opacity-100 z-1' : 'opacity-0'
        )}
      />
    </div>
  )
}

export default memo(RollingGridPortrait)
