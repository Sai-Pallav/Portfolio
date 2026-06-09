import { useState, useEffect } from 'react'

export default function useScrollReveal(ref, threshold = 0.1) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref, threshold])

  return visible
}
