import { useEffect, useState, useRef } from 'react'

export function useSectionObserver(sectionIds) {
  const [activeSection, setActiveSection] = useState(sectionIds[0] ?? '')
  const rafRef = useRef(null)

  useEffect(() => {
    // Always listen to window scroll since main-content is inside window
    // and getBoundingClientRect works relative to viewport regardless
    const getActive = () => {
      const viewportHeight = window.innerHeight
      // Trigger point: 30% down from the top of the viewport
      const triggerY = viewportHeight * 0.3

      let closest = sectionIds[0]
      let closestDist = Infinity

      sectionIds.forEach((id) => {
        const el = document.getElementById(id)
        if (!el) return
        const rect = el.getBoundingClientRect()
        // Distance from the section's top edge to the trigger point
        const dist = Math.abs(rect.top - triggerY)
        if (dist < closestDist) {
          closestDist = dist
          closest = id
        }
      })

      setActiveSection(closest)
    }

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(getActive)
    }

    // Run once on mount to set correct initial state
    getActive()

    // Listen to window scroll (works regardless of which element scrolls)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [sectionIds])

  return activeSection
}

export default useSectionObserver
