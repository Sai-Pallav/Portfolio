import { motion } from 'framer-motion'
import { useMemo, useState, useEffect, useCallback } from 'react'

/**
 * Animated SVG component that renders the branching timeline.
 * Uses DYNAMIC measurement from actual card DOM positions for perfect alignment.
 * 
 * @param {Object} props
 * @param {number} props.totalProjects - Number of projects
 * @param {Object} props.animatedProgress - Animation state from useTimelineAnimation
 * @param {boolean} props.isMobile - Whether viewport is mobile
 * @param {Array} props.cardRefs - Array of refs to card elements
 * @param {Object} props.containerRef - Ref to container element
 */
export default function AnimatedTimelineSVG({ totalProjects, animatedProgress, isMobile, cardRefs, containerRef }) {
  const { verticalProgress, branches } = animatedProgress
  const [svgDimensions, setSvgDimensions] = useState({ width: 1000, height: 2000 })
  const [nodePositions, setNodePositions] = useState([])
  
  // Calculate SVG dimensions and node positions from actual card DOM positions
  const calculatePositions = useCallback(() => {
    if (!containerRef.current || !cardRefs.current[0]) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const positions = []
    
    cardRefs.current.forEach((cardEl, index) => {
      if (!cardEl) return
      
      const cardRect = cardEl.getBoundingClientRect()
      
      // Calculate positions relative to container
      const relativeY = cardRect.top - containerRect.top
      const relativeX = cardRect.left - containerRect.left
      const cardWidth = cardRect.width
      
      // Node position: center of card vertically, at timeline center horizontally
      const nodeY = relativeY + (cardRect.height / 2)
      
      // Branch endpoint: at card edge (left edge for right cards, right edge for left cards)
      const isLeft = !isMobile && index % 2 === 0
      const branchEndX = isLeft 
        ? relativeX + cardWidth  // Right edge of left card
        : relativeX              // Left edge of right card
      
      positions.push({
        index,
        nodeY,
        branchEndX,
        cardTop: relativeY,
        cardHeight: cardRect.height,
        isLeft
      })
    })
    
    // Calculate total SVG height from last card position
    const lastCard = positions[positions.length - 1]
    const svgHeight = lastCard ? lastCard.cardTop + lastCard.cardHeight + 200 : 2000
    const svgWidth = containerRect.width
    
    setSvgDimensions({ width: svgWidth, height: svgHeight })
    setNodePositions(positions)
  }, [containerRef, cardRefs])
  
  // Initial calculation and resize observer
  useEffect(() => {
    calculatePositions()
    
    const resizeObserver = new ResizeObserver(() => {
      calculatePositions()
    })
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    // Throttle resize and scroll events for better performance
    let resizeTimeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(calculatePositions, 150)
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [calculatePositions])
  
  // Calculate vertical line position (center of container for desktop, left for mobile)
  const verticalLineX = useMemo(() => {
    if (isMobile) return 80
    return svgDimensions.width / 2
  }, [svgDimensions.width, isMobile])
  
  // Calculate branch paths dynamically from measured positions
  const branchPaths = useMemo(() => {
    return nodePositions.map((pos) => {
      const nodeX = verticalLineX
      const nodeY = pos.nodeY
      const endX = pos.branchEndX
      
      // Create smooth bezier curve from node to card edge
      const midX = nodeX + (endX - nodeX) * 0.5
      const path = `M ${nodeX} ${nodeY} C ${midX} ${nodeY}, ${endX} ${nodeY}, ${endX} ${nodeY}`
      
      return {
        index: pos.index,
        path,
        direction: pos.isLeft ? 'left' : 'right',
        progress: branches[pos.index]?.progress || 0,
        nodeVisible: branches[pos.index]?.nodeVisible || false,
        cardVisible: branches[pos.index]?.cardVisible || false
      }
    })
  }, [nodePositions, verticalLineX, branches])
  
  // Calculate vertical line path
  const verticalLinePath = useMemo(() => {
    if (nodePositions.length === 0) return ''
    const startY = nodePositions[0].nodeY
    const endY = nodePositions[nodePositions.length - 1].nodeY
    return `M ${verticalLineX} ${startY} L ${verticalLineX} ${endY}`
  }, [nodePositions, verticalLineX])
  
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
      preserveAspectRatio="xMidYMin meet"
      style={{ zIndex: 5 }}
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        {/* Gradient for vertical line */}
        <linearGradient id="verticalLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
          <stop offset="30%" stopColor="var(--accent)" stopOpacity="0.8" />
          <stop offset="70%" stopColor="var(--accent)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.2" />
        </linearGradient>
        
        {/* Gradient for right branch lines (center to right) */}
        <linearGradient id="branchGradientRight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.3" />
        </linearGradient>

        {/* Gradient for left branch lines (center to left) */}
        <linearGradient id="branchGradientLeft" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.3" />
        </linearGradient>
        
        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* Stronger glow for nodes */}
        <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* Radial gradient for nodes */}
        <radialGradient id="nodeGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="1" />
          <stop offset="70%" stopColor="var(--accent)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* Main vertical line (data stream) */}
      <motion.path
        d={verticalLinePath}
        stroke="url(#verticalLineGradient)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ 
          pathLength: verticalProgress,
          opacity: verticalProgress > 0 ? 1 : 0
        }}
        transition={{ duration: 0.05, ease: "easeOut" }}
        filter="url(#glow)"
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 0,
        }}
      />
      
      {/* Secondary glowing line for energy effect */}
      <motion.path
        d={verticalLinePath}
        stroke="var(--accent)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ 
          pathLength: verticalProgress,
          opacity: verticalProgress > 0 ? 0.4 : 0
        }}
        transition={{ duration: 0.05, ease: "easeOut" }}
        filter="url(#glow)"
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 0,
        }}
      />
      
      {/* Left branch lines */}
      {branchPaths.filter(b => b.direction === 'left').map((branch) => (
        <g key={`left-${branch.index}`}>
          {/* Main branch line */}
          <motion.path
            d={branch.path}
            stroke="url(#branchGradientLeft)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: branch.progress,
              opacity: branch.progress > 0 ? 1 : 0
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            filter="url(#glow)"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 0,
            }}
          />
        </g>
      ))}
      
      {/* Right branch lines */}
      {branchPaths.filter(b => b.direction === 'right').map((branch) => (
        <g key={`right-${branch.index}`}>
          {/* Main branch line */}
          <motion.path
            d={branch.path}
            stroke="url(#branchGradientRight)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: branch.progress,
              opacity: branch.progress > 0 ? 1 : 0
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            filter="url(#glow)"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 0,
            }}
          />
        </g>
      ))}
      
      {/* Glowing pulse nodes */}
      {nodePositions.map((pos) => {
        const branch = branchPaths.find(b => b.index === pos.index)
        return (
          <g key={`node-${pos.index}`}>
            {/* Outer glow ring */}
            <motion.circle
              cx={verticalLineX}
              cy={pos.nodeY}
              r="10"
              fill="url(#nodeGradient)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: branch?.nodeVisible ? [1, 1.5, 1] : 0,
                opacity: branch?.nodeVisible ? [0.5, 1, 0.5] : 0
              }}
              transition={{ 
                duration: 2,
                repeat: branch?.nodeVisible ? Infinity : 0,
                ease: "easeInOut"
              }}
              filter="url(#nodeGlow)"
            />
            
            {/* Core node */}
            <motion.circle
              cx={verticalLineX}
              cy={pos.nodeY}
              r="5"
              fill="var(--accent)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: branch?.nodeVisible ? 1 : 0,
                opacity: branch?.nodeVisible ? 1 : 0
              }}
              transition={{ 
                duration: 0.4,
                ease: "easeOut"
              }}
              filter="url(#glow)"
            />
            
            {/* Inner bright core */}
            <motion.circle
              cx={verticalLineX}
              cy={pos.nodeY}
              r="2.5"
              fill="white"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: branch?.nodeVisible ? 1 : 0,
                opacity: branch?.nodeVisible ? 0.9 : 0
              }}
              transition={{ 
                duration: 0.4,
                ease: "easeOut",
                delay: 0.1
              }}
            />
          </g>
        )
      })}
    </svg>
  )
}
