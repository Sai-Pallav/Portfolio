import { useRef, useMemo, useEffect, useState, useCallback, memo } from 'react'
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber'
import { Html, shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { motion, useReducedMotion } from 'framer-motion'
import { personal } from '@/data/personal'
import SocialIcon from '@/components/ui/SocialIcon'

// --- Global Theme Ref for Imperative Material Updates (No React Re-renders) ---
const globalTheme = {
  color: '#3b82f6',
  version: 0,
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
    tiltX: 0,
    tiltA: Math.PI / 4,
    tiltB: -Math.PI / 4,
  },
  depth: { cameraZ: 8 },
  proximity: { maxDistance: 220, minDistance: 40, minFactor: 0.05 },
  particles: { count: 30, minRadius: 2.4, spread: 2.0 },
}

// Three-tier hierarchical orbital system (TASK 15 configuration)
// Orbit 1 (inner): Professional Identity - GitHub, LinkedIn
// Orbit 2 (middle): Technical Proof - LeetCode, GeeksforGeeks
// Orbit 3 (outer): Direct Action - Email (copy), Resume (download)
const ORBITAL_PLANES = {
  inner: {
    inclination: 28 * (Math.PI / 180),   // 28° tilt
    radius: 2.6,                           // Closest orbit
    period: 18,                            // 18 seconds per revolution
    precessionPeriod: 100,                 // Axis precession over 100s
  },
  middle: {
    inclination: 68 * (Math.PI / 180),   // 68° tilt
    radius: 3.0,                           // Medium orbit
    period: 26,                            // 26 seconds per revolution
    precessionPeriod: 110,                 // Axis precession over 110s
  },
  outer: {
    inclination: 115 * (Math.PI / 180),  // 115° tilt
    radius: 3.3,                           // Outermost orbit
    period: 38,                            // 38 seconds per revolution
    precessionPeriod: 120,                 // Axis precession over 120s
  },
}

// Icon-to-orbit mapping with phase locking for paired icons
const ICON_ORBIT_CONFIG = {
  // Orbit 1: Professional Identity
  github:   { orbit: 'inner',  initialPhase: 0 },
  linkedin: { orbit: 'inner',  initialPhase: Math.PI },  // Phase-locked 180° opposite
  
  // Orbit 2: Technical Proof
  leetcode: { orbit: 'middle', initialPhase: 0 },
  gfg:      { orbit: 'middle', initialPhase: Math.PI },  // Phase-locked 180° opposite
  
  // Orbit 3: Direct Action
  email:    { orbit: 'outer',  initialPhase: 0 },
  resume:   { orbit: 'outer',  initialPhase: Math.PI },  // Phase-locked 180° opposite
}

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
// Ring Glow Custom Neon Material - calm infrastructure look with burst ripples
const RingGlowMaterial = shaderMaterial(
  { 
    color: new THREE.Color('#8B5CFF'), 
    opacity: 0.8,
    time: 0,
    rippleProgress: 0.0,
    rippleOrigin: 0.0
  },
  `varying vec3 vNormal; varying vec3 vViewPosition; varying vec2 vUv;
   void main() { vUv = uv; vNormal = normalize(normalMatrix * normal); vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vViewPosition = -mvPosition.xyz; gl_Position = projectionMatrix * mvPosition; }`,
  `uniform vec3 color; uniform float opacity; uniform float time; uniform float rippleProgress; uniform float rippleOrigin; varying vec3 vNormal; varying vec3 vViewPosition; varying vec2 vUv;
   void main() { 
     vec3 normal = normalize(vNormal); vec3 viewDir = normalize(vViewPosition); 
     float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 1.5); 
     
     // Subtle base glow without pulses
     vec3 baseColor = color * 0.35;
     vec3 edgeGlow = color * fresnel * 1.5;
     
     // Propagating ripple from chosen origin (Rare Burst)
     float rippleGlow = 0.0;
     if (rippleProgress > 0.0 && rippleProgress < 1.0) {
       float dist = abs(vUv.x - rippleOrigin);
       if (dist > 0.5) dist = 1.0 - dist;
       float angleDist = dist * 2.0 * 3.14159265;
       float waveFront = rippleProgress * 3.14159265;
       float wavePeak = exp(-pow(angleDist - waveFront, 2.0) / 0.08);
       rippleGlow = wavePeak * (1.0 - rippleProgress) * 0.8;
     }
     
     vec3 finalColor = baseColor + edgeGlow + color * rippleGlow * 1.5;
     
     // Camera space Z depth fade to enhance volumetric hologram depth
     float depthFade = clamp((vViewPosition.z + 10.45) / 4.9, 0.2, 1.0);
     float finalOpacity = opacity * (0.2 + fresnel * 0.8 + rippleGlow) * depthFade;
     
     gl_FragColor = vec4(finalColor, finalOpacity); 
   }`
)
extend({ RingGlowMaterial })

