import { motion } from 'framer-motion'
import { useRef, memo } from 'react'

/**
 * Central Career Core - A glowing energy source with rotating rings and pulsing effects.
 * Represents the heart of the career orbit system.
 * 
 * @param {{ isActive: boolean }} props
 */
const CareerCore = memo(function CareerCore({ isActive }) {
  const uid = useRef(`career-core-${Math.random().toString(36).slice(2)}`).current
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow effect */}
      <motion.div
        animate={{
          scale: [0.95, 1.05, 0.95],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, var(--accent) 0%, var(--accent-hover) 50%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      
      {/* Main core container */}
      <motion.div
        className="relative w-40 h-40 md:w-56 md:h-56"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Outer rotating ring 1 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0"
          aria-hidden="true"
        >
          <svg viewBox="0 0 224 224" className="w-full h-full">
            <defs>
              <linearGradient id={`ring1Gradient-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.8" />
                <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.1" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <circle
              cx="112"
              cy="112"
              r="100"
              stroke={`url(#ring1Gradient-${uid})`}
              strokeWidth="2"
              fill="none"
              strokeDasharray="10 5"
            />
          </svg>
        </motion.div>
        
        {/* Outer rotating ring 2 (opposite direction) */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-2"
          aria-hidden="true"
        >
          <svg viewBox="0 0 224 224" className="w-full h-full">
            <defs>
              <linearGradient id={`ring2Gradient-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-hover)" stopOpacity="0.6" />
                <stop offset="50%" stopColor="var(--accent-hover)" stopOpacity="0.1" />
                <stop offset="100%" stopColor="var(--accent-hover)" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <circle
              cx="112"
              cy="112"
              r="90"
              stroke={`url(#ring2Gradient-${uid})`}
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="8 8"
            />
          </svg>
        </motion.div>
        
        {/* Inner core with pulsing glow */}
        <motion.div
          animate={{
            scale: [0.98, 1.02, 0.98],
            boxShadow: [
              '0 0 40px var(--accent)',
              '0 0 80px var(--accent)',
              '0 0 40px var(--accent)'
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-8 rounded-full flex items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(circle at center, var(--accent) 0%, var(--accent-hover) 50%, var(--accent-dim) 100%)',
          }}
        >
          {/* Inner energy effect */}
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute inset-0"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0deg, var(--accent) 90deg, transparent 180deg, var(--accent-hover) 270deg, transparent 360deg)',
              opacity: 0.3
            }}
            aria-hidden="true"
          />
          
          {/* Core icon/symbol */}
          <div className="relative z-10 text-4xl md:text-5xl">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-white">
              <motion.path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2 }}
              />
              <motion.path
                d="M2 17L12 22L22 17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.5 }}
              />
              <motion.path
                d="M2 12L12 17L22 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1 }}
              />
            </svg>
          </div>
        </motion.div>
        
        {/* Energy particles */}
        <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 224 224" aria-hidden="true">
          {[...Array(8)].map((_, i) => (
            <motion.circle
              key={i}
              cx={112 + Math.cos((i * 45) * Math.PI / 180) * 80}
              cy={112 + Math.sin((i * 45) * Math.PI / 180) * 80}
              r="2"
              fill="var(--accent)"
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.25
              }}
            />
          ))}
        </svg>
        
        {/* Active state indicator */}
        {isActive && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0.4 }}
            transition={{ duration: 0.5 }}
            className="absolute -inset-4 rounded-full blur-xl"
            style={{
              background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />
        )}
      </motion.div>
    </div>
  )
})

export default CareerCore
