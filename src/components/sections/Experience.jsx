import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'
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

function Experience() {
  const sectionRef = useRef(null)
  const orbitContainerRef = useRef(null)
  const detailsRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(-1)
  const { scrollProgress, orbitAngle, isMobile, isInView: orbitInView } = useOrbitAnimation(sectionRef, selectedNodeIndex !== -1)
  
  // Use only manually selected node (not scroll-based)
  const currentNodeIndex = selectedNodeIndex
  
  const handleNodeSelect = (index) => {
    setSelectedNodeIndex(selectedNodeIndex === index ? -1 : index)
  }
  
  const handleCloseDetails = () => {
    setSelectedNodeIndex(-1)
  }
  
  // Orbit configuration
  const orbitRadii = [180, 260, 340]
  const orbitDurations = [25, 35, 45]
  const nodeAngles = [0, 120, 240]
  
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
  
  const nodeVariants = {
    hidden: (i) => {
      // Start from center position (50%, 50%)
      return {
        scale: 0,
        opacity: 0,
        x: '-50%',
        y: '-50%',
        left: '50%',
        top: '50%'
      }
    },
    visible: (i) => {
      // Calculate final position based on node's orbit
      const angle = nodeAngles[i]
      const radius = orbitRadii[i]
      const radians = (angle * Math.PI) / 180
      const x = 50 + (radius / 8) * Math.cos(radians)
      const y = 50 + (radius / 8) * Math.sin(radians)
      
      return {
        scale: 1,
        opacity: 1,
        x: '-50%',
        y: '-50%',
        left: `${x}%`,
        top: `${y}%`,
        transition: {
          type: 'spring',
          stiffness: 120,
          damping: 18,
          delay: 0.6 + i * 0.2
        }
      }
    }
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
              ref={orbitContainerRef} 
              initial="hidden"
              animate="visible"
              variants={orbitSystemVariants}
              className="relative w-full h-[100vh] flex items-center justify-center"
            >
              {/* Central Core with entrance animation */}
              <motion.div 
                variants={coreVariants}
                className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
              >
                <CareerCore isActive={currentNodeIndex !== -1} />
              </motion.div>
              
              {/* Orbit Rings with staggered entrance */}
              {orbitRadii.map((radius, i) => (
                <motion.div 
                  key={i}
                  variants={ringVariants}
                  custom={i}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <OrbitRing
                    radius={radius}
                    duration={orbitDurations[i]}
                    isActive={currentNodeIndex === i}
                    direction={i % 2 === 0 ? 'clockwise' : 'counter-clockwise'}
                  />
                </motion.div>
              ))}
              
              {/* Experience Nodes with pop-in animation and orbit rotation */}
              {experience.map((exp, i) => {
                // Calculate position based on node's orbit + current orbit rotation
                const angle = nodeAngles[i]
                const radius = orbitRadii[i]
                const currentAngle = angle + (orbitInView ? orbitAngle : 0)
                const radians = (currentAngle * Math.PI) / 180
                const x = 50 + (radius / 8) * Math.cos(radians)
                const y = 50 + (radius / 8) * Math.sin(radians)
                
                return (
                  <motion.div
                    key={exp.id}
                    initial={{ 
                      scale: 0, 
                      opacity: 0
                    }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1,
                      left: `${x}%`,
                      top: `${y}%`
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
                        type: 'tween',
                        duration: 0.1,
                        ease: 'linear'
                      },
                      top: {
                        type: 'tween',
                        duration: 0.1,
                        ease: 'linear'
                      }
                    }}
                    className="absolute"
                    style={{
                      transform: 'translate(-50%, -50%)',
                      zIndex: currentNodeIndex === i ? 40 : 30
                    }}
                  >
                    <ExperienceNode
                      exp={exp}
                      index={i}
                      angle={nodeAngles[i]}
                      radius={orbitRadii[i]}
                      isActive={currentNodeIndex === i}
                      orbitAngle={orbitInView ? orbitAngle : 0}
                      onSelect={handleNodeSelect}
                    />
                  </motion.div>
                )
              })}
              
              {/* Energy Beam to active node */}
              <AnimatePresence>
                {currentNodeIndex !== -1 && (
                  <EnergyBeam
                    activeNodeIndex={currentNodeIndex}
                    nodeAngles={nodeAngles}
                    nodeRadii={orbitRadii}
                    containerRef={orbitContainerRef}
                    orbitAngle={orbitInView ? orbitAngle : 0}
                  />
                )}
              </AnimatePresence>
              
              {/* Details Panel */}
              <AnimatePresence mode="wait">
                {currentNodeIndex !== -1 && (
                  <ExperienceDetails
                    ref={detailsRef}
                    key={currentNodeIndex}
                    exp={experience[currentNodeIndex]}
                    position={currentNodeIndex === 0 ? 'right' : 'left'}
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