// Comet Trail Glow Shader Material - Flowing Plasma look
const TrailGlowMaterial = shaderMaterial(
  {
    coreColor: new THREE.Color('#ffffff'),
    edgeColor: new THREE.Color('#8B5CFF'),
    opacity: 0.0,
    isReverse: 0.0,
    trailLengthFactor: 1.0,
    time: 0.0
  },
  `varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewPosition;
   void main() { 
     vUv = uv; 
     vNormal = normalize(normalMatrix * normal); 
     vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); 
     vViewPosition = -mvPosition.xyz; 
     gl_Position = projectionMatrix * mvPosition; 
   }`,
  `uniform vec3 coreColor; uniform vec3 edgeColor; uniform float opacity; uniform float isReverse; uniform float trailLengthFactor; uniform float time; varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewPosition;
   void main() {
     // Maximum trail length is 20% of the circumference
     float maxFraction = 0.20; 
     
     // Slight internal turbulence/noise in the plasma tail
     float noise = sin(vUv.y * 12.0 + time * 6.0) * cos(vUv.x * 24.0 - time * 4.0) * 0.02;
     float distortedUvX = clamp(vUv.x + noise, 0.0, 1.0);
     
     float tailFade = 0.0;
     if (isReverse > 0.5) {
       // Clockwise rotation: trail is in range [0.0, maxFraction]
       if (distortedUvX <= maxFraction) {
         float progress = 1.0 - (distortedUvX / maxFraction); // 1.0 at head (0.0), 0.0 at tail (maxFraction)
         float activeProgress = (progress - (1.0 - trailLengthFactor)) / trailLengthFactor;
         tailFade = activeProgress > 0.0 ? pow(activeProgress, 1.8) : 0.0;
       }
     } else {
       // Counter-clockwise rotation: trail is in range [1.0 - maxFraction, 1.0]
       if (distortedUvX >= 1.0 - maxFraction) {
         float progress = (distortedUvX - (1.0 - maxFraction)) / maxFraction; // 0.0 at tail (1.0 - maxFraction), 1.0 at head (1.0)
         float activeProgress = (progress - (1.0 - trailLengthFactor)) / trailLengthFactor;
         tailFade = activeProgress > 0.0 ? pow(activeProgress, 1.8) : 0.0;
       }
     }

     // Core vs Edge ratio
     vec3 normal = normalize(vNormal);
     vec3 viewDir = normalize(vViewPosition);
     float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 1.2);
     
     // Cross-section coordinate to make center white, edges violet with UV waving distortion
     float waveDistortion = sin(distortedUvX * 16.0 + time * 5.0) * 0.04;
     float centerFactor = sin(clamp(vUv.y + waveDistortion, 0.0, 1.0) * 3.14159265);
     float coreFactor = pow(centerFactor, 5.0) * (1.0 - fresnel * 0.4);
     
     vec3 finalColor = mix(edgeColor, coreColor, coreFactor);
     float edgeFade = smoothstep(0.0, 0.15, centerFactor) * (0.4 + 0.6 * fresnel);
     
     // Camera space Z depth fade
     float depthFade = clamp((vViewPosition.z + 10.45) / 4.9, 0.2, 1.0);
     
     gl_FragColor = vec4(finalColor, opacity * tailFade * edgeFade * depthFade);
   }`
)
extend({ TrailGlowMaterial })

