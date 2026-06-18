import { motion } from 'framer-motion'
import { scaleIn } from './aboutVariants'
import { lazy, Suspense } from 'react'
const Lanyard = lazy(() => import('@/components/ui/Lanyard'))
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
          {/* Photo Container */}
          <motion.div
            className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/30"
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-accent/20 via-transparent to-accent-hover/20 opacity-0 transition-opacity duration-500" />

            {/* Lanyard Component */}
            <div className="w-full h-[400px] md:h-[450px] lg:h-[500px] flex items-center justify-center">
              <Suspense fallback={
                <div className="flex flex-col items-center gap-3 text-white/20 font-mono text-xs select-none">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
                  <span>INITIALIZING 3D CANVAS</span>
                </div>
              }>
                <Lanyard position={[0, 0, 13]} gravity={[0, -40, 0]} fov={25} transparent={true} sectionRef={sectionRef} />
              </Suspense>
            </div>

            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent"
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
