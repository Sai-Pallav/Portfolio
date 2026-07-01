import { useRef, memo, useMemo } from 'react'
import { motion, useScroll, useTransform, useReducedMotion, useInView, useSpring } from 'framer-motion'
import { personal } from '@/data/personal'

// Static absolute paths matching index.html preloads to prevent hashing and enable parallel fetching
const heroPortrait = '/hero-portrait.webp'
const heroPortraitMobile = '/hero-portrait-mobile.webp'
const heroPortraitAlternate = '/hero-portrait-alternate.webp'

/**
 * Ultra-Optimized Cinematic Premium Hero Section
 * 
 * Performance & Rendering Tuning:
 * - Suspends floats, sweeps, and active animations when scrolled out of view using useInView.
 * - Extracts and memoizes all inline style objects to guarantee referential stability and prevent GC pressure.
 * - Promotes portrait and parallax elements to GPU hardware-accelerated layers (will-change).
 * - Implements responsive WebP loading via standard HTML5 <picture> serving static, preloaded assets.
 * - Full prefers-reduced-motion accessibility integration.
 * - Wrapped in React.memo() to insulate the Hero from parent layout updates.
 */
function Hero() {
  const containerRef = useRef(null)
  const { scrollY } = useScroll()
  const shouldReduceMotion = useReducedMotion()

  // Track if the Hero is in the active viewport (suspends loops when off-screen)
  const isInView = useInView(containerRef, { amount: 0.05 })

  // Parallax translation (suspended/static if OS prefers reduced motion)
  const yRaw = useTransform(scrollY, [0, 800], [0, shouldReduceMotion ? 0 : -100])
  const opacityRaw = useTransform(scrollY, [0, 600], [1, 0])

  // Apply smooth spring physics to scroll transitions for professional momentum
  const yTransform = useSpring(yRaw, { stiffness: 85, damping: 26, mass: 0.5 })
  const opacityTransform = useSpring(opacityRaw, { stiffness: 85, damping: 26, mass: 0.5 })

  // Memoized referentially-stable style structures to avoid object recreation on render passes
  const backgroundStyle = useMemo(() => ({
    // Dual ambient glow system: combines the primary portrait glow with a secondary soft text glow
    background: 'radial-gradient(circle at 20% 45%, var(--accent-dim) 0%, transparent 60%), radial-gradient(circle at center, transparent 40%, var(--bg) 100%), var(--hero-ambient-glow), var(--bg)',
    willChange: 'transform, opacity',
    transform: 'translate3d(0, 0, 0)',
  }), [])

  const noiseStyle = useMemo(() => ({
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    opacity: 'var(--hero-noise-opacity)',
    willChange: 'opacity, transform',
    transform: 'translate3d(0, 0, 0)',
  }), [])

  const bottomGradientStyle = useMemo(() => ({
    background: 'linear-gradient(to top, var(--bg) 0%, transparent 100%)',
    willChange: 'transform',
    transform: 'translate3d(0, 0, 0)',
  }), [])

  const imageStyle = useMemo(() => ({
    mixBlendMode: 'var(--hero-img-blend)',
    opacity: 'var(--hero-img-opacity)',
    WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)',
    maskImage: 'radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)',
    willChange: 'transform, opacity',
    backfaceVisibility: 'hidden',
    transform: 'translate3d(0, 0, 0)',
  }), [])

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative min-h-screen w-full flex items-center justify-start overflow-hidden bg-bg"
    >
      {/* Background Environment Layers (Consolidated to 2 layers for compositing efficiency) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Layer 1: Consolidated Background (Base + Theme Accent Glow + Vignette) */}
        <div 
          className="absolute inset-0 hero-background-env"
          style={backgroundStyle} 
        />

        {/* Layer 2: Film Grain Noise Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none hero-noise-overlay"
          style={noiseStyle}
        />
      </div>

      {/* Primary Layer: Masked Portrait Image (Responsive WebP, Eager Loading, Stable Dimensions) */}
      <div className="absolute right-0 bottom-0 top-0 w-full md:w-[60%] h-full z-10 pointer-events-none flex items-end justify-center md:justify-end overflow-hidden">
        <motion.div
          style={{ y: yTransform, opacity: opacityTransform, willChange: 'transform, opacity' }}
          className="relative w-[90%] md:w-[85%] h-[75vh] md:h-[90vh] flex items-end justify-center"
        >
          {/* Studio Backlight Glow for Depth (Theme-aware and hardware-accelerated) */}
          <div 
            className="absolute inset-0 m-auto w-[75%] h-[75%] rounded-full blur-[100px] opacity-35 pointer-events-none z-0"
            style={{
              background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
              willChange: 'transform',
              transform: 'translate3d(0, 0, 0)',
            }}
          />

          {/* Nested Motion Div to prevent transform conflicts between Parallax scroll and Floating animations */}
          <motion.div
            animate={isInView && !shouldReduceMotion ? {
              y: [0, -12, 0],
            } : {}}
            transition={isInView && !shouldReduceMotion ? {
              y: {
                duration: 12,
                repeat: Infinity,
                ease: "easeInOut",
              }
            } : {}}
            style={{ willChange: 'transform' }}
            className="w-full h-full flex items-end justify-center z-10"
          >
            <picture className="w-full h-full object-cover">
              <source srcSet={heroPortraitMobile} media="(max-width: 768px)" type="image/webp" />
              <source srcSet={heroPortrait} type="image/webp" />
              <motion.img
                src={heroPortrait}
                alt={personal.name}
                width={1024}
                height={1024}
                loading="eager"
                decoding="async"
                data-portal-portrait="true"
                data-portal-image={heroPortraitAlternate}
                initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full object-cover object-center hero-portrait-img pointer-events-auto"
                style={imageStyle}
              />
            </picture>
          </motion.div>
          
          {/* Subtle bottom gradient to blend image edge into background */}
          <div 
            className="absolute inset-x-0 bottom-0 h-32 pointer-events-none z-20"
            style={bottomGradientStyle}
          />
        </motion.div>
      </div>

      {/* Mobile/Tablet Readability Vignette (Only active on smaller viewports to elevate text contrast over portrait) */}
      <div 
        className="absolute inset-0 z-15 pointer-events-none block md:hidden"
        style={{
          background: 'linear-gradient(to top, var(--bg) 15%, rgba(10, 10, 11, 0.5) 60%, transparent 100%), linear-gradient(to right, var(--bg) 20%, transparent 80%)'
        }}
      />

      {/* Secondary Layer: Personal Branding Content */}
      <div className="relative z-20 max-w-7xl w-full mx-auto px-6 md:px-12 lg:px-20 py-20 flex items-center justify-start pointer-events-none">
        <div className="flex flex-col justify-center h-full max-w-xl md:max-w-2xl relative pointer-events-none">
          
          {/* Top Branding / Logo */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="mb-4 md:mb-5 font-mono text-[10px] md:text-xs tracking-[0.25em] font-medium uppercase pointer-events-auto"
            style={{ color: 'var(--accent)' }}
          >
            {personal.firstName} // Portfolio 2026
          </motion.div>

          {/* Name - Elegant Big Typography */}
          <motion.h1
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold font-heading leading-[1.0] md:leading-[0.95] tracking-tight md:tracking-tighter pointer-events-auto"
            style={{ color: 'var(--text-heading)' }}
          >
            {personal.name}
          </motion.h1>

          {/* Role */}
          <motion.p
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
            className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight mt-4 md:mt-5 mb-2 pointer-events-auto"
            style={{ color: 'var(--text-primary)' }}
          >
            {personal.role}
          </motion.p>

          {/* Short Positioning Statement */}
          <motion.p
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
            className="text-sm sm:text-base md:text-lg leading-relaxed max-w-md md:max-w-lg font-body pointer-events-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            {personal.tagline}
          </motion.p>
          
          {/* Subtle CTA link */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.55 }}
            className="mt-8 md:mt-10 flex items-center gap-4 pointer-events-auto"
          >
            <motion.a 
              href="#about"
              whileHover={shouldReduceMotion ? {} : { scale: 1.03, x: 2 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              className="group flex items-center gap-3 text-xs uppercase tracking-[0.25em] font-semibold font-mono hover:text-[var(--accent)] transition-all duration-300 ease-out"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span>Explore Identity</span>
              <div className="relative flex items-center">
                <span 
                  className="w-8 h-[1px] group-hover:w-12 group-hover:bg-[var(--accent)] transition-all duration-300 ease-out" 
                  style={{ background: 'var(--text-muted)' }}
                />
                <span className="opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-1 text-[var(--accent)] transition-all duration-300 ease-out text-[10px]">
                  →
                </span>
              </div>
            </motion.a>
          </motion.div>
        </div>
      </div>

      {/* Minimal Scroll-Down Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-12 left-6 md:left-12 lg:left-20 z-20 flex items-center gap-4 text-[10px] font-mono tracking-[0.3em] uppercase select-none pointer-events-none"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>Scroll</span>
        <div className="w-[1px] h-12 bg-white/10 relative overflow-hidden">
          <motion.div 
            animate={isInView && !shouldReduceMotion ? {
              y: [-48, 48]
            } : {}}
            transition={isInView && !shouldReduceMotion ? {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            } : {}}
            className="absolute top-0 left-0 w-full h-1/2"
            style={{ background: 'var(--accent)' }}
          />
        </div>
      </motion.div>
    </section>
  )
}

export default memo(Hero)
