import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Smooth scroll wrapper using Lenis.
 * Syncs with GSAP ScrollTrigger so scroll-driven animations stay accurate.
 */
function SmoothScroll({ children }) {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    })

    window.lenis = lenis

    lenis.on('scroll', ScrollTrigger.update)
    ScrollTrigger.refresh()

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
