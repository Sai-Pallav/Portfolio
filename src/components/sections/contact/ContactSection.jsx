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
      className="relative isolate min-h-screen overflow-hidden px-6 lg:px-0 pt-16 pb-12 md:pt-24 md:pb-16 group/section"
    >
      {/* ═══════════════════════════════════════════════════════════
           BACKGROUND ATMOSPHERE SYSTEM — Full-bleed, zero-seam
           10 precision layers | Inverse-square optical scattering
           Theme-adaptive via CSS custom properties
           ═══════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">

        {/* ── LAYER 1: SURFACE FOUNDATION ──────────────────────────────
             Deep obsidian base with gentle surface curvature warmth.
             Centered at 65% Y so it slightly pools toward the middle-lower
             region rather than washing the entire top flat black.        */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              // Primary dark base — pools toward center-bottom, gentle curvature
              'radial-gradient(ellipse 180% 130% at 50% 60%, color-mix(in srgb, var(--bg-surface) 40%, var(--bg)) 0%, color-mix(in srgb, var(--bg-surface) 16%, var(--bg)) 44%, var(--bg) 82%)',
              // Top-left corner lift — saves the PCB/heading area from going void
              'radial-gradient(ellipse 95% 55% at 4% 18%, color-mix(in srgb, var(--bg-surface) 32%, transparent) 0%, color-mix(in srgb, var(--bg-surface) 12%, transparent) 48%, transparent 72%)',
              // Top-right corner lift — mirrors left, balances the composition
              'radial-gradient(ellipse 75% 50% at 98% 14%, color-mix(in srgb, var(--bg-surface) 28%, transparent) 0%, color-mix(in srgb, var(--bg-surface) 10%, transparent) 50%, transparent 72%)',
              // Bottom-left lift — bridges cards left edge
              'radial-gradient(ellipse 65% 40% at 2% 90%, color-mix(in srgb, var(--bg-surface) 22%, transparent) 0%, transparent 58%)'
            ].join(', ')
          }}
        />

        {/* ── LAYER 2: WIDE ATMOSPHERIC FIELD ─────────────────────────
             The largest layer — blankets the entire section with a very
             low-opacity continuous atmospheric tint. This is what prevents
             any zone from going totally void/black between focal regions.
             Think of this as "room fill light" in studio photography.     */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              // Dominant wide-field tint — large enough to reach far corners
              'radial-gradient(ellipse 220% 180% at 50% 42%, color-mix(in srgb, var(--accent) 2.4%, transparent) 0%, color-mix(in srgb, var(--accent) 1.4%, transparent) 28%, color-mix(in srgb, var(--accent) 0.6%, transparent) 58%, color-mix(in srgb, var(--accent) 0.2%, transparent) 75%, transparent 90%)',
              // Secondary-hue chromatic wash from upper-right
              'radial-gradient(ellipse 150% 120% at 75% 48%, color-mix(in srgb, var(--accent-secondary, var(--accent)) 1.6%, transparent) 0%, color-mix(in srgb, var(--accent-secondary, var(--accent)) 0.6%, transparent) 42%, transparent 72%)',
              // Warmth anchor at bottom — cards area atmospheric floor
              'radial-gradient(ellipse 180% 70% at 50% 100%, color-mix(in srgb, var(--accent) 1.6%, transparent) 0%, color-mix(in srgb, var(--accent) 0.6%, transparent) 45%, color-mix(in srgb, var(--accent) 0.2%, transparent) 68%, transparent 85%)',
              // Top-corner atmospheric mist — very diffuse, covers both top corners
              'radial-gradient(ellipse 240% 50% at 50% -8%, color-mix(in srgb, var(--accent) 1.4%, transparent) 0%, color-mix(in srgb, var(--accent) 0.5%, transparent) 40%, transparent 72%)'
            ].join(', ')
          }}
        />

        {/* ── LAYER 3: VERTICAL LIGHTING SPINE ────────────────────────
             Flows from top to bottom as a gentle ribbon of light through
             the vertical center. Creates the sense that there is a light
             source above the section casting down through it.            */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              // Top zenith — expanded width to spread across the full heading row
              'radial-gradient(ellipse 150% 52% at 48% 0%, color-mix(in srgb, var(--accent) 3.5%, transparent) 0%, color-mix(in srgb, var(--accent) 1.8%, transparent) 30%, color-mix(in srgb, var(--accent) 0.6%, transparent) 55%, transparent 75%)',
              // Upper-left angled source — specifically illuminates the "Engineering" text area
              'radial-gradient(ellipse 80% 42% at 18% 8%, color-mix(in srgb, var(--accent) 2.4%, transparent) 0%, color-mix(in srgb, var(--accent) 1.0%, transparent) 38%, color-mix(in srgb, var(--accent) 0.3%, transparent) 62%, transparent 78%)',
              // Diagonal cascade — flows from upper-left toward lower-right, creates directional depth
              'radial-gradient(ellipse 85% 65% at 32% 30%, color-mix(in srgb, var(--accent) 1.6%, transparent) 0%, color-mix(in srgb, var(--accent) 0.6%, transparent) 42%, transparent 68%)',
              // Mid-spine bridge — connects top glow to middle content
              'radial-gradient(ellipse 90% 38% at 50% 38%, color-mix(in srgb, var(--accent) 2.8%, transparent) 0%, color-mix(in srgb, var(--accent) 1.2%, transparent) 38%, color-mix(in srgb, var(--accent) 0.3%, transparent) 62%, transparent 78%)',
              // Lower-spine — connects form/globe row to cards zone
              'radial-gradient(ellipse 120% 42% at 50% 76%, color-mix(in srgb, var(--accent) 2.0%, transparent) 0%, color-mix(in srgb, var(--accent) 0.8%, transparent) 42%, color-mix(in srgb, var(--accent) 0.2%, transparent) 65%, transparent 82%)'
            ].join(', ')
          }}
        />

        {/* ── LAYER 4: LATERAL ENVIRONMENTAL BEDS ─────────────────────
             Left-side and right-side regional fields that ensure the
             form area (left) and globe area (right) both have proper
             environmental support — not just the center spine.          */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              // LEFT BED: Form-side ambient field — extended vertically to reach top-left
              'radial-gradient(ellipse 75% 95% at 16% 44%, color-mix(in srgb, var(--accent) 2.6%, transparent) 0%, color-mix(in srgb, var(--accent) 1.1%, transparent) 35%, color-mix(in srgb, var(--accent) 0.3%, transparent) 58%, transparent 78%)',
              // FAR-LEFT EDGE: Thin atmospheric haze for the very left PCB rail
              'radial-gradient(ellipse 38% 100% at 0% 50%, color-mix(in srgb, var(--accent) 1.6%, transparent) 0%, color-mix(in srgb, var(--accent) 0.5%, transparent) 45%, transparent 72%)',
              // LEFT-CENTER: Transition band between form and center
              'radial-gradient(ellipse 58% 70% at 36% 50%, color-mix(in srgb, var(--accent) 1.8%, transparent) 0%, color-mix(in srgb, var(--accent) 0.6%, transparent) 42%, transparent 70%)',
              // RIGHT-CENTER: Transition band between center and globe
              'radial-gradient(ellipse 58% 70% at 64% 50%, color-mix(in srgb, var(--accent-secondary, var(--accent)) 2.2%, transparent) 0%, color-mix(in srgb, var(--accent) 0.8%, transparent) 42%, transparent 70%)',
              // RIGHT BED: Globe-side ambient field — extended vertically to reach top-right
              'radial-gradient(ellipse 75% 95% at 84% 44%, color-mix(in srgb, var(--accent-secondary, var(--accent)) 2.8%, transparent) 0%, color-mix(in srgb, var(--accent) 1.2%, transparent) 35%, color-mix(in srgb, var(--accent) 0.3%, transparent) 58%, transparent 78%)',
              // FAR-RIGHT EDGE: Thin atmospheric haze for the very right PCB rail
              'radial-gradient(ellipse 38% 100% at 100% 50%, color-mix(in srgb, var(--accent-secondary, var(--accent)) 1.5%, transparent) 0%, color-mix(in srgb, var(--accent) 0.4%, transparent) 48%, transparent 72%)'
            ].join(', ')
          }}
        />

        {/* ── LAYER 5: FOCAL POINT ANCHORS ─────────────────────────────
             Restrained precision anchors for the two main content objects.
             Globe (right) gets slightly more intensity as it is a 3D
             lit object. Form (left) gets a softer diffuse halo.
             Both decay smoothly so they integrate with the field layers. */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              // Globe focal anchor — multi-stop inverse-square decay
              'radial-gradient(circle 420px at 67% 47%, color-mix(in srgb, var(--accent-secondary, var(--accent)) 4.0%, transparent) 0%, color-mix(in srgb, var(--accent) 2.0%, transparent) 28%, color-mix(in srgb, var(--accent) 0.8%, transparent) 52%, color-mix(in srgb, var(--accent) 0.2%, transparent) 72%, transparent 90%)',
              // Form focal anchor — broader, softer, lower intensity
              'radial-gradient(circle 380px at 33% 47%, color-mix(in srgb, var(--accent) 2.6%, transparent) 0%, color-mix(in srgb, var(--accent) 1.2%, transparent) 30%, color-mix(in srgb, var(--accent) 0.4%, transparent) 55%, transparent 75%, transparent 92%)',
              // Cards-row focal softbox — very broad, low-intensity base
              'radial-gradient(ellipse 140% 35% at 50% 84%, color-mix(in srgb, var(--accent) 1.6%, transparent) 0%, color-mix(in srgb, var(--accent) 0.5%, transparent) 42%, transparent 70%)'
            ].join(', ')
          }}
        />

        {/* ── LAYER 6: STUDIO TOP-ZENITH SHEEN ─────────────────────────
             Matte glass specular simulation: a very faint neutral-white
             reflective bloom at the very top center, as if a soft box
             is positioned just above. Adds perceived surface quality.   */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 120% 55% at 50% -2%, rgba(255,255,255,0.030) 0%, rgba(255,255,255,0.012) 30%, rgba(255,255,255,0.003) 55%, transparent 72%)'
          }}
        />

        {/* ── LAYER 7: SPATIAL VIGNETTE ─────────────────────────────────
             Soft perimeter darkening. The gradient starts at 45% from
             center so most of the content area stays open and illuminated.
             The corners darken smoothly to frame the content.            */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 112% 88% at 50% 46%, transparent 38%, rgba(0,0,0,0.16) 62%, rgba(0,0,0,0.44) 82%, rgba(0,0,0,0.72) 100%)'
          }}
        />

        {/* ── LAYER 8: ANTI-BANDING MICRO-GRAIN ────────────────────────
             Fractal noise overlay at ultra-low opacity breaks up any
             visible gradient banding on 8-bit monitors. overlay blend
             mode means it brightens lights and darkens darks, adding
             micro-texture depth without visible graininess.             */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
            backgroundSize: '256px 256px',
            opacity: 0.028,
            mixBlendMode: 'overlay'
          }}
        />

        {/* ── LAYER 9: CURSOR-REACTIVE GLOW ────────────────────────────
             Smooth 500px aura follows the mouse. Fades in on hover
             using group-hover. Adds a sense of material responsiveness. */}
        {!shouldReduceMotion && (
          <div
            className="pointer-events-none absolute inset-0 opacity-0 group-hover/section:opacity-100"
            style={{
              background: 'radial-gradient(circle 500px at var(--mouse-x, 50%) var(--mouse-y, 50%), color-mix(in srgb, var(--accent) 2.5%, transparent) 0%, color-mix(in srgb, var(--accent) 0.8%, transparent) 40%, transparent 70%)',
              transition: 'opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)'
            }}
          />
        )}

        {/* ── LAYER 10: SECTION BOUNDARY CHAMFERS ──────────────────────
             Hairline top accent — marks the section entrance.
             Bottom uses the standard border token for consistency.      */}
        <div
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{
            background: 'linear-gradient(to right, transparent 8%, color-mix(in srgb, var(--accent) 10%, transparent) 28%, color-mix(in srgb, var(--accent) 20%, transparent) 50%, color-mix(in srgb, var(--accent) 10%, transparent) 72%, transparent 92%)'
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-px pointer-events-none bg-gradient-to-r from-transparent via-border to-transparent" />

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

