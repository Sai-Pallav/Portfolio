import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree, extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import { useReducedMotion } from 'framer-motion'
import * as THREE from 'three'
import Lighting from './Lighting'
import ParticleLayer from './ParticleLayer'
import InteractionManager from './InteractionManager'
import OrbitingIcon from './OrbitingIcon'

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
    radius: 3.4,
    tiltA: Math.PI / 4,
    tiltB: -Math.PI / 4,
  },
}

const ORBIT_CONFIGS = [
  { tiltZ: SCENE_CONFIG.orbit.tiltA, speed: 0.265, radius: SCENE_CONFIG.orbit.radius, initialPhase: 0 },
  { tiltZ: SCENE_CONFIG.orbit.tiltB, speed: -0.295, radius: SCENE_CONFIG.orbit.radius, initialPhase: Math.PI / 2 },
  { tiltZ: SCENE_CONFIG.orbit.tiltA, speed: 0.280, radius: SCENE_CONFIG.orbit.radius, initialPhase: Math.PI },
  { tiltZ: SCENE_CONFIG.orbit.tiltB, speed: -0.270, radius: SCENE_CONFIG.orbit.radius, initialPhase: -Math.PI / 2 },
]

const lerpFI = (current, target, factor, delta) =>
  current + (target - current) * (1.0 - Math.exp(-factor * delta))

// Fresnel Atmospheric Glow
const FresnelGlowMaterial = shaderMaterial(
  { color: new THREE.Color('#2563EB'), glowPower: SCENE_CONFIG.globe.glowPower, glowIntensity: SCENE_CONFIG.globe.glowIntensity },
  `varying vec3 vNormal; varying vec3 vViewPosition;
   void main() { vNormal = normalize(normalMatrix * normal); vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vViewPosition = -mvPosition.xyz; gl_Position = projectionMatrix * mvPosition; }`,
  `uniform vec3 color; uniform float glowPower; uniform float glowIntensity; varying vec3 vNormal; varying vec3 vViewPosition;
   void main() { vec3 normal = normalize(vNormal); vec3 viewDir = normalize(vViewPosition); float intensity = pow(1.0 - max(dot(normal, viewDir), 0.0), glowPower) * glowIntensity; gl_FragColor = vec4(color, intensity); }`
)
extend({ FresnelGlowMaterial })

// Camera Rig Component
function CameraRig({ distanceFactor }) {
  const shouldReduceMotion = useReducedMotion()
  const easedFactor = useRef(1.0)
  const timeAccum = useRef(0)
  const lastX = useRef(0)
  const lastY = useRef(0)

  useFrame((state, delta) => {
    if (shouldReduceMotion) return
    
    timeAccum.current = (timeAccum.current + delta) % 100000
    const t = timeAccum.current

    easedFactor.current = lerpFI(easedFactor.current, distanceFactor.current, 3.5, delta)
    const f = easedFactor.current

    const nextX = (Math.sin(t * 0.06) * 0.035 + Math.cos(t * 0.14) * 0.015) * f
    const nextY = (Math.cos(t * 0.04) * 0.035 + Math.sin(t * 0.11) * 0.015) * f

    state.camera.position.x = nextX
    state.camera.position.y = nextY

    if (Math.abs(nextX - lastX.current) > 0.0001 || Math.abs(nextY - lastY.current) > 0.0001) {
      state.camera.lookAt(0, 0, 0)
      lastX.current = nextX
      lastY.current = nextY
    }
  })
  return null
}

// 3D Globe Mesh Sub-component
const Globe = React.memo(function Globe({ distanceFactor, themeColor, ambientIntensity }) {
  const globeGroupRef = useRef()
  const pointsRef  = useRef()
  const easedFactor = useRef(1.0)
  const timeAccum   = useRef(0)
  const shouldReduceMotion = useReducedMotion()

  const geomWire   = useMemo(() => new THREE.IcosahedronGeometry(SCENE_CONFIG.globe.radius, 2), [])
  const geomPoints = useMemo(() => new THREE.IcosahedronGeometry(SCENE_CONFIG.globe.radius, 4), [])
  const geomGlass  = useMemo(() => new THREE.SphereGeometry(SCENE_CONFIG.globe.glassRadius, 32, 32), [])
  const geomHalo   = useMemo(() => new THREE.SphereGeometry(SCENE_CONFIG.globe.haloRadius, 32, 32), [])

  // Calculate glow intensity based on ambient intensity multiplier
  const effectiveGlowIntensity = useMemo(() => 
    SCENE_CONFIG.globe.glowIntensity * ambientIntensity,
    [ambientIntensity]
  )

  useEffect(() => {
    return () => {
      geomWire.dispose()
      geomPoints.dispose()
      geomGlass.dispose()
      geomHalo.dispose()
    }
  }, [geomWire, geomPoints, geomGlass, geomHalo])

  useFrame((state, delta) => {
    if (shouldReduceMotion) return
    timeAccum.current = (timeAccum.current + delta) % 100000
    const time = timeAccum.current

    easedFactor.current = lerpFI(easedFactor.current, distanceFactor.current, 3.5, delta)
    const f = easedFactor.current
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y += delta * 0.18 * f
      globeGroupRef.current.rotation.x += delta * 0.04 * f
    }
    if (pointsRef.current) {
      pointsRef.current.material.size = (0.025 + Math.sin(time * 2.5) * 0.005) * (0.3 + 0.7 * f)
    }
  })

  return (
    <group ref={globeGroupRef}>
      <mesh geometry={geomGlass}>
        <meshStandardMaterial color="#0a0f1e" roughness={0.25} metalness={0.6}
          transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh geometry={geomWire}>
        <meshBasicMaterial color={themeColor} wireframe transparent
          opacity={SCENE_CONFIG.globe.wireframeOpacity} depthWrite={false} />
      </mesh>
      <points ref={pointsRef} geometry={geomPoints}>
        <pointsMaterial color={themeColor} size={0.028} transparent
          opacity={SCENE_CONFIG.globe.pointsOpacity} sizeAttenuation
          depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh geometry={geomHalo}>
        <fresnelGlowMaterial color={themeColor}
          glowPower={SCENE_CONFIG.globe.glowPower}
          glowIntensity={effectiveGlowIntensity}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
})

export default React.memo(function GlobeScene({ socialsToRender, distanceFactor, hoveredCountRef, themeColor, ambientIntensity, setWebglSupported }) {
  const { width } = useThree((state) => state.size)
  
  const scale = useMemo(() => {
    if (width < 300) return 0.85
    if (width > 500) return 1.15
    return 0.85 + ((width - 300) / 200) * 0.3
  }, [width])

  const orbitScale = useMemo(() => {
    if (width < 380) return 0.75
    if (width < 500) return 0.82
    if (width < 600) return 0.90
    return 1.0
  }, [width])

  return (
    <group scale={scale}>
      <Lighting themeColor={themeColor} />
      <InteractionManager setWebglSupported={setWebglSupported} />
      <CameraRig distanceFactor={distanceFactor} />
      <Globe distanceFactor={distanceFactor} themeColor={themeColor} ambientIntensity={ambientIntensity} />
      <ParticleLayer distanceFactor={distanceFactor} themeColor={themeColor} />
      <group scale={orbitScale}>
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
              themeColor={themeColor}
            />
          )
        })}
      </group>
    </group>
  )
})
