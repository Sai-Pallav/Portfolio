import React, { useEffect, useRef, Suspense, lazy, memo } from 'react'
import { useReducedMotion, useInView, motion } from 'framer-motion'
import ContactHero from './ContactHero'
import ContactForm from './ContactForm'
import ContactCards from './ContactCards'
import Contact3DObject from './Contact3DObject'
import PCBConnection from './PCBConnection'

export default memo(function ContactSection() {
  const sectionRef = useRef(null)
  const isInViewRepeat = useInView(sectionRef, { margin: '200px 0px' })
  const shouldReduceMotion = useReducedMotion()
  const rectRef = useRef(null)

  // Mouse tracking listener for cursor-driven ambient light (Optimized with requestAnimationFrame throttling)
  useEffect(() => {
    if (shouldReduceMotion) return

    const updateRect = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect()
        rectRef.current = {
          left: rect.left + window.scrollX,
          top: rect.top + window.scrollY
        }
      }
    }

    // Cache the rect initially and update on layout/resize changes (scroll listener eliminated)
    updateRect()
    window.addEventListener('resize', updateRect, { passive: true })

    let ticking = false
    const handleMouseMove = (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!rectRef.current) {
            updateRect()
          }
          const rect = rectRef.current
          if (rect && sectionRef.current) {
            const x = e.clientX + window.scrollX - rect.left
            const y = e.clientY + window.scrollY - rect.top
            sectionRef.current.style.setProperty('--mouse-x', `${x}px`)
            sectionRef.current.style.setProperty('--mouse-y', `${y}px`)
          }
          ticking = false
        })
        ticking = true
      }
    }

    const el = sectionRef.current
    if (el) {
      el.addEventListener('mousemove', handleMouseMove, { passive: true })
    }
    return () => {
      window.removeEventListener('resize', updateRect)
      if (el) el.removeEventListener('mousemove', handleMouseMove)
    }
  }, [shouldReduceMotion])

  return (
    <section 
      id="contact" 
      ref={sectionRef} 
      className="relative min-h-screen overflow-hidden px-6 pt-16 pb-24 md:pt-24 md:pb-32 group/section"
    >
      {/* Background Layer with Global Lighting, Connectivity, and Noise */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Layer 1: Very Dark Base */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface/50 via-bg to-surface/50 transition-colors duration-500" />

        {/* Layer 2: Large accent radial glow behind heading */}
        <div className="absolute -top-[10%] left-[5%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full blur-[130px] pointer-events-none mix-blend-screen" style={{ background: 'var(--gradient-glow)', opacity: 'calc(0.15 * var(--ambient-intensity))' }} />

        {/* Layer 3: Soft accent radial glow behind globe projection */}
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full blur-[150px] pointer-events-none mix-blend-screen" style={{ background: 'var(--gradient-glow)', opacity: 'calc(0.18 * var(--ambient-intensity))' }} />

        {/* Layer 4: Low-opacity ambient accent glow reaching the cards */}
        <div className="absolute bottom-[-10%] left-[10%] w-[550px] h-[550px] md:w-[750px] md:h-[750px] rounded-full blur-[130px] pointer-events-none" style={{ background: 'var(--gradient-glow)', opacity: 'calc(0.12 * var(--ambient-intensity))' }} />

        {/* Layer 5: Very subtle global vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(3,7,18,0.7)_100%)] pointer-events-none" />

        {/* Layer 6: Volumetric Fog Clouds (Slow floating movement) */}
        {!shouldReduceMotion && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <motion.div
              animate={{
                x: [0, 40, -20, 0],
                y: [0, -30, 20, 0],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute top-1/4 left-1/4 w-[400px] h-[300px] rounded-full blur-[100px] will-change-transform"
              style={{ background: 'var(--gradient-glow)', opacity: 'calc(0.2 * var(--ambient-intensity))' }}
            />
            <motion.div
              animate={{
                x: [0, -30, 45, 0],
                y: [0, 40, -30, 0],
              }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: -5
              }}
              className="absolute top-1/2 right-1/3 w-[450px] h-[320px] rounded-full blur-[110px] will-change-transform"
              style={{ background: 'var(--gradient-glow)', opacity: 'calc(0.2 * var(--ambient-intensity))' }}
            />
          </div>
        )}

        {/* Cursor-driven ambient mouse light */}
        {!shouldReduceMotion && (
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-300 opacity-0 group-hover/section:opacity-100"
            style={{
              background: 'var(--gradient-glow)',
              opacity: 'calc(0.08 * var(--ambient-intensity))'
            }}
          />
        )}

        {/* Ambient Grid Structure */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)] pointer-events-none" />

        {/* Subconscious connecting flow lines SVG (Percentage-based, fully responsive) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-35" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="flowGrad1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.01" />
              <stop offset="35%" stopColor="var(--accent-secondary)" stopOpacity="0.06" />
              <stop offset="65%" stopColor="var(--accent-secondary)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="var(--accent-hover)" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          <path
            d="M 10 15 C 25 22, 28 35, 42 45 C 50 51, 60 40, 70 35"
            fill="none"
            stroke="url(#flowGrad1)"
            strokeWidth="0.06"
            strokeDasharray="0.6 1.4"
          />
          <path
            d="M 38 55 C 48 65, 42 75, 32 85 C 22 92, 12 88, 2 95"
            fill="none"
            stroke="url(#flowGrad1)"
            strokeWidth="0.05"
            strokeDasharray="0.4 1.2"
          />
          <path
            d="M 78 40 C 82 55, 72 68, 58 78 C 48 85, 38 82, 28 90"
            fill="none"
            stroke="url(#flowGrad1)"
            strokeWidth="0.05"
            strokeDasharray="0.5 1.0"
          />
        </svg>

        {/* Fine Grain SVG Noise Overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.015] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <filter id="noiseFilterContact">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilterContact)" />
        </svg>

        {/* Linear divider highlights */}
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--accent) 50%, transparent)' }} />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Zone 1: Hero — stays in max-w-7xl */}
      <div className="mx-auto max-w-7xl px-6 md:px-12 relative z-10">
        <ContactHero />
      </div>

      {/* Zone 2: Interaction Area — 12-col grid, form at col 2-6, globe at col 7-12 */}
      <div className="relative w-full mt-8 lg:mt-10">
        <div className="relative grid grid-cols-1 lg:grid-cols-12 lg:gap-x-6 items-center">
          <PCBConnection />
          {/* Form: col-start-2 leaves col-1 as left PCB breathing room */}
          <div id="contact-form-container" className="lg:col-start-2 lg:col-span-5 w-full relative z-20 flex flex-col items-start lg:items-center">
            <div className="w-full max-w-[474px]">
              <ContactForm />
            </div>
          </div>
          {/* Globe: col-span-6, pushed to right edge with justify-end */}
          <div className="hidden md:flex lg:col-span-6 items-center justify-center lg:justify-end w-full relative z-20">
            <div id="contact-globe-inner" className="relative w-full h-[450px] lg:h-[520px] overflow-visible flex items-center justify-center lg:justify-end pointer-events-none z-10">
              <div className="absolute w-[300px] h-[300px] md:w-[400px] md:h-[400px] lg:w-[500px] lg:h-[500px] rounded-full blur-[80px] pointer-events-none -z-10 animate-pulse duration-[8000ms]" style={{ background: 'var(--gradient-glow)', opacity: 'calc(0.10 * var(--ambient-intensity))' }} />
              <Contact3DObject isInView={isInViewRepeat} />
            </div>
          </div>
        </div>
      </div>

      {/* Zone 3: Cards — stays in max-w-7xl */}
      <div className="mx-auto max-w-7xl px-6 md:px-12 relative z-10 mt-8 lg:mt-10">
        <ContactCards />
      </div>
    </section>
  )
})
