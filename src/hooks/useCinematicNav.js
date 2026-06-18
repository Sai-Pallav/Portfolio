import { useCallback, useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* ── Animation constants ─────────────────────────────────────────── */

const ADJACENT_SCROLL_DURATION = 1.5
const EXIT_DURATION = 0.3
const ENTER_DURATION = 0.45
const WARP_OFFSET = 60 // pixels of directional displacement

/**
 * Custom cubic ease-in-out for Lenis adjacent scrolling.
 * Equivalent to cubic-bezier(0.65, 0, 0.35, 1).
 */
const cubicInOut = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/* ── Geometry helpers ────────────────────────────────────────────── */

/**
 * Returns the absolute scroll-Y offset of a DOM element.
 * Uses getBoundingClientRect for accuracy across all layouts.
 * MUST be called before any GSAP transforms are applied to ancestors.
 */
function getAbsoluteTop(element) {
  return element.getBoundingClientRect().top + window.scrollY
}

/**
 * Determines which section the user is currently viewing based on
 * pure page geometry (not React state). Finds the section whose
 * absolute top is closest to (but not past) the viewport center.
 */
function getCurrentSectionIndex(navItems) {
  const viewportCenter = window.scrollY + window.innerHeight / 2
  let bestIndex = 0

  for (let i = 0; i < navItems.length; i++) {
    const el = document.querySelector(navItems[i].href)
    if (!el) continue
    if (getAbsoluteTop(el) <= viewportCenter) {
      bestIndex = i
    }
  }

  return bestIndex
}

/* ── Hook ────────────────────────────────────────────────────────── */

/**
 * Cinematic navigation hook.
 *
 * Returns a stable `handleNavClick(e, href)` callback for use in
 * Navbar and other navigation components.
 *
 * Two modes:
 *   Mode A — Adjacent sections (≤1 apart): Lenis smooth scroll
 *   Mode B — Non-adjacent sections: 5-phase GSAP warp transition
 *
 * Direction is always calculated from page geometry, never from
 * React state, so it is immune to stale closures and delayed renders.
 *
 * @param {Array<{label: string, href: string}>} navItems
 *   Ordered array of navigation items matching the page section order.
 */
export function useCinematicNav(navItems) {
  const isAnimatingRef = useRef(false)
  const activeTweenRef = useRef(null)

  // Cleanup on unmount: kill any running animation, restore DOM
  useEffect(() => {
    return () => {
      if (activeTweenRef.current) {
        activeTweenRef.current.kill()
        activeTweenRef.current = null
      }
      const mainEl = document.getElementById('main-content')
      if (mainEl) {
        gsap.set(mainEl, { clearProps: 'all' })
      }
      isAnimatingRef.current = false
    }
  }, [])

  const handleNavClick = useCallback(
    (e, href) => {
      e.preventDefault()

      // ── Safety: block overlapping transitions ──
      if (isAnimatingRef.current) return

      const target = document.querySelector(href)
      if (!target) return

      const lenis = window.lenis

      // ── Determine adjacency from geometry ──
      const currentIndex = getCurrentSectionIndex(navItems)
      const targetIndex = navItems.findIndex((item) => item.href === href)
      if (targetIndex === -1) return

      // ── Teleport/Warp Transition for all sections ──

      /* ────────────────────────────────────────────────────────
         MODE B — Non-adjacent: 5-phase cinematic warp
      ──────────────────────────────────────────────────────── */
      const mainEl = document.getElementById('main-content')
      if (!mainEl) {
        // Fallback: instant scroll if #main-content is missing
        if (lenis) {
          lenis.scrollTo(target, { immediate: true })
        } else {
          target.scrollIntoView({ behavior: 'auto' })
        }
        return
      }

      // Lock navigation
      isAnimatingRef.current = true

      // ── Direction from geometry ──
      // CRITICAL: Calculate BEFORE any transforms are applied.
      // GSAP transforms on #main-content would contaminate
      // getBoundingClientRect, giving wrong coordinates.
      const targetScrollY = getAbsoluteTop(target)
      const currentScroll = window.scrollY
      const isGoingDown = targetScrollY > currentScroll

      // Direction-correct offsets (inverted for natural page sliding):
      //   Going DOWN → content exits upward (-Y), enters from below (+Y)
      //   Going UP   → content exits downward (+Y), enters from above (-Y)
      const exitY = isGoingDown ? -WARP_OFFSET : WARP_OFFSET
      const enterY = isGoingDown ? WARP_OFFSET : -WARP_OFFSET

      // Kill any leftover tween from a previous navigation
      if (activeTweenRef.current) {
        activeTweenRef.current.kill()
      }

      // Pause Lenis to prevent scroll momentum from fighting the warp
      if (lenis) lenis.stop()

      // ── Phase 1: Exit ──
      activeTweenRef.current = gsap.to(mainEl, {
        y: exitY,
        scale: 0.98,
        opacity: 0,
        duration: EXIT_DURATION,
        ease: 'power3.inOut',
        force3D: true,
        onComplete: () => {
          // ── Phase 2: Teleport ──
          // Clear ALL transforms before scrolling so coordinates are clean
          gsap.set(mainEl, { clearProps: 'transform,scale,y' })

          // Instant scroll to pre-calculated pixel offset.
          // Use window.scrollTo directly — Lenis is stopped and would
          // silently reject lenis.scrollTo(). The raw browser API always
          // works. Lenis re-syncs when start() is called in Phase 5.
          window.scrollTo(0, targetScrollY)

          // ── Phase 3: Entry setup ──
          // Position content at the entry offset (still invisible from Phase 1)
          gsap.set(mainEl, {
            y: enterY,
            scale: 0.98,
            opacity: 0,
            force3D: true,
          })

          // Wait one frame so the browser has committed the scroll
          // position before we start the entry animation
          requestAnimationFrame(() => {
            // ── Phase 4: Enter ──
            activeTweenRef.current = gsap.to(mainEl, {
              y: 0,
              scale: 1,
              opacity: 1,
              duration: ENTER_DURATION,
              ease: 'power3.out',
              force3D: true,
              onComplete: () => {
                // ── Phase 5: Cleanup ──
                // Remove ALL temporary GSAP props so the DOM is pristine
                gsap.set(mainEl, { clearProps: 'all' })

                // Resume Lenis (re-enables wheel/touch scrolling)
                if (lenis) lenis.start()

                // Safe to refresh now — no transforms are active
                ScrollTrigger.refresh()

                // Unlock navigation
                isAnimatingRef.current = false
                activeTweenRef.current = null
              },
            })
          })
        },
      })
    },
    [navItems]
  )

  return handleNavClick
}
