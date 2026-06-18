import { motion } from 'framer-motion'
import { memo, useId } from 'react'

/**
 * Energy Beam - Animated laser connection from core to the experience node.
 * Uses a static curved bezier path and scales natively via SVG.
 * 
 * @param {{
 *   activeNodeIndex: number,
 *   nodeRadii: number[]
 * }} props
 */
const EnergyBeam = memo(function EnergyBeam({ activeNodeIndex, nodeRadii }) {
  const idSuffix = useId().replace(/:/g, '')
  const uid = `energy-beam-${idSuffix}`
  
  // Center is 400, 400 inside the static 800x800 SVG canvas
  const centerX = 400
  const centerY = 400
  
  const radius = nodeRadii[activeNodeIndex]
  const targetX = centerX + radius
  const targetY = centerY
  
  // Curved bezier path: starts at center, curves slightly upward, ends at the node
  const midX = centerX + radius * 0.5
  const midY = centerY - 35
  const beamPath = `M ${centerX} ${centerY} Q ${midX} ${midY} ${targetX} ${targetY}`
  
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox="0 0 800 800"
      style={{
        width: '100%',
        height: '100%',
        zIndex: 35,
        overflow: 'visible'
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
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.8 }}
        exit={{ pathLength: 0, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        filter={`url(#beamGlow-${uid})`}
      />
      
      {/* Glow layer */}
      <motion.path
        d={beamPath}
        stroke="var(--accent)"
        strokeWidth="5"
        strokeOpacity="0.3"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.4 }}
        exit={{ pathLength: 0, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.03 }}
        filter={`url(#beamGlow-${uid})`}
      />
      
      {/* Energy pulse traveling along beam */}
      <motion.circle
        r="5.5"
        fill={`url(#pulseGradient-${uid})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatDelay: 0.5,
          delay: 0.5
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
        cx={targetX}
        cy={targetY}
        r="4.5"
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
          delay: 0.5
        }}
        filter={`url(#beamGlow-${uid})`}
      />
      
      {/* Core emission point */}
      <motion.circle
        cx={centerX}
        cy={centerY}
        r="6.5"
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
