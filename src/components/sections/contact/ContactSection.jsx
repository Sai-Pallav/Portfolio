import { useEffect, useRef, useState, memo, useCallback } from 'react'
import { useReducedMotion, useInView, motion } from 'framer-motion'
import ContactHero from './ContactHero'
import ContactForm from './ContactForm'
import ContactCards from './ContactCards'
import Contact3DObject from './Contact3DObject'
import LeftPCB from './LeftPCB'
import RightPCB from './RightPCB'

export default memo(function ContactSection() {
  const [contactSystemState, setContactSystemState] = useState('dormant')
  const [transmissionFailed, setTransmissionFailed] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [formProgress, setFormProgress] = useState(0)
  const sectionRef = useRef(null)

  // Optimization: Tracks viewport intersection to toggle canvas animation state
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

  const handleTypingChange = useCallback((typing) => {
    setIsTyping(typing)
    if (sectionRef.current) {
      sectionRef.current.setAttribute('data-typing', typing ? 'true' : 'false')
      sectionRef.current.dispatchEvent(new CustomEvent('contact-typing', { detail: { isTyping: typing } }))
    }
  }, [])

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden px-6 lg:px-0 pt-16 pb-24 md:pt-24 md:pb-32 group/section"
    >
      {/* Background Layers Stack (God-Tier Ambient Atmosphere System) */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Layer 1: Base Canvas with deep obsidian foundation */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#010204] via-bg to-[#010204] transition-colors duration-500" />

        {/* Layer 1b: Low-Frequency Animated Grain Overlay (kills flat-gradient banding without visual noise) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.032]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay'
          }}
        />

        {/* Layer 1c: Deep Drifting Color Fields (75s - 85s slow organic drift biased toward center-right transition) */}
        {!shouldReduceMotion && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Transition field bridging PCB to Globe in center-right */}
            <div
              className="absolute top-[16%] left-[32%] lg:left-[38%] w-[560px] h-[500px] rounded-full blur-[130px] will-change-transform"
              style={{
                background: 'radial-gradient(ellipse 65% 55% at 52% 48%, var(--accent-dim) 0%, rgba(12,6,28,0.32) 48%, transparent 70%)',
                animation: 'voidDriftField1 80s ease-in-out infinite',
                opacity: 'calc(0.32 * var(--ambient-intensity, 1))'
              }}
            />
            {/* Globe environment field in upper-right */}
            <div
              className="absolute top-[22%] right-[-4%] lg:right-[0%] w-[540px] h-[540px] rounded-full blur-[140px] will-change-transform"
              style={{
                background: 'radial-gradient(circle, var(--accent-secondary, var(--accent-dim)) 0%, rgba(10,5,24,0.28) 50%, transparent 72%)',
                animation: 'voidDriftField2 75s ease-in-out infinite',
                opacity: 'calc(0.26 * var(--ambient-intensity, 1))'
              }}
            />
          </div>
        )}

        {/* Layer 2: Left-side localized environmental field (restrained to protect the form and maintain dark buffer) */}
        <div className="absolute top-[22%] left-[0%] lg:left-[2%] w-[360px] h-[360px] lg:w-[400px] lg:h-[400px] rounded-full blur-[120px] pointer-events-none" style={{ background: 'var(--gradient-glow)', opacity: 'calc(0.035 * var(--ambient-intensity, 1))' }} />

        {/* Layer 3: Controlled globe environmental illumination (supporting the 3-zone depth structure) */}
        <div className="absolute top-[20%] right-[2%] lg:right-[8%] w-[420px] h-[420px] lg:w-[500px] lg:h-[500px] rounded-full blur-[110px] pointer-events-none" style={{ background: 'var(--gradient-glow)', opacity: 'calc(0.09 * var(--ambient-intensity, 1))' }} />

        {/* Layer 4: Soft ambient accent glow supporting the lower foundation */}
        <div className="absolute bottom-[-6%] left-[18%] w-[350px] h-[350px] lg:w-[400px] lg:h-[400px] rounded-full blur-[120px] pointer-events-none" style={{ background: 'var(--gradient-glow)', opacity: 'calc(0.035 * var(--ambient-intensity, 1))' }} />

        {/* Layer 5: Tightened multi-stop elliptical vignette for rich natural perimeter falloff */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_75%_at_50%_48%,transparent_28%,rgba(1,2,5,0.45)_60%,rgba(0,1,3,0.92)_100%)] pointer-events-none" />

        {/* Layer 6: Volumetric Atmospheric Float */}
        {!shouldReduceMotion && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-14">
            <motion.div
              animate={{
                x: [0, 20, -10, 0],
                y: [0, -15, 10, 0],
              }}
              transition={{
                duration: 28,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute top-1/4 left-1/4 w-[280px] h-[200px] rounded-full blur-[95px] will-change-transform"
              style={{ background: 'var(--gradient-glow)', opacity: 'calc(0.06 * var(--ambient-intensity, 1))' }}
            />
            <motion.div
              animate={{
                x: [0, -20, 20, 0],
                y: [0, 20, -15, 0],
              }}
              transition={{
                duration: 32,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: -5
              }}
              className="absolute top-1/2 right-1/4 w-[300px] h-[220px] rounded-full blur-[105px] will-change-transform"
              style={{ background: 'var(--gradient-glow)', opacity: 'calc(0.06 * var(--ambient-intensity, 1))' }}
            />
          </div>
        )}

        {/* Layer 7: Cursor-driven ambient mouse light */}
        {!shouldReduceMotion && (
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-300 opacity-0 group-hover/section:opacity-100"
            style={{
              background: 'var(--gradient-glow)',
              opacity: 'calc(0.035 * var(--ambient-intensity, 1))'
            }}
          />
        )}

        {/* Layer 8: Spatially Controlled Technical Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.020)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.020)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_65%_at_56%_48%,black_0%,rgba(0,0,0,0.80)_22%,rgba(0,0,0,0.38)_50%,rgba(0,0,0,0.12)_72%,transparent_90%)] pointer-events-none" />

        {/* Layer 11: Linear divider highlights */}
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--accent) 50%, transparent)' }} />
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
          <LeftPCB isInView={isInViewRepeat} formRef={formContainerRef} globeRef={globeContainerRef} contactSystemState={contactSystemState} transmissionFailed={transmissionFailed} isTyping={isTyping} formProgress={formProgress} beamActive={isBeamActive} />
          <RightPCB isInView={isInViewRepeat} formRef={formContainerRef} globeRef={globeContainerRef} contactSystemState={contactSystemState} transmissionFailed={transmissionFailed} formProgress={formProgress} isTyping={isTyping} isMiddleActive={isMiddleActive} isRightActive={isRightActive} />
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
                  onTransmit={() => setContactSystemState('transmit')}
                  setContactSystemState={setContactSystemState}
                  setTransmissionFailed={setTransmissionFailed}
                  onTypingChange={handleTypingChange}
                  setFormProgress={setFormProgress}
                />
              </div>
            </div>
            {/* Globe Container */}
            <div className="flex items-center justify-center relative z-20 lg:translate-x-16">
              <div id="contact-globe-inner" ref={globeContainerRef} className="relative w-[300px] h-[300px] md:w-[380px] md:h-[380px] lg:w-[460px] lg:h-[460px] overflow-visible flex items-center justify-center pointer-events-none z-10">
                {/* Zone B: Globe Environment (Medium-strength asymmetrical atmospheric field extending toward PCB transition) */}
                <div
                  className="absolute w-[320px] h-[320px] md:w-[420px] md:h-[420px] lg:w-[500px] lg:h-[500px] rounded-full blur-[64px] pointer-events-none -z-10"
                  style={{
                    background: 'radial-gradient(ellipse 65% 58% at 46% 52%, var(--accent-dim) 0%, rgba(12,6,28,0.30) 46%, transparent 72%)',
                    animation: shouldReduceMotion ? 'none' : 'globeAtmosphereBreathe 7.5s ease-in-out infinite',
                    opacity: 'calc(0.17 * var(--ambient-intensity, 1))'
                  }}
                />
                {/* Zone A: Globe Core (Strong localized illumination immediately behind globe, rapid dark falloff) */}
                <div
                  className="absolute w-[190px] h-[190px] md:w-[250px] md:h-[250px] lg:w-[310px] lg:h-[310px] rounded-full blur-[36px] pointer-events-none -z-10"
                  style={{
                    background: 'radial-gradient(circle, var(--accent) 0%, rgba(168, 85, 247, 0.40) 35%, transparent 68%)',
                    animation: shouldReduceMotion ? 'none' : 'globeAtmosphereBreathe 7.5s ease-in-out infinite',
                    animationDelay: '-3.75s',
                    opacity: 'calc(0.22 * var(--ambient-intensity, 1))'
                  }}
                />
                <Contact3DObject isInView={isInViewRepeat} contactSystemState={contactSystemState} />
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
