import React, { useRef, useMemo, useEffect, useCallback, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useReducedMotion } from 'framer-motion'
import SocialIcon from '@/components/ui/SocialIcon'

const SCENE_CONFIG = {
  depth: { cameraZ: 8 },
}

const lerpFI = (current, target, factor, delta) =>
  current + (target - current) * (1.0 - Math.exp(-factor * delta))

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

export default memo(function OrbitingIcon({ social, tiltZ, speed, radius, initialPhase, index, distanceFactor, hoveredCountRef, themeColor }) {
  const rotationRef  = useRef()
  const iconGroupRef = useRef()
  const htmlRef      = useRef()
  const glowRef      = useRef()

  const hoverRef = useRef(false)
  const shouldReduceMotion = useReducedMotion()

  const speedMultiplier  = useRef(1.0)
  const bobOffset        = useRef(0)
  const easedSpeedFactor = useRef(1.0)
  const hoverGlowFactor  = useRef(0.0)
  const timeAccum        = useRef(0)

  const tempVec = useMemo(() => new THREE.Vector3(), [])
  const lastStyle = useRef({ opacity: -1, scaleVal: -1, glowOpacity: -1 })
  const STYLE_THRESHOLD = 0.002

  const handlePointerOver = useCallback(() => {
    hoverRef.current = true
    hoveredCountRef.current += 1
    // Dispatch event-driven highlight notification (Architecture Refactor)
    window.dispatchEvent(new CustomEvent('globe-hover', { detail: { platform: social.platform } }))
  }, [hoveredCountRef, social.platform])

  const handlePointerOut = useCallback(() => {
    hoverRef.current = false
    hoveredCountRef.current = Math.max(0, hoveredCountRef.current - 1)
    // Dispatch event-driven highlight removal (Architecture Refactor)
    window.dispatchEvent(new CustomEvent('globe-hover', { detail: { platform: null } }))
  }, [hoveredCountRef])

  const lastColor = useRef('')

  useFrame((state, delta) => {
    if (shouldReduceMotion) return
    timeAccum.current = (timeAccum.current + delta) % 100000
    const time    = timeAccum.current
    const hovered = hoverRef.current

    easedSpeedFactor.current = lerpFI(easedSpeedFactor.current, distanceFactor.current, 3.5, delta)
    const f = easedSpeedFactor.current

    const targetGlow = hovered ? 1.0 : 0.0
    const glowSpeed  = hovered ? 8.0 : 4.8
    hoverGlowFactor.current = lerpFI(hoverGlowFactor.current, targetGlow, glowSpeed, delta)

    const organicVariation = 1.0 + Math.sin(time * 0.15 + index) * 0.06
    const isAnyHovered     = hoveredCountRef.current > 0
    const targetSpeedMult  = isAnyHovered ? 0.2 : 1.0
    speedMultiplier.current = lerpFI(speedMultiplier.current, targetSpeedMult, 4.0, delta)

    if (rotationRef.current) {
      rotationRef.current.rotation.y += delta * speed * speedMultiplier.current * organicVariation * f
    }

    const targetBob = hovered ? 0.0 : Math.sin(time * 2.0 + index * 1.6) * 0.05 * f
    bobOffset.current = lerpFI(bobOffset.current, targetBob, 5.0, delta)
    if (iconGroupRef.current) iconGroupRef.current.position.y = bobOffset.current

    if (iconGroupRef.current && htmlRef.current) {
      iconGroupRef.current.getWorldPosition(tempVec)
      tempVec.applyMatrix4(state.camera.matrixWorldInverse)

      const camZ  = state.camera.position.z || SCENE_CONFIG.depth.cameraZ
      const maxZ  = -(camZ - radius)
      const minZ  = -(camZ + radius)
      const depth = THREE.MathUtils.clamp((tempVec.z - minZ) / (maxZ - minZ), 0, 1)

      const baseScale     = 0.92 + depth * 0.08
      const scaleVal      = baseScale * (1.0 + hoverGlowFactor.current * 0.06)
      const opacityVal    = 0.25 + depth * 0.75
      const glowOpacity   = hoverGlowFactor.current

      // Dirty-check before writing styles
      const prev = lastStyle.current
      if (Math.abs(opacityVal - prev.opacity) > STYLE_THRESHOLD) {
        htmlRef.current.style.opacity = opacityVal
        prev.opacity = opacityVal
      }
      if (Math.abs(scaleVal - prev.scaleVal) > STYLE_THRESHOLD) {
        htmlRef.current.style.transform = `scale(${scaleVal})`
        prev.scaleVal = scaleVal
      }
      if (glowRef.current && Math.abs(glowOpacity - prev.glowOpacity) > 0.01) {
        glowRef.current.style.opacity = glowOpacity.toFixed(2)
        prev.glowOpacity = glowOpacity
      }
    }

    if (glowRef.current && lastColor.current !== themeColor) {
      glowRef.current.style.boxShadow = `0 0 16px ${themeColor}`
      lastColor.current = themeColor
    }
  })

  return (
    <group rotation={[0, 0, tiltZ]}>
      <group ref={rotationRef} rotation={[0, initialPhase, 0]}>
        <group ref={iconGroupRef} position={[radius, 0, 0]}>
          <Html center distanceFactor={8} pointerEvents="auto">
            <div className="relative group/tooltip pointer-events-auto">
              <a
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${social.platform} profile`}
                className={`relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${getSocialBadgeColors(social.platform)} border transition-all duration-300 backdrop-blur-md cursor-pointer shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-accent after:absolute after:inset-[-12px] after:content-['']`}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                ref={htmlRef}
              >
                <SocialIcon platform={social.platform} className="h-6 w-6 relative z-10" />
                <div
                  ref={glowRef}
                  className="absolute inset-0 rounded-xl pointer-events-none opacity-0 transition-shadow duration-300 blur-sm"
                  style={{ boxShadow: `0 0 16px ${themeColor}` }}
                />
              </a>

              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 px-3 py-1.5 rounded-lg bg-bg-raised/95 border border-white/[0.08] backdrop-blur-md opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 pointer-events-none shadow-[0_4px_16px_rgba(0,0,0,0.5)] scale-90 group-hover/tooltip:scale-100">
                <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-heading)] whitespace-nowrap">
                  {social.platform}
                </span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-bg-raised border-t border-l border-white/[0.08] rotate-45 -translate-y-[4px]" />
              </div>
            </div>
          </Html>
        </group>
      </group>
    </group>
  )
})
