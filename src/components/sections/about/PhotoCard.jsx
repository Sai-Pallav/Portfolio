import { motion } from 'framer-motion'
import { scaleIn } from './aboutVariants'
import Lanyard from '@/components/ui/Lanyard'
import SectionTitle from './SectionTitle'
import BioBlock from './BioBlock'

export default function PhotoCard({ sectionRef }) {
  return (
    <motion.aside
      variants={scaleIn}
      className="group relative w-full"
      aria-label="Profile photo"
    >
      {/* Full screen container with stacked layout */}
      <div className="relative">

        {/* ID card - positioned above text */}
        <div className="relative z-20 mb-12 lg:mb-16 lg:absolute lg:right-0 lg:top-0 lg:w-1/2 lg:max-w-lg">
          {/* Liquid Glass Effect SVG Filter */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ position: 'absolute', zIndex: 1 }}>
            <defs>
              <filter id="liquid-glass-photo" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.01"
                  numOctaves="4"
                  result="noise"
                  seed="1"
                >
                  <animate
                    attributeName="baseFrequency"
                    values="0.01;0.015;0.01"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale="8"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feColorMatrix
                  type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                  in="blur"
                  result="goo"
                />
                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
              </filter>
            </defs>
          </svg>

          {/* Photo Container */}
          <motion.div
            className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/30"
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-accent-hover/20 opacity-0 transition-opacity duration-500" />

            {/* Lanyard Component */}
            <div className="w-full h-full min-h-[400px]">
              <Lanyard position={[0, 0, 30]} gravity={[0, -40, 0]} fov={30} transparent={true} sectionRef={sectionRef} />
            </div>

            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              initial={{ x: '-100%' }}
              transition={{ duration: 0.6 }}
            />
          </motion.div>

          {/* Decorative glow */}
          <motion.div
            className="absolute -inset-4 rounded-3xl opacity-0 transition-opacity duration-500 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, var(--accent) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
        </div>

        {/* Text content - below ID card */}
        <div className="relative z-10 lg:pr-8 lg:max-w-2xl">
          <SectionTitle />
          <BioBlock />
        </div>
      </div>
    </motion.aside>
  )
}
