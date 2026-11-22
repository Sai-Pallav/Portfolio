import { memo, useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { getGlowTexture, H_VAL } from './generateWireGeometry'
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

      float innerFeather = smoothstep(0.06, 0.20, aU);
      float outerFeather = 1.0 - smoothstep(0.995, 1.02, aU);

      // Whispering gossamer connective tissue: line alpha pre-calibrated to BG 0.05–0.09, MID 0.16–0.24, FG 0.28–0.38
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
    varying vec4 vRelativeCoord;

    void main() {
      // Stage 1: Static almond chamber position (aRelativeCoord stored for Stage 2 helical sync)
      vec3 pos = position;

      float innerFeather = smoothstep(0.06, 0.20, aU);
      float outerFeather = 1.0 - smoothstep(0.995, 1.02, aU);

      // 3-layer Z-depth contrast cue
      float depthCue = aLayer > 0.5 ? 1.25 : (aLayer < -0.5 ? 0.38 : 0.88);

      // Fine twinkling starlight sparkle modulation across micro-nodes
      float twinkle = 0.74 + 0.26 * sin(uTime * 4.2 + pos.x * 22.0 + pos.y * 34.0 + pos.z * 26.0);
      if (aIsHighlight > 0.5) {
        twinkle = 0.94 + 0.06 * sin(uTime * 2.6 + pos.x * 12.0);
      }

      vAlpha = alpha * innerFeather * outerFeather * uGlowIntensity * depthCue * twinkle;
      vColor = color;
      vIsHighlight = aIsHighlight;
      vLayer = aLayer;
      vRelativeCoord = aRelativeCoord;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

      // Multi-scale starlight field point sizing matching Answer 4:
      // FG ice-white pinpoint hubs: 14–22px quad
      // FG cyan stars: 6–10px quad
      // MID cobalt/royal-blue nodes: 4–7px quad
      // BG sapphire micro-dots: 1.5–3px quad
      float feather = innerFeather * outerFeather;
      float scaleFeather = 0.25 + 0.75 * innerFeather;
      float baseSize = size * uNodeScale * depthCue * (32.0 / -mvPosition.z) * min(1.15, uGlowIntensity) * max(0.20, feather);
      float maxPointSize = aIsHighlight > 0.5 ? 22.0 : (aLayer > 0.5 ? 10.0 : (aLayer < -0.5 ? 3.0 : 7.0));
      float minPointSize = aIsHighlight > 0.5 ? 14.0 : (aLayer > 0.5 ? 6.0 : (aLayer < -0.5 ? 1.5 : 4.0));
      gl_PointSize = clamp(baseSize * scaleFeather, minPointSize * scaleFeather, maxPointSize);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3 vColor;
    varying float vIsHighlight;
    varying float vLayer;
    varying vec4 vRelativeCoord;

    void main() {
      // Purely circular radial coordinates - zero 4-point cross or star-spike math
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord) * 2.0;
      if (dist > 1.0) discard;
      if (vAlpha < 0.003) discard;

      vec3 electricCyan = vec3(0.157, 0.847, 1.0); // #28d8ff
      vec3 iceWhite = vec3(1.0, 1.0, 1.0);
      vec3 cobaltCyan = vec3(0.055, 0.380, 0.920);
      vec3 indigoViolet = vec3(0.369, 0.282, 1.0); // #5e48ff

      // Subtle indigo-violet rim tinting near purple wave rims
      float rimProx = smoothstep(0.65, 0.90, abs(vRelativeCoord.y));
      float colorViolet = clamp((vColor.r - 0.10) * 3.2, 0.0, 1.0);
      float rimTint = max(rimProx * 0.70, colorViolet * 0.80);

      if (vIsHighlight > 0.5) {
        // Sparse 12–15% FG purely circular ice-white pinpoint hubs (Answer 4)
        // Sharp 15–20% pure white core, tight exponential cyan-blue halo, zero spikes or bokeh blobs
        float sharpCore = exp(-dist * dist * 65.0);
        float whiteCore = pow(clamp(1.0 - dist * 2.5, 0.0, 1.0), 4.8);
        float expHalo = exp(-dist * 6.2) * 0.82;
        float circleCutoff = pow(clamp(1.0 - dist, 0.0, 1.0), 1.6);

        vec3 haloCol = mix(cobaltCyan, electricCyan, clamp(1.0 - dist * 1.3, 0.0, 1.0));
        haloCol = mix(haloCol, indigoViolet, rimTint * 0.35);

        vec3 col = mix(haloCol, iceWhite, clamp(whiteCore * 1.7 + sharpCore * 0.95, 0.0, 1.0));
        float hubAlpha = clamp(whiteCore * 0.96 + sharpCore * 0.60 + expHalo * circleCutoff, 0.0, 0.98);

        gl_FragColor = vec4(col, min(vAlpha * hubAlpha, 0.98));
      } else {
        // Multi-scale starlight hierarchy: 6-10px cyan FG, 4-7px cobalt MID, 1.5-3px sapphire BG
        float core = exp(-dist * dist * 36.0);
        float expHalo = exp(-dist * 4.6) * 0.65;
        float circleCutoff = pow(clamp(1.0 - dist, 0.0, 1.0), 1.4);

        vec3 nodeCol = vColor;
        if (vLayer > 0.5) {
          // Foreground cyan stars
          nodeCol = mix(vColor, iceWhite, core * 0.45);
        } else if (vLayer < -0.5) {
          // Background micro-dots: dim sapphire
          nodeCol = vColor;
        } else {
          // Midground nodes: cobalt/royal-blue blend
          nodeCol = mix(vColor, iceWhite, core * 0.25);
        }

        // Subtle indigo-violet rim tinting near purple wave edges
        nodeCol = mix(nodeCol, indigoViolet, rimTint * 0.45);

        float radialAlpha = (core * 0.72 + expHalo * 0.58) * circleCutoff;
        gl_FragColor = vec4(nodeCol, min(vAlpha * radialAlpha, 0.96));
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

      float innerFeather = smoothstep(0.06, 0.20, aU);
      float outerFeather = 1.0 - smoothstep(0.98, 1.01, aU);

      // Answer 5: peak opacity 0.025–0.032, deep sapphire (#041038 to #061b4d)
      vAlpha = alpha * innerFeather * outerFeather * uGlowIntensity;
      vColor = color;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      float pointSize = clamp(
        size * uNodeScale * (85.0 / -mvPosition.z) * min(1.15, uGlowIntensity),
        18.0,
        75.0
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
      if (vAlpha < 0.001) discard;

      // Ultra-silky smooth quadratic Gaussian falloff (Answer 5: exp(-3.5 * dist^2))
      float falloff = exp(-dist * dist * 3.5) * (1.0 - dist);

      gl_FragColor = vec4(vColor, clamp(vAlpha * falloff, 0.0, 0.032));
    }
  `,
}

/**
 * NeuralNetworkField:
 * Standalone, high-performance 3D visualization component for Stage 1.
 * Renders the 3-layer volumetric neural web (points + line segments),
 * restrained deep-sapphire volumetric nebula glow (#05164d) across chambers,
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
      map: glowTexture,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  }, [focalFlaresGeo, glowTexture, glow, nodeScale])

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
      {/* 1. Restrained Volumetric Nebula Glow (#05164d) across chambers */}
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
