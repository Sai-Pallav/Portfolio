import { useScroll, useMotionValueEvent } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'

/**
 * Central animation controller for the Orbit Experience section.
 * Manages scroll tracking, orbit rotation, and active node detection.
 * 
 * @param {React.RefObject} sectionRef - Reference to the Experience section
 * @returns {{
 *   scrollProgress: number,
 *   activeNodeIndex: number,
 *   orbitAngle: number,
 *   isMobile: boolean,
 *   isInView: boolean
 * }}
 */
export function useOrbitAnimation(sectionRef) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeNodeIndex, setActiveNodeIndex] = useState(-1)
  const [orbitAngle, setOrbitAngle] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [isInView, setIsInView] = useState(false)
  
  const orbitSpeedRef = useRef(0.5) // Degrees per frame
  const animationFrameRef = useRef(null)
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    
    let resizeTimeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(checkMobile, 150)
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [])
  
  // Check for reduced motion preference
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      orbitSpeedRef.current = 0
    }
  }, [])
  
  // Scroll tracking with Framer Motion
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  })
  
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setScrollProgress(latest)
    
    // Determine active node based on scroll progress
    // Each node activates at 33% intervals
    if (latest < 0.1) {
      setActiveNodeIndex(-1) // No node active yet
    } else if (latest < 0.33) {
      setActiveNodeIndex(0)
    } else if (latest < 0.66) {
      setActiveNodeIndex(1)
    } else if (latest <= 1) {
      setActiveNodeIndex(2)
    }
    
    // Check if section is in view
    setIsInView(latest > 0 && latest < 1)
  })
  
  // Orbit rotation animation loop
  useEffect(() => {
    if (isMobile || !isInView) {
      // Stop rotation on mobile or when out of view
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }
    
    let lastTime = performance.now()
    
    const animate = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000 // Convert to seconds
      lastTime = currentTime
      
      // Update orbit angle (0.5 degrees per second * deltaTime)
      setOrbitAngle(prev => (prev + orbitSpeedRef.current * deltaTime * 60) % 360)
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    animationFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isMobile, isInView])
  
  // Slow down orbit when a node is active
  useEffect(() => {
    if (activeNodeIndex !== -1) {
      orbitSpeedRef.current = 0.2 // Slow down
    } else {
      orbitSpeedRef.current = 0.5 // Normal speed
    }
  }, [activeNodeIndex])
  
  return {
    scrollProgress,
    activeNodeIndex,
    orbitAngle,
    isMobile,
    isInView
  }
}
