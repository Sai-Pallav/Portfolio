import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useReducedMotion } from 'framer-motion'
import * as THREE from 'three'

const SCENE_CONFIG = {
  proximity: { maxDistance: 220, minDistance: 40, minFactor: 0.05 },
  particles: { count: 30, minRadius: 2.4, spread: 2.0 },
}

const createPRNG = (seed) => {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

const lerpFI = (current, target, factor, delta) =>
  current + (target - current) * (1.0 - Math.exp(-factor * delta))

export default React.memo(function ParticleLayer({ distanceFactor, themeColor }) {
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
      easedFactor.current = lerpFI(easedFactor.current, distanceFactor.current, 3.5, delta)
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
      <pointsMaterial color={themeColor} size={0.02} transparent opacity={0.18}
        sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
})
