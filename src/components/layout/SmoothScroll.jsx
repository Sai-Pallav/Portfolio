import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Smooth scroll wrapper using Lenis.
 *
 * - Single Lenis instance, exposed globally as `window.lenis`
 * - GSAP drives the RAF loop (autoRaf: false) so Lenis and
 *   ScrollTrigger stay perfectly synchronized on every frame.
 * - Lenis scroll events feed ScrollTrigger.update for accurate
 *   trigger position tracking.
 */
function SmoothScroll({ children }) {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    })

    // Expose globally so other modules (useCinematicNav, BackToTop, etc.)
    // can call lenis.scrollTo / lenis.stop / lenis.start directly.
    window.lenis = lenis

    // Pipe every Lenis scroll frame into ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update)
    ScrollTrigger.refresh()

    // Let GSAP's ticker drive Lenis instead of a separate rAF loop.
    // This guarantees both systems read the same timestamp.
    const tickerCallback = (time) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(tickerCallback)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tickerCallback)
      lenis.destroy()
      window.lenis = null
      ScrollTrigger.refresh()
    }
  }, [])

  return <>{children}</>
}

export default SmoothScroll
