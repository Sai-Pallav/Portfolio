import { memo, useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { getGlowTexture, getHeroGlowTexture } from './generateWireGeometry'

/**
 * Multi-Tier Node Hierarchy:
 * 1. 6 High-Intensity Curve-Crossing Flares strictly on Hero wave intersections (u >= 0.35)
 *    - Blazing white-cyan pinpoint core (exp(-r * 18.0))
 *    - Soft, wide Royal-Blue halo (exp(-r * 3.5))
 * 2. 65 Crisp Small Glowing Neural Nodes inside the almond lobe volume
 */
export const NetworkNodes = memo(function NetworkNodes({
  focalFlaresGeo,
  heroNodesGeo,
  intersectionNodesGeo,
  connectionNodesGeo,
  themeConfig,
  nodeScale = 1.0,
}) {
  const glow = themeConfig.glowIntensity || 1.0
  const flaresGeo = focalFlaresGeo || heroNodesGeo
  const interGeo = intersectionNodesGeo || connectionNodesGeo

  const glowTexture = useMemo(() => getGlowTexture(64), [])
  const heroTexture = useMemo(() => getHeroGlowTexture(128), [])

  // 1a. Blazing White-Cyan Pinpoint Core strictly at curve crossings
  const flareCoreMat = useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color('#ffffff'),
      size: 0.45 * Math.min(1.25, glow) * nodeScale,
      map: heroTexture,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  }, [heroTexture, glow, nodeScale])

  // 1b. Soft, wide Royal-Blue halo around curve intersections (#0048ff)
  const flareHaloMat = useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color('#0048ff'),
      size: 1.35 * glow * nodeScale,
      map: glowTexture,
      transparent: true,
      opacity: Math.min(0.85, 0.75 * glow),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  }, [glowTexture, glow, nodeScale])

  // 2. 65 Crisp Small Glowing Neural Nodes inside almond lobe and perimeter
  const intersectionMat = useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color('#30d5ff'),
      size: 0.18 * Math.min(1.20, glow) * nodeScale,
      map: glowTexture,
      transparent: true,
      opacity: Math.min(1.0, 0.85 * glow),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  }, [glowTexture, glow, nodeScale])

  const prevMatsRef = useRef({})
  useEffect(() => {
    const current = { flareCoreMat, flareHaloMat, intersectionMat }
    Object.keys(prevMatsRef.current).forEach((k) => {
      const oldMat = prevMatsRef.current[k]
      if (oldMat && oldMat !== current[k]) {
        oldMat.dispose()
      }
    })
    prevMatsRef.current = current
  }, [flareCoreMat, flareHaloMat, intersectionMat])

  return (
    <group>
      {/* 6 Exact Curve-Crossing Flares (Wide Royal-Blue Halo + Blazing White-Cyan Spark) */}
      {flaresGeo && <points geometry={flaresGeo} material={flareHaloMat} />}
      {flaresGeo && <points geometry={flaresGeo} material={flareCoreMat} />}

      {/* 65 Crisp Glowing Neural Nodes inside the almond lobe */}
      {interGeo && <points geometry={interGeo} material={intersectionMat} />}
    </group>
  )
})
