import { useRef, useMemo, useEffect, useState, useCallback, memo } from 'react'
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber'
import { Html, shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { motion, useReducedMotion } from 'framer-motion'
import { personal } from '@/data/personal'
import SocialIcon from '@/components/ui/SocialIcon'

// --- Global Theme Ref for Imperative Material Updates (No React Re-renders) ---
const globalTheme = {
  color: '#8b5cf6',
  secondaryColor: '#a855f7',
  version: 0,
}

// Scene constants
const SCENE_CONFIG = {
  camera: { position: [0, 0, 8], fov: 45 },
  globe: {
    radius: 2.0,
    glassRadius: 1.96,
    haloRadius: 2.08,
    wireframeOpacity: 0.12,
    pointsOpacity: 0.50,
    glowIntensity: 0.75,
    glowPower: 4.8,
  },
  orbit: {
    radius: 2.8,
    tiltX: 0,
    tiltA: Math.PI / 4,
    tiltB: -Math.PI / 4,
  },
  depth: { cameraZ: 8 },
  proximity: { maxDistance: 220, minDistance: 40, minFactor: 0.05 },
  particles: { count: 30, minRadius: 2.4, spread: 2.0 },
}

// Three-tier hierarchical orbital system (TASK 15 configuration)


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
  { color: new THREE.Color('#8b5cf6'), glowPower: SCENE_CONFIG.globe.glowPower, glowIntensity: SCENE_CONFIG.globe.glowIntensity },
  `varying vec3 vNormal; varying vec3 vViewPosition;
   void main() { vNormal = normalize(normalMatrix * normal); vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vViewPosition = -mvPosition.xyz; gl_Position = projectionMatrix * mvPosition; }`,
  `uniform vec3 color; uniform float glowPower; uniform float glowIntensity; varying vec3 vNormal; varying vec3 vViewPosition;
   void main() { vec3 normal = normalize(vNormal); vec3 viewDir = normalize(vViewPosition); float intensity = pow(1.0 - max(dot(normal, viewDir), 0.0), glowPower) * glowIntensity; gl_FragColor = vec4(color, intensity); }`
)
extend({ FresnelGlowMaterial })
// Ring Glow Custom Neon Material - clean, calm infrastructure look
const RingGlowMaterial = shaderMaterial(
  { 
    color: new THREE.Color('#8B5CFF'), 
    opacity: 0.8
  },
  `varying vec3 vNormal; varying vec3 vViewPosition; varying vec2 vUv;
   void main() { vUv = uv; vNormal = normalize(normalMatrix * normal); vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vViewPosition = -mvPosition.xyz; gl_Position = projectionMatrix * mvPosition; }`,
  `uniform vec3 color; uniform float opacity; varying vec3 vNormal; varying vec3 vViewPosition; varying vec2 vUv;
   void main() { 
     vec3 normal = normalize(vNormal); vec3 viewDir = normalize(vViewPosition); 
     float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 1.5); 
     
     vec3 baseColor = color * 0.35;
     vec3 edgeGlow = color * fresnel * 1.5;
     vec3 finalColor = baseColor + edgeGlow;
     
     // Camera space Z depth fade to enhance volumetric hologram depth
     float depthFade = clamp((vViewPosition.z + 10.45) / 4.9, 0.2, 1.0);
     float finalOpacity = opacity * (0.2 + fresnel * 0.8) * depthFade;
     
     gl_FragColor = vec4(finalColor, finalOpacity); 
   }`
)
extend({ RingGlowMaterial })
// ─────────────────────────────────────────────────────────────────────────────
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
  const lastColorVersion = useRef(-1)
  useFrame(() => {
    if (lastColorVersion.current !== globalTheme.version && lightRef.current) {
      lightRef.current.color.set(globalTheme.color)
      lastColorVersion.current = globalTheme.version
    }
  })
  return (
    <>
      <ambientLight intensity={0.25} />
      <hemisphereLight args={['#ffffff', '#090913', 0.3]} />
      <directionalLight position={[5, 4, 4]} intensity={1.2} color="#ffffff" />
      <pointLight ref={lightRef} position={[-4, -1, -4]} intensity={2.2} color={globalTheme.color} distance={12} decay={2.2} />
    </>
  )
}

