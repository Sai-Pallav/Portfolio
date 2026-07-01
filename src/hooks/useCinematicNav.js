import { useCallback, useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* ── Animation tuning ────────────────────────────────────────────── */

const ADJACENT_DURATION = 1.2       // Lenis scroll time for ±1 sections
const EXIT_DURATION     = 0.3       // Phase 1: blur-fade-out
const ENTER_DURATION    = 0.45      // Phase 4: rack-focus-in
const SLIDE_OFFSET      = 20        // directional slide distance (px)
const BLUR_MAX          = 12        // peak blur radius (px)


/**
 * Smooth cubic ease-in-out for Lenis adjacent scrolling.
 * cubic-bezier(0.65, 0, 0.35, 1)
 */
const cubicInOut = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/* ── Geometry helpers ────────────────────────────────────────────── */

/** Absolute scroll-Y of an element (call BEFORE any GSAP transforms). */
function getAbsoluteTop(el) {
  return el.getBoundingClientRect().top + window.scrollY
}

/** Current section index based on viewport center vs section tops. */
function getCurrentSectionIndex(navItems) {
  const center = window.scrollY + window.innerHeight / 2
  let best = 0
  for (let i = 0; i < navItems.length; i++) {
    const el = document.querySelector(navItems[i].href)
    if (!el) continue
    if (getAbsoluteTop(el) <= center) best = i
  }
  return best
}



/* ── Accessibility ───────────────────────────────────────────────── */

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ── Hook ────────────────────────────────────────────────────────── */

/**
 * Premium cinematic navigation hook.
 *
 * • Adjacent (±1): Lenis smooth scroll with weighted cubic easing.
 * • Non-adjacent (≥2): 5-phase cinematic warp — directional blur
 *   rack-focus with accent progress bar.
 *
 * Integrates with global `window.lenis` from SmoothScroll.jsx.
 * Respects `prefers-reduced-motion`.
 */
export function useCinematicNav(navItems) {
  const isAnimatingRef      = useRef(false)
  const activeTweenRef      = useRef(null)

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      activeTweenRef.current?.kill()
      activeTweenRef.current = null

      const mainEl = document.getElementById('main-content')
      if (mainEl) {
        gsap.set(mainEl, { clearProps: 'all' })
        mainEl.style.filter = ''
      }



      isAnimatingRef.current = false
    }
  }, [])

  const handleNavClick = useCallback(
    (e, href) => {
      e.preventDefault()
      if (isAnimatingRef.current) return

      const target = document.querySelector(href)
      if (!target) return

      const lenis = window.lenis

      /* ── Reduced motion → instant jump ── */
      if (prefersReducedMotion()) {
        if (lenis) lenis.scrollTo(target, { immediate: true })
        else target.scrollIntoView({ behavior: 'auto' })
        return
      }

      /* ── Adjacency check ── */
      const currentIdx  = getCurrentSectionIndex(navItems)
      const targetIdx   = navItems.findIndex((n) => n.href === href)
      if (targetIdx === -1) return
      const distance = Math.abs(targetIdx - currentIdx)

      /* ── MODE A: Adjacent (±1) — Lenis smooth scroll ── */
      if (distance <= 1) {
        if (lenis) {
          lenis.scrollTo(target, {
            duration: ADJACENT_DURATION,
            easing:   cubicInOut,
          })
        } else {
          target.scrollIntoView({ behavior: 'smooth' })
        }
        return
      }

      /* ── MODE B: Non-adjacent — cinematic warp ── */
      const mainEl = document.getElementById('main-content')
      if (!mainEl) {
        if (lenis) lenis.scrollTo(target, { immediate: true })
        else target.scrollIntoView({ behavior: 'auto' })
        return
      }

      // Lock
      isAnimatingRef.current = true

      // Direction from geometry (BEFORE transforms)
      const targetScrollY = getAbsoluteTop(target)
      const isGoingDown   = targetScrollY > window.scrollY
      const exitY  = isGoingDown ? -SLIDE_OFFSET : SLIDE_OFFSET
      const enterY = isGoingDown ?  SLIDE_OFFSET : -SLIDE_OFFSET

      // Kill previous
      activeTweenRef.current?.kill()

      // Pause Lenis
      if (lenis) lenis.stop()



      /* ── Phase 1: Blur & Fade Exit ── */
      activeTweenRef.current = gsap.to(mainEl, {
        y:        exitY,
        opacity:  0,
        duration: EXIT_DURATION,
        ease:     'power2.inOut',
        force3D:  true,
        onUpdate() {
          const p = this.progress()
          mainEl.style.filter = `blur(${p * BLUR_MAX}px)`
        },
        onComplete() {
          /* ── Phase 2: Teleport ── */
          gsap.set(mainEl, { clearProps: 'transform,y' })
          mainEl.style.filter = `blur(${BLUR_MAX}px)`
          window.scrollTo(0, targetScrollY)

          /* ── Phase 3: Entry setup ── */
          gsap.set(mainEl, {
            y:       enterY,
            opacity: 0,
            force3D: true,
          })

          requestAnimationFrame(() => {
            /* ── Phase 4: Rack-Focus Entry ── */
            activeTweenRef.current = gsap.to(mainEl, {
              y:        0,
              opacity:  1,
              duration: ENTER_DURATION,
              ease:     'power2.out',
              force3D:  true,
              onUpdate() {
                const p = this.progress()
                mainEl.style.filter = `blur(${BLUR_MAX * (1 - p)}px)`
              },
              onComplete() {
                /* ── Phase 5: Cleanup ── */
                gsap.set(mainEl, { clearProps: 'all' })
                mainEl.style.filter = ''

                if (lenis) lenis.start()
                ScrollTrigger.refresh()

                isAnimatingRef.current  = false
                activeTweenRef.current  = null
              },
            })
          })
        },
      })
    },
    [navItems],
  )

  return handleNavClick
}
