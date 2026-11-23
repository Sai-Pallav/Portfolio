import { motion } from 'framer-motion'
import { memo, useId } from 'react'

/**
 * Energy Beam - Animated laser connection from core to the experience node.
 * Uses a straight path and scales dynamically via SVG.
 * 
 * @param {{
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
        transition={{ duration: 0.42, ease: "easeOut" }}
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
        transition={{ duration: 0.36, ease: "easeOut", delay: 0.02 }}
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
        transition={{ duration: 0.32, ease: "easeOut", delay: 0.04 }}
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

      {/* Node endpoint - reticle group centered at targetX, targetY */}
      <g transform={`translate(${targetX}, ${targetY})`}>
        {/* Rotating tech reticle */}
        <motion.circle
          cx={0}
          cy={0}
          r="9"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="4 2"
          strokeOpacity="0.8"
          fill="none"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, rotate: 360 }}
          transition={{
            scale: { duration: 0.3 },
            opacity: { duration: 0.3 },
            rotate: { duration: 8, repeat: Infinity, ease: "linear" }
          }}
        />

        {/* Counter-rotating inner circular reticle (anti-clockwise) */}
        <motion.circle
          cx={0}
          cy={0}
          r="5.5"
          stroke="var(--accent-hover)"
          strokeWidth="0.8"
          strokeDasharray="3 2"
          strokeOpacity="0.75"
          fill="none"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: [0.4, 0.85, 0.4], rotate: -360 }}
          transition={{
            scale: { duration: 0.3 },
            opacity: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 6, repeat: Infinity, ease: "linear" }
          }}
        />

        {/* Center micro target dot */}
        <motion.circle
          cx={0}
          cy={0}
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
      </g>

      {/* Core emission group centered at centerX, centerY */}
      <g transform={`translate(${centerX}, ${centerY})`}>
        {/* Outer energy ring */}
        <motion.circle
          cx={0}
          cy={0}
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

        {/* Center pulsing dot */}
        <motion.circle
          cx={0}
          cy={0}
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
      </g>
    </motion.svg>
  )
})

export default EnergyBeam