function MicroParticles({ distanceFactor }) {
  const pointsRef = useRef()
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
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
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
  const wireRef = useRef()
  const gridRef = useRef()
  const pointsRef = useRef()
  const easedFactor = useRef(1.0)
  const timeAccum = useRef(0)
  const shouldReduceMotion = useReducedMotion()

  const geomWire = useMemo(() => new THREE.IcosahedronGeometry(SCENE_CONFIG.globe.radius, 2), [])
  const geomGrid = useMemo(() => new THREE.IcosahedronGeometry(SCENE_CONFIG.globe.radius * 1.025, 1), [])
  const geomPoints = useMemo(() => new THREE.IcosahedronGeometry(SCENE_CONFIG.globe.radius, 4), [])
  const geomGlass = useMemo(() => new THREE.SphereGeometry(SCENE_CONFIG.globe.glassRadius, 32, 32), [])
  const geomHalo = useMemo(() => new THREE.SphereGeometry(SCENE_CONFIG.globe.haloRadius, 32, 32), [])

  useFrame((state, delta) => {
    if (shouldReduceMotion) return
    timeAccum.current = (timeAccum.current + delta) % 100000
    const time = timeAccum.current

    easedFactor.current = lerpFI(easedFactor.current, distanceFactor.current, LERP.proximitySpeed, delta)
    const f = easedFactor.current
    if (wireRef.current) wireRef.current.rotation.y += delta * 0.08 * f
    if (gridRef.current) {
      gridRef.current.rotation.y -= delta * 0.05 * f
      gridRef.current.rotation.x -= delta * 0.015 * f
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.10 * f
      pointsRef.current.rotation.x += delta * 0.02 * f
      pointsRef.current.material.size = (0.025 + Math.sin(time * 2.5) * 0.005) * (0.3 + 0.7 * f)
    }
  })

  return (
    <group>
      <mesh geometry={geomGlass} name="glassCore">
        <meshStandardMaterial color="#0a0814" roughness={0.25} metalness={0.6}
          transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh ref={wireRef} geometry={geomWire}>
        <meshBasicMaterial color={globalTheme.color} wireframe transparent
          opacity={SCENE_CONFIG.globe.wireframeOpacity} depthWrite={false} />
      </mesh>
      <mesh ref={gridRef} geometry={geomGrid}>
        <meshBasicMaterial color={globalTheme.color} wireframe transparent
          opacity={SCENE_CONFIG.globe.wireframeOpacity * 0.7} depthWrite={false} />
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

function OrbitingIcon({ iconData, reactionGlowRef, onHoverChange, hoveredCountRef }) {
  const iconGroupRef = useRef()
  const htmlRef = useRef()
  const glowRef = useRef()

  const hoverRef = useRef(false)
  const shouldReduceMotion = useReducedMotion()

  const hoverGlowFactor = useRef(0.0)
  const lastStyle = useRef({ opacity: -1, scaleVal: -1, glowOpacity: -1, brightnessVal: -1, saturateVal: -1 })
  const STYLE_THRESHOLD = 0.002

  const { platform, url, specialType } = iconData
  const [copied, setCopied] = useState(false)

  const tempVec = useMemo(() => new THREE.Vector3(), [])

  const handlePointerOver = useCallback(() => {
    hoverRef.current = true
    hoveredCountRef.current += 1
    if (onHoverChange) onHoverChange(true)
  }, [hoveredCountRef, onHoverChange])

  const handlePointerOut = useCallback(() => {
    hoverRef.current = false
    hoveredCountRef.current = Math.max(0, hoveredCountRef.current - 1)
    if (onHoverChange) onHoverChange(false)
  }, [hoveredCountRef, onHoverChange])

  const handleIconClick = useCallback((e) => {
    if (specialType === 'email') {
      e.preventDefault()
      e.stopPropagation()
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = url
        textArea.style.position = "fixed"
        textArea.style.opacity = "0"
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand("copy")
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch (err) {
          console.error("Fallback copy failed", err)
        }
        document.body.removeChild(textArea)
      }
    }
  }, [specialType, url])

    // Combined physics loop and theme shadow synchronization
    const lastColorVersion = useRef(-1)

    useFrame((state, delta) => {
      if (shouldReduceMotion) return
      const hovered = hoverRef.current

      const targetGlow = hovered ? 1.0 : 0.0
      const glowSpeed = hovered ? LERP.hoverGlowIn : LERP.hoverGlowOut
      hoverGlowFactor.current = lerpFI(hoverGlowFactor.current, targetGlow, glowSpeed, delta)

      // Depth-based opacity, scale, and brightness
      if (iconGroupRef.current && htmlRef.current) {
        iconGroupRef.current.getWorldPosition(tempVec)
        tempVec.applyMatrix4(state.camera.matrixWorldInverse)

        const camZ = state.camera.position.z || SCENE_CONFIG.depth.cameraZ
        const radius = 2.45
        const maxZ = -(camZ - radius * 1.2)
        const minZ = -(camZ + radius * 1.2)
        const depth = THREE.MathUtils.clamp((tempVec.z - minZ) / (maxZ - minZ), 0, 1)

        const baseScale = 0.95 + depth * 0.08
        const scaleVal = baseScale * (1.0 + hoverGlowFactor.current * 0.03)
        const opacityVal = 0.55 + depth * 0.45
        const brightnessVal = 0.8 + depth * 0.2
        const saturateVal = 0.85 + depth * 0.15
        const reactionGlow = reactionGlowRef ? reactionGlowRef.current : 0.0
        const glowOpacity = Math.max(hoverGlowFactor.current, reactionGlow)

        // Dirty-check style updates
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
          prev.saturateVal = saturateVal
        }
        if (glowRef.current && Math.abs(glowOpacity - prev.glowOpacity) > 0.01) {
          glowRef.current.style.opacity = glowOpacity.toFixed(2)
          prev.glowOpacity = glowOpacity
        }
      }

      // Theme shadow synchronization (combined to reduce hook overhead)
      if (lastColorVersion.current !== globalTheme.version && glowRef.current) {
        glowRef.current.style.boxShadow = `0 0 16px ${globalTheme.color}`
        lastColorVersion.current = globalTheme.version
      }
    })

  const renderLink = () => {
    const iconContent = (
      <>
        <SocialIcon platform={platform} className="h-4 w-4" />
        <div
          ref={glowRef}
          className="absolute inset-0 rounded-lg pointer-events-none opacity-0 transition-shadow duration-300 blur-sm"
          style={{ boxShadow: `0 0 16px ${globalTheme.color}` }}
        />
      </>
    )

    if (specialType === 'email') {
      return (
        <button
          onClick={handleIconClick}
          aria-label="Copy email address to clipboard"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-bg-surface/90 border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-colors duration-300 backdrop-blur-md cursor-pointer shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-accent after:absolute after:inset-[-12px] after:content-['']"
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          ref={htmlRef}
        >
          {iconContent}
        </button>
      )
    }

    if (specialType === 'resume') {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download
          aria-label="Download resume PDF"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-bg-surface/90 border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-colors duration-300 backdrop-blur-md cursor-pointer shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-accent after:absolute after:inset-[-12px] after:content-['']"
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          ref={htmlRef}
        >
          {iconContent}
        </a>
      )
    }

    // Regular social link
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${platform} profile`}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-bg-surface/90 border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-colors duration-300 backdrop-blur-md cursor-pointer shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-accent after:absolute after:inset-[-12px] after:content-['']"
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        ref={htmlRef}
      >
        {iconContent}
      </a>
    )
  }

  return (
    <group ref={iconGroupRef}>
      <Html center transform sprite distanceFactor={8} pointerEvents="auto">
        <div className="relative group/tooltip pointer-events-auto">
          {renderLink()}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 px-3 py-1.5 rounded-lg bg-bg-raised/95 border border-white/[0.08] backdrop-blur-md opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 pointer-events-none shadow-[0_4px_16px_rgba(0,0,0,0.5)] scale-90 group-hover/tooltip:scale-100">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-heading)] whitespace-nowrap">
              {specialType === 'email' && copied ? 'Copied!' : platform}
            </span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-bg-raised border-t border-l border-white/[0.08] rotate-45 -translate-y-[4px]" />
          </div>
        </div>
      </Html>
    </group>
  )
}

const sharedRingGeometry = new THREE.TorusGeometry(2.45, 0.035, 8, 128)

const OrbitalRing = memo(function OrbitalRing({ 
  myRingIndex,
  angle, 
  ringSpeed, 
  iconSpeed, 
  icons, 
  zOffset, 
  distanceFactor, 
  hoveredCountRef, 
  hoveredOrbitRef 
}) {
  const orbitGroupRef = useRef()
  const meshRef = useRef()
  const pivotARef = useRef()
  const pivotBRef = useRef()

  const iconWrapperARef = useRef()
  const iconWrapperBRef = useRef()

  const orbitGroupPhase = useRef(0)
  const pivotAPhase = useRef(0)
  const pivotBPhase = useRef(Math.PI)

  const isHoveredARef = useRef(false)
  const isHoveredBRef = useRef(false)
  const hoverFactorA = useRef(0)
  const hoverFactorB = useRef(0)
  const easedDistance = useRef(1.0)

  // Create ring material per ring instance
  const ringMaterial = useMemo(() => {
    const mat = new RingGlowMaterial()
    mat.transparent = true
    mat.blending = THREE.AdditiveBlending
    mat.depthWrite = false
    mat.color = new THREE.Color('#8B5CFF')
    mat.opacity = 0.35
    return mat
  }, [])

  useEffect(() => {
    return () => {
      ringMaterial.dispose()
    }
  }, [ringMaterial])

  useFrame((state, delta) => {
    // Eased distance factor (smooth deceleration as cursor moves closer)
    const targetDist = distanceFactor ? distanceFactor.current : 1.0
    easedDistance.current = lerpFI(easedDistance.current, targetDist, LERP.proximitySpeed, delta)
    const proximitySpeedFactor = easedDistance.current

    // Smooth hover factor lerping
    const targetHoverA = isHoveredARef.current ? 1.0 : 0.0
    hoverFactorA.current = lerpFI(hoverFactorA.current, targetHoverA, 6.0, delta)

    const targetHoverB = isHoveredBRef.current ? 1.0 : 0.0
    hoverFactorB.current = lerpFI(hoverFactorB.current, targetHoverB, 6.0, delta)

    // Fixed orbital radius (prevents ring expansion or shift on hover)
    const currentRadius = 2.45

    // Set static positions of icon wrappers
    if (iconWrapperARef.current) {
      iconWrapperARef.current.position.set(currentRadius, 0, zOffset)
    }
    if (iconWrapperBRef.current) {
      iconWrapperBRef.current.position.set(currentRadius, 0, zOffset)
    }

    // Orbital speed governed smoothly by cursor proximity
    const activeIconSpeed = iconSpeed * proximitySpeedFactor
    const activeRingSpeed = ringSpeed * proximitySpeedFactor

    // 1. Rotate the OrbitGroup itself slowly according to cursor distance
    orbitGroupPhase.current = (orbitGroupPhase.current + delta * activeRingSpeed) % (2 * Math.PI)
    
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.z = orbitGroupPhase.current
    }

    // 2. Rotate the IconPivots (making the icons revolve along the ring according to cursor distance)
    pivotAPhase.current = (pivotAPhase.current + delta * activeIconSpeed) % (2 * Math.PI)
    pivotBPhase.current = (pivotBPhase.current + delta * activeIconSpeed) % (2 * Math.PI)

    if (pivotARef.current) {
      pivotARef.current.rotation.z = pivotAPhase.current
    }
    if (pivotBRef.current) {
      pivotBRef.current.rotation.z = pivotBPhase.current
    }

    // Feed hover scale to icon wrapper
    const hoverScaleA = 1.0 + hoverFactorA.current * 0.05
    if (iconWrapperARef.current) {
      iconWrapperARef.current.scale.set(hoverScaleA, hoverScaleA, hoverScaleA)
    }

    const hoverScaleB = 1.0 + hoverFactorB.current * 0.05
    if (iconWrapperBRef.current) {
      iconWrapperBRef.current.scale.set(hoverScaleB, hoverScaleB, hoverScaleB)
    }
  })

  const radTilt = 65 * (Math.PI / 180)
  const radZ = angle * (Math.PI / 180)
  const radius = 2.45

  return (
    <group rotation={[0, 0, radZ]}>
      <group rotation={[radTilt, 0, 0]}>
        <group ref={orbitGroupRef}>
          <mesh ref={meshRef} position={[0, 0, zOffset]} geometry={sharedRingGeometry} material={ringMaterial} />

          {/* IconPivot A */}
          <group ref={pivotARef}>
            <group ref={iconWrapperARef} position={[radius, 0, zOffset]}>
              {icons[0] && (
                <OrbitingIcon
                  iconData={icons[0]}
                  onHoverChange={(hovered) => {
                    isHoveredARef.current = hovered
                  }}
                  distanceFactor={distanceFactor}
                  hoveredCountRef={hoveredCountRef}
                  hoveredOrbitRef={hoveredOrbitRef}
                />
              )}
            </group>
          </group>

          {/* IconPivot B */}
          <group ref={pivotBRef}>
            <group ref={iconWrapperBRef} position={[radius, 0, zOffset]}>
              {icons[1] && (
                <OrbitingIcon
                  iconData={icons[1]}
                  onHoverChange={(hovered) => {
                    isHoveredBRef.current = hovered
                  }}
                  distanceFactor={distanceFactor}
                  hoveredCountRef={hoveredCountRef}
                  hoveredOrbitRef={hoveredOrbitRef}
                />
              )}
            </group>
          </group>
        </group>
      </group>
    </group>
  )
})

const tempColorA = new THREE.Color()
const tempColorB = new THREE.Color()

function Scene({ iconsToRender, distanceFactor, hoveredCountRef, hoveredOrbitRef }) {
  const { width } = useThree((state) => state.size)

  const scale = useMemo(() => {
    if (width < 300) return 0.55
    if (width > 380) return 0.78
    return 0.55 + ((width - 300) / 80) * 0.23
  }, [width])

  // Imperative scene color update on theme state transitions
  const lastColorVersion = useRef(-1)
  
  useFrame((state) => {
    if (lastColorVersion.current !== globalTheme.version) {
      tempColorA.set(globalTheme.color)
      tempColorB.set(globalTheme.secondaryColor)
      state.scene.traverse((obj) => {
        if (obj.name === 'glassCore') {
          if (obj.material) {
            // Synchronize inner glass core with active theme hue (deep dark theme undertone)
            obj.material.color.set(globalTheme.color).multiplyScalar(0.10).add(new THREE.Color('#05060a'))
          }
          return
        }
        if (obj.isMesh || obj.isPoints) {
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
            mats.forEach((mat) => {
              const isSecondary = obj.geometry && obj.geometry === sharedRingGeometry
              const activeColor = isSecondary ? tempColorB : tempColorA
              if (mat.color) mat.color.copy(activeColor)
              if (mat.uniforms && mat.uniforms.color) {
                mat.uniforms.color.value.copy(activeColor)
              }
              if (mat.uniforms && mat.uniforms.edgeColor) {
                mat.uniforms.edgeColor.value.copy(tempColorB)
              }
            })
          }
        }
      })
      lastColorVersion.current = globalTheme.version
    }
  })

  // Group active icons into pairs for the 3 rings
  const ringIcons = useMemo(() => {
    const groups = [[], [], []]
    iconsToRender.forEach((icon, idx) => {
      const ringIdx = Math.floor(idx / 2) % 3
      groups[ringIdx].push(icon)
    })
    return groups
  }, [iconsToRender])

  return (
    <group scale={scale}>
      <Lights />
      <CameraRig distanceFactor={distanceFactor} />
      <Globe distanceFactor={distanceFactor} />
      <MicroParticles distanceFactor={distanceFactor} />
      
      {/* 3 Premium-looking 3D Orbital Rings */}
      <OrbitalRing 
        myRingIndex={0}
        angle={0} 
        ringSpeed={0.02} 
        iconSpeed={0.35}
        icons={ringIcons[0]} 
        zOffset={0.00}
        distanceFactor={distanceFactor}
        hoveredCountRef={hoveredCountRef}
        hoveredOrbitRef={hoveredOrbitRef}
      />
      <OrbitalRing 
        myRingIndex={1}
        angle={60} 
        ringSpeed={-0.016} 
        iconSpeed={-0.28}
        icons={ringIcons[1]} 
        zOffset={0.00}
        distanceFactor={distanceFactor}
        hoveredCountRef={hoveredCountRef}
        hoveredOrbitRef={hoveredOrbitRef}
      />
      <OrbitalRing 
        myRingIndex={2}
        angle={120} 
        ringSpeed={0.013} 
        iconSpeed={0.22}
        icons={ringIcons[2]} 
        zOffset={0.00}
        distanceFactor={distanceFactor}
        hoveredCountRef={hoveredCountRef}
        hoveredOrbitRef={hoveredOrbitRef}
      />
    </group>
  )
}

const Contact3DObject = memo(function Contact3DObject({ isInView }) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)
  const distanceFactor = useRef(1.0)
  const hoveredCountRef = useRef(0)
  const hoveredOrbitRef = useRef(null)
  const cachedRect = useRef(null)

  // WebGL Context Loss graceful UI recovery handler
  const [webglSupported, setWebglSupported] = useState(true)

  // Issue #13: MutationObserver on <html> (retains theme synchronization, bypassing React renders)
  useEffect(() => {
    const readTheme = () => {
      if (typeof document === 'undefined') return
      const styles = getComputedStyle(document.documentElement)
      const accent = styles.getPropertyValue("--accent").trim() || '#8b5cf6'
      const secondary = styles.getPropertyValue("--accent-secondary").trim() || styles.getPropertyValue("--accent-hover").trim() || accent
      let updated = false
      if (accent && accent !== globalTheme.color) {
        globalTheme.color = accent
        updated = true
      }
      if (secondary && secondary !== globalTheme.secondaryColor) {
        globalTheme.secondaryColor = secondary
        updated = true
      }
      if (updated) {
        globalTheme.version += 1
      }
    }
    readTheme()
    const observer = new MutationObserver(readTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] })
    return () => observer.disconnect()
  }, [])

  // Cache rect, update on resize/scroll/mutation using ResizeObserver to prevent layout thrashing
  useEffect(() => {
    const update = () => { 
      if (containerRef.current) {
        cachedRect.current = containerRef.current.getBoundingClientRect()
      }
    }
    update()

    const resizeObserver = new ResizeObserver(() => {
      update()
    })
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener("resize", update, { passive: true })
    window.addEventListener("scroll", update, { passive: true })
    return () => { 
      resizeObserver.disconnect()
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update)
    }
  }, [])

  useEffect(() => {
    if (!isInView || shouldReduceMotion || !webglSupported) return

    const { maxDistance, minDistance, minFactor } = SCENE_CONFIG.proximity
    let ticking = false

    const handleMouseMove = (e) => {
      if (ticking || !cachedRect.current) return
      ticking = true

      window.requestAnimationFrame(() => {
        const r = cachedRect.current
        if (r) {
          const dx = e.clientX - (r.left + r.width / 2)
          const dy = e.clientY - (r.top + r.height / 2)
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d > maxDistance) { 
            distanceFactor.current = 1.0 
          } else if (d < minDistance) { 
            distanceFactor.current = minFactor 
          } else { 
            const t = (d - minDistance) / (maxDistance - minDistance)
            const eased = t * t * (3 - 2 * t)
            distanceFactor.current = minFactor + eased * (1.0 - minFactor) 
          }
        }
        ticking = false
      })
    }
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [shouldReduceMotion, webglSupported, isInView])

  const iconsToRender = useMemo(() => {
    const icons = []
    
    // Orbit 1: Professional Identity
    if (personal.socials.github) {
      icons.push({ key: 'github', platform: 'github', url: personal.socials.github })
    }
    if (personal.socials.linkedin) {
      icons.push({ key: 'linkedin', platform: 'linkedin', url: personal.socials.linkedin })
    }
    
    // Orbit 2: Technical Proof
    if (personal.socials.leetcode) {
      icons.push({ key: 'leetcode', platform: 'leetcode', url: personal.socials.leetcode })
    }
    if (personal.socials.gfg) {
      icons.push({ key: 'gfg', platform: 'gfg', url: personal.socials.gfg })
    }
    
    // Orbit 3: Direct Action
    if (personal.email) {
      icons.push({ 
        key: 'email', 
        platform: 'email', 
        url: personal.email, 
        isSpecial: true, 
        specialType: 'email' 
      })
    }
    if (personal.resume) {
      icons.push({ 
        key: 'resume', 
        platform: 'resume', 
        url: personal.resume, 
        isSpecial: true, 
        specialType: 'resume' 
      })
    }
    
    return icons
  }, [])

  if (shouldReduceMotion) return null

  return (
    <>
      {/* Issue #14: Accessibility Fallback Nav Links - descriptive screen-reader text */}
      <nav aria-label="Social media links and contact options" className="sr-only">
        {iconsToRender.map(icon => {
          if (icon.specialType === 'email') {
            return <button key={icon.key} onClick={() => navigator.clipboard.writeText(icon.url)}>Copy email: {icon.url}</button>
          }
          if (icon.specialType === 'resume') {
            return <a key={icon.key} href={icon.url} download>Download resume</a>
          }
          return (
            <a key={icon.key} href={icon.url} target="_blank" rel="noopener noreferrer">
              Visit Sai Pallav's {icon.platform} profile
            </a>
          )
        })}
      </nav>

      {/* Re-render wrapper only hidden on mobile (hidden md:flex) */}
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full aspect-square max-w-[380px] lg:max-w-[420px] z-10 pointer-events-none flex items-center justify-center"
      >
        <div
          className="absolute w-[60%] h-[60%] rounded-full blur-[100px] pointer-events-none -z-10 transition-colors duration-500"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', opacity: 0.08 }}
        />

        <div className="absolute inset-0 pointer-events-none">
          {webglSupported ? (
            <Canvas
              frameloop={isInView ? "always" : "never"}
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
              style={{ pointerEvents: 'auto', opacity: 1 }}
            >
              <Scene 
                iconsToRender={iconsToRender} 
                distanceFactor={distanceFactor} 
                hoveredCountRef={hoveredCountRef}
                hoveredOrbitRef={hoveredOrbitRef}
              />
            </Canvas>
          ) : (
            // Robust 2D recovery fallback: elegant animated list in place of crashed WebGL canvas
            <div className="flex items-center justify-center w-full h-full pointer-events-auto">
              <div className="flex gap-4 p-4 rounded-2xl bg-bg-surface/50 border border-white/5 backdrop-blur-md shadow-2xl animate-fade-in">
                {iconsToRender.map(icon => {
                  if (icon.specialType === 'email') {
                    return (
                      <button
                        key={icon.key}
                        onClick={() => navigator.clipboard.writeText(icon.url)}
                        aria-label="Copy email address"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-bg-surface border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-all duration-300"
                      >
                        <SocialIcon platform={icon.platform} className="h-5 w-5" />
                      </button>
                    )
                  }
                  if (icon.specialType === 'resume') {
                    return (
                      <a
                        key={icon.key}
                        href={icon.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        aria-label="Download resume"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-bg-surface border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-all duration-300"
                      >
                        <SocialIcon platform={icon.platform} className="h-5 w-5" />
                      </a>
                    )
                  }
                  return (
                    <a
                      key={icon.key}
                      href={icon.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${icon.platform} profile`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-bg-surface border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-all duration-300"
                    >
                      <SocialIcon platform={icon.platform} className="h-5 w-5" />
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
})

export default Contact3DObject;
