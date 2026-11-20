import { memo } from 'react'
import RollingGridPortrait from './RollingGridPortrait'

const aboutPortrait = '/hero-portrait.webp'

function PhotoCard() {
  return (
    <div className="relative w-full h-full flex items-center justify-center lg:justify-end">
      {/* Backlight Ambient Glow */}
      <div
        className="absolute inset-0 opacity-40 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 60% 40%, var(--accent) 0%, transparent 65%)',
        }}
      />

      {/* Portrait Image Container with Isolated Stacking Context */}
      <div
        className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-[420px] xl:max-w-[480px] flex items-center justify-center"
        style={{ isolation: 'isolate' }}
      >
        <RollingGridPortrait
          src={aboutPortrait}
          alt="Sai Pallav"
        />

        {/* Seamless Vignette Gradients - Elevated cleanly above 3D Z-lift */}
        {/* Bottom Fade */}
        <div
          className="absolute inset-x-0 bottom-0 h-28 sm:h-36 bg-gradient-to-t from-bg via-bg/70 to-transparent pointer-events-none z-30"
          style={{ transform: 'translateZ(60px)' }}
        />

        {/* Left Fade (Desktop) */}
        <div
          className="hidden lg:block absolute inset-y-0 left-0 w-24 sm:w-32 bg-gradient-to-r from-bg via-bg/60 to-transparent pointer-events-none z-30"
          style={{ transform: 'translateZ(60px)' }}
        />

        {/* Top Fade Subtle */}
        <div
          className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-bg/40 to-transparent pointer-events-none z-30"
          style={{ transform: 'translateZ(60px)' }}
        />
      </div>
    </div>
  )
}

export default memo(PhotoCard)
