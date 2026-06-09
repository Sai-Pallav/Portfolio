import { motion } from 'framer-motion'
import { useRef } from 'react'

/**
 * Orbit Ring - Circular path with subtle glow and rotation animation.
 * Creates the orbital trajectory for experience nodes.
 * 
 * @param {{
 *   radius: number,
 *   duration: number,
 *   isActive: boolean,
 *   direction?: 'clockwise' | 'counter-clockwise'
 * }} props
 */
export default function OrbitRing({ 
  radius, 
  duration, 
  isActive, 
  direction = 'clockwise' 
}) {
  // SVG viewBox is 800x800, center at 400,400
  const center = 400
  const uid = useRef(`orbit-${radius}-${Math.random().toString(36).slice(2)}`).current
  
  // SVG path for a full circle orbit (used by animateMotion particles)
  const orbitPath = `M ${center - radius} ${center} a ${radius} ${radius} 0 1 0 ${2 * radius} 0 a ${radius} ${radius} 0 1 0 -${2 * radius} 0`
  
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 800 800"
        className="absolute"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '800px',
          maxHeight: '800px',
        }}
      >
        <defs>
          {/* Gradient for orbit ring */}
          <linearGradient id={`orbitGradient-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
            <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.4" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id={`glow-${uid}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Main orbit path — key changes with isActive to re-trigger pathLength draw-in */}
        <motion.circle
          key={`ring-${radius}-${isActive}`}
          cx={center}
          cy={center}
          r={radius}
          stroke={`url(#orbitGradient-${uid})`}
          strokeWidth={isActive ? "2" : "1"}
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: isActive ? 0.7 : 0.3 }}
          transition={{
            pathLength: { duration: isActive ? 1.2 : 1.5, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.4 }
          }}
        />
        
        {/* Active highlight ring */}
        {isActive && (
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            stroke="var(--accent)"
            strokeWidth="2"
            strokeOpacity="0.6"
            fill="none"
            strokeDasharray="20 10"
            animate={{ rotate: direction === 'clockwise' ? 360 : -360 }}
            transition={{ 
              duration: duration / 3, 
              repeat: Infinity,
              ease: "linear"
            }}
            filter={`url(#glow-${uid})`}
            style={{
              transformOrigin: `${center}px ${center}px`
            }}
          />
        )}
        
        {/* Ambient particles that actually travel along the orbit */}
        {[...Array(4)].map((_, i) => (
          <circle
            key={i}
            r={isActive ? '2.5' : '1.8'}
            fill="var(--accent)"
          >
            <animateMotion
              dur={`${duration}s`}
              repeatCount="indefinite"
              begin={`-${(i / 4) * duration}s`}
              path={orbitPath}
            />
            <animate
              attributeName="opacity"
              values="0.2;0.7;0.2"
              dur="2s"
              repeatCount="indefinite"
              begin={`${i * 0.5}s`}
            />
            <animate
              attributeName="r"
              values={isActive ? '2;3.5;2' : '1.5;2.5;1.5'}
              dur="2s"
              repeatCount="indefinite"
              begin={`${i * 0.5}s`}
            />
          </circle>
        ))}
      </svg>
    </motion.div>
  )
}
