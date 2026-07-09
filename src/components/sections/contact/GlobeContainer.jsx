import React, { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion, useReducedMotion } from 'framer-motion'
import { personal } from '@/data/personal'
import GlobeScene from './GlobeScene'

const SCENE_CONFIG = {
  camera: { position: [0, 0, 8], fov: 45 },
  proximity: { maxDistance: 220, minDistance: 40, minFactor: 0.05 },
}

const getSocialBadgeColors = (platform) => {
  switch (platform) {
    case 'linkedin':
      return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400 hover:text-blue-300 shadow-blue-500/10'
    case 'instagram':
      return 'from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400 hover:text-pink-300 shadow-pink-500/10'
    case 'github':
      return 'from-zinc-900/90 to-black/90 border-zinc-700/50 text-white hover:text-zinc-200 shadow-zinc-800/30'
    case 'leetcode':
      return 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-500 hover:text-amber-400 shadow-amber-500/10'
    default:
      return 'from-accent/20 to-accent-hover/20 border-accent/30 text-accent hover:text-accent-hover shadow-accent/10'
  }
}

export default React.memo(function GlobeContainer({ isInView }) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)
  const distanceFactor = useRef(1.0)
  const hoveredCountRef = useRef(0)
  const cachedRect = useRef(null)

  const [webglSupported, setWebglSupported] = useState(true)
  const [themeColor, setThemeColor] = useState('#2563EB') // Default professional theme accent
  const [ambientIntensity, setAmbientIntensity] = useState(1.0) // Default ambient intensity

  // MutationObserver on <html> (retains theme synchronization, updating state on change)
  useEffect(() => {
    const readTheme = () => {
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()
      const ambient = getComputedStyle(document.documentElement).getPropertyValue("--ambient-intensity").trim()
      if (accent) {
        setThemeColor(accent)
      }
      if (ambient) {
        setAmbientIntensity(parseFloat(ambient) || 1.0)
      }
    }
    readTheme()
    const observer = new MutationObserver(readTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] })
    return () => observer.disconnect()
  }, [])

  // Cache rect, update on resize/scroll only (throttled to avoid layout thrashing)
  useEffect(() => {
    const update = () => { if (containerRef.current) cachedRect.current = containerRef.current.getBoundingClientRect() }
    update()

    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          update()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("resize", update, { passive: true })
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  useEffect(() => {
    const { maxDistance, minDistance, minFactor } = SCENE_CONFIG.proximity
    const handleMouseMove = (e) => {
      if (!cachedRect.current || shouldReduceMotion || !webglSupported) return
      const r = cachedRect.current
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > maxDistance) { distanceFactor.current = 1.0 }
      else if (d < minDistance) { distanceFactor.current = minFactor }
      else { const t = (d - minDistance) / (maxDistance - minDistance); const eased = t * t * (3 - 2 * t); distanceFactor.current = minFactor + eased * (1.0 - minFactor) }
    }
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [shouldReduceMotion, webglSupported])

  const socialsToRender = useMemo(() => [
    { platform: "github", url: personal.socials.github },
    { platform: "linkedin", url: personal.socials.linkedin },
    { platform: "instagram", url: personal.socials.instagram },
  ].filter(s => s.url), [])

  if (shouldReduceMotion) return null

  return (
    <>
      {/* Accessibility screen-reader fallback links */}
      <nav aria-label="Social media links" className="sr-only">
        {socialsToRender.map(s => (
          <a key={s.platform} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit Sai Pallav's ${s.platform} profile`}>
            Sai Pallav's {s.platform}
          </a>
        ))}
      </nav>

      {/* R3F WebGL Canvas Container */}
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 w-full h-full z-10 pointer-events-none hidden md:flex items-center justify-center"
      >
        <div
          className="absolute w-[60%] h-[60%] rounded-full blur-[100px] pointer-events-none -z-10 transition-colors duration-500"
          style={{ background: `radial-gradient(circle, ${themeColor} 0%, transparent 70%)`, opacity: 'calc(0.08 * var(--ambient-intensity))' }}
        />
        
        <div className="absolute inset-0 pointer-events-none">
          {webglSupported ? (
            <Canvas 
              frameloop={isInView ? "always" : "never"}
              camera={SCENE_CONFIG.camera}
              dpr={[1, 2]}
            >
              <GlobeScene 
                socialsToRender={socialsToRender} 
                distanceFactor={distanceFactor} 
                hoveredCountRef={hoveredCountRef} 
                themeColor={themeColor}
                ambientIntensity={ambientIntensity}
                setWebglSupported={setWebglSupported}
              />
            </Canvas>
          ) : (
            <div className="flex items-center justify-center w-full h-full pointer-events-auto">
              <div className="flex gap-4 p-4 rounded-2xl bg-bg-surface/50 border border-white/5 backdrop-blur-md shadow-2xl animate-fade-in">
                {socialsToRender.map(s => (
                  <a
                    key={s.platform}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${s.platform} profile`}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${getSocialBadgeColors(s.platform)} border transition-all duration-300 backdrop-blur-md shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]`}
                  >
                    <SocialIcon platform={s.platform} className="h-6 w-6 relative z-10" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
})
