import { memo, useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { getGlowTexture } from './generateWireGeometry'

const BeadedShader = {
  vertexShader: `
    attribute float size;
    attribute float alpha;
    attribute vec3 color;
    uniform float uGlowIntensity;
    uniform float uNodeScale;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vAlpha = alpha * uGlowIntensity;
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = clamp(size * uNodeScale * (28.0 / -mvPosition.z) * min(1.25, uGlowIntensity), 1.6, 4.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform sampler2D uTexture;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vec4 tex = texture2D(uTexture, gl_PointCoord);
      vec3 col = dot(vColor, vColor) > 0.0001 ? vColor : uColor;
      gl_FragColor = vec4(col, tex.a * clamp(vAlpha, 0.0, 1.0));
    }
  `,
}

/**
 * 5 Sweeping Outer Beaded Dot-Streams (75 beads per arc)
 * Floating well outside the main waves in the dark space above and below the stream.
 * Softly glowing cyan/blue dots (opacity: 0.55, fading at both ends).
 */
export const BeadedStreams = memo(function BeadedStreams({
  beadedStreamsGeo,
  themeConfig,
  nodeScale = 1.0,
}) {
  const glow = themeConfig.glowIntensity || 1.0
  const glowTexture = useMemo(() => getGlowTexture(64), [])

  const beadedMat = useMemo(() => {
    const col = new THREE.Color('#38d8ff').lerp(new THREE.Color('#0055ff'), 0.35)
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: col },
        uTexture: { value: glowTexture },
        uGlowIntensity: { value: glow },
        uNodeScale: { value: nodeScale },
      },
      vertexShader: BeadedShader.vertexShader,
      fragmentShader: BeadedShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [glowTexture, glow, nodeScale])

  const prevMatRef = useRef(beadedMat)
  useEffect(() => {
    if (prevMatRef.current && prevMatRef.current !== beadedMat) {
      prevMatRef.current.dispose()
    }
    prevMatRef.current = beadedMat
  }, [beadedMat])

  const meshRef = useRef(null)
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.matrixAutoUpdate = false
      meshRef.current.updateMatrix()
    }
  }, [])

  if (!beadedStreamsGeo) return null

  return (
    <points
      ref={meshRef}
      geometry={beadedStreamsGeo}
      material={beadedMat}
      matrixAutoUpdate={false}
      onUpdate={(self) => self.updateMatrix()}
    />
  )
})
