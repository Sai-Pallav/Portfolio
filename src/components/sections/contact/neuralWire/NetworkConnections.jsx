import { memo, useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'

const ConstellationShader = {
  vertexShader: `
    attribute float aU;
    attribute float aAlpha;
    attribute vec3 color;
    uniform float uOpacity;
    uniform float uInnerFade;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      float fadeDist = max(0.005, uInnerFade);
      float feather = smoothstep(0.0, fadeDist, aU);
      vAlpha = aAlpha * feather * uOpacity;
      vColor = color;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vec3 col = length(vColor) > 0.01 ? vColor : uColor;
      gl_FragColor = vec4(col, clamp(vAlpha, 0.0, 1.0));
    }
  `,
}

/**
 * 3D Neural Triangulation Mesh (opacity: 0.18)
 * Connects the 65 graph nodes to 2-3 nearest neighbors inside the dark almond eye
 * using ultra-fine straight line segments in Royal-Blue/Cyan.
 */
export const NetworkConnections = memo(function NetworkConnections({
  constellationGeo,
  primaryConnectionsGeo,
  themeConfig,
  innerFade = 0.04,
}) {
  const glow = themeConfig.glowIntensity || 1.0
  const opacity = themeConfig.wireOpacity || 0.94
  const geo = constellationGeo || primaryConnectionsGeo

  const constellationMat = useMemo(() => {
    const col = new THREE.Color('#0a52ff').lerp(new THREE.Color('#30d5ff'), 0.45)
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: col },
        uOpacity: { value: Math.min(0.22, Math.max(0.14, 0.18 * opacity * glow)) },
        uInnerFade: { value: innerFade },
      },
      vertexShader: ConstellationShader.vertexShader,
      fragmentShader: ConstellationShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [opacity, glow, innerFade])

  const prevMatRef = useRef(constellationMat)
  useEffect(() => {
    if (prevMatRef.current && prevMatRef.current !== constellationMat) {
      prevMatRef.current.dispose()
    }
    prevMatRef.current = constellationMat
  }, [constellationMat])

  if (!geo) return null

  return <lineSegments geometry={geo} material={constellationMat} />
})
