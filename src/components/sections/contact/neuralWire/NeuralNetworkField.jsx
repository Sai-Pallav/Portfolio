import { memo, useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { getGlowTexture, getHeroGlowTexture, H_VAL } from './generateWireGeometry'
import { generateRefinedNeuralField } from './neuralPocketBounds'
import { useWireframeConfig } from './WireframeConfigContext'

const NeuralLineShader = {
  vertexShader: `
    attribute vec3 aBasePos;
    attribute float aU;
    attribute float aWeight;
    attribute float aLayer;
    attribute float aAlpha;
    attribute vec4 aRelativeCoord;
    attribute vec3 color;

    uniform float uOpacity;
    uniform float uInnerFade;

    varying float vAlpha;
    varying vec3 vColor;
    varying float vLayer;

    void main() {
      // Stage 1: Static almond chamber position (aRelativeCoord stored for Stage 2 helical sync)
      vec3 pos = position;

      float innerFeather = smoothstep(0.09, 0.16, aU);
      float outerFeather = 1.0 - smoothstep(0.93, 0.97, aU);

      // Whispering gossamer connective tissue (Gap 1): line alpha pre-calibrated to BG 0.05–0.10, MID 0.14–0.24, FG 0.28–0.40
      vAlpha = aAlpha * innerFeather * outerFeather * uOpacity;
      vColor = color;
      vLayer = aLayer;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      gl_FragColor = vec4(vColor, clamp(vAlpha, 0.0, 1.0));
    }
  `,
}

const NeuralPointShader = {
  vertexShader: `
    attribute vec3 aBasePos;
    attribute float aU;
    attribute float aWeight;
    attribute float aLayer;
    attribute vec4 aRelativeCoord;
    attribute float size;
    attribute float alpha;
    attribute vec3 color;
    attribute float aIsHighlight;

    uniform float uGlowIntensity;
    uniform float uNodeScale;
    uniform float uInnerFade;
    uniform float uTime;

    varying float vAlpha;
    varying vec3 vColor;
    varying float vIsHighlight;
    varying float vLayer;

    void main() {
      // Stage 1: Static almond chamber position (aRelativeCoord stored for Stage 2 helical sync)
      vec3 pos = position;

      float innerFeather = smoothstep(0.09, 0.16, aU);
      float outerFeather = 1.0 - smoothstep(0.93, 0.97, aU);

      // 3-layer Z-depth contrast:
      float depthCue = aLayer > 0.5 ? 1.20 : (aLayer < -0.5 ? 0.38 : 0.88);

      // Fine twinkling starlight sparkle modulation across micro-nodes (Gap 2)
      float twinkle = 0.68 + 0.32 * sin(uTime * 4.2 + pos.x * 22.0 + pos.y * 34.0 + pos.z * 26.0);
      if (aIsHighlight > 0.5) {
        twinkle = 0.90 + 0.10 * sin(uTime * 2.8 + pos.x * 12.0);
      }

      vAlpha = alpha * innerFeather * outerFeather * uGlowIntensity * depthCue * twinkle;
      vColor = color;
      vIsHighlight = aIsHighlight;
      vLayer = aLayer;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

      // Multi-scale starlight field point sizing (Gap 2):
      // Radiant ice-white foreground hubs: 26.0 to 34.0 px on screen with diamond sparkle and lush micro-halo
      // Foreground electric-cyan junctions: 9.0 to 14.0 px
      // Midground micro-nodes: 5.0 to 9.0 px
      // Background micro-dots: 2.2 to 4.5 px
      float baseSize = size * uNodeScale * depthCue * (48.0 / -mvPosition.z) * min(1.15, uGlowIntensity);
      float maxPointSize = aIsHighlight > 0.5 ? 34.0 : (aLayer > 0.5 ? 14.0 : (aLayer < -0.5 ? 4.5 : 9.0));
      float minPointSize = aLayer < -0.5 ? 2.0 : (aIsHighlight > 0.5 ? 24.0 : 2.8);
      gl_PointSize = clamp(baseSize, minPointSize, maxPointSize);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3 vColor;
    varying float vIsHighlight;
    varying float vLayer;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord) * 2.0;
      if (dist > 1.0) discard;

      // Razor-sharp bright pinpoint core (Gap 2)
      float core = pow(clamp(1.0 - dist * 1.8, 0.0, 1.0), 3.2);

      // Tight exponential cyan-blue micro-halo (never oversized blurry bokeh orbs) (Gap 2)
      float microHalo = exp(-dist * 4.6) * 0.55;
      vec3 cyanHalo = vec3(0.08, 0.72, 1.0);

      if (vIsHighlight > 0.5) {
        // Radiant ice-white foreground hub: razor-sharp white core + 4-ray diamond sparkle + lush exponential cyan/cobalt micro-halo
        float whiteCore = pow(clamp(1.0 - dist * 2.0, 0.0, 1.0), 4.2);

        // Crisp 4-ray diamond starlight sparkle
        float rayH = pow(clamp(1.0 - abs(coord.x) * 2.0, 0.0, 1.0), 1.8) * pow(clamp(1.0 - abs(coord.y) * 12.0, 0.0, 1.0), 2.2);
        float rayV = pow(clamp(1.0 - abs(coord.y) * 2.0, 0.0, 1.0), 1.8) * pow(clamp(1.0 - abs(coord.x) * 12.0, 0.0, 1.0), 2.2);
        float rays = max(rayH, rayV) * 0.92;

        // Lush electric-cyan / cobalt exponential micro-halo
        float expHalo = exp(-dist * 4.2) * 0.85;
        vec3 cobaltCyan = mix(vec3(0.06, 0.38, 0.98), vec3(0.12, 0.82, 1.0), clamp(1.0 - dist * 1.2, 0.0, 1.0));

        vec3 col = mix(cobaltCyan, vec3(1.0, 1.0, 1.0), clamp(whiteCore * 1.8 + rays * 0.95, 0.0, 1.0));
        float starAlpha = clamp(whiteCore * 1.0 + rays * 0.90 + expHalo * 0.75, 0.0, 0.98);

        gl_FragColor = vec4(col, min(vAlpha * starAlpha, 0.98));
      } else {
        // Electric-cyan / cobalt micro-nodes & junctions (Gap 2)
        // Correct GLSL smoothstep argument order: blendFactor in [0, 1]
        float blendFactor = 1.0 - smoothstep(0.15, 0.70, dist);
        vec3 col = mix(cyanHalo, vColor, blendFactor);
        if (vLayer > 0.5) {
          col = mix(col, vec3(1.0, 1.0, 1.0), core * 0.40);
        }
        float radialAlpha = core * 0.92 + microHalo;
        gl_FragColor = vec4(col, min(vAlpha * radialAlpha, 0.96));
      }
    }
  `,
}

const NeuralHazeShader = {
  vertexShader: `
    attribute vec3 aBasePos;
    attribute float aU;
    attribute float aWeight;
    attribute vec4 aRelativeCoord;
    attribute float size;
    attribute float alpha;
    attribute vec3 color;

    uniform float uGlowIntensity;
    uniform float uNodeScale;
    uniform float uInnerFade;

    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vec3 pos = position;

      float innerFeather = smoothstep(0.09, 0.16, aU);
      float outerFeather = 1.0 - smoothstep(0.93, 0.97, aU);

      vAlpha = alpha * innerFeather * outerFeather * uGlowIntensity;
      vColor = color;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      float pointSize = clamp(
        size * uNodeScale * (110.0 / -mvPosition.z) * min(1.15, uGlowIntensity),
        22.0,
        160.0
      );
      gl_PointSize = pointSize;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord) * 2.0;
      if (dist > 1.0) discard;

      // Ultra-silky smooth quadratic Gaussian falloff (strictly zero circular blotches or bright hotspots) (Gap 4)
      float falloff = exp(-dist * dist * 2.8) * pow(1.0 - dist, 1.2);

      gl_FragColor = vec4(vColor, clamp(vAlpha * falloff, 0.0, 0.65));
    }
  `,
}

/**
 * NeuralNetworkField:
 * Standalone, high-performance 3D visualization component for Stage 1.
 * Renders the 3-layer volumetric neural web (points + line segments),
 * equalized deep-sapphire-to-electric-blue volumetric nebula glow across ALL chambers,
 * and delicate curve-crossing flares strictly inside negative-space pocket bounds.
 */
export const NeuralNetworkField = memo(function NeuralNetworkField({
  linesGeo,
  pointsGeo,
  hazeGeo,
  focalFlaresGeo,
  themeConfig = {},
  nodeScale = 1.0,
  innerFade = 0.04,
  side = 'left',
}) {
  const glow = themeConfig.glowIntensity || 1.0

  const glowTexture = useMemo(() => getGlowTexture(64), [])
  const heroTexture = useMemo(() => getHeroGlowTexture(128), [])

  // Access current live wireframe config so bounds match rendered ribbon shapes exactly
  const wireframeCtx = useWireframeConfig()
  const sideConfig = side === 'left' ? wireframeCtx.leftConfig : wireframeCtx.rightConfig

  const fullConfig = useMemo(() => {
    return {
      ...sideConfig,
      ...themeConfig,
      innerFade,
      nodeScale,
    }
  }, [sideConfig, themeConfig, innerFade, nodeScale])

  // Generate refined neural field geometries implementing all 6 visual gap polish passes
  const refinedField = useMemo(() => {
    return generateRefinedNeuralField(side, H_VAL, fullConfig)
  }, [side, fullConfig])

  const activeLinesGeo = refinedField?.linesGeo || linesGeo
  const activePointsGeo = refinedField?.pointsGeo || pointsGeo
  const activeHazeGeo = refinedField?.hazeGeo || hazeGeo

  const lineMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        // Line opacities pre-calibrated to BG 0.05–0.10, MID 0.14–0.24, FG 0.28–0.40 (Gap 1)
        uOpacity: { value: 1.0 * Math.min(1.0, glow) },
        uInnerFade: { value: innerFade },
      },
      vertexShader: NeuralLineShader.vertexShader,
      fragmentShader: NeuralLineShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [glow, innerFade])

  const pointMatRef = useRef(null)

  const pointMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uGlowIntensity: { value: glow },
        uNodeScale: { value: nodeScale },
        uInnerFade: { value: innerFade },
        uTime: { value: 0.0 },
      },
      vertexShader: NeuralPointShader.vertexShader,
      fragmentShader: NeuralPointShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    pointMatRef.current = mat
    return mat
  }, [glow, nodeScale, innerFade])

  useFrame((state) => {
    if (pointMatRef.current) {
      pointMatRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  const hazeMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uGlowIntensity: { value: glow },
        uNodeScale: { value: nodeScale },
        uInnerFade: { value: innerFade },
      },
      vertexShader: NeuralHazeShader.vertexShader,
      fragmentShader: NeuralHazeShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [glow, nodeScale, innerFade])

  // Delicate Curve-Crossing Flares (6 exact curve intersections, sized crisp without blurry blobs)
  const flareCoreMat = useMemo(() => {
    if (!focalFlaresGeo) return null
    return new THREE.PointsMaterial({
      color: new THREE.Color('#ffffff'),
      size: 0.012 * Math.min(1.15, glow) * nodeScale,
      map: heroTexture,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  }, [focalFlaresGeo, heroTexture, glow, nodeScale])

  const flareHaloMat = useMemo(() => {
    if (!focalFlaresGeo) return null
    return new THREE.PointsMaterial({
      color: new THREE.Color('#0048ff'),
      size: 0.026 * glow * nodeScale,
      map: glowTexture,
      transparent: true,
      opacity: Math.min(0.08, 0.06 * glow),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  }, [focalFlaresGeo, glowTexture, glow, nodeScale])

  // Comprehensive GPU resource disposal
  const prevMatsRef = useRef({})
  useEffect(() => {
    const current = { lineMat, pointMat, hazeMat, flareCoreMat, flareHaloMat }
    Object.keys(prevMatsRef.current).forEach((k) => {
      const oldMat = prevMatsRef.current[k]
      if (oldMat && oldMat !== current[k]) {
        oldMat.dispose()
      }
    })
    prevMatsRef.current = current
    return () => {
      lineMat.dispose()
      pointMat.dispose()
      hazeMat.dispose()
      if (flareCoreMat) flareCoreMat.dispose()
      if (flareHaloMat) flareHaloMat.dispose()
    }
  }, [lineMat, pointMat, hazeMat, flareCoreMat, flareHaloMat])

  // Dispose generated geometries on unmount / regeneration
  useEffect(() => {
    return () => {
      if (refinedField?.linesGeo) refinedField.linesGeo.dispose()
      if (refinedField?.pointsGeo) refinedField.pointsGeo.dispose()
      if (refinedField?.hazeGeo) refinedField.hazeGeo.dispose()
    }
  }, [refinedField])

  return (
    <group>
      {/* 1. Equalized Volumetric Nebula Glow (#061a66 to #0e52e8) across ALL chambers */}
      {activeHazeGeo && <points geometry={activeHazeGeo} material={hazeMat} />}

      {/* 2. Whisper-Thin Gossamer Connective Tissue (max edge <= 0.26 * h(u)) */}
      {activeLinesGeo && <lineSegments geometry={activeLinesGeo} material={lineMat} />}

      {/* 3. Multi-Scale Starlight Field: Twinkling Micro-Nodes + Radiant Ice-White Hubs */}
      {activePointsGeo && <points geometry={activePointsGeo} material={pointMat} />}

      {/* 4. Delicate Curve-Crossing Flares */}
      {focalFlaresGeo && flareHaloMat && <points geometry={focalFlaresGeo} material={flareHaloMat} />}
      {focalFlaresGeo && flareCoreMat && <points geometry={focalFlaresGeo} material={flareCoreMat} />}
    </group>
  )
})

export default NeuralNetworkField
