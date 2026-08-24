import { useRef, memo, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import SectionTitle from './SectionTitle'
import BioBlock from './BioBlock'
import PhotoCard from './PhotoCard'
import { staggerContainer } from './aboutVariants'

function About() {
  const containerRef = useRef(null)
  const shouldReduceMotion = useReducedMotion()

  const ambientBgStyle = useMemo(() => ({
    background:
      'radial-gradient(circle at 85% 20%, var(--accent-dim) 0%, transparent 55%), radial-gradient(circle at 15% 85%, var(--accent-dim) 0%, transparent 55%)',
  }), [])

  return (
    <section
      id="about"
      ref={containerRef}
      aria-label="About Sai Pallav"
      className="relative min-h-screen w-full flex flex-col justify-center py-20 sm:py-24 md:py-28 overflow-hidden bg-bg border-t border-white/[0.04]"
    >
      {/* Top Center Glowing Pill Indicator (Matching Reference Image) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="w-12 h-4 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-center justify-center shadow-lg shadow-black/40">
          <div className="w-3 h-1 rounded-full bg-accent/80 animate-pulse" />
        </div>
      </div>

      {/* Background Atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 -z-10"
        style={ambientBgStyle}
        aria-hidden="true"
      />

      {/* Subtle Noise / Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none -z-10"
        style={{
          backgroundImage: `
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
        aria-hidden="true"
      />

      <motion.div
        className="relative z-10 max-w-7xl w-full mx-auto px-6 sm:px-10 md:px-12 lg:px-16"
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Text, Identity, Stats & Focus Areas */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <SectionTitle />
            <BioBlock />
          </div>

          {/* Right Column: Seamless Background-Blended Portrait Photo */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-end">
            <PhotoCard />
          </div>

        </div>
      </motion.div>
    </section>
  )
}

export default memo(About)
