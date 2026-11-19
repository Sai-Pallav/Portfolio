import { memo, useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'

const LineFeatherShader = {
  vertexShader: `
    attribute float aU;
    attribute float aAlpha;
    attribute vec3 color;
    uniform float uOpacity;
    uniform float uInnerFade;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      // Dynamic inner tip fade near the globe: smoothstep(0.0, max(0.005, uInnerFade), aU)
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
 * 3-Layer Additive Ribbon Rendering for the 4 Primary Hero Waves
 * + 44 Companion Silk Strands bundled tightly along the hero paths:
 * 1. 6-pass micro-offset Royal-Blue (#0048ff) aura bundle for Hero Waves 0, 1, 3
 * 2. Crisp White-Cyan (#e0ffff) core filaments
 * 3. Violet/Magenta (#b83dff) Hero 2 core & aura
 * 4. 44 Companion Silk Strands in Royal-Blue (#0a52ff), Cyan (#30d5ff), and Violet (#9d30ff)
 */
export const WirePaths = memo(function WirePaths({
  primaryCoreGeo,
  primaryHaloGeo,
  primaryFgGeo,
  secondaryGeo,
  secondaryFgGeo,
  depthGeo,
  primaryBgGeo,
  subFilamentsGeo,
  tertiaryGeo,
  themeConfig,
  innerFade = 0.04,
}) {
  const glow = themeConfig.glowIntensity || 1.0
  const opacity = themeConfig.wireOpacity || 0.94

  const pCoreGeo = primaryCoreGeo || primaryFgGeo
  const pHaloGeo = primaryHaloGeo
  const sGeo = secondaryGeo || secondaryFgGeo
  const dGeo = depthGeo || primaryBgGeo
  const sfGeo = subFilamentsGeo || tertiaryGeo

  // 1. Hero 0, 1, 3: Crisp White-Cyan Energy Core (opacity: 0.95)
  const coreMat = useMemo(() => {
    const col = new THREE.Color('#e0ffff')
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: col },
        uOpacity: { value: Math.min(1.0, 0.95 * opacity) },
        uInnerFade: { value: innerFade },
      },
      vertexShader: LineFeatherShader.vertexShader,
      fragmentShader: LineFeatherShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [opacity, innerFade])

  // 2. Hero 0, 1, 3: 6-Pass Micro-Offset Royal-Blue Aura (#0048ff, opacity: 0.32)
  const haloMat = useMemo(() => {
    const col = new THREE.Color('#0048ff')
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: col },
        uOpacity: { value: Math.min(1.0, 0.32 * glow * opacity) },
        uInnerFade: { value: innerFade },
      },
      vertexShader: LineFeatherShader.vertexShader,
      fragmentShader: LineFeatherShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [opacity, glow, innerFade])

  // 3. Hero 2: Violet/Magenta Core Wave (#f0abfc, opacity: 0.95)
  const violetCoreMat = useMemo(() => {
    const col = new THREE.Color('#f0abfc')
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: col },
        uOpacity: { value: Math.min(1.0, 0.95 * opacity) },
        uInnerFade: { value: innerFade },
      },
      vertexShader: LineFeatherShader.vertexShader,
      fragmentShader: LineFeatherShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [opacity, innerFade])

  // 4. Hero 2: 6-Pass Micro-Offset Neon Violet Aura (#b83dff, opacity: 0.42)
  const violetHaloMat = useMemo(() => {
    const col = new THREE.Color('#b83dff')
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: col },
        uOpacity: { value: Math.min(1.0, 0.42 * glow * opacity) },
        uInnerFade: { value: innerFade },
      },
      vertexShader: LineFeatherShader.vertexShader,
      fragmentShader: LineFeatherShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [opacity, glow, innerFade])

  // 5. 44 Companion Silk Strands: Bundled silk fibers hugging hero waves (opacity: 0.16 to 0.34 per vertex)
  const subFilamentsMat = useMemo(() => {
    const defaultCol = new THREE.Color('#0a52ff')
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: defaultCol },
        uOpacity: { value: Math.min(1.0, 1.0 * glow * opacity) },
        uInnerFade: { value: innerFade },
      },
      vertexShader: LineFeatherShader.vertexShader,
      fragmentShader: LineFeatherShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [opacity, glow, innerFade])

  const prevMatsRef = useRef({})
  useEffect(() => {
    const current = {
      coreMat,
      haloMat,
      violetCoreMat,
      violetHaloMat,
      subFilamentsMat,
    }
    Object.keys(prevMatsRef.current).forEach((k) => {
      const oldMat = prevMatsRef.current[k]
      if (oldMat && oldMat !== current[k]) {
        oldMat.dispose()
      }
    })
    prevMatsRef.current = current
  }, [
    coreMat,
    haloMat,
    violetCoreMat,
    violetHaloMat,
    subFilamentsMat,
  ])

  return (
    <group>
      {/* 44 Companion Silk Strands (bundled locks of silk hugging hero waves, leaving eye center dark) */}
      {sfGeo && <lineSegments geometry={sfGeo} material={subFilamentsMat} />}

      {/* Hero 0, 1, 3: 6-Pass Micro-Offset Royal-Blue Aura (#0048ff) */}
      {pHaloGeo && <lineSegments geometry={pHaloGeo} material={haloMat} />}

      {/* Hero 2: 6-Pass Micro-Offset Neon Violet Aura (#b83dff) */}
      {dGeo && <lineSegments geometry={dGeo} material={violetHaloMat} />}

      {/* Hero 2: Vibrant Violet/Magenta Core Wave */}
      {sGeo && <lineSegments geometry={sGeo} material={violetCoreMat} />}

      {/* Hero 0, 1, 3: Crisp White-Cyan Core Filaments */}
      {pCoreGeo && <lineSegments geometry={pCoreGeo} material={coreMat} />}
    </group>
  )
})
