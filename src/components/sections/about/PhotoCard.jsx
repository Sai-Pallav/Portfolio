import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion'
import aboutPortrait from '@/assets/about-portrait.webp'

export default function PhotoCard({ sectionRef }) {
  const shouldReduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const yRaw = useTransform(
    scrollYProgress,
    [0, 1],
    [shouldReduceMotion ? 0 : 35, shouldReduceMotion ? 0 : -35]
  )
  const yTransform = useSpring(yRaw, { stiffness: 85, damping: 26, mass: 0.5 })

  return (
    <div className="absolute right-0 bottom-0 top-0 w-full md:w-[60%] lg:w-[55%] h-full z-10 pointer-events-none flex items-center justify-center md:justify-end md:pr-12 lg:pr-20 xl:pr-28 overflow-hidden">
      <motion.div
        style={{ y: yTransform, willChange: 'transform' }}
        className="relative max-h-[80vh] md:max-h-[85vh] max-w-[92vw] aspect-[894/1024] flex items-center justify-center"
      >
        {/* Studio Backlight Glow for Depth (Theme-aware and hardware-accelerated) */}
        <div
          className="absolute inset-0 m-auto w-[80%] h-[80%] rounded-full blur-[100px] opacity-35 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
            willChange: 'transform',
            transform: 'translate3d(0, 0, 0)',
          }}
        />

        {/* Floating animation */}
        <motion.div
          animate={!shouldReduceMotion ? {
            y: [0, -10, 0],
          } : {}}
          transition={!shouldReduceMotion ? {
            y: {
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          } : {}}
          style={{ willChange: 'transform' }}
          className="w-full h-full flex items-center justify-center z-10"
        >
          <motion.img
            src={aboutPortrait}
            alt="Profile portrait"
            width={894}
            height={1024}
            loading="eager"
            decoding="async"
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full object-contain object-center hero-portrait-img pointer-events-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
