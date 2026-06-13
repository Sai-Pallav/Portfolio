import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { personal } from '@/data/personal'
import SocialIcon from '@/components/ui/SocialIcon'
import useTypewriter from '@/hooks/useTypewriter'
import { useRevealAnimation } from '@/hooks/useScrollTrigger'

/**
 * Modern Futuristic Hero Section
 * Features: Particle background, gradient text, glassmorphism cards, smooth animations
 */
// Isolated Typewriter component to prevent high-frequency text changes from re-rendering the entire Hero section
function TypewriterRole() {
  const displayText = useTypewriter(personal.typewriterRoles)
  return (
    <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold" style={{ color: 'var(--text-secondary)' }}>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block w-1 h-8 md:h-10 ml-2 rounded-full"
        style={{ 
          background: 'var(--accent)',
          boxShadow: '0 0 20px var(--accent)'
        }}
      />
    </h2>
  )
}

function Hero() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 150])
  const opacity = useTransform(scrollY, [0, 600, 800], [1, 1, 0])
  const contentRef = useRef(null)

  useRevealAnimation(contentRef, { delay: 0.2, duration: 1 })

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        {/* Base gradient uses theme background */}
        <div className="absolute inset-0" style={{ background: 'var(--bg)' }} />
        
        {/* Animated grid */}
        <motion.div
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'linear',
          }}
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--accent) 1px, transparent 1px),
              linear-gradient(to bottom, var(--accent) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px',
            opacity: 0.1,
          }}
        />
        
        {/* Floating orbs using theme accent color */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'var(--accent)', opacity: 0.15 }}
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -80, 0],
            y: [0, 80, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'var(--accent-hover)', opacity: 0.12 }}
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -60, 0],
            y: [0, -80, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 4,
          }}
          className="absolute top-1/2 right-1/3 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'var(--accent)', opacity: 0.1 }}
        />
      </div>

      {/* Main Content */}
      <motion.div
        ref={contentRef}
        style={{ y, opacity }}
        className="relative z-10 max-w-7xl mx-auto px-6 py-20"
      >
        <div className="text-center space-y-8">
          {/* Available Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="flex justify-center"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border shadow-lg"
                 style={{ 
                   background: 'var(--bg-surface)', 
                   borderColor: 'var(--border-glow)',
                   boxShadow: '0 4px 20px var(--accent-dim)'
                 }}>
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.5, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative"
              >
                <div className="w-3 h-3 rounded-full" style={{ background: 'var(--success)' }} />
                <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping" style={{ background: 'var(--success)' }} />
              </motion.div>
              <span className="font-medium text-sm tracking-wider" style={{ color: 'var(--accent)' }}>
                AVAILABLE FOR OPPORTUNITIES
              </span>
            </div>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-4"
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold">
              <motion.span
                className="block"
                style={{ color: 'var(--text-heading)' }}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                Hi, I'm
              </motion.span>
              <motion.span
                className="block bg-gradient-to-r bg-clip-text text-transparent"
                style={{ 
                  backgroundImage: `linear-gradient(to right, var(--accent), var(--accent-hover))`,
                  filter: `drop-shadow(0 0 30px var(--accent-dim))`
                }}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                {personal.name}
              </motion.span>
            </h1>
          </motion.div>

          {/* Typewriter Role */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex justify-center"
          >
            <div className="relative inline-block">
              <div className="absolute inset-0 blur-2xl" style={{ background: 'var(--accent-dim)' }} />
              <div className="relative px-8 py-4 rounded-2xl border"
                   style={{ 
                     background: 'var(--bg-surface)', 
                     borderColor: 'var(--border)',
                     opacity: 0.95
                   }}>
                <TypewriterRole />
              </div>
            </div>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            {personal.tagline}
          </motion.p>

          {/* Info Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="flex flex-wrap justify-center gap-4 pt-4"
          >
            <InfoCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              text={personal.location}
            />
            <InfoCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              }
              text={personal.university}
            />
            <InfoCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              }
              text={`CGPA: ${personal.cgpa}`}
            />
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex flex-wrap justify-center gap-4 pt-8"
          >
            <motion.a
              href="#projects"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-8 py-4 rounded-xl overflow-hidden cursor-pointer"
              style={{ background: 'var(--accent)' }}
            >
              <motion.div
                className="absolute inset-0"
                style={{ background: 'var(--accent-hover)' }}
                initial={{ x: '-100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
              <span className="relative z-10 flex items-center gap-2 font-semibold text-lg"
                    style={{ color: 'var(--accent-contrast)' }}>
                View My Work
                <motion.svg
                  className="w-5 h-5"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </motion.svg>
              </span>
            </motion.a>

            <motion.a
              href="#contact"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-8 py-4 rounded-xl border-2 transition-colors cursor-pointer overflow-hidden"
              style={{ 
                borderColor: 'var(--border-glow)',
                background: 'var(--bg-surface)'
              }}
            >
              <motion.div
                className="absolute inset-0"
                style={{ background: 'var(--accent-dim)' }}
                initial={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <span className="relative z-10 font-semibold text-lg"
                    style={{ color: 'var(--accent)' }}>
                Get In Touch
              </span>
            </motion.a>
          </motion.div>

          {/* Social Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex justify-center items-center gap-4 pt-8"
          >
            {Object.entries(personal.socials).map(([platform, url], index) => (
              <motion.a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.9 + index * 0.1,
                  type: 'spring',
                  stiffness: 200,
                }}
                whileHover={{ scale: 1.2, rotate: 5, y: -5 }}
                whileTap={{ scale: 0.9 }}
                className="relative p-4 rounded-xl border transition-all duration-300 group cursor-pointer"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)'
                }}
                aria-label={`Visit ${platform} profile`}
              >
                <SocialIcon platform={platform} className="w-6 h-6 relative z-10" />
                <motion.div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'var(--accent-dim)' }}
                  initial={{ scale: 0 }}
                  whileHover={{ scale: 1 }}
                />
              </motion.a>
            ))}
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="flex flex-col items-center gap-2"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="text-xs font-medium tracking-widest uppercase">Scroll Down</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}

/**
 * Info Card Component
 */
function InfoCard({ icon, text }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      className="flex items-center gap-3 px-5 py-3 rounded-xl border transition-all cursor-default"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)'
      }}
    >
      <div style={{ color: 'var(--accent)' }}>{icon}</div>
      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{text}</span>
    </motion.div>
  )
}

export default Hero