// Local Segment Activation Material (20-30 degrees short energized arc)
const SegmentGlowMaterial = shaderMaterial(
  {
    color: new THREE.Color('#ffffff'),
    opacity: 0.0
  },
  `varying vec3 vNormal; varying vec3 vViewPosition; varying vec2 vUv;
   void main() { vUv = uv; vNormal = normalize(normalMatrix * normal); vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vViewPosition = -mvPosition.xyz; gl_Position = projectionMatrix * mvPosition; }`,
  `uniform vec3 color; uniform float opacity; varying vec3 vNormal; varying vec3 vViewPosition; varying vec2 vUv;
   void main() {
     // Show 25 degrees around the icon (25 / 360 = 0.07 fraction)
     float fraction = 0.07;
     float mask = 0.0;
     if (vUv.x <= fraction) {
       mask = 1.0 - (vUv.x / fraction);
     } else if (vUv.x >= 1.0 - fraction) {
       mask = (vUv.x - (1.0 - fraction)) / fraction;
     }
     
     if (mask <= 0.0) discard;
     
     vec3 normal = normalize(vNormal); vec3 viewDir = normalize(vViewPosition); 
     float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 1.5); 
     
     vec3 finalColor = color * (1.0 + fresnel * 2.0);
     float finalOpacity = opacity * mask * (0.3 + fresnel * 0.7);
     
     // Apply depth fade
     float depthFade = clamp((vViewPosition.z + 10.45) / 4.9, 0.2, 1.0);
     
     gl_FragColor = vec4(finalColor, finalOpacity * depthFade);
   }`
)
extend({ SegmentGlowMaterial })
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
  const lastColorVersion = useRef(-1)
  useFrame(() => {
    if (lastColorVersion.current !== globalTheme.version && lightRef.current) {
      lightRef.current.color.set(globalTheme.color)
      lastColorVersion.current = globalTheme.version
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
  const pointsRef = useRef()
  const easedFactor = useRef(1.0)
  const timeAccum = useRef(0)
  const shouldReduceMotion = useReducedMotion()

  const geomWire = useMemo(() => new THREE.IcosahedronGeometry(SCENE_CONFIG.globe.radius, 2), [])
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
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.10 * f
      pointsRef.current.rotation.x += delta * 0.02 * f
      pointsRef.current.material.size = (0.025 + Math.sin(time * 2.5) * 0.005) * (0.3 + 0.7 * f)
    }
  })

  return (
    <group>
      <mesh geometry={geomGlass} name="glassCore">
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

function OrbitingIcon({ iconData, reactionGlowRef, onHoverChange, distanceFactor, hoveredCountRef, hoveredOrbitRef }) {
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
  })

  // Theme shadow synchronization
  const lastColorVersion = useRef(-1)
  useFrame(() => {
    if (lastColorVersion.current !== globalTheme.version && glowRef.current) {
      glowRef.current.style.boxShadow = `0 0 16px ${globalTheme.color}`
      lastColorVersion.current = globalTheme.version
    }
  })

  const renderLink = () => {
    const iconContent = (
      <>
        <SocialIcon platform={platform} className="h-5 w-5" />
        <div
          ref={glowRef}
          className="absolute inset-0 rounded-xl pointer-events-none opacity-0 transition-shadow duration-300 blur-sm"
          style={{ boxShadow: `0 0 16px ${globalTheme.color}` }}
        />
      </>
    )

    if (specialType === 'email') {
      return (
        <button
          onClick={handleIconClick}
          aria-label="Copy email address to clipboard"
          className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-bg-surface/90 border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-colors duration-300 backdrop-blur-md cursor-pointer shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-accent after:absolute after:inset-[-12px] after:content-['']"
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
          className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-bg-surface/90 border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-colors duration-300 backdrop-blur-md cursor-pointer shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-accent after:absolute after:inset-[-12px] after:content-['']"
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
        className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-bg-surface/90 border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-colors duration-300 backdrop-blur-md cursor-pointer shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-accent after:absolute after:inset-[-12px] after:content-['']"
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

// Create shared geometry and material to reuse across all OrbitGroup components
const sharedRingGeometry = new THREE.TorusGeometry(2.45, 0.035, 32, 256)
const sharedRingMaterial = (() => {
  const mat = new RingGlowMaterial()
  mat.transparent = true
  mat.blending = THREE.AdditiveBlending
  mat.depthWrite = false
  mat.color = new THREE.Color('#8B5CFF')
  mat.opacity = 0.35
  return mat
})()

const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const OrbitalRing = memo(function OrbitalRing({ 
  myRingIndex,
  activeTransmissionRef,
  activeBurstRef,
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

  const trailMeshARef = useRef()
  const trailMeshBRef = useRef()

  const iconWrapperARef = useRef()
  const iconWrapperBRef = useRef()

  const packetMeshARef = useRef()
  const packetMeshBRef = useRef()

  const orbitGroupPhase = useRef(0)
  const pivotAPhase = useRef(0)
  const pivotBPhase = useRef(Math.PI)

  const isHoveredARef = useRef(false)
  const isHoveredBRef = useRef(false)
  const hoverFactorA = useRef(0)
  const hoverFactorB = useRef(0)

  const wasHoveredA = useRef(false)
  const wasHoveredB = useRef(false)

  // Packet animation states
  const packetActiveA = useRef(false)
  const packetProgressA = useRef(0)
  const packetCooldownA = useRef(6 + Math.random() * 4)
  const packetTimerA = useRef(0)

  const packetActiveB = useRef(false)
  const packetProgressB = useRef(0)
  const packetCooldownB = useRef(6 + Math.random() * 4)
  const packetTimerB = useRef(0)

  // Reaction animation states (scale / glow jump)
  const reactionActiveA = useRef(false)
  const reactionTimeA = useRef(0)
  const reactionFactorA = useRef(0.0)

  const reactionActiveB = useRef(false)
  const reactionTimeB = useRef(0)
  const reactionFactorB = useRef(0.0)

  const tempVecA = useMemo(() => new THREE.Vector3(), [])
  const tempVecB = useMemo(() => new THREE.Vector3(), [])

  // Dynamic radius ref
  const radiusRef = useRef(2.45)

  // Create ring and segment materials per ring instance to support independent ripple uniforms
  const ringMaterial = useMemo(() => {
    const mat = new RingGlowMaterial()
    mat.transparent = true
    mat.blending = THREE.AdditiveBlending
    mat.depthWrite = false
    mat.color = new THREE.Color('#8B5CFF')
    mat.opacity = 0.35
    mat.rippleProgress = 0.0
    mat.rippleOrigin = 0.0
    mat.time = 0.0
    return mat
  }, [])

  const segmentMaterialA = useMemo(() => {
    const mat = new SegmentGlowMaterial()
    mat.transparent = true
    mat.blending = THREE.AdditiveBlending
    mat.depthWrite = false
    mat.color = new THREE.Color('#ffffff')
    mat.opacity = 0.0
    return mat
  }, [])

  const segmentMaterialB = useMemo(() => {
    const mat = new SegmentGlowMaterial()
    mat.transparent = true
    mat.blending = THREE.AdditiveBlending
    mat.depthWrite = false
    mat.color = new THREE.Color('#ffffff')
    mat.opacity = 0.0
    return mat
  }, [])

  // Memoize trail materials per icon
  const trailMaterialA = useMemo(() => {
    const mat = new TrailGlowMaterial()
    mat.transparent = true
    mat.blending = THREE.AdditiveBlending
    mat.depthWrite = false
    mat.coreColor = new THREE.Color('#ffffff')
    mat.edgeColor = new THREE.Color('#8B5CFF')
    mat.isReverse = iconSpeed < 0 ? 1.0 : 0.0
    mat.trailLengthFactor = 1.0
    mat.opacity = 0.0
    mat.time = 0.0
    return mat
  }, [iconSpeed])

  const trailMaterialB = useMemo(() => {
    const mat = new TrailGlowMaterial()
    mat.transparent = true
    mat.blending = THREE.AdditiveBlending
    mat.depthWrite = false
    mat.coreColor = new THREE.Color('#ffffff')
    mat.edgeColor = new THREE.Color('#8B5CFF')
    mat.isReverse = iconSpeed < 0 ? 1.0 : 0.0
    mat.trailLengthFactor = 1.0
    mat.opacity = 0.0
    mat.time = 0.0
    return mat
  }, [iconSpeed])

  const packetMaterialA = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }), [])
  const packetMaterialB = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }), [])

  useFrame((state, delta) => {
    const tGlobal = state.clock.getElapsedTime()

    // Smooth hover factor lerping
    const targetHoverA = isHoveredARef.current ? 1.0 : 0.0
    hoverFactorA.current = lerpFI(hoverFactorA.current, targetHoverA, 6.0, delta)

    const targetHoverB = isHoveredBRef.current ? 1.0 : 0.0
    hoverFactorB.current = lerpFI(hoverFactorB.current, targetHoverB, 6.0, delta)

    // Dynamic radius expansion on hover
    const activeHover = Math.max(hoverFactorA.current, hoverFactorB.current)
    const targetRadius = 2.45 + activeHover * 0.08
    radiusRef.current = lerpFI(radiusRef.current, targetRadius, 6.0, delta)
    const currentRadius = radiusRef.current

    // Scale the Torus meshes to expand radius dynamically
    const scaleFactor = currentRadius / 2.45
    if (meshRef.current) {
      meshRef.current.scale.set(scaleFactor, scaleFactor, 1.0)
    }
    if (trailMeshARef.current) {
      trailMeshARef.current.scale.set(scaleFactor, scaleFactor, 1.0)
    }
    if (trailMeshBRef.current) {
      trailMeshBRef.current.scale.set(scaleFactor, scaleFactor, 1.0)
    }

    // Set dynamic positions of icon wrappers
    if (iconWrapperARef.current) {
      iconWrapperARef.current.position.set(currentRadius, 0, zOffset)
    }
    if (iconWrapperBRef.current) {
      iconWrapperBRef.current.position.set(currentRadius, 0, zOffset)
    }

    // Orbital Speed Easing: Reduce speed by 10% when hovered
    const speedMultiplier = 1.0 - activeHover * 0.10
    const activeIconSpeed = iconSpeed * speedMultiplier

    // 1. Rotate the OrbitGroup itself slowly (carrying the RingMesh and both IconPivots)
    orbitGroupPhase.current = (orbitGroupPhase.current + delta * ringSpeed) % (2 * Math.PI)
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.z = orbitGroupPhase.current
    }

    // 2. Rotate the IconPivots (making the icons revolve along the ring)
    pivotAPhase.current = (pivotAPhase.current + delta * activeIconSpeed) % (2 * Math.PI)
    pivotBPhase.current = (pivotBPhase.current + delta * activeIconSpeed) % (2 * Math.PI)

    if (pivotARef.current) {
      pivotARef.current.rotation.z = pivotAPhase.current
    }
    if (pivotBRef.current) {
      pivotBRef.current.rotation.z = pivotBPhase.current
    }

    // --- Packet Event triggers ---
    const hoveredA = isHoveredARef.current
    const hoveredB = isHoveredBRef.current

    // Hover triggers: requests sync if no other transmission is active
    if (hoveredA && !wasHoveredA.current) {
      if (!packetActiveA.current && !packetActiveB.current && !activeTransmissionRef.current) {
        packetActiveA.current = true
        packetProgressA.current = 0.0
        activeTransmissionRef.current = `packet-r${myRingIndex}-a`
      }
    }
    wasHoveredA.current = hoveredA

    if (hoveredB && !wasHoveredB.current) {
      if (!packetActiveA.current && !packetActiveB.current && !activeTransmissionRef.current) {
        packetActiveB.current = true
        packetProgressB.current = 0.0
        activeTransmissionRef.current = `packet-r${myRingIndex}-b`
      }
    }
    wasHoveredB.current = hoveredB

    // Transmission frequency temporarily doubles on hover (timer speed = 2.0)
    const timerSpeedA = hoveredA ? 2.0 : 1.0
    const timerSpeedB = hoveredB ? 2.0 : 1.0

    // Trigger on periodic cooldown: only if no transmission is active anywhere
    if (!packetActiveA.current && !packetActiveB.current && (!activeBurstRef.current || activeBurstRef.current.ringIndex !== myRingIndex)) {
      if (!activeTransmissionRef.current) {
        packetTimerA.current += delta * timerSpeedA
        if (packetTimerA.current >= packetCooldownA.current) {
          packetActiveA.current = true
          packetProgressA.current = 0.0
          packetTimerA.current = 0
          packetCooldownA.current = 6 + Math.random() * 4
          activeTransmissionRef.current = `packet-r${myRingIndex}-a`
        }
      }
    }
    if (!packetActiveA.current && !packetActiveB.current && (!activeBurstRef.current || activeBurstRef.current.ringIndex !== myRingIndex)) {
      if (!activeTransmissionRef.current) {
        packetTimerB.current += delta * timerSpeedB
        if (packetTimerB.current >= packetCooldownB.current) {
          packetActiveB.current = true
          packetProgressB.current = 0.0
          packetTimerB.current = 0
          packetCooldownB.current = 6 + Math.random() * 4
          activeTransmissionRef.current = `packet-r${myRingIndex}-b`
        }
      }
    }

    // Update periodic packet A
    if (packetActiveA.current) {
      packetProgressA.current += delta / 1.2 // 1.2s travel time
      if (packetProgressA.current >= 1.0) {
        packetActiveA.current = false
        packetProgressA.current = 1.0
        reactionActiveA.current = true
        reactionTimeA.current = 0.0
      }
      if (packetMeshARef.current) {
        const progress = packetProgressA.current
        const easedProgress = easeInOutCubic(progress)
        packetMeshARef.current.position.set(currentRadius * easedProgress, 0, zOffset)
        
        // Streak motion blur (elongation during transit)
        const streakStretch = 1.0 + Math.sin(progress * Math.PI) * 1.5
        const streakThin = 1.0 - Math.sin(progress * Math.PI) * 0.4
        packetMeshARef.current.scale.set(streakStretch, streakThin, streakThin)
        
        packetMaterialA.opacity = THREE.MathUtils.clamp(Math.min(progress / 0.15, (1.0 - progress) / 0.05), 0, 1)
      }
    } else {
      // Hide packet if not active and not part of the Rare Burst
      const isBurstTargetA = activeBurstRef.current && activeBurstRef.current.ringIndex === myRingIndex && activeBurstRef.current.iconIndex === 0 && activeBurstRef.current.stage === 'travel'
      if (!isBurstTargetA) {
        packetMaterialA.opacity = 0.0
      }
    }

    // Update periodic packet B
    if (packetActiveB.current) {
      packetProgressB.current += delta / 1.2 // 1.2s travel time
      if (packetProgressB.current >= 1.0) {
        packetActiveB.current = false
        packetProgressB.current = 1.0
        reactionActiveB.current = true
        reactionTimeB.current = 0.0
      }
      if (packetMeshBRef.current) {
        const progress = packetProgressB.current
        const easedProgress = easeInOutCubic(progress)
        packetMeshBRef.current.position.set(currentRadius * easedProgress, 0, zOffset)
        
        // Streak motion blur (elongation during transit)
        const streakStretch = 1.0 + Math.sin(progress * Math.PI) * 1.5
        const streakThin = 1.0 - Math.sin(progress * Math.PI) * 0.4
        packetMeshBRef.current.scale.set(streakStretch, streakThin, streakThin)
        
        packetMaterialB.opacity = THREE.MathUtils.clamp(Math.min(progress / 0.15, (1.0 - progress) / 0.05), 0, 1)
      }
    } else {
      const isBurstTargetB = activeBurstRef.current && activeBurstRef.current.ringIndex === myRingIndex && activeBurstRef.current.iconIndex === 1 && activeBurstRef.current.stage === 'travel'
      if (!isBurstTargetB) {
        packetMaterialB.opacity = 0.0
      }
    }

    // --- Rare Communication Burst Sync Stage & Propagation ---
    let burstReactionFactorA = 0.0
    let burstReactionFactorB = 0.0

    // Set time uniform on ringMaterial for custom shader effects
    ringMaterial.time = tGlobal

    if (activeBurstRef.current && activeBurstRef.current.ringIndex === myRingIndex) {
      const burst = activeBurstRef.current
      const progress = burst.progress
      
      if (burst.stage === 'travel') {
        const easedProgress = easeInOutCubic(progress)
        if (burst.iconIndex === 0) {
          if (packetMeshARef.current) {
            packetMeshARef.current.position.set(currentRadius * easedProgress, 0, zOffset)
            const streakStretch = 1.0 + Math.sin(progress * Math.PI) * 2.2
            const streakThin = 1.0 - Math.sin(progress * Math.PI) * 0.5
            packetMeshARef.current.scale.set(streakStretch, streakThin, streakThin)
            packetMaterialA.opacity = THREE.MathUtils.clamp(Math.min(progress / 0.15, (1.0 - progress) / 0.05), 0, 1)
          }
        } else {
          if (packetMeshBRef.current) {
            packetMeshBRef.current.position.set(currentRadius * easedProgress, 0, zOffset)
            const streakStretch = 1.0 + Math.sin(progress * Math.PI) * 2.2
            const streakThin = 1.0 - Math.sin(progress * Math.PI) * 0.5
            packetMeshBRef.current.scale.set(streakStretch, streakThin, streakThin)
            packetMaterialB.opacity = THREE.MathUtils.clamp(Math.min(progress / 0.15, (1.0 - progress) / 0.05), 0, 1)
          }
        }
      } else if (burst.stage === 'sync') {
        // Sync envelope lasts first 380ms of the 800ms stage (0.475 fraction of progress)
        const pSync = Math.min(progress / 0.475, 1.0)
        const syncFactor = pSync < 0.15 ? (pSync / 0.15) : Math.pow((1.0 - pSync) / 0.85, 2.0)
        
        if (burst.iconIndex === 0) {
          burstReactionFactorA = syncFactor
        } else {
          burstReactionFactorB = syncFactor
        }
        
        // Propagate ripple along ring
        ringMaterial.rippleProgress = progress
        ringMaterial.rippleOrigin = burst.iconIndex === 0 ? 0.0 : 0.5
      }
    } else {
      ringMaterial.rippleProgress = 0.0
    }

    // Update periodic reaction timers & release locks
    if (reactionActiveA.current) {
      reactionTimeA.current += delta
      const p = reactionTimeA.current / 0.38 // 380ms duration
      if (p >= 1.0) {
        reactionActiveA.current = false
        reactionFactorA.current = 0.0
        if (activeTransmissionRef.current === `packet-r${myRingIndex}-a`) {
          activeTransmissionRef.current = null // Release lock
        }
      } else {
        // Fast attack, smooth decay envelope
        reactionFactorA.current = p < 0.15 ? (p / 0.15) : Math.pow((1.0 - p) / 0.85, 2.0)
      }
    }

    if (reactionActiveB.current) {
      reactionTimeB.current += delta
      const p = reactionTimeB.current / 0.38 // 380ms duration
      if (p >= 1.0) {
        reactionActiveB.current = false
        reactionFactorB.current = 0.0
        if (activeTransmissionRef.current === `packet-r${myRingIndex}-b`) {
          activeTransmissionRef.current = null // Release lock
        }
      } else {
        reactionFactorB.current = p < 0.15 ? (p / 0.15) : Math.pow((1.0 - p) / 0.85, 2.0)
      }
    }

    // Combine periodic reaction and burst reaction factors
    const activeReactionA = Math.max(reactionFactorA.current, burstReactionFactorA)
    const activeReactionB = Math.max(reactionFactorB.current, burstReactionFactorB)

    // Feed combined reaction to wrapper scales
    const hoverScaleA = 1.0 + hoverFactorA.current * 0.05
    const syncScaleA = 1.0 + activeReactionA * 0.08
    if (iconWrapperARef.current) {
      iconWrapperARef.current.scale.set(hoverScaleA * syncScaleA, hoverScaleA * syncScaleA, hoverScaleA * syncScaleA)
    }

    const hoverScaleB = 1.0 + hoverFactorB.current * 0.05
    const syncScaleB = 1.0 + activeReactionB * 0.08
    if (iconWrapperBRef.current) {
      iconWrapperBRef.current.scale.set(hoverScaleB * syncScaleB, hoverScaleB * syncScaleB, hoverScaleB * syncScaleB)
    }

    // Update segment materials (20-30 degrees short energized arcs)
    segmentMaterialA.opacity = activeReactionA
    segmentMaterialB.opacity = activeReactionB

    // --- Depth Calculation & Trail Uniform Updates ---
    const camZ = state.camera.position.z || 8
    const maxZ = -(camZ - currentRadius * 1.2)
    const minZ = -(camZ + currentRadius * 1.2)

    // Depth A
    let depthA = 1.0
    if (iconWrapperARef.current) {
      iconWrapperARef.current.getWorldPosition(tempVecA)
      tempVecA.applyMatrix4(state.camera.matrixWorldInverse)
      depthA = THREE.MathUtils.clamp((tempVecA.z - minZ) / (maxZ - minZ), 0, 1)
    }

    // Depth B
    let depthB = 1.0
    if (iconWrapperBRef.current) {
      iconWrapperBRef.current.getWorldPosition(tempVecB)
      tempVecB.applyMatrix4(state.camera.matrixWorldInverse)
      depthB = THREE.MathUtils.clamp((tempVecB.z - minZ) / (maxZ - minZ), 0, 1)
    }

    // Dynamic organic breathing for trail ribbon lengths (between 12% and 18%)
    const breatheA = Math.sin(tGlobal * 0.37) * 0.5 + Math.cos(tGlobal * 0.13) * 0.3
    const breatheB = Math.sin(tGlobal * 0.41) * 0.5 + Math.cos(tGlobal * 0.17) * 0.3

    const baseLengthA = 0.72 + breatheA * 0.08
    const baseLengthB = 0.72 + breatheB * 0.08

    const targetLengthA = baseLengthA + hoverFactorA.current * 0.25
    const targetLengthB = baseLengthB + hoverFactorB.current * 0.25

    // Update trail uniforms (depth fades trail, hover/sync extends/brightens it)
    if (trailMaterialA) {
      trailMaterialA.time = tGlobal
      trailMaterialA.opacity = (0.05 + depthA * 0.25) * 0.8 + activeReactionA * 0.6
      trailMaterialA.trailLengthFactor = THREE.MathUtils.clamp(targetLengthA * (0.6 + depthA * 0.4), 0, 1)
    }
    if (trailMaterialB) {
      trailMaterialB.time = tGlobal
      trailMaterialB.opacity = (0.05 + depthB * 0.25) * 0.8 + activeReactionB * 0.6
      trailMaterialB.trailLengthFactor = THREE.MathUtils.clamp(targetLengthB * (0.6 + depthB * 0.4), 0, 1)
    }

    // Sync glow values to refs so OrbitingIcon can read them
    reactionFactorA.current = activeReactionA
    reactionFactorB.current = activeReactionB
  })

  const radTilt = 65 * (Math.PI / 180)
  const radZ = angle * (Math.PI / 180)
  const radius = 2.45
  const DEBUG = false

  return (
    <group rotation={[0, 0, radZ]}>
      <group rotation={[radTilt, 0, 0]}>
        {/* OrbitGroup contains the RingMesh, both IconPivots, and trails */}
        <group ref={orbitGroupRef}>
          {/* RingMesh with localized material for independent ripple wave propagation */}
          <mesh ref={meshRef} geometry={sharedRingGeometry} material={ringMaterial} />

          {/* IconPivot A */}
          <group ref={pivotARef}>
            {DEBUG && (
              <mesh position={[0, 0, zOffset]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshBasicMaterial color="red" wireframe />
              </mesh>
            )}
            {/* Trail segment covering exact orbit path */}
            <mesh 
              ref={trailMeshARef}
              position={[0, 0, zOffset]}
              geometry={sharedRingGeometry} 
              material={trailMaterialA} 
            />
            {/* Local Ring Activation segment centered around icon */}
            <mesh 
              position={[0, 0, zOffset]}
              geometry={sharedRingGeometry} 
              material={segmentMaterialA} 
            />
            {/* Emerging data packet */}
            <mesh ref={packetMeshARef} material={packetMaterialA}>
              <sphereGeometry args={[0.05, 8, 8]} />
            </mesh>
            {/* Connected endpoint */}
            <group ref={iconWrapperARef} position={[radius, 0, zOffset]}>
              {icons[0] && (
                <OrbitingIcon
                  iconData={icons[0]}
                  reactionGlowRef={reactionFactorA}
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
            {DEBUG && (
              <mesh position={[0, 0, zOffset]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshBasicMaterial color="blue" wireframe />
              </mesh>
            )}
            {/* Trail segment covering exact orbit path */}
            <mesh 
              ref={trailMeshBRef}
              position={[0, 0, zOffset]}
              geometry={sharedRingGeometry} 
              material={trailMaterialB} 
            />
            {/* Local Ring Activation segment centered around icon */}
            <mesh 
              position={[0, 0, zOffset]}
              geometry={sharedRingGeometry} 
              material={segmentMaterialB} 
            />
            {/* Emerging data packet */}
            <mesh ref={packetMeshBRef} material={packetMaterialB}>
              <sphereGeometry args={[0.05, 8, 8]} />
            </mesh>
            {/* Connected endpoint */}
            <group ref={iconWrapperBRef} position={[radius, 0, zOffset]}>
              {icons[1] && (
                <OrbitingIcon
                  iconData={icons[1]}
                  reactionGlowRef={reactionFactorB}
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

function Scene({ iconsToRender, distanceFactor, hoveredCountRef, hoveredOrbitRef }) {
  const { width } = useThree((state) => state.size)

  // Concurrency lock to respect Premium Constraint: at most ONE major animation at a time
  const activeTransmissionRef = useRef(null)

  // Rare Communication Burst coordinator
  const activeBurstRef = useRef(null)
  const burstCooldownRef = useRef(15 + Math.random() * 5) // 15-20s
  const burstTimerRef = useRef(0)

  // Issue #7: Continuous linear interpolation scaling instead of discrete pop-jumps
  // Scale reduced to 0.78 max so globe+orbits fit within 420px container without visual bleed
  const scale = useMemo(() => {
    if (width < 300) return 0.55
    if (width > 380) return 0.78
    return 0.55 + ((width - 300) / 80) * 0.23
  }, [width])

  // Imperative scene color update on theme state transitions
  const lastColorVersion = useRef(-1)
  
  useFrame((state, delta) => {
    // --- Rare Communication Burst Coordinator ---
    if (!activeBurstRef.current) {
      if (!activeTransmissionRef.current) {
        burstTimerRef.current += delta
        if (burstTimerRef.current >= burstCooldownRef.current) {
          const r = Math.floor(Math.random() * 3)
          const i = Math.floor(Math.random() * 2)
          activeBurstRef.current = { ringIndex: r, iconIndex: i, progress: 0.0, stage: 'travel' }
          activeTransmissionRef.current = 'burst' // Acquire lock
          burstTimerRef.current = 0
          burstCooldownRef.current = 15 + Math.random() * 5
        }
      }
    } else {
      const burst = activeBurstRef.current
      if (burst.stage === 'travel') {
        burst.progress += delta / 1.2 // 1.2s travel
        if (burst.progress >= 1.0) {
          burst.progress = 0.0
          burst.stage = 'sync'
        }
      } else if (burst.stage === 'sync') {
        burst.progress += delta / 0.8 // 800ms sync & ripple propagation
        if (burst.progress >= 1.0) {
          activeBurstRef.current = null
          activeTransmissionRef.current = null // Release lock
        }
      }
    }

    if (lastColorVersion.current !== globalTheme.version) {
      const color = new THREE.Color(globalTheme.color)
      state.scene.traverse((obj) => {
        if (obj.name === 'glassCore') return
        if (obj.geometry && obj.geometry === sharedRingGeometry) return // Retain custom neon purple
        if (obj.isMesh || obj.isPoints) {
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
            mats.forEach((mat) => {
              if (mat.color) mat.color.copy(color)
              if (mat.uniforms && mat.uniforms.color) {
                mat.uniforms.color.value.copy(color)
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
        activeTransmissionRef={activeTransmissionRef}
        activeBurstRef={activeBurstRef}
        angle={0} 
        ringSpeed={0.02} 
        iconSpeed={0.35}
        icons={ringIcons[0]} 
        zOffset={-0.12}
        distanceFactor={distanceFactor}
        hoveredCountRef={hoveredCountRef}
        hoveredOrbitRef={hoveredOrbitRef}
      />
      <OrbitalRing 
        myRingIndex={1}
        activeTransmissionRef={activeTransmissionRef}
        activeBurstRef={activeBurstRef}
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
        activeTransmissionRef={activeTransmissionRef}
        activeBurstRef={activeBurstRef}
        angle={120} 
        ringSpeed={0.013} 
        iconSpeed={0.22}
        icons={ringIcons[2]} 
        zOffset={0.12}
        distanceFactor={distanceFactor}
        hoveredCountRef={hoveredCountRef}
        hoveredOrbitRef={hoveredOrbitRef}
      />
    </group>
  )
}

export default function Contact3DObject() {
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
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()
      if (accent && accent !== globalTheme.color) {
        globalTheme.color = accent
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
    const { maxDistance, minDistance, minFactor } = SCENE_CONFIG.proximity
    let ticking = false

    const handleMouseMove = (e) => {
      if (ticking || !cachedRect.current || shouldReduceMotion || !webglSupported) return
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
  }, [shouldReduceMotion, webglSupported])

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
        className="relative w-full aspect-square max-w-[380px] lg:max-w-[420px] z-10 pointer-events-none hidden md:flex items-center justify-center"
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
}
