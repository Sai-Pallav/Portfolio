import { motion } from 'framer-motion'
import { scaleIn } from './aboutVariants'

const aboutPortrait = '/hero-portrait.webp'

export default function PhotoCard() {
  return (
    <motion.div
      variants={scaleIn}
      className="relative w-full h-full min-h-[480px] lg:min-h-[640px] flex items-end justify-center lg:justify-end overflow-hidden"
    >
      {/* Backlight Ambient Glow */}
      <div
        className="absolute inset-0 opacity-40 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 60% 40%, var(--accent) 0%, transparent 65%)',
        }}
      />

      {/* Portrait Image Container */}
      <div className="relative w-full max-w-lg lg:max-w-xl h-full flex items-end">
        <img
          src={aboutPortrait}
          alt="Sai Pallav"
          loading="eager"
          decoding="async"
          className="w-full h-auto max-h-[680px] object-cover object-top filter brightness-[0.92] contrast-[1.05]"
        />

        {/* Seamless Vignette Gradients (Blending Bottom and Left into Background) */}
        {/* Bottom Fade */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg via-bg/70 to-transparent pointer-events-none" />

        {/* Left Fade (Desktop) */}
        <div className="hidden lg:block absolute inset-y-0 left-0 w-36 bg-gradient-to-r from-bg via-bg/60 to-transparent pointer-events-none" />

        {/* Top Fade Subtle */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-bg/40 to-transparent pointer-events-none" />
      </div>
    </motion.div>
  )
}
