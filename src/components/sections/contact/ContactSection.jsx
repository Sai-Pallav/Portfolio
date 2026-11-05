import { useEffect, useRef, useState, memo, useCallback } from 'react'
import { useReducedMotion, useInView } from 'framer-motion'
import ContactHero from './ContactHero'
// import ContactForm from './ContactForm'
// import ContactCards from './ContactCards'
import Contact3DObject from './Contact3DObject'
// import LeftPCB from './LeftPCB'
// import RightPCB from './RightPCB'

export default memo(function ContactSection() {
  const [contactSystemState, setContactSystemState] = useState('dormant')
  const [transmissionFailed, setTransmissionFailed] = useState(false)
  const sectionRef = useRef(null)

  // Optimization: Tracks viewport intersection to toggle canvas & SVG animation state
  const isInViewRepeat = useInView(sectionRef, { margin: '200px 0px' })
  const shouldReduceMotion = useReducedMotion()

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

    const t1 = setTimeout(() => setOrchestrationStage('beam'), 2000)
    const t2 = setTimeout(() => setOrchestrationStage('form-active'), 4100)
    const t3 = setTimeout(() => setOrchestrationStage('middle-active'), 6500)
    const t4 = setTimeout(() => setOrchestrationStage('right-active'), 6500)

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
      className="relative isolate min-h-screen overflow-hidden px-6 lg:px-0 pt-16 pb-12 md:pt-24 md:pb-16 group/section"
    >
      {/* ═══════════════════════════════════════════════════════════
           ULTRA-REFINED BACKGROUND ATMOSPHERE SYSTEM
           Quiet luxury aesthetic: 90% dark obsidian foundation,
           soft atmospheric room fill, and restrained ambient accent light.
           ═══════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">

        {/* ── LAYER 1: DEEP OBSIDIAN FOUNDATION & GLOBAL FIELD ───────── */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              // Deep obsidian base — subtle radial pooling toward middle-bottom
              'radial-gradient(ellipse 160% 120% at 50% 55%, #08080c 0%, #050508 50%, #030304 100%)',
              // Wide global ambient fill — ultra-subtle room illumination matching active theme accent
              'radial-gradient(ellipse 200% 160% at 50% 40%, color-mix(in srgb, var(--accent) 3.5%, transparent) 0%, color-mix(in srgb, var(--accent) 1.2%, transparent) 40%, transparent 85%)'
            ].join(', ')
          }}
        />

        {/* ── LAYER 2: REGIONAL & ENVIRONMENT LIGHT WASH ──────────────── */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              // Zenith top illumination — illuminates system header row with theme glow
              'radial-gradient(ellipse 140% 50% at 50% 0%, color-mix(in srgb, var(--accent) 4.5%, transparent) 0%, color-mix(in srgb, var(--accent) 1.6%, transparent) 35%, transparent 70%)',
              // Globe focal region (Center) — soft ambient halo behind 3D object
              'radial-gradient(ellipse 80% 80% at 50% 50%, color-mix(in srgb, var(--accent) 4.2%, transparent) 0%, color-mix(in srgb, var(--accent-secondary) 1.5%, transparent) 45%, transparent 80%)'
            ].join(', ')
          }}
        />

        {/* ── LAYER 3: TOP SPECULAR CHAMFER & SPATIAL VIGNETTE ───────── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              // Top-zenith glass sheen bloom
              'radial-gradient(ellipse 120% 50% at 50% -2%, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.008) 35%, transparent 70%)',
              // Perimeter vignette — frames the section smoothly
              'radial-gradient(ellipse 110% 85% at 50% 46%, transparent 35%, rgba(0,0,0,0.22) 60%, rgba(0,0,0,0.60) 85%, rgba(0,0,0,0.85) 100%)'
            ].join(', ')
          }}
        />

        {/* ── LAYER 4: SECTION BOUNDARY ACCENT LINES ─────────────────── */}
        <div
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{
            background: 'linear-gradient(to right, transparent 8%, color-mix(in srgb, var(--accent) 14%, transparent) 30%, color-mix(in srgb, var(--accent) 26%, transparent) 50%, color-mix(in srgb, var(--accent) 14%, transparent) 70%, transparent 92%)'
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-px pointer-events-none bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

      </div>

      {/* Zone 1: Hero */}
      <div className="mx-auto max-w-7xl px-6 md:px-12 relative z-10">
        <ContactHero />
      </div>

      {/* Zone 2: Interaction Area */}
      <div className="relative w-full mt-8 lg:mt-10">
        {/* Full-width backdrop wrapper for Left and Right PCB (Disabled) */}
        {/*
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen pointer-events-none z-0 hidden lg:block">
          <LeftPCB isInView={isInViewRepeat} formRef={formContainerRef} globeRef={globeContainerRef} contactSystemState={contactSystemState} transmissionFailed={transmissionFailed} beamActive={isBeamActive} />
          <RightPCB isInView={isInViewRepeat} formRef={formContainerRef} globeRef={globeContainerRef} contactSystemState={contactSystemState} transmissionFailed={transmissionFailed} isMiddleActive={isMiddleActive} isRightActive={isRightActive} />
        </div>
        */}

        {/* Full-width flex container keeps the globe centered */}
        <div className="w-full px-6 md:px-12 lg:px-0 relative z-10 flex items-center justify-center">
          <div className="relative flex items-center justify-center w-full">
            {/* Form Container (Disabled) */}
            {/*
            <div
              id="contact-form-container"
              ref={formContainerRef}
              className="w-full max-w-[474px] relative z-20 flex flex-col items-start lg:items-center"
              style={{
                opacity: isFormActive ? 1 : 0.50,
                transform: 'translateY(0)',
                pointerEvents: 'auto',
                transition: 'opacity 500ms cubic-bezier(0.25, 1, 0.5, 1), transform 500ms cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            >
              <div className="w-full max-w-[474px]">
                <ContactForm
                  contactSystemState={contactSystemState}
                  onTransmit={handleTransmit}
                  setContactSystemState={setContactSystemState}
                  setTransmissionFailed={setTransmissionFailed}
                  onTypingChange={handleTypingChange}
                  isFormActive={isFormActive}
                />
              </div>
            </div>
            */}

            {/* Globe Container */}
            <div className="flex items-center justify-center relative z-20">
              <div id="contact-globe-inner" ref={globeContainerRef} className="relative w-[300px] h-[300px] md:w-[380px] md:h-[380px] lg:w-[460px] lg:h-[460px] overflow-visible flex items-center justify-center pointer-events-none z-10">
                {/* Zone B: Globe Environment (Soft localized outer halo, softened edge & controlled spread) */}
                <div
                  className="absolute w-[320px] h-[320px] md:w-[400px] md:h-[400px] lg:w-[460px] lg:h-[460px] rounded-full blur-[65px] pointer-events-none -z-10 transition-all duration-700 ease-out"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--accent) 28%, transparent) 0%, color-mix(in srgb, var(--accent-secondary) 10%, transparent) 45%, transparent 72%)',
                    animation: shouldReduceMotion ? 'none' : 'globeAtmosphereBreathe 7.5s ease-in-out infinite',
                    opacity: contactSystemState === 'transmit' ? 0.50 : 0.26,
                    transform: contactSystemState === 'transmit' ? 'scale(1.15) translateZ(0)' : 'scale(1) translateZ(0)',
                    willChange: 'opacity, transform'
                  }}
                />
                {/* Zone A: Globe Core (Strong crisp localized core illumination) */}
                <div
                  className="absolute w-[200px] h-[200px] md:w-[260px] md:h-[260px] lg:w-[320px] lg:h-[320px] rounded-full blur-[38px] pointer-events-none -z-10 transition-all duration-700 ease-out"
                  style={{
                    background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 45%, #ffffff 12%) 0%, color-mix(in srgb, var(--accent) 20%, transparent) 38%, transparent 68%)',
                    animation: shouldReduceMotion ? 'none' : 'globeAtmosphereBreathe 7.5s ease-in-out infinite',
                    animationDelay: '-3.75s',
                    opacity: contactSystemState === 'transmit' ? 0.60 : 0.30,
                    transform: contactSystemState === 'transmit' ? 'scale(1.2) translateZ(0)' : 'scale(1) translateZ(0)',
                    willChange: 'opacity, transform'
                  }}
                />
                <Contact3DObject isInView={isInViewRepeat} contactSystemState={contactSystemState} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zone 3: Cards (Disabled) */}
      {/*
      <div className="mx-auto max-w-7xl px-6 md:px-12 relative z-10 mt-8 lg:mt-10">
        <ContactCards />
      </div>
      */}
    </section>
  )
})

