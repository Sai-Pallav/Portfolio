import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { experience } from '@/data/experience'
import CareerCore from './experience/CareerCore'
import OrbitRing from './experience/OrbitRing'
import ExperienceNode from './experience/ExperienceNode'
import ExperienceDetails from './experience/ExperienceDetails'
import ExperienceCard from './experience/ExperienceCard'
import EnergyBeam from './experience/EnergyBeam'
import { useOrbitAnimation } from '@/hooks/useOrbitAnimation'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

// Orbit configuration defined statically at module level to prevent re-creation
const ORBIT_RADII = [280, 350, 430]
const ORBIT_DURATIONS = [25, 35, 45]
const NODE_ANGLES = [0, 120, 240]

function Experience() {
  const sectionRef = useRef(null)
  const orbitContainerRef = useRef(null)
  const detailsRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(-1)
  const { orbitAngle, isMobile, isInView: orbitInView } = useOrbitAnimation(sectionRef, selectedNodeIndex !== -1)
  
  // Use only manually selected node (not scroll-based)
  const currentNodeIndex = selectedNodeIndex
  
  const handleNodeSelect = useCallback((index) => {
    setSelectedNodeIndex(prev => prev === index ? -1 : index)
  }, [])
  
  const handleCloseDetails = useCallback(() => {
    setSelectedNodeIndex(prev => {
      const prevIndex = prev
      // Restore focus to the node button that opened the panel
      if (prevIndex !== -1 && nodeRefs.current[prevIndex]) {
        nodeRefs.current[prevIndex].focus()
      }
      return -1
    })
  }, [])

  // Move focus into panel when it opens; restore on close via handleCloseDetails
  useEffect(() => {
    if (selectedNodeIndex !== -1 && detailsRef.current) {
      // Small timeout to let the enter animation start before focusing
      const t = setTimeout(() => detailsRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [selectedNodeIndex])

  // Escape key closes the details panel
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && selectedNodeIndex !== -1) handleCloseDetails()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedNodeIndex, handleCloseDetails])
  
  // Refs to each orbit node button for focus restoration
  const nodeRefs = useRef([])
  
  // Stable ref setters to prevent inline arrow functions breaking memoization
  const nodeRefSetters = useMemo(() => {
    return [0, 1, 2].map(i => (el) => {
      nodeRefs.current[i] = el
    })
  }, [])
  
  // Calculate dynamic details panel position based on selected node's placement in viewport
  const getDetailsPosition = useCallback(() => {
    if (currentNodeIndex === -1) return 'left'
    const angle = NODE_ANGLES[currentNodeIndex]
    const radius = ORBIT_RADII[currentNodeIndex]
    const currentAngle = angle + (orbitInView ? orbitAngle : 0)
    const radians = (currentAngle * Math.PI) / 180
    const x = 50 + (radius / 8) * Math.cos(radians)
    // If node is on the right half of the screen (x >= 50), details should be on the left
    return x >= 50 ? 'left' : 'right'
  }, [currentNodeIndex, orbitAngle, orbitInView])
  
  // Orbit entrance animations
  const orbitSystemVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  }
  
  const coreVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  }
  
  const ringVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i) => ({
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        delay: 0.3 + i * 0.15,
        ease: [0.16, 1, 0.3, 1]
      }
    })
  }
  

  return (
    <section
      id="experience"
      ref={sectionRef}
      className="relative min-h-screen lg:min-h-[120vh] py-16 md:py-20 px-4 sm:px-6 overflow-hidden"
      aria-label="Career Orbit Experience"
    >
      {/* Premium Animated Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Deep gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface/50 via-bg to-surface/50" />
        
        {/* Animated gradient orbs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 0.25, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{ 
            background: 'radial-gradient(circle, var(--accent) 0%, var(--accent-hover) 50%, transparent 70%)',
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isInView ? { opacity: 0.2, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
          className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full blur-[100px]"
          style={{ 
            background: 'radial-gradient(circle, var(--accent-hover) 0%, var(--accent) 50%, transparent 70%)',
          }}
        />
        
        {/* Animated mesh pattern */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 0.03 } : { opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, var(--accent) 1px, transparent 1px),
              radial-gradient(circle at 75% 75%, var(--accent-hover) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {/* Premium Header */}
          <motion.div variants={itemVariants} className="text-center mb-8 md:mb-12">
            <motion.h2
              variants={itemVariants}
              className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight"
            >
              <span className="bg-gradient-to-r from-primary via-accent to-accent-hover bg-clip-text text-transparent">
                Professional
              </span>
              <br />
              <span className="bg-gradient-to-r from-accent-hover via-accent to-primary bg-clip-text text-transparent">
                Experience
              </span>
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="text-secondary text-xl md:text-2xl leading-relaxed max-w-2xl mx-auto"
            >
              An interconnected evolution of impactful contributions
            </motion.p>
          </motion.div>

          {/* Orbit System */}
          {isMobile ? (
            // Mobile: Vertical stacked detailed cards
            <motion.div variants={itemVariants} className="flex flex-col gap-6 px-4">
              {experience.map((exp, i) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <ExperienceCard exp={exp} index={i} total={experience.length} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            // Desktop: Immersive orbit system with entrance animations
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={orbitSystemVariants}
              className="relative w-full h-[85vh] lg:h-[100vh] flex items-center justify-center overflow-visible"
            >
              {/* Centered Orbit Wrapper with aspect-square to guarantee perfect circular orbits */}
              <div
                ref={orbitContainerRef}
                className="relative w-full max-w-[min(75vh,720px)] aspect-square flex items-center justify-center"
              >
                {/* Central Core with entrance animation */}
                <motion.div 
                  variants={coreVariants}
                  className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                >
                  <CareerCore isActive={currentNodeIndex !== -1} />
                </motion.div>
                
                {/* Orbit Rings with staggered entrance */}
                {ORBIT_RADII.map((radius, i) => (
                  <motion.div 
                    key={i}
                    variants={ringVariants}
                    custom={i}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <OrbitRing
                      radius={radius}
                      duration={ORBIT_DURATIONS[i]}
                      isActive={currentNodeIndex === i}
                      hasActiveSelection={currentNodeIndex !== -1}
                      direction={i % 2 === 0 ? 'clockwise' : 'counter-clockwise'}
                    />
                  </motion.div>
                ))}
                
                {/* Experience Nodes with pop-in animation and orbit rotation */}
                {experience.map((exp, i) => {
                  // Calculate position based on node's orbit + current orbit rotation
                  const angle = NODE_ANGLES[i]
                  const radius = ORBIT_RADII[i]
                  const currentAngle = angle + (orbitInView ? orbitAngle : 0)
                  const radians = (currentAngle * Math.PI) / 180
                  const x = 50 + (radius / 8) * Math.cos(radians)
                  const y = 50 + (radius / 8) * Math.sin(radians)
                  
                  return (
                    <motion.div
                      key={exp.id}
                      initial={{ 
                        scale: 0, 
                        opacity: 0,
                        x: '-50%',
                        y: '-50%'
                      }}
                      animate={{ 
                        scale: 1, 
                        opacity: 1,
                        left: `${x}%`,
                        top: `${y}%`,
                        x: '-50%',
                        y: '-50%'
                      }}
                      transition={{
                        scale: {
                          type: 'spring',
                          stiffness: 120,
                          damping: 18,
                          delay: 0.8 + i * 0.2
                        },
                        opacity: {
                          duration: 0.5,
                          delay: 0.8 + i * 0.2
                        },
                        left: {
                          duration: 0
                        },
                        top: {
                          duration: 0
                        }
                      }}
                      className="absolute"
                      style={{
                        zIndex: currentNodeIndex === i ? 40 : 30,
                        pointerEvents: currentNodeIndex !== -1 && currentNodeIndex !== i ? 'none' : 'auto'
                      }}
                    >
                      <ExperienceNode
                        exp={exp}
                        index={i}
                        angle={NODE_ANGLES[i]}
                        radius={ORBIT_RADII[i]}
                        isActive={currentNodeIndex === i}
                        isDimmed={currentNodeIndex !== -1 && currentNodeIndex !== i}
                        onSelect={handleNodeSelect}
                        nodeRef={nodeRefSetters[i]}
                      />
                    </motion.div>
                  )
                })}
                
                {/* Energy Beam to active node */}
                <AnimatePresence>
                  {currentNodeIndex !== -1 && (
                    <EnergyBeam
                      activeNodeIndex={currentNodeIndex}
                      nodeAngles={NODE_ANGLES}
                      nodeRadii={ORBIT_RADII}
                      containerRef={orbitContainerRef}
                      orbitAngle={orbitInView ? orbitAngle : 0}
                    />
                  )}
                </AnimatePresence>
              </div>
              
              {/* Details Panel */}
              <AnimatePresence mode="wait">
                {currentNodeIndex !== -1 && (
                  <ExperienceDetails
                    ref={detailsRef}
                    key={currentNodeIndex}
                    exp={experience[currentNodeIndex]}
                    position={getDetailsPosition()}
                    onClose={handleCloseDetails}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Premium CTA */}
          <motion.div variants={itemVariants} className="text-center mt-20 md:mt-24">
            <motion.a
              href="#contact"
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-accent to-accent-hover text-accent-contrast font-bold text-lg rounded-2xl shadow-2xl shadow-accent/30 transition-all duration-300 hover:shadow-accent/50 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative z-10">Let's Connect</span>
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="relative z-10"
              >
                →
              </motion.span>
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default Experience
