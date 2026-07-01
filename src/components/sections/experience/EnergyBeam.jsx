import { motion } from 'framer-motion'
import { memo, useId } from 'react'

/**
 * Energy Beam - Animated laser connection from core to the experience node.
 * Uses a straight path and scales dynamically via SVG.
 * 
 * @param {{
 *   startX: number,
 *   startY: number,
 *   endX: number,
 *   endY: number,
 *   width: number,
 *   height: number
 * }} props
 */
const EnergyBeam = memo(function EnergyBeam({ startX, startY, endX, endY, width, height }) {
  const idSuffix = useId().replace(/:/g, '')
  const uid = `energy-beam-${idSuffix}`
  
  const centerX = startX
  const centerY = startY
  const targetX = endX
  const targetY = endY
  
  // Straight path: starts at center, ends at the node
  const beamPath = `M ${centerX} ${centerY} L ${targetX} ${targetY}`
  
  return (
    <motion.svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
      style={{
        width: '100%',
        height: '100%',
        zIndex: 35,
        overflow: 'visible'
      }}
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <defs>
        {/* Beam gradient - stronger at core, fading at node */}
        <linearGradient
          id={`beamGradient-${uid}`}
          gradientUnits="userSpaceOnUse"
          x1={centerX}
          y1={centerY}
          x2={targetX}
          y2={targetY}
        >
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="1" />
          <stop offset="40%" stopColor="var(--accent)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.3" />
        </linearGradient>
        
        {/* Glow filter */}
        <filter id={`beamGlow-${uid}`} filterUnits="userSpaceOnUse">
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
      
      {/* Outer glow layer (diffuse blur) */}
      <motion.path
        d={beamPath}
        stroke="var(--accent)"
        strokeWidth="7"
        strokeOpacity="0.15"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        filter={`url(#beamGlow-${uid})`}
      />
      
      {/* Mid glow layer (ambient laser color) */}
      <motion.path
        d={beamPath}
        stroke={`url(#beamGradient-${uid})`}
        strokeWidth="3.5"
        strokeOpacity="0.65"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.02 }}
      />

      {/* Inner hot core (high intensity laser center) */}
      <motion.path
        d={beamPath}
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeOpacity="0.95"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
      />
      
      {/* Energy pulse 1 traveling along beam */}
      <motion.circle
        r="3"
        fill="#ffffff"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "linear"
        }}
        filter={`url(#beamGlow-${uid})`}
      >
        <animateMotion
          dur="1.8s"
          repeatCount="indefinite"
          path={beamPath}
        />
      </motion.circle>
      
      {/* Energy pulse 2 (staggered delay) */}
      <motion.circle
        r="2.5"
        fill="var(--accent)"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0.8, 0] }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <animateMotion
          dur="1.8s"
          begin="0.9s"
          repeatCount="indefinite"
          path={beamPath}
        />
      </motion.circle>
      
      {/* Node endpoint - rotating tech reticle */}
      <motion.circle
        cx={targetX}
        cy={targetY}
        r="9"
        stroke="var(--accent)"
        strokeWidth="1"
        strokeDasharray="4 2"
        strokeOpacity="0.8"
        fill="none"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: 360 }}
        style={{ transformOrigin: `${targetX}px ${targetY}px` }}
        transition={{
          scale: { duration: 0.4 },
          opacity: { duration: 0.4 },
          rotate: { duration: 8, repeat: Infinity, ease: "linear" }
        }}
      />
      
      {/* Node endpoint - diamond bracket */}
      <motion.rect
        x={targetX - 6.5}
        y={targetY - 6.5}
        width="13"
        height="13"
        rx="1"
        stroke="var(--accent-hover)"
        strokeWidth="0.8"
        strokeOpacity="0.5"
        fill="none"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: [0.3, 0.7, 0.3], rotate: 45 }}
        style={{ transformOrigin: `${targetX}px ${targetY}px` }}
        transition={{
          scale: { duration: 0.4 },
          rotate: { duration: 0 },
          opacity: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
        }}
      />

      {/* Node endpoint - center micro target dot */}
      <motion.circle
        cx={targetX}
        cy={targetY}
        r="3"
        fill="#ffffff"
        stroke="var(--accent)"
        strokeWidth="1.2"
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.25, 1] }}

        transition={{
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
        filter={`url(#beamGlow-${uid})`}
      />
      
      {/* Core emission - outer energy ring */}
      <motion.circle
        cx={centerX}
        cy={centerY}
        r="12"
        stroke="var(--accent)"
        strokeWidth="1"
        strokeOpacity="0.4"
        fill="none"
        animate={{
          scale: [1, 1.35, 1],
          opacity: [0.1, 0.5, 0.1]
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Core emission - center pulsing dot */}
      <motion.circle
        cx={centerX}
        cy={centerY}
        r="5"
        fill="#ffffff"
        stroke="var(--accent)"
        strokeWidth="1.8"
        animate={{
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        filter={`url(#beamGlow-${uid})`}
      />
    </motion.svg>
  )
})

export default EnergyBeam
