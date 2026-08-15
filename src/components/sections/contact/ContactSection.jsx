import { useEffect, useRef, useState, memo, useCallback } from 'react'
import { useReducedMotion, useInView } from 'framer-motion'
import ContactHero from './ContactHero'
import ContactForm from './ContactForm'
import ContactCards from './ContactCards'
import Contact3DObject from './Contact3DObject'
import LeftPCB from './LeftPCB'
import RightPCB from './RightPCB'

export default memo(function ContactSection() {
  const [contactSystemState, setContactSystemState] = useState('dormant')
  const [transmissionFailed, setTransmissionFailed] = useState(false)
  const sectionRef = useRef(null)

  // Optimization: Tracks viewport intersection to toggle canvas & SVG animation state
  const isInViewRepeat = useInView(sectionRef, { margin: '200px 0px' })
  const shouldReduceMotion = useReducedMotion()
  const rectRef = useRef(null)

  // Master Orchestration Timeline
  // Sequence: idle (0-2s) -> Left PCB pulse (2.0s-4.4s) -> Form lights up 1st (4.4s) -> Middle PCB lights up 2nd (4.8s) -> Right End PCB lights up 3rd (5.2s)
  const [orchestrationStage, setOrchestrationStage] = useState('idle')

  useEffect(() => {
    if (!isInViewRepeat) {
      setOrchestrationStage('idle')
      return
    }

    if (shouldReduceMotion) {
      setOrchestrationStage('complete')
      return
    }

    const t1 = setTimeout(() => setOrchestrationStage('beam'), 5000)
    const t2 = setTimeout(() => setOrchestrationStage('form-active'), 7400)
    const t3 = setTimeout(() => setOrchestrationStage('middle-active'), 7800)
    const t4 = setTimeout(() => setOrchestrationStage('right-active'), 8200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [isInViewRepeat, shouldReduceMotion])

  const isBeamActive = orchestrationStage !== 'idle'
  const isFormActive = orchestrationStage === 'form-active' || orchestrationStage === 'middle-active' || orchestrationStage === 'right-active' || orchestrationStage === 'complete'
  const isMiddleActive = orchestrationStage === 'middle-active' || orchestrationStage === 'right-active' || orchestrationStage === 'complete'
  const isRightActive = orchestrationStage === 'right-active' || orchestrationStage === 'complete'

  // Mouse tracking listener for cursor-driven ambient light (Throttled using requestAnimationFrame)
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

    // Cache the rect initially and update on window resize (passive listener)
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

  const formContainerRef = useRef(null)
  const globeContainerRef = useRef(null)

  useEffect(() => {
    if (contactSystemState === 'transmit') {
      const timerDormant = setTimeout(() => {
        setContactSystemState('dormant')
      }, 1900) // 1100ms + 800ms settle = 1900ms

      return () => clearTimeout(timerDormant)
    }
  }, [contactSystemState])

  // Imperative event dispatch without triggering React re-renders on the master ContactSection
  const handleTypingChange = useCallback((typing) => {
    if (sectionRef.current) {
      sectionRef.current.setAttribute('data-typing', typing ? 'true' : 'false')
      sectionRef.current.dispatchEvent(new CustomEvent('contact-typing', { detail: { isTyping: typing } }))
    }
  }, [])

  const handleTransmit = useCallback(() => {
    setContactSystemState('transmit')
  }, [])

  return (
    <section
      id="contact"
      ref={sectionRef}
      data-inview={isInViewRepeat ? 'true' : 'false'}
      className="relative min-h-screen overflow-hidden px-6 lg:px-0 pt-16 pb-12 md:pt-24 md:pb-16 group/section"
    >
      {/* Background Layers Stack (Top 1% Precision Engineering Visual System) */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
        {/* Layer 1: Master Base Foundation — Deep calibrated black with balanced ambient depth */}
        <div
          className="absolute inset-0 transition-colors duration-500"
          style={{
            background: 'radial-gradient(ellipse 120% 70% at 50% 50%, color-mix(in srgb, var(--accent) 3.8%, #090b12) 0%, color-mix(in srgb, var(--accent) 1.4%, #040508) 50%, #000103 100%)'
          }}
        />

        {/* Layer 2: Microscopic Anti-Banding Texture (Physical depth, eliminates flat gradient banding) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay'
          }}
        />

        {/* Layer 3: Ambient Depth Fields (Slow, deterministic, low-amplitude GPU atmospheric illumination) */}
        {!shouldReduceMotion && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Core transition field bridging interaction center */}
            <div
              className="absolute top-[12%] left-[28%] lg:left-[32%] w-[560px] h-[480px] rounded-full blur-[115px] will-change-transform anim-inview-pause"
              style={{
                background: 'radial-gradient(ellipse 70% 60% at 50% 50%, color-mix(in srgb, var(--accent) 8.0%, #0a0d16) 0%, color-mix(in srgb, var(--accent) 3.2%, #05060b) 48%, transparent 78%)',
                animation: 'voidDriftField1 85s ease-in-out infinite'
              }}
            />
            {/* Focal atmospheric field supporting the globe region */}
            <div
              className="absolute top-[16%] right-[-2%] lg:right-[2%] w-[500px] h-[500px] rounded-full blur-[110px] will-change-transform anim-inview-pause"
              style={{
                background: 'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--accent) 8.8%, #0b0e18) 0%, color-mix(in srgb, var(--accent) 3.2%, #05070d) 46%, transparent 74%)',
                animation: 'voidDriftField2 78s ease-in-out infinite'
              }}
            />
          </div>
        )}

        {/* Layer 4: Form-Side Quiet Zone Buffer (Preserves visual crispness & text contrast) */}
        <div
          className="absolute top-[20%] left-[0%] lg:left-[2%] w-[360px] h-[360px] lg:w-[400px] lg:h-[400px] rounded-full blur-[125px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 2.2%, #040508) 0%, #000103 62%, transparent 80%)',
            opacity: 'calc(0.28 * var(--ambient-intensity, 1))'
          }}
        />

        {/* Layer 5: Localized Globe Environmental Glow (Controlled secondary illumination) */}
        <div
          className="absolute top-[18%] right-[0%] lg:right-[6%] w-[380px] h-[380px] lg:w-[430px] lg:h-[430px] rounded-full blur-[96px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 11.5%, transparent) 0%, color-mix(in srgb, var(--accent) 3.2%, transparent) 40%, transparent 68%)',
            opacity: 'calc(0.26 * var(--ambient-intensity, 1))'
          }}
        />

        {/* Layer 7: Precision Engineering Reference Anchors (Restrained corner brackets) */}
        <div className="absolute inset-x-8 md:inset-x-16 top-12 bottom-10 pointer-events-none opacity-[0.065] hidden md:block">
          {/* Top-left corner bracket */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white" />
          {/* Top-right corner bracket */}
          <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white" />
          {/* Bottom-left corner bracket */}
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white" />
          {/* Bottom-right corner bracket */}
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white" />
        </div>

        {/* Layer 8: Spatial Peripheral Vignette (Natural edge falloff framing the composition) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 85% 72% at 52% 48%, transparent 48%, rgba(1, 2, 5, 0.39) 73%, #000103 100%), linear-gradient(to bottom, rgba(0, 1, 3, 0.72) 0%, transparent 16%, transparent 84%, rgba(0, 1, 3, 0.85) 100%)'
          }}
        />

        {/* Layer 9: Cursor-Driven Ambient Illumination (Interactive organic aura) */}
        {!shouldReduceMotion && (
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-500 opacity-0 group-hover/section:opacity-100"
            style={{
              background: 'radial-gradient(circle 420px at var(--mouse-x, 50%) var(--mouse-y, 50%), color-mix(in srgb, var(--accent) 8.0%, transparent) 0%, color-mix(in srgb, var(--accent) 2.0%, transparent) 50%, transparent 75%)',
              opacity: 'calc(0.22 * var(--ambient-intensity, 1))'
            }}
          />
        )}

        {/* Layer 10: Precision Boundary Highlights (Soft atmospheric falloff, no harsh concentrated hotspot) */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: 'linear-gradient(to right, transparent 15%, color-mix(in srgb, var(--accent) 18%, transparent) 35%, color-mix(in srgb, var(--accent) 28%, transparent) 50%, color-mix(in srgb, var(--accent) 18%, transparent) 65%, transparent 85%)'
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Zone 1: Hero */}
      <div className="mx-auto max-w-7xl px-6 md:px-12 relative z-10">
        <ContactHero />
      </div>

      {/* Zone 2: Interaction Area */}
      <div className="relative w-full mt-8 lg:mt-10">
        {/* Full-width backdrop wrapper for Left and Right PCB */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen pointer-events-none z-0 hidden lg:block">
          <LeftPCB isInView={isInViewRepeat} formRef={formContainerRef} globeRef={globeContainerRef} contactSystemState={contactSystemState} transmissionFailed={transmissionFailed} beamActive={isBeamActive} />
          <RightPCB isInView={isInViewRepeat} formRef={formContainerRef} globeRef={globeContainerRef} contactSystemState={contactSystemState} transmissionFailed={transmissionFailed} isMiddleActive={isMiddleActive} isRightActive={isRightActive} />
        </div>

        {/* Full-width flex container keeps the form and globe in their natural positions. */}
        <div className="w-full px-6 md:px-12 lg:px-0 relative z-10">
          <div className="relative flex flex-col lg:flex-row items-center justify-evenly w-full gap-12 lg:gap-0">
            {/* Form Container */}
            <div
              id="contact-form-container"
              ref={formContainerRef}
              className="w-full max-w-[474px] relative z-20 flex flex-col items-start lg:items-center lg:translate-x-20"
              style={{
                opacity: isFormActive ? 1 : 0.50,
                transform: 'translateY(0)',
                pointerEvents: 'auto',
                transition: 'opacity 700ms ease-out, transform 700ms ease-out'
              }}
            >
              <div className="w-full max-w-[474px]">
                <ContactForm
                  contactSystemState={contactSystemState}
                  onTransmit={handleTransmit}
                  setContactSystemState={setContactSystemState}
                  setTransmissionFailed={setTransmissionFailed}
                  onTypingChange={handleTypingChange}
                />
              </div>
            </div>
            {/* Globe Container */}
            <div className="flex items-center justify-center relative z-20 lg:translate-x-16">
              <div id="contact-globe-inner" ref={globeContainerRef} className="relative w-[300px] h-[300px] md:w-[380px] md:h-[380px] lg:w-[460px] lg:h-[460px] overflow-visible flex items-center justify-center pointer-events-none z-10">
                {/* Zone B: Globe Environment (Soft localized outer halo, softened edge & controlled spread) */}
                <div
                  className="absolute w-[280px] h-[280px] md:w-[350px] md:h-[350px] lg:w-[410px] lg:h-[410px] rounded-full blur-[58px] pointer-events-none -z-10"
                  style={{
                    background: 'radial-gradient(ellipse 65% 58% at 46% 52%, color-mix(in srgb, var(--accent) 12%, #0b0d18) 0%, color-mix(in srgb, var(--accent) 3.5%, transparent) 45%, transparent 68%)',
                    animation: shouldReduceMotion ? 'none' : 'globeAtmosphereBreathe 7.5s ease-in-out infinite',
                    opacity: 'calc(0.14 * var(--ambient-intensity, 1))'
                  }}
                />
                {/* Zone A: Globe Core (Strong crisp localized core illumination) */}
                <div
                  className="absolute w-[180px] h-[180px] md:w-[240px] md:h-[240px] lg:w-[295px] lg:h-[295px] rounded-full blur-[34px] pointer-events-none -z-10"
                  style={{
                    background: 'radial-gradient(circle, var(--accent) 0%, color-mix(in srgb, var(--accent) 28%, transparent) 34%, transparent 64%)',
                    animation: shouldReduceMotion ? 'none' : 'globeAtmosphereBreathe 7.5s ease-in-out infinite',
                    animationDelay: '-3.75s',
                    opacity: 'calc(0.22 * var(--ambient-intensity, 1))'
                  }}
                />
                <Contact3DObject isInView={isInViewRepeat} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zone 3: Cards */}
      <div className="mx-auto max-w-7xl px-6 md:px-12 relative z-10 mt-8 lg:mt-10">
        <ContactCards />
      </div>
    </section>
  )
})

