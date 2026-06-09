import { useState, useEffect, useRef, useCallback } from 'react'
import { useScroll, useTransform } from 'framer-motion'

/**
 * Custom hook to manage scroll-triggered timeline animations.
 * Tracks scroll position and calculates progressive animation state
 * for each project branch in the timeline.
 * 
 * Uses dynamic card position tracking for perfect alignment.
 * 
 * @param {number} totalProjects - Total number of projects to display
 * @param {Array} cardPositions - Array of card Y positions (from refs)
 * @returns {Object} Animation progress state for timeline
 */
export default function useTimelineAnimation(totalProjects, cardPositions = []) {
  const [isMobile, setIsMobile] = useState(false)
  const sectionRef = useRef(null)
  const containerRef = useRef(null)
  
  // Detect mobile viewport with better breakpoint
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    
    // Debounce resize events for better performance
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
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
  
  // Setup scroll tracking with Framer Motion
  // Trigger when section top reaches 75% down the viewport
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.75", "end 0.15"]
  })
  
  // Transform scroll progress into vertical line progress (0 to 1)
  // Start animating immediately when trigger hits
  const verticalProgress = useTransform(
    scrollYProgress,
    [0, 0.02, 0.98, 1], // Almost instant start, complete at end
    prefersReducedMotion ? [1, 1, 1, 1] : [0, 0, 1, 1]
  )
  
  // Calculate branch animation states
  const [branchStates, setBranchStates] = useState([])
  
  const calculateBranchStates = useCallback((progress) => {
    if (prefersReducedMotion) {
      // If reduced motion, show everything at once
      return Array(totalProjects).fill(null).map(() => ({
        progress: 1,
        visible: true,
        cardVisible: true,
        nodeVisible: true
      }))
    }
    
    const states = []
    
    // 12% of scroll for initial vertical line travel before first branch
    const initialSpacing = 0.12
    const branchStart = initialSpacing
    const branchEnd = 0.92 // Use 92% of scroll range
    const branchRange = branchEnd - branchStart
    const branchSegment = branchRange / totalProjects
    
    for (let i = 0; i < totalProjects; i++) {
      const branchTriggerStart = branchStart + (i * branchSegment)
      const nodeTriggerPoint = branchTriggerStart + (branchSegment * 0.10) // Node appears at 10%
      const branchTriggerEnd = branchTriggerStart + (branchSegment * 0.65) // Branch completes at 65%
      const cardTriggerStart = branchTriggerStart + (branchSegment * 0.45) // Card reveals at 45%
      
      let branchProgress = 0
      let isVisible = false
      let isNodeVisible = false
      let isCardVisible = false
      
      // Node visibility (appears first)
      if (progress >= nodeTriggerPoint) {
        isNodeVisible = true
      }
      
      // Branch progress (grows from node)
      if (progress >= branchTriggerStart) {
        isVisible = true
        branchProgress = Math.min(
          1,
          (progress - branchTriggerStart) / (branchTriggerEnd - branchTriggerStart)
        )
      }
      
      // Card visibility (reveals after branch is 45% complete)
      if (progress >= cardTriggerStart) {
        isCardVisible = true
      }
      
      states.push({
        progress: branchProgress,
        visible: isVisible,
        nodeVisible: isNodeVisible,
        cardVisible: isCardVisible
      })
    }
    
    return states
  }, [totalProjects, prefersReducedMotion])
  
  const maxProgressRef = useRef(0)

  useEffect(() => {
    maxProgressRef.current = 0
  }, [totalProjects])

  // Subscribe to vertical progress changes
  useEffect(() => {
    const unsubscribe = verticalProgress.on('change', (latest) => {
      if (latest > maxProgressRef.current) {
        maxProgressRef.current = latest
        const states = calculateBranchStates(latest)
        setBranchStates(states)
      }
    })
    
    return () => unsubscribe()
  }, [verticalProgress, calculateBranchStates])
  
  return {
    sectionRef,
    containerRef,
    verticalProgress,
    branches: branchStates,
    isMobile,
    prefersReducedMotion
  }
}
