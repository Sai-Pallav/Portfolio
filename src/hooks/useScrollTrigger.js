import { useEffect, useState, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Active-section tracker using GSAP ScrollTrigger.
 *
 * Creates one ScrollTrigger per section. The trigger fires when the
 * section's top edge crosses the viewport center (start: 'top center')
 * and deactivates when its bottom edge passes the center
 * (end: 'bottom center').
 *
 * This is more reliable than IntersectionObserver for scroll-driven
 * UIs because it integrates natively with Lenis via the shared
 * ScrollTrigger.update pipeline set up in SmoothScroll.
 */
export function useScrollTrigger(sectionIds) {
  const [activeSection, setActiveSection] = useState(sectionIds[0])
  const triggersRef = useRef([])

  useEffect(() => {
    // Tear down any existing triggers before creating new ones
    triggersRef.current.forEach((trigger) => trigger.kill())
    triggersRef.current = []

    sectionIds.forEach((id, index) => {
      const section = document.getElementById(id)
      if (!section) return

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => setActiveSection(id),
        onEnterBack: () => setActiveSection(id),
        onLeave: () => {
          if (index < sectionIds.length - 1) {
            setActiveSection(sectionIds[index + 1])
          }
        },
        onLeaveBack: () => {
          if (index > 0) {
            setActiveSection(sectionIds[index - 1])
          }
        },
      })

      triggersRef.current.push(trigger)
    })

    ScrollTrigger.refresh()

    return () => {
      triggersRef.current.forEach((trigger) => trigger.kill())
    }
  }, [sectionIds])

  return activeSection
}
