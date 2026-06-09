import { useEffect, useState, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Custom hook for GSAP ScrollTrigger section tracking
 * Provides active section detection and smooth scroll integration with Lenis
 */
export function useScrollTrigger(sectionIds) {
  const [activeSection, setActiveSection] = useState(sectionIds[0])
  const triggersRef = useRef([])

  useEffect(() => {
    // Clear existing triggers
    triggersRef.current.forEach(trigger => trigger.kill())
    triggersRef.current = []

    // Create ScrollTrigger for each section
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
      triggersRef.current.forEach(trigger => trigger.kill())
    }
  }, [sectionIds])

  return activeSection
}

/**
 * Custom hook for section reveal animations
 * Animates elements into view when they enter the viewport
 */
export function useRevealAnimation(ref, options = {}) {
  const {
    delay = 0,
    duration = 1.2,
    ease = 'power3.out',
    y = 60,
    opacity = 0,
    scale = 0.95,
  } = options

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element,
        { y, opacity, scale },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration,
          ease,
          delay,
          scrollTrigger: {
            trigger: element,
            start: 'top 90%',
            end: 'bottom 10%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    }, element)

    return () => ctx.revert()
  }, [ref, delay, duration, ease, y, opacity, scale])
}

/**
 * Custom hook for staggered children animations
 */
export function useStaggerAnimation(ref, options = {}) {
  const {
    delay = 0,
    duration = 0.8,
    ease = 'power3.out',
    y = 40,
    opacity = 0,
    stagger = 0.15,
  } = options

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element.children,
        { y, opacity },
        {
          y: 0,
          opacity: 1,
          duration,
          ease,
          delay,
          stagger,
          scrollTrigger: {
            trigger: element,
            start: 'top 85%',
            end: 'bottom 15%',
            toggleActions: 'play none none reverse',
          },
        }
      )
    }, element)

    return () => ctx.revert()
  }, [ref, delay, duration, ease, y, opacity, stagger])
}

/**
 * Custom hook for cinematic section entrance/exit animations
 * Creates dramatic scene transitions with parallax effects
 */
export function useCinematicSectionAnimation(ref, options = {}) {
  const {
    duration = 1.5,
    ease = 'power4.inOut',
    yEnter = 100,
    yExit = -100,
    scaleEnter = 0.9,
    scaleExit = 1.1,
  } = options

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const ctx = gsap.context(() => {
      // Entrance animation
      gsap.fromTo(
        element,
        { y: yEnter, opacity: 0, scale: scaleEnter },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration,
          ease,
          scrollTrigger: {
            trigger: element,
            start: 'top 80%',
            end: 'top 20%',
            scrub: 1,
          },
        }
      )

      // Exit animation
      gsap.to(element, {
        y: yExit,
        opacity: 0,
        scale: scaleExit,
        duration,
        ease,
        scrollTrigger: {
          trigger: element,
          start: 'bottom 20%',
          end: 'bottom 80%',
          scrub: 1,
        },
      })
    }, element)

    return () => ctx.revert()
  }, [ref, duration, ease, yEnter, yExit, scaleEnter, scaleExit])
}
