import { memo, useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { getGlowTexture, getBokehTexture } from './generateWireGeometry'

const StardustShader = {
  vertexShader: `
    attribute float size;
    attribute float alpha;
    attribute vec3 color;
    uniform float uGlowIntensity;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vAlpha = alpha * uGlowIntensity;
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      // Crisp 1.0px - 2.2px pinpoint stardust
      gl_PointSize = clamp(size * (20.0 / -mvPosition.z) * min(1.25, uGlowIntensity), 1.0, 2.2);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vec4 tex = texture2D(uTexture, gl_PointCoord);
      gl_FragColor = vec4(vColor, tex.a * clamp(vAlpha * 0.90, 0.0, 1.0));
    }
  `,
}

/**
 * 900 Tiny Pinpoint Stardust Specks (1.0px–2.2px)
 * + 25 Large Out-of-Focus Royal-Blue Bokeh Circles (opacity: 0.08–0.18) in the outer background.
 */
export const NetworkParticles = memo(function NetworkParticles({
  stardustGeo,
  particlesGeo,
  bokehGeo,
  themeConfig,
}) {
  const glowTexture = useMemo(() => getGlowTexture(32), [])
  const bokehTexture = useMemo(() => getBokehTexture(64), [])
  const glow = themeConfig.glowIntensity || 1.0

  const sGeo = stardustGeo || particlesGeo

  // 1. 900 Tiny Pinpoint Stardust Specks (1.0px - 2.2px)
  const stardustMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: glowTexture },
        uGlowIntensity: { value: glow },
      },
      vertexShader: StardustShader.vertexShader,
      fragmentShader: StardustShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [glow, glowTexture])

  // 2. 25 Soft Background Bokeh Circles (opacity: 0.08 to 0.18, Royal-Blue #0048ff)
  const bokehMat = useMemo(() => {
    const col = new THREE.Color('#0048ff')
    return new THREE.PointsMaterial({
      color: col,
      size: 0.52 * glow,
      map: bokehTexture,
      transparent: true,
      opacity: Math.min(0.18, Math.max(0.08, 0.12 * glow)),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  }, [bokehTexture, glow])

  const prevMatsRef = useRef({})
  useEffect(() => {
    const current = { stardustMat, bokehMat }
    Object.keys(prevMatsRef.current).forEach((k) => {
      const oldMat = prevMatsRef.current[k]
      if (oldMat && oldMat !== current[k]) {
        oldMat.dispose()
      }
    })
    prevMatsRef.current = current
  }, [stardustMat, bokehMat])

  return (
    <group>
      {/* 25 Background Soft Bokeh Circles */}
      {bokehGeo && <points geometry={bokehGeo} material={bokehMat} />}

      {/* 900 Tiny Pinpoint Stardust Specks */}
      {sGeo && <points geometry={sGeo} material={stardustMat} />}
    </group>
  )
})
