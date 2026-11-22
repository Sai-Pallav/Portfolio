import { memo, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useThree, createPortal } from '@react-three/fiber'
import { H_VAL } from './generateWireGeometry'
import { generateRefinedNeuralField } from './neuralPocketBounds'
import { useWireframeConfig } from './WireframeConfigContext'

// Helper to compute responsive ribbon layout matching SideWireNetwork
function calculateRibbonLayout(viewportWidth, ribbonConfig) {
  const halfWidth = viewportWidth / 2

  let baseStart
  if (viewportWidth >= 8.5) {
    baseStart = 2.30
  } else if (viewportWidth <= 5.5) {
    baseStart = 1.65
  } else {
    baseStart = 1.65 + ((viewportWidth - 5.5) / 3.0) * 0.65
  }

  const innerExt = (ribbonConfig.innerExtension ?? 0.0) - (ribbonConfig.innerGap ?? 0.0)
  const xInner = Math.max(0.05, baseStart - innerExt)

  const baseEnd = Math.max(halfWidth * 1.28, 7.2)
  const outerExt = (ribbonConfig.outerExtension ?? 1.5) * 1.2 + (ribbonConfig.outerXOffset ?? 0.0)
  const xOuter = Math.max(xInner + 2.0, baseEnd + outerExt)

  const span = (xOuter - xInner) * (ribbonConfig.lengthMultiplier ?? 1.0)
  const scaleX = span / 10.0
  const scaleY = Math.max(0.60, Math.min(1.35, span * 0.18)) * (ribbonConfig.breadthMultiplier ?? 1.0)
  const scaleZ = ribbonConfig.depthMultiplier ?? 1.0
  const nodeScale = Math.max(0.65, Math.min(1.35, scaleY)) * (ribbonConfig.nodeScale ?? 1.0)

  return { xStart: xInner, xEnd: xOuter, span, scaleX, scaleY, scaleZ, nodeScale }
}

// Helper to compute ribbon transformation matrix matching RibbonGroup
function getRibbonMatrix(ribbon, layout) {
  const isLeft = ribbon.side === 'left'

  const posX = isLeft
    ? -layout.xStart - (ribbon.xOffset ?? 0)
    : layout.xStart + (ribbon.xOffset ?? 0)

  const pos = new THREE.Vector3(
    posX,
    ribbon.yOffset ?? 0,
    ribbon.zOffset ?? 0
  )

  const rot = new THREE.Euler(
    ((ribbon.pitchX ?? 0) * Math.PI) / 180,
    isLeft
      ? ((ribbon.yawY ?? 0) * Math.PI) / 180
      : -((ribbon.yawY ?? 0) * Math.PI) / 180,
    isLeft
      ? -((ribbon.tiltZ ?? 0) * Math.PI) / 180
      : ((ribbon.tiltZ ?? 0) * Math.PI) / 180
  )

  const scale = new THREE.Vector3(layout.scaleX, layout.scaleY, layout.scaleZ)

  const mat = new THREE.Matrix4()
  mat.compose(pos, new THREE.Quaternion().setFromEuler(rot), scale)
  return mat
}

