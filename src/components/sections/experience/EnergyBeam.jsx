import { motion } from 'framer-motion'
import { useMemo, useEffect, useState, useRef, memo } from 'react'

/**
 * Energy Beam - Animated laser connection from core to the experience node.
 * Creates a glowing pulse effect along a curved bezier path.
 * Dynamically measures actual DOM positions for accurate alignment.
 * 
 * @param {{
 *   activeNodeIndex: number,
 *   nodeAngles: number[],
 *   nodeRadii: number[],
 *   containerRef?: React.RefObject,
 *   orbitAngle?: number
 * }} props
 */
const EnergyBeam = memo(function EnergyBeam({ activeNodeIndex, nodeAngles, nodeRadii, containerRef, orbitAngle = 0 }) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 800 })
  const uid = useRef(`energy-beam-${Math.random().toString(36).slice(2)}`).current
  
  // Measure container dimensions dynamically
  useEffect(() => {
    if (!containerRef?.current) return
    
    const measure = () => {
      const rect = containerRef.current.getBoundingClientRect()
      setDimensions({ width: rect.width, height: rect.height })
    }
    
    measure()
    
    const observer = new ResizeObserver(measure)
    observer.observe(containerRef.current)
    
    return () => observer.disconnect()
  }, [containerRef])
  
  // Calculate beam path from core center to active node position
  const { beamPath, nodeX, nodeY } = useMemo(() => {
    const centerX = dimensions.width / 2
    const centerY = dimensions.height / 2
    
    // Use the same angle calculation as ExperienceNode (angle + orbitAngle)
    const angle = nodeAngles[activeNodeIndex]
    const radius = nodeRadii[activeNodeIndex]
    const currentAngle = angle + orbitAngle
    const radians = (currentAngle * Math.PI) / 180
    
    // Match ExperienceNode positioning: x = 50 + (radius/8) * cos(radians)
    const targetXPercent = 50 + (radius / 8) * Math.cos(radians)
    const targetYPercent = 50 + (radius / 8) * Math.sin(radians)
    
    const targetX = (targetXPercent / 100) * dimensions.width
    const targetY = (targetYPercent / 100) * dimensions.height
    
    // Smooth bezier curve from center to node
    const midX = centerX + (targetX - centerX) * 0.5
    const midY = centerY + (targetY - centerY) * 0.3
    
    return {
      beamPath: `M ${centerX} ${centerY} Q ${midX} ${midY} ${targetX} ${targetY}`,
      nodeX: targetX,
      nodeY: targetY
    }
  }, [activeNodeIndex, nodeAngles, nodeRadii, dimensions, orbitAngle])
  
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: '100%',
        height: '100%',
        zIndex: 35
      }}
      aria-hidden="true"
    >
      <defs>
        {/* Beam gradient - stronger at core, fading at node */}
        <linearGradient id={`beamGradient-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="1" />
          <stop offset="40%" stopColor="var(--accent)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.3" />
        </linearGradient>
        
        {/* Glow filter */}
        <filter id={`beamGlow-${uid}`}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* Pulse gradient */}
        <radialGradient id={`pulseGradient-${uid}`}>
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* Main beam path */}
      <motion.path
        d={beamPath}
        stroke={`url(#beamGradient-${uid})`}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.8 }}
        exit={{ pathLength: 0, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        filter={`url(#beamGlow-${uid})`}
      />
      
      {/* Glow layer */}
      <motion.path
        d={beamPath}
        stroke="var(--accent)"
        strokeWidth="4"
        strokeOpacity="0.3"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.4 }}
        exit={{ pathLength: 0, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
        filter={`url(#beamGlow-${uid})`}
      />
      
      {/* Energy pulse traveling along beam */}
      <motion.circle
        r="5"
        fill={`url(#pulseGradient-${uid})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatDelay: 0.5,
          delay: 0.6
        }}
      >
        <animateMotion
          dur="1.5s"
          repeatCount="indefinite"
          path={beamPath}
        />
      </motion.circle>
      
      {/* Node endpoint glow */}
      <motion.circle
        cx={nodeX}
        cy={nodeY}
        r="4"
        fill="var(--accent)"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: [0.4, 0.8, 0.4],
          scale: [1, 1.5, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.6
        }}
        filter={`url(#beamGlow-${uid})`}
      />
      
      {/* Core emission point */}
      <motion.circle
        cx={dimensions.width / 2}
        cy={dimensions.height / 2}
        r="6"
        fill="var(--accent)"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.6, 1, 0.6]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        filter={`url(#beamGlow-${uid})`}
      />
    </svg>
  )
})

export default EnergyBeam
