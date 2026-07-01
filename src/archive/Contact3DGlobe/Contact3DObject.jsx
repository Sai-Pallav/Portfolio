import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber'
import { Html, shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { motion, useReducedMotion } from 'framer-motion'
import { personal } from '@/data/personal'
import SocialIcon from '@/components/ui/SocialIcon'

// --- Global Theme Ref for Imperative Material Updates (No React Re-renders) ---
const globalTheme = {
  color: '#3b82f6',
  updated: true, // start true to force initial mesh color set
}

// Scene constants
const SCENE_CONFIG = {
  camera: { position: [0, 0, 8], fov: 45 },
  globe: {
    radius: 2.0,
    glassRadius: 1.96,
    haloRadius: 2.08,
    wireframeOpacity: 0.06,
    pointsOpacity: 0.35,
    glowIntensity: 0.5,
    glowPower: 4.8,
  },
  orbit: {
    radius: 2.8,
    tiltA: Math.PI / 4,
    tiltB: -Math.PI / 4,
  },
  depth: { cameraZ: 8 },
  proximity: { maxDistance: 220, minDistance: 40, minFactor: 0.05 },
  particles: { count: 30, minRadius: 2.4, spread: 2.0 },
}

const ORBIT_CONFIGS = [
  { tiltZ: SCENE_CONFIG.orbit.tiltA, speed: 0.265, radius: SCENE_CONFIG.orbit.radius, initialPhase: 0 },
  { tiltZ: SCENE_CONFIG.orbit.tiltB, speed: -0.295, radius: SCENE_CONFIG.orbit.radius, initialPhase: Math.PI / 2 },
  { tiltZ: SCENE_CONFIG.orbit.tiltA, speed: 0.280, radius: SCENE_CONFIG.orbit.radius, initialPhase: Math.PI },
  { tiltZ: SCENE_CONFIG.orbit.tiltB, speed: -0.270, radius: SCENE_CONFIG.orbit.radius, initialPhase: -Math.PI / 2 },
]

// Named constants for framerate-independent easing rates
const LERP = {
  orbitSpeed: 4.0,
  proximitySpeed: 3.5,
  hoverGlowIn: 8.0,
  hoverGlowOut: 4.8,
  bobOffset: 5.0,
}

// Simple pure seed-based LCG PRNG helper to keep render-phase calculations pure
const createPRNG = (seed) => {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

// Issue #5: Mathematically correct framerate-independent exponential decay
const lerpFI = (current, target, factor, delta) =>
  current + (target - current) * (1.0 - Math.exp(-factor * delta))

// Fresnel Atmospheric Glow
const FresnelGlowMaterial = shaderMaterial(
  { color: new THREE.Color('#3b82f6'), glowPower: SCENE_CONFIG.globe.glowPower, glowIntensity: SCENE_CONFIG.globe.glowIntensity },
  `varying vec3 vNormal; varying vec3 vViewPosition;
   void main() { vNormal = normalize(normalMatrix * normal); vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vViewPosition = -mvPosition.xyz; gl_Position = projectionMatrix * mvPosition; }`,
  `uniform vec3 color; uniform float glowPower; uniform float glowIntensity; varying vec3 vNormal; varying vec3 vViewPosition;
   void main() { vec3 normal = normalize(vNormal); vec3 viewDir = normalize(vViewPosition); float intensity = pow(1.0 - max(dot(normal, viewDir), 0.0), glowPower) * glowIntensity; gl_FragColor = vec4(color, intensity); }`
)
extend({ FresnelGlowMaterial })

// ─── CameraRig ───────────────────────────────────────────────────────────────
// Issue #7: Camera drift respects distanceFactor.
// Issue #18: lookAt cached and only calculated on subpixel movement.
// Issue #4: Wrap timer accumulator to prevent precision loss.
function CameraRig({ distanceFactor }) {
  const shouldReduceMotion = useReducedMotion()
  const easedFactor = useRef(1.0)
  const timeAccum = useRef(0)
  const lastX = useRef(0)
  const lastY = useRef(0)

  useFrame((state, delta) => {
    if (shouldReduceMotion) return
    
    // Wrap time accumulator (Issue #4)
    timeAccum.current = (timeAccum.current + delta) % 100000
    const t = timeAccum.current

    easedFactor.current = lerpFI(easedFactor.current, distanceFactor.current, LERP.proximitySpeed, delta)
    const f = easedFactor.current

    const nextX = (Math.sin(t * 0.06) * 0.035 + Math.cos(t * 0.14) * 0.015) * f
    const nextY = (Math.cos(t * 0.04) * 0.035 + Math.sin(t * 0.11) * 0.015) * f

    state.camera.position.x = nextX
    state.camera.position.y = nextY

    // Issue #18: Clamp lookAt matrix calculations to subpixel offsets
    if (Math.abs(nextX - lastX.current) > 0.0001 || Math.abs(nextY - lastY.current) > 0.0001) {
      state.camera.lookAt(0, 0, 0)
      lastX.current = nextX
      lastY.current = nextY
    }
  })
  return null
}

function Lights() {
  const lightRef = useRef()
  useFrame(() => {
    if (globalTheme.updated && lightRef.current) {
      lightRef.current.color.set(globalTheme.color)
    }
  })
  return (
    <>
      <ambientLight intensity={0.1} />
      <hemisphereLight args={['#ffffff', '#090913', 0.2]} />
      <directionalLight position={[5, 4, 4]} intensity={1.0} color="#ffffff" />
      <pointLight ref={lightRef} position={[-4, -1, -4]} intensity={1.5} color={globalTheme.color} distance={12} decay={2.2} />
    </>
  )
}

function MicroParticles({ distanceFactor }) {
  const pointsRef   = useRef()
  const easedFactor = useRef(1.0)
  const shouldReduceMotion = useReducedMotion()

  const [positions] = useMemo(() => {
    const random = createPRNG(42)
    const { count, minRadius, spread } = SCENE_CONFIG.particles
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const u = random(), v = random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const r = minRadius + random() * spread
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return [pos]
  }, [])

  useFrame((state, delta) => {
    if (!shouldReduceMotion && pointsRef.current) {
      easedFactor.current = lerpFI(easedFactor.current, distanceFactor.current, LERP.proximitySpeed, delta)
      const f = easedFactor.current
      pointsRef.current.rotation.y += delta * 0.01 * f
      pointsRef.current.rotation.x += delta * 0.005 * f
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={globalTheme.color} size={0.02} transparent opacity={0.18}
        sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function Globe({ distanceFactor }) {
  const wireRef    = useRef()
  const pointsRef  = useRef()
  const easedFactor = useRef(1.0)
  const timeAccum   = useRef(0)
  const shouldReduceMotion = useReducedMotion()

  const geomWire   = useMemo(() => new THREE.IcosahedronGeometry(SCENE_CONFIG.globe.radius, 2), [])
  const geomPoints = useMemo(() => new THREE.IcosahedronGeometry(SCENE_CONFIG.globe.radius, 4), [])
  const geomGlass  = useMemo(() => new THREE.SphereGeometry(SCENE_CONFIG.globe.glassRadius, 32, 32), [])
  const geomHalo   = useMemo(() => new THREE.SphereGeometry(SCENE_CONFIG.globe.haloRadius, 32, 32), [])

  useFrame((state, delta) => {
    if (shouldReduceMotion) return
    timeAccum.current = (timeAccum.current + delta) % 100000
    const time = timeAccum.current

    easedFactor.current = lerpFI(easedFactor.current, distanceFactor.current, LERP.proximitySpeed, delta)
    const f = easedFactor.current
    if (wireRef.current)   wireRef.current.rotation.y  += delta * 0.08 * f
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.10 * f
      pointsRef.current.rotation.x += delta * 0.02 * f
      pointsRef.current.material.size = (0.025 + Math.sin(time * 2.5) * 0.005) * (0.3 + 0.7 * f)
    }
  })

  return (
    <group>
      <mesh geometry={geomGlass}>
        <meshStandardMaterial color="#0a0f1e" roughness={0.25} metalness={0.6}
          transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh ref={wireRef} geometry={geomWire}>
        <meshBasicMaterial color={globalTheme.color} wireframe transparent
          opacity={SCENE_CONFIG.globe.wireframeOpacity} depthWrite={false} />
      </mesh>
      <points ref={pointsRef} geometry={geomPoints}>
        <pointsMaterial color={globalTheme.color} size={0.028} transparent
          opacity={SCENE_CONFIG.globe.pointsOpacity} sizeAttenuation
          depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh geometry={geomHalo}>
        <fresnelGlowMaterial color={globalTheme.color}
          glowPower={SCENE_CONFIG.globe.glowPower}
          glowIntensity={SCENE_CONFIG.globe.glowIntensity}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function OrbitingIcon({ social, tiltZ, speed, radius, initialPhase, index, distanceFactor, hoveredCountRef }) {
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
  const lastStyle = useRef({ opacity: -1, scaleVal: -1, glowOpacity: -1, brightnessVal: -1, saturateVal: -1 })
  const STYLE_THRESHOLD = 0.002

  const handlePointerOver = useCallback(() => {
    hoverRef.current = true
    hoveredCountRef.current += 1
  }, [hoveredCountRef])

  const handlePointerOut = useCallback(() => {
    hoverRef.current = false
    hoveredCountRef.current = Math.max(0, hoveredCountRef.current - 1)
  }, [hoveredCountRef])

  useFrame((state, delta) => {
    if (shouldReduceMotion) return
    timeAccum.current = (timeAccum.current + delta) % 100000
    const time    = timeAccum.current
    const hovered = hoverRef.current

    easedSpeedFactor.current = lerpFI(easedSpeedFactor.current, distanceFactor.current, LERP.proximitySpeed, delta)
    const f = easedSpeedFactor.current

    const targetGlow = hovered ? 1.0 : 0.0
    const glowSpeed  = hovered ? LERP.hoverGlowIn : LERP.hoverGlowOut
    hoverGlowFactor.current = lerpFI(hoverGlowFactor.current, targetGlow, glowSpeed, delta)

    const organicVariation = 1.0 + Math.sin(time * 0.15 + index) * 0.06
    const isAnyHovered     = hoveredCountRef.current > 0
    const targetSpeedMult  = isAnyHovered ? 0.2 : 1.0
    speedMultiplier.current = lerpFI(speedMultiplier.current, targetSpeedMult, LERP.orbitSpeed, delta)

    if (rotationRef.current) {
      rotationRef.current.rotation.y += delta * speed * speedMultiplier.current * organicVariation * f
    }

    const targetBob = hovered ? 0.0 : Math.sin(time * 2.0 + index * 1.6) * 0.05 * f
    bobOffset.current = lerpFI(bobOffset.current, targetBob, LERP.bobOffset, delta)
    if (iconGroupRef.current) iconGroupRef.current.position.y = bobOffset.current

    if (iconGroupRef.current && htmlRef.current) {
      iconGroupRef.current.getWorldPosition(tempVec)
      tempVec.applyMatrix4(state.camera.matrixWorldInverse)

      const camZ  = state.camera.position.z || SCENE_CONFIG.depth.cameraZ
      const maxZ  = -(camZ - radius)
      // Issue #2: Fixed Z-tilt math fallacy - bounds are exactly [-radius, radius]
      const minZ  = -(camZ + radius)
      const depth = THREE.MathUtils.clamp((tempVec.z - minZ) / (maxZ - minZ), 0, 1)

      const baseScale     = 0.92 + depth * 0.08
      const scaleVal      = baseScale * (1.0 + hoverGlowFactor.current * 0.06)
      const opacityVal    = 0.25 + depth * 0.75
      const brightnessVal = 0.5  + depth * 0.5
      const saturateVal   = 0.6  + depth * 0.4
      const glowOpacity   = hoverGlowFactor.current

      // Issue #3: Dirty-check before writing styles
      const prev = lastStyle.current
      if (Math.abs(opacityVal - prev.opacity) > STYLE_THRESHOLD) {
        htmlRef.current.style.opacity = opacityVal
        prev.opacity = opacityVal
      }
      if (Math.abs(scaleVal - prev.scaleVal) > STYLE_THRESHOLD) {
        htmlRef.current.style.transform = `scale(${scaleVal})`
        prev.scaleVal = scaleVal
      }
      if (Math.abs(brightnessVal - prev.brightnessVal) > STYLE_THRESHOLD || Math.abs(saturateVal - prev.saturateVal) > STYLE_THRESHOLD) {
        htmlRef.current.style.filter = `brightness(${brightnessVal.toFixed(3)}) saturate(${saturateVal.toFixed(3)})`
        prev.brightnessVal = brightnessVal
        prev.saturateVal   = saturateVal
      }
      // Issue #6: Update glow layer opacity imperatively (no repaint invalidation)
      if (glowRef.current && Math.abs(glowOpacity - prev.glowOpacity) > 0.01) {
        glowRef.current.style.opacity = glowOpacity.toFixed(2)
        prev.glowOpacity = glowOpacity
      }
    }
  })

  // Issue #13: Update glow element shadow color on active theme color updates
  useFrame(() => {
    if (globalTheme.updated && glowRef.current) {
      glowRef.current.style.boxShadow = `0 0 16px ${globalTheme.color}`
    }
  })

  return (
    <group rotation={[0, 0, tiltZ]}>
      <group ref={rotationRef} rotation={[0, initialPhase, 0]}>
        <group ref={iconGroupRef} position={[radius, 0, 0]}>
          <Html center transform sprite distanceFactor={8} pointerEvents="auto">
            <div className="relative group/tooltip pointer-events-auto">
              {/* Issue #3: Expanded target hitboxes with absolute pseudo-elements (Fitts's Law compliance) */}
              <a
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${social.platform} profile`}
                className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-bg-surface/90 border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-colors duration-300 backdrop-blur-md cursor-pointer shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-accent after:absolute after:inset-[-12px] after:content-['']"
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                ref={htmlRef}
              >
                <SocialIcon platform={social.platform} className="h-5 w-5" />
                {/* Issue #6: Composited glow layer - transitions opacity only (no paint invalidate) */}
                <div
                  ref={glowRef}
                  className="absolute inset-0 rounded-xl pointer-events-none opacity-0 transition-shadow duration-300 blur-sm"
                  style={{ boxShadow: `0 0 16px ${globalTheme.color}` }}
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
}

function Scene({ socialsToRender, distanceFactor, hoveredCountRef }) {
  const { width } = useThree((state) => state.size)
  
  // Issue #7: Continuous linear interpolation scaling instead of discrete pop-jumps
  const scale = useMemo(() => {
    if (width < 300) return 0.7
    if (width > 380) return 1.0
    return 0.7 + ((width - 300) / 80) * 0.3
  }, [width])

  // Imperative scene color update on theme state transitions
  useFrame((state) => {
    if (globalTheme.updated) {
      const color = new THREE.Color(globalTheme.color)
      state.scene.traverse((obj) => {
        if (obj.isMesh || obj.isPoints) {
          if (obj.material) {
            if (obj.material.color) obj.material.color.copy(color)
            if (obj.material.uniforms && obj.material.uniforms.color) {
              obj.material.uniforms.color.value.copy(color)
            }
          }
        }
      })
      // Set updated flag back to false once consumed by frame loops
      globalTheme.updated = false
    }
  })

  return (
    <group scale={scale}>
      <Lights />
      <CameraRig distanceFactor={distanceFactor} />
      <Globe distanceFactor={distanceFactor} />
      <MicroParticles distanceFactor={distanceFactor} />
      {socialsToRender.map((social, i) => {
        const config = ORBIT_CONFIGS[i % ORBIT_CONFIGS.length]
        return (
          <OrbitingIcon
            key={social.platform}
            social={social}
            tiltZ={config.tiltZ}
            speed={config.speed}
            radius={config.radius}
            initialPhase={config.initialPhase}
            index={i}
            distanceFactor={distanceFactor}
            hoveredCountRef={hoveredCountRef}
          />
        )
      })}
    </group>
  )
}

export default function Contact3DObject() {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)
  const distanceFactor = useRef(1.0)
  const hoveredCountRef = useRef(0)
  const cachedRect = useRef(null)

  // WebGL Context Loss graceful UI recovery handler
  const [webglSupported, setWebglSupported] = useState(true)

  // Issue #13: MutationObserver on <html> (retains theme synchronization, bypassing React renders)
  useEffect(() => {
    const readTheme = () => {
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()
      if (accent && accent !== globalTheme.color) {
        globalTheme.color = accent
        globalTheme.updated = true // triggers meshes & lights imperative update inside frame loops
      }
    }
    readTheme()
    const observer = new MutationObserver(readTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] })
    return () => observer.disconnect()
  }, [])

  // Issue #9: Cache rect, update on resize/scroll only
  useEffect(() => {
    const update = () => { if (containerRef.current) cachedRect.current = containerRef.current.getBoundingClientRect() }
    update()
    window.addEventListener("resize", update, { passive: true })
    window.addEventListener("scroll", update, { passive: true })
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update) }
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
    { platform: "leetcode", url: personal.socials.leetcode },
  ].filter(s => s.url), [])

  if (shouldReduceMotion) return null

  return (
    <>
      {/* Issue #14: Accessibility Fallback Nav Links - descriptive screen-reader text */}
      <nav aria-label="Social media links" className="sr-only">
        {socialsToRender.map(s => (
          <a key={s.platform} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit Sai Pallav's ${s.platform} profile`}>
            Sai Pallav's {s.platform}
          </a>
        ))}
      </nav>

      {/* Re-render wrapper only hidden on mobile (hidden md:flex) */}
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-0 md:bottom-10 right-0 md:right-[5%] w-72 h-72 md:w-96 md:h-96 z-10 pointer-events-none hidden md:flex items-center justify-center"
      >
        <div
          className="absolute w-[60%] h-[60%] rounded-full blur-[100px] pointer-events-none -z-10 transition-colors duration-500"
          style={{ background: `radial-gradient(circle, ${globalTheme.color} 0%, transparent 70%)`, opacity: 0.08 }}
        />
        
        <div className="absolute inset-0 pointer-events-none">
          {webglSupported ? (
            <Canvas 
              camera={SCENE_CONFIG.camera}
              onCreated={({ gl }) => {
                const canvasEl = gl.domElement
                const handleContextLost = (e) => {
                  e.preventDefault()
                  setWebglSupported(false)
                }
                canvasEl.addEventListener('webglcontextlost', handleContextLost)
                return () => {
                  canvasEl.removeEventListener('webglcontextlost', handleContextLost)
                }
              }}
            >
              <Scene socialsToRender={socialsToRender} distanceFactor={distanceFactor} hoveredCountRef={hoveredCountRef} />
            </Canvas>
          ) : (
            // Robust 2D recovery fallback: elegant animated list in place of crashed WebGL canvas
            <div className="flex items-center justify-center w-full h-full pointer-events-auto">
              <div className="flex gap-4 p-4 rounded-2xl bg-bg-surface/50 border border-white/5 backdrop-blur-md shadow-2xl animate-fade-in">
                {socialsToRender.map(s => (
                  <a
                    key={s.platform}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${s.platform} profile`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-bg-surface border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-all duration-300"
                  >
                    <SocialIcon platform={s.platform} className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