// Helper to merge two BufferGeometries with rigid transforms on position and aBasePos
function mergeTransformedGeometries(geoA, matA, geoB, matB) {
  if (!geoA && !geoB) return null
  if (!geoA) return geoB
  if (!geoB) return geoA

  const merged = new THREE.BufferGeometry()
  const vA = geoA.attributes.position ? geoA.attributes.position.count : 0
  const vB = geoB.attributes.position ? geoB.attributes.position.count : 0
  const total = vA + vB

  const mA = matA.elements
  const a0 = mA[0], a1 = mA[1], a2 = mA[2]
  const a4 = mA[4], a5 = mA[5], a6 = mA[6]
  const a8 = mA[8], a9 = mA[9], a10 = mA[10]
  const a12 = mA[12], a13 = mA[13], a14 = mA[14]

  const mB = matB.elements
  const b0 = mB[0], b1 = mB[1], b2 = mB[2]
  const b4 = mB[4], b5 = mB[5], b6 = mB[6]
  const b8 = mB[8], b9 = mB[9], b10 = mB[10]
  const b12 = mB[12], b13 = mB[13], b14 = mB[14]

  for (const attrName in geoA.attributes) {
    const attrA = geoA.attributes[attrName]
    const attrB = geoB.attributes[attrName]
    if (!attrB) continue

    // Both fields store immutable rest positions once. Preserve both names for
    // shader-based deformation without a second transform or GPU upload.
    if (attrName === 'aBasePos' && attrA === geoA.attributes.position && attrB === geoB.attributes.position) {
      merged.setAttribute('aBasePos', merged.getAttribute('position'))
      continue
    }
    if (attrName === 'aU') continue
    const itemSize = attrA.itemSize
    const arr = new attrA.array.constructor(total * itemSize)

    if (attrName === 'position' || attrName === 'aBasePos') {
      const srcA = attrA.array
      for (let i = 0, j = 0; i < vA; i++, j += 3) {
        const x = srcA[j], y = srcA[j + 1], z = srcA[j + 2]
        arr[j] = a0 * x + a4 * y + a8 * z + a12
        arr[j + 1] = a1 * x + a5 * y + a9 * z + a13
        arr[j + 2] = a2 * x + a6 * y + a10 * z + a14
      }
      const srcB = attrB.array
      const offset = vA * 3
      for (let i = 0, j = 0; i < vB; i++, j += 3) {
        const x = srcB[j], y = srcB[j + 1], z = srcB[j + 2]
        arr[offset + j] = b0 * x + b4 * y + b8 * z + b12
        arr[offset + j + 1] = b1 * x + b5 * y + b9 * z + b13
        arr[offset + j + 2] = b2 * x + b6 * y + b10 * z + b14
      }
    } else {
      arr.set(attrA.array, 0)
      arr.set(attrB.array, vA * itemSize)
    }

    merged.setAttribute(attrName, new THREE.BufferAttribute(arr, itemSize))
  }

  // aU is exactly aRelativeCoord.x. Keep the full Vector4 contract and share
  // its immutable storage through attribute views (no quantization).
  const relative = new THREE.InterleavedBuffer(merged.getAttribute('aRelativeCoord').array, 4)
  merged.setAttribute('aRelativeCoord', new THREE.InterleavedBufferAttribute(relative, 4, 0))
  merged.setAttribute('aU', new THREE.InterleavedBufferAttribute(relative, 1, 0))
  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

function disposeNeuralField(field) {
  field.linesGeo?.dispose()
  field.pointsGeo?.dispose()
  field.hazeGeo?.dispose()
}

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

    void main() {
      vec3 pos = position;

      float innerFeather = smoothstep(0.06, 0.20, aU);
      float outerFeather = 1.0 - smoothstep(0.995, 1.02, aU);

      // Whispering gossamer connective tissue: line alpha pre-calibrated to depth tiers
      vAlpha = aAlpha * innerFeather * outerFeather * uOpacity;
      vColor = color;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      if (vAlpha < 0.003) discard;
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

    varying float vAlpha;
    varying vec3 vColor;
    varying vec3 vHaloCol;
    varying float vIsHighlight;

    void main() {
      vec3 pos = position;

      float innerFeather = smoothstep(0.06, 0.20, aU);
      float outerFeather = 1.0 - smoothstep(0.995, 1.02, aU);

      // 3-layer Z-depth contrast cue
      float depthCue = aLayer > 0.5 ? 1.15 : (aLayer < -0.5 ? 0.48 : 0.88);

      // Stable starlight: no frame-time uniform uploads or blinking isolated dots.
      vAlpha = alpha * innerFeather * outerFeather * uGlowIntensity * depthCue;
      vIsHighlight = aIsHighlight;

      // Hoisted static color, tier, and rim-tint calculations out of fragment shader (Requirement 3)
      vec3 electricCyan = vec3(0.157, 0.847, 1.0); // #28d8ff
      vec3 iceWhite = vec3(1.0, 1.0, 1.0);
      vec3 cobaltCyan = vec3(0.055, 0.380, 0.920);
      vec3 indigoViolet = vec3(0.369, 0.282, 1.0); // #5e48ff

      float rimProx = smoothstep(0.65, 0.90, abs(aRelativeCoord.y));
      float colorViolet = clamp((color.r - 0.10) * 3.2, 0.0, 1.0);
      float rimTint = max(rimProx * 0.70, colorViolet * 0.80);

      if (aIsHighlight > 0.5) {
        vec3 halo = mix(cobaltCyan, electricCyan, 0.65);
        vHaloCol = halo;
        vColor = iceWhite;
      } else {
        vec3 nodeCol = color;
        float coreMix = aLayer > 0.5 ? 0.45 : (aLayer < -0.5 ? 0.0 : 0.25);
        nodeCol = mix(nodeCol, indigoViolet, rimTint * 0.18);
        vColor = nodeCol;
        vHaloCol = vec3(coreMix);
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

      // Multi-scale starlight field point sizing:
      // Tightened around actual visible falloff radius to crush GPU overdraw (Requirement 3)
      float feather = innerFeather * outerFeather;
      float scaleFeather = 0.25 + 0.75 * innerFeather;
      float baseSize = size * uNodeScale * depthCue * (30.0 / -mvPosition.z) * min(1.15, uGlowIntensity) * max(0.20, feather);
      float maxPointSize = aIsHighlight > 0.5 ? 12.0 : (aLayer > 0.5 ? 6.0 : (aLayer < -0.5 ? 2.5 : 4.8));
      float minPointSize = aIsHighlight > 0.5 ? 5.0 : (aLayer > 0.5 ? 2.6 : (aLayer < -0.5 ? 1.0 : 2.0));
      gl_PointSize = clamp(baseSize * scaleFeather, minPointSize * scaleFeather, maxPointSize);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3 vColor;
    varying vec3 vHaloCol;
    varying float vIsHighlight;

    void main() {
      // Immediate squared-distance early discard before ANY math (Requirement 3)
      vec2 p = gl_PointCoord - 0.5;
      float r2 = dot(p, p);
      if (r2 > 0.25) discard;
      if (vAlpha < 0.003) discard;

      // Circle cutoff falloff
      float circleCutoff = clamp(1.0 - 4.0 * r2, 0.0, 1.0);

      if (vIsHighlight > 0.5) {
        // Purely circular ice-white pinpoint hub: needle-sharp core + tight exponential cyan halo
        float sharpCore = exp(-150.0 * r2);
        float whiteCore = exp(-240.0 * r2) * clamp(1.0 - 25.0 * r2, 0.0, 1.0);
        float expHalo = (exp(-110.0 * r2) * 0.40 + exp(-42.0 * r2) * 0.12) * circleCutoff;

        vec3 col = mix(vHaloCol, vec3(1.0), clamp(whiteCore * 1.8 + sharpCore * 0.95, 0.0, 1.0));
        float hubAlpha = clamp(whiteCore * 0.96 + sharpCore * 0.60 + expHalo, 0.0, 0.98);

        gl_FragColor = vec4(col, min(vAlpha * hubAlpha, 0.98));
      } else {
        // Multi-scale starlight nodes: brilliant core + restrained whispering halo
        float core = exp(-190.0 * r2);
        float expHalo = (exp(-68.0 * r2) * 0.32 + exp(-26.0 * r2) * 0.12) * circleCutoff;

        vec3 nodeCol = mix(vColor, vec3(1.0), core * vHaloCol.r);
        float radialAlpha = core * 0.76 + expHalo * 0.48;

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

      vAlpha = alpha * innerFeather * outerFeather * uGlowIntensity;
      vColor = color;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      // Small rear-core sprites keep additive haze localized and limit overdraw.
      float pointSize = clamp(
        size * uNodeScale * (65.0 / -mvPosition.z) * min(1.15, uGlowIntensity),
        14.0,
        36.0
      );
      gl_PointSize = pointSize;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      // Immediate squared-distance early discard before ANY math (Requirement 3)
      vec2 p = gl_PointCoord - 0.5;
      float r2 = dot(p, p);
      if (r2 > 0.25) discard;
      if (vAlpha < 0.001) discard;

      // Radial sapphire falloff with a soft circular cutoff; no bright bokeh rim.
      float falloff = exp(-4.60 * r2) * clamp(1.0 - 4.0 * r2, 0.0, 1.0);

      gl_FragColor = vec4(vColor, clamp(vAlpha * falloff, 0.0, 0.024));
    }
  `,
}

/**
 * NeuralNetworkField:
 * Merges both left/right wings and all BG/MID/FG depth tiers into at most 3 total draw calls
 * (1 LineSegments for all edges, 1 Points for all nodes, 1 Points for all haze) with
 * precomputed boundingSpheres, matrixAutoUpdate = false, and locked useMemo geometry/material
 * creation with stable primitive dependencies (Requirements 1 & 2).
 */
export const NeuralNetworkField = memo(function NeuralNetworkField({
  themeConfig = {},
  nodeScale = 1.0,
  innerFade = 0.04,
  side = 'left',
}) {
  // Only the left instance renders the merged 2-wing field into the scene root via createPortal,
  // reducing the entire neural field across both wings to at most 3 total draw calls (Requirement 2).
  if (side === 'right') {
    return null
  }

  return (
    <MergedNeuralNetworkField
      themeConfig={themeConfig}
      nodeScale={nodeScale}
      innerFade={innerFade}
    />
  )
})

const MergedNeuralNetworkField = memo(function MergedNeuralNetworkField({
  themeConfig = {},
  nodeScale = 1.0,
  innerFade = 0.04,
}) {
  const { viewport, scene, gl } = useThree()
  const glow = themeConfig.glowIntensity || 1.0
  const primaryWire = themeConfig.primaryWire || ''

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.__neuralRenderer = gl
    return () => {
      if (window.__neuralRenderer === gl) delete window.__neuralRenderer
    }
  }, [gl])

  const wireframeCtx = useWireframeConfig()
  const leftConfig = wireframeCtx.leftConfig
  const rightConfig = wireframeCtx.rightConfig

  // Stable primitive keys for geometry dependencies (Requirement 1)
  const leftKey = `${leftConfig.lengthMultiplier}_${leftConfig.breadthMultiplier}_${leftConfig.depthMultiplier}_${leftConfig.innerExtension}_${leftConfig.outerExtension}_${leftConfig.amplitude}_${leftConfig.frequency}_${leftConfig.zAmplitude}_${leftConfig.wingSweep}_${leftConfig.ribbon1Amp}_${leftConfig.ribbon2Amp}_${leftConfig.ribbon3Amp}_${leftConfig.ribbon4Amp}_${leftConfig.distRibbon01}_${leftConfig.distRibbon12}_${leftConfig.distRibbon23}_${leftConfig.innerGap}_${leftConfig.xOffset}_${leftConfig.yOffset}_${leftConfig.zOffset}_${leftConfig.pitchX}_${leftConfig.yawY}_${leftConfig.tiltZ}`
  const rightKey = `${rightConfig.lengthMultiplier}_${rightConfig.breadthMultiplier}_${rightConfig.depthMultiplier}_${rightConfig.innerExtension}_${rightConfig.outerExtension}_${rightConfig.amplitude}_${rightConfig.frequency}_${rightConfig.zAmplitude}_${rightConfig.wingSweep}_${rightConfig.ribbon1Amp}_${rightConfig.ribbon2Amp}_${rightConfig.ribbon3Amp}_${rightConfig.ribbon4Amp}_${rightConfig.distRibbon01}_${rightConfig.distRibbon12}_${rightConfig.distRibbon23}_${rightConfig.innerGap}_${rightConfig.xOffset}_${rightConfig.yOffset}_${rightConfig.zOffset}_${rightConfig.pitchX}_${rightConfig.yawY}_${rightConfig.tiltZ}`
  const vpWidth = viewport.width

  // 1. Generate refined neural field for left wing independently so tweaking right never rebuilds left
  const leftFieldData = useMemo(() => {
    const t0 = performance.now()
    const leftFullConfig = { ...leftConfig, ...themeConfig, innerFade, nodeScale }
    const layout = calculateRibbonLayout(vpWidth, leftConfig)
    const aspect = layout.scaleY / (layout.scaleX * Math.max(0.25, Math.abs(Math.cos((leftConfig.yawY ?? 0) * Math.PI / 180))))
    const field = generateRefinedNeuralField('left', H_VAL, leftFullConfig, aspect)
    return {
      field,
      dt: performance.now() - t0,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftKey, innerFade, nodeScale, primaryWire, vpWidth])

  // 2. Generate refined neural field for right wing independently so tweaking left never rebuilds right
  const rightFieldData = useMemo(() => {
    const t0 = performance.now()
    const rightFullConfig = { ...rightConfig, ...themeConfig, innerFade, nodeScale }
    const layout = calculateRibbonLayout(vpWidth, rightConfig)
    const aspect = layout.scaleY / (layout.scaleX * Math.max(0.25, Math.abs(Math.cos((rightConfig.yawY ?? 0) * Math.PI / 180))))
    const field = generateRefinedNeuralField('right', H_VAL, rightFullConfig, aspect)
    return {
      field,
      dt: performance.now() - t0,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightKey, innerFade, nodeScale, primaryWire, vpWidth])

  // Each geometry owner releases exactly its own resources on replacement/unmount.
  useEffect(() => () => disposeNeuralField(leftFieldData.field), [leftFieldData])
  useEffect(() => () => disposeNeuralField(rightFieldData.field), [rightFieldData])

  // 3. Fast rigid transform & merge into at most 3 total BufferGeometries
  const mergedGeometries = useMemo(() => {
    const leftField = leftFieldData.field
    const rightField = rightFieldData.field

    if (typeof window !== 'undefined') {
      window.__neuralBuildTimes = {
        left: leftFieldData.dt,
        right: rightFieldData.dt,
        total: leftFieldData.dt + rightFieldData.dt,
      }
    }

    // Compute transforms for each wing
    const layoutLeft = calculateRibbonLayout(vpWidth, leftConfig)
    const layoutRight = calculateRibbonLayout(vpWidth, rightConfig)

    const matLeft = getRibbonMatrix({ ...leftConfig, side: 'left' }, layoutLeft)
    const matRight = getRibbonMatrix({ ...rightConfig, side: 'right' }, layoutRight)

    const mergedLinesGeo = mergeTransformedGeometries(leftField.linesGeo, matLeft, rightField.linesGeo, matRight)
    const mergedPointsGeo = mergeTransformedGeometries(leftField.pointsGeo, matLeft, rightField.pointsGeo, matRight)
    const mergedHazeGeo = mergeTransformedGeometries(leftField.hazeGeo, matLeft, rightField.hazeGeo, matRight)

    return {
      linesGeo: mergedLinesGeo,
      pointsGeo: mergedPointsGeo,
      hazeGeo: mergedHazeGeo,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftFieldData, rightFieldData, vpWidth, leftKey, rightKey])

  useEffect(() => () => disposeNeuralField(mergedGeometries), [mergedGeometries])

  // Strict useMemo for materials with stable primitive dependencies (Requirement 1)
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

  const pointMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uGlowIntensity: { value: glow },
        uNodeScale: { value: nodeScale },
        uInnerFade: { value: innerFade },
      },
      vertexShader: NeuralPointShader.vertexShader,
      fragmentShader: NeuralPointShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    return mat
  }, [glow, nodeScale, innerFade])

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

  // Separate lifetimes: a point-only material change must not dispose a live line material.
  useEffect(() => () => lineMat.dispose(), [lineMat])
  useEffect(() => () => pointMat.dispose(), [pointMat])
  useEffect(() => () => hazeMat.dispose(), [hazeMat])

  // Render merged meshes directly at scene level with matrixAutoUpdate = false (Requirements 1 & 2)
  return createPortal(
    <group matrixAutoUpdate={false} dispose={null}>
      {/* 1. Restrained Volumetric Nebula Glow (Merged Points) */}
      {mergedGeometries.hazeGeo && (
        <points
          geometry={mergedGeometries.hazeGeo}
          material={hazeMat}
          matrixAutoUpdate={false}
        />
      )}

      {/* 2. Gossamer Connective Tissue (Merged LineSegments) */}
      {mergedGeometries.linesGeo && (
        <lineSegments
          geometry={mergedGeometries.linesGeo}
          material={lineMat}
          matrixAutoUpdate={false}
        />
      )}

      {/* 3. Multi-Scale Starlight Field: Micro-Nodes + Ice-White Hubs (Merged Points) */}
      {mergedGeometries.pointsGeo && (
        <points
          geometry={mergedGeometries.pointsGeo}
          material={pointMat}
          matrixAutoUpdate={false}
        />
      )}
    </group>,
    scene
  )
})

export default NeuralNetworkField
