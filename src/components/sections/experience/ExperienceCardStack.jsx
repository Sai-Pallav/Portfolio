import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ExperienceCard from './ExperienceCard'

gsap.registerPlugin(ScrollTrigger)

export default function ExperienceCardStack({ items }) {
  const stackRef = useRef(null)

  useLayoutEffect(() => {
    const stack = stackRef.current
    if (!stack || items.length === 0) return undefined

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return undefined

    const cards = gsap.utils.toArray('.exp-stack-card', stack)
    if (cards.length === 0) return undefined

    const ctx = gsap.context(() => {
      cards.forEach((card, index) => {
        if (index >= cards.length - 1) return

        gsap.fromTo(
          card,
          {
            scale: 1,
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
          },
          {
            scale: 0.92 - (cards.length - 2 - index) * 0.03,
            opacity: 0.4 + index * 0.1,
            filter: 'blur(4px)',
            y: -32,
            ease: 'none',
            scrollTrigger: {
              trigger: cards[index + 1],
              start: 'top bottom',
              end: `top top+=${140 + index * 24}`,
              scrub: 0.7,
            },
          },
        )
      })

      ScrollTrigger.refresh()
      const timeoutId = setTimeout(() => {
        ScrollTrigger.refresh()
      }, 100)

      return () => clearTimeout(timeoutId)
    }, stack)

    return () => ctx.revert()
  }, [items])

  const topOffset = (index) => `calc(6rem + ${index * 1.5}rem)`

  return (
    <div ref={stackRef} className="relative max-w-4xl mx-auto w-full px-1 sm:px-0">
      {items.map((exp, index) => (
        <div
          key={exp.id}
          className="exp-stack-card sticky pb-12 last:pb-0"
          style={{
            top: topOffset(index),
            zIndex: index + 1,
          }}
        >
          <ExperienceCard exp={exp} index={index} total={items.length} />
        </div>
      ))}
      <div className="h-[32vh] pointer-events-none" aria-hidden="true" />
    </div>
  )
}
