import { memo, useState, useRef } from 'react'

// Master Hero Video Asset
const heroVideo = '/video-project.mp4'

/**
 * Responsive Hero Section with Media Controls
 * - Full-bleed responsive background <video>
 * - Paused by default per user request
 * - Interactive Play/Pause & Sound toggle controls
 */
function Hero() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef(null)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.warn('Playback error:', err))
      }
    }
  }

  const toggleAudio = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted
      videoRef.current.muted = nextMuted
      setIsMuted(nextMuted)
    }
  }

  return (
    <section
      id="hero"
      aria-label="Hero"
      className="relative h-screen w-full overflow-hidden bg-bg"
    >
      <video
        ref={videoRef}
        src={heroVideo}
        loop
        muted={isMuted}
        playsInline
        className="w-full h-full object-cover hero-video select-none pointer-events-none"
      />

      {/* Floating Media Controls (Play/Pause & Sound) */}
      <div className="absolute bottom-6 right-6 z-30 flex items-center gap-3 pointer-events-auto">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 hover:border-white/30 backdrop-blur-md text-white/80 hover:text-white transition-all duration-300 shadow-lg cursor-pointer"
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ? (
            /* Pause Icon */
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
            </svg>
          ) : (
            /* Play Icon */
            <svg className="w-4 h-4 text-white/70 group-hover:text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          <span className="font-mono text-xs tracking-wider uppercase font-medium">
            {isPlaying ? 'PAUSE' : 'PLAY VIDEO'}
          </span>
        </button>

        {/* Audio Toggle Button */}
        <button
          onClick={toggleAudio}
          className="group flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 hover:border-white/30 backdrop-blur-md text-white/80 hover:text-white transition-all duration-300 shadow-lg cursor-pointer"
          aria-label={isMuted ? 'Unmute video audio' : 'Mute video audio'}
        >
          {isMuted ? (
            <svg className="w-4 h-4 text-white/60 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
          <span className="font-mono text-xs tracking-wider uppercase font-medium">
            {isMuted ? 'MUTED' : 'AUDIO ON'}
          </span>
        </button>
      </div>
    </section>
  )
}

export default memo(Hero)
