import { useRef, memo, useMemo } from 'react'
import { motion, useScroll, useTransform, useReducedMotion, useInView, useSpring } from 'framer-motion'
import { personal } from '@/data/personal'

// Static absolute paths matching index.html preloads to prevent hashing and enable parallel fetching
const heroPortrait = '/hero-portrait.webp'
const heroPortraitMobile = '/hero-portrait-mobile.webp'
const heroPortraitAlternate = '/hero-portrait-alternate.webp'

// Premium editorial ease-out curve
const EDITORIAL_EASE = [0.22, 1, 0.36, 1]

/**
 * Editorial Refined Hero / About Section
 * 
 * Hierarchy & Motion Refinements:
 * - Section label increased (14-15px) with refined tracking and muted white presence.
 * - Name reduced ~10-15% (text-4xl sm:text-5xl md:text-6xl) for confident editorial proportion.
 * - Role strengthened (text-xl sm:text-2xl) and grouped tightly with Name (Group 1).
 * - Positioning statement elevated (text-[16px] sm:text-[18px]) with increased contrast (Group 2).
 * - Supporting metadata grouped quietly with restrained typography (Group 3).
 * - CTA micro-interaction refined with smooth arrow offset and brightness shift (Group 4).
 * - Staggered entrance sequence (~900-1100ms total) with zero continuous looping animations.
 */
function Hero() {
  const containerRef = useRef(null)
  const { scrollY } = useScroll()
  const shouldReduceMotion = useReducedMotion()

  // Track if the Hero is in the active viewport
  const isInView = useInView(containerRef, { amount: 0.05 })

  // Parallax translation (suspended/static if OS prefers reduced motion)
  const yRaw = useTransform(scrollY, [0, 800], [0, shouldReduceMotion ? 0 : -80])
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

          {/* Stable image container - No continuous floating animation per Section 16 */}
          <div className="w-full h-full flex items-end justify-center z-10">
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
                initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.1, ease: EDITORIAL_EASE }}
                className="w-full h-full object-cover object-center hero-portrait-img pointer-events-auto"
                style={imageStyle}
              />
            </picture>
          </div>
          
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
      <div className="relative z-20 max-w-7xl w-full mx-auto px-6 md:px-12 lg:px-20 py-16 md:py-24 flex items-center justify-start pointer-events-none">
        <div className="flex flex-col justify-center h-full max-w-xl md:max-w-2xl relative pointer-events-none">
          
          {/* Stage 1: Section Label — Clear editorial presence */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EDITORIAL_EASE, delay: 0.10 }}
            className="mb-4 sm:mb-5 font-mono text-[13px] sm:text-[14px] md:text-[15px] tracking-[0.18em] font-medium uppercase text-white/65 pointer-events-auto"
          >
            01 — ABOUT
          </motion.div>

          {/* Group 1: Identity (Name + Role) */}
          <div className="pointer-events-auto">
            {/* Stage 2: Name — Confident editorial proportion */}
            <motion.h1
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EDITORIAL_EASE, delay: 0.18 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold font-heading leading-[1.06] tracking-tight text-white/95"
            >
              {personal.name}
            </motion.h1>

            {/* Stage 3: Professional Role — Strengthened title case */}
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EDITORIAL_EASE, delay: 0.26 }}
              className="text-xl sm:text-2xl font-semibold font-heading text-white/90 mt-2 sm:mt-2.5"
            >
              Full-Stack Engineer
            </motion.div>
          </div>

          {/* Group 2: Stage 4: Description — Elevated presence & bridge to proof */}
          <motion.p
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EDITORIAL_EASE, delay: 0.36 }}
            className="text-[16px] sm:text-[17.5px] md:text-[18.5px] leading-relaxed max-w-lg md:max-w-[580px] font-body text-white/80 mt-6 sm:mt-7 pointer-events-auto"
          >
            I build production web applications and AI-powered systems, working across the frontend, backend, and deployment stack.
          </motion.p>

          {/* Group 3: Stage 5: Supporting Credentials & Metadata — Kept quiet */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EDITORIAL_EASE, delay: 0.46 }}
            className="mt-7 sm:mt-8 space-y-2 pointer-events-auto"
          >
            {/* Evidence Proof Line */}
            <div className="text-xs sm:text-[13.5px] font-body text-white/55 tracking-wide">
              Built for 300+ campus users · production web applications
            </div>

            {/* Compressed Credential Line */}
            <div className="text-xs sm:text-[13.5px] font-body text-white/45 tracking-wide">
              BITS Pilani · CSE · {personal.cgpa} CGPA
            </div>

            {/* Informational Availability */}
            <div className="pt-1 flex items-center gap-2 text-xs sm:text-[13px] font-body text-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shrink-0" />
              <span>Open to software engineering internships</span>
            </div>
          </motion.div>

          {/* Group 4: Stage 6: Technical Stack CTA with restrained micro-interaction */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EDITORIAL_EASE, delay: 0.56 }}
            className="mt-8 sm:mt-9 pointer-events-auto"
          >
            <a 
              href="#skills"
              className="inline-flex items-center gap-2.5 text-xs sm:text-[13px] font-mono font-medium tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors duration-300 group"
            >
              <span>EXPLORE THE STACK</span>
              <span className="text-white/40 group-hover:text-white group-hover:translate-x-1.5 transition-transform duration-300">→</span>
            </a>
          </motion.div>

        </div>
      </div>
    </section>
  )
}

export default memo(Hero)
