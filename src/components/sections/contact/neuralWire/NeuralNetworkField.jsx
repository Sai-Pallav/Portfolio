import { memo, useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, createPortal } from '@react-three/fiber'
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

    const itemSize = attrA.itemSize
    const arr = new Float32Array(total * itemSize)

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

  merged.computeBoundingSphere()
  return merged
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
    uniform float uTime;

    varying float vAlpha;
    varying vec3 vColor;
    varying vec3 vHaloCol;
    varying float vIsHighlight;

    void main() {
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
        halo = mix(halo, indigoViolet, rimTint * 0.35);
        vHaloCol = halo;
        vColor = iceWhite;
      } else {
        vec3 nodeCol = color;
        float coreMix = aLayer > 0.5 ? 0.45 : (aLayer < -0.5 ? 0.0 : 0.25);
        nodeCol = mix(nodeCol, indigoViolet, rimTint * 0.45);
        vColor = nodeCol;
        vHaloCol = vec3(coreMix);
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

      // Multi-scale starlight field point sizing:
      // Tightened around actual visible falloff radius to crush GPU overdraw (Requirement 3)
      float feather = innerFeather * outerFeather;
      float scaleFeather = 0.25 + 0.75 * innerFeather;
      float baseSize = size * uNodeScale * depthCue * (30.0 / -mvPosition.z) * min(1.15, uGlowIntensity) * max(0.20, feather);
      float maxPointSize = aIsHighlight > 0.5 ? 20.0 : (aLayer > 0.5 ? 9.5 : (aLayer < -0.5 ? 3.0 : 6.8));
      float minPointSize = aIsHighlight > 0.5 ? 13.0 : (aLayer > 0.5 ? 5.5 : (aLayer < -0.5 ? 1.4 : 3.8));
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
        // Purely circular ice-white pinpoint hub: sharp core + tight exponential cyan halo
        float sharpCore = exp(-260.0 * r2);
        float whiteCore = exp(-400.0 * r2) * clamp(1.0 - 25.0 * r2, 0.0, 1.0);
        float expHalo = (exp(-60.0 * r2) * 0.55 + exp(-10.0 * r2) * 0.27) * circleCutoff;

        vec3 col = mix(vHaloCol, vec3(1.0), clamp(whiteCore * 1.7 + sharpCore * 0.95, 0.0, 1.0));
        float hubAlpha = clamp(whiteCore * 0.96 + sharpCore * 0.60 + expHalo, 0.0, 0.98);

        gl_FragColor = vec4(col, min(vAlpha * hubAlpha, 0.98));
      } else {
        // Multi-scale starlight nodes: brilliant core + whispering halo
        float core = exp(-144.0 * r2);
        float expHalo = (exp(-48.0 * r2) * 0.40 + exp(-12.0 * r2) * 0.25) * circleCutoff;

        vec3 nodeCol = mix(vColor, vec3(1.0), core * vHaloCol.r);
        float radialAlpha = core * 0.72 + expHalo * 0.58;

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
      // Tightened gl_PointSize around visible falloff radius to crush overdraw without shrinking physical presence (Requirement 3)
      float pointSize = clamp(
        size * uNodeScale * (65.0 / -mvPosition.z) * min(1.15, uGlowIntensity),
        14.0,
        44.0
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

      // Fast r2-based Gaussian falloff calibrated proportionally to 44.0 quad ceiling (8.0 * (44/58)^2 = 4.60)
      float falloff = exp(-4.60 * r2) * clamp(1.0 - 4.0 * r2, 0.0, 1.0);

      gl_FragColor = vec4(vColor, clamp(vAlpha * falloff, 0.0, 0.032));
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

  if (typeof window !== 'undefined') {
    window.__neuralRenderer = gl
  }

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
    const field = generateRefinedNeuralField('left', H_VAL, leftFullConfig)
    return {
      field,
      dt: performance.now() - t0,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftKey, innerFade, nodeScale, primaryWire])

  // 2. Generate refined neural field for right wing independently so tweaking left never rebuilds right
  const rightFieldData = useMemo(() => {
    const t0 = performance.now()
    const rightFullConfig = { ...rightConfig, ...themeConfig, innerFade, nodeScale }
    const field = generateRefinedNeuralField('right', H_VAL, rightFullConfig)
    return {
      field,
      dt: performance.now() - t0,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightKey, innerFade, nodeScale, primaryWire])

  // Clean disposal of previous unmerged single-wing fields when they change or unmount
  const prevLeftRef = useRef(leftFieldData.field)
  useEffect(() => {
    if (prevLeftRef.current && prevLeftRef.current !== leftFieldData.field) {
      const f = prevLeftRef.current
      if (f.linesGeo) f.linesGeo.dispose()
      if (f.pointsGeo) f.pointsGeo.dispose()
      if (f.hazeGeo) f.hazeGeo.dispose()
    }
    prevLeftRef.current = leftFieldData.field
  }, [leftFieldData])

  const prevRightRef = useRef(rightFieldData.field)
  useEffect(() => {
    if (prevRightRef.current && prevRightRef.current !== rightFieldData.field) {
      const f = prevRightRef.current
      if (f.linesGeo) f.linesGeo.dispose()
      if (f.pointsGeo) f.pointsGeo.dispose()
      if (f.hazeGeo) f.hazeGeo.dispose()
    }
    prevRightRef.current = rightFieldData.field
  }, [rightFieldData])

  useEffect(() => {
    return () => {
      if (prevLeftRef.current) {
        const f = prevLeftRef.current
        if (f.linesGeo) f.linesGeo.dispose()
        if (f.pointsGeo) f.pointsGeo.dispose()
        if (f.hazeGeo) f.hazeGeo.dispose()
      }
      if (prevRightRef.current) {
        const f = prevRightRef.current
        if (f.linesGeo) f.linesGeo.dispose()
        if (f.pointsGeo) f.pointsGeo.dispose()
        if (f.hazeGeo) f.hazeGeo.dispose()
      }
    }
  }, [])

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

  // Dispose previous merged geometries when mergedGeometries changes or unmounts
  const prevMergedRef = useRef(mergedGeometries)
  useEffect(() => {
    if (prevMergedRef.current && prevMergedRef.current !== mergedGeometries) {
      const m = prevMergedRef.current
      if (m.linesGeo) m.linesGeo.dispose()
      if (m.pointsGeo) m.pointsGeo.dispose()
      if (m.hazeGeo) m.hazeGeo.dispose()
    }
    prevMergedRef.current = mergedGeometries
  }, [mergedGeometries])

  useEffect(() => {
    return () => {
      if (prevMergedRef.current) {
        const m = prevMergedRef.current
        if (m.linesGeo) m.linesGeo.dispose()
        if (m.pointsGeo) m.pointsGeo.dispose()
        if (m.hazeGeo) m.hazeGeo.dispose()
      }
    }
  }, [])

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

  // Lightweight per-frame animation: strictly updates uniform value, zero allocations (Requirement 1)
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

  // Disposal on unmount or re-creation (Requirement 1)
  useEffect(() => {
    return () => {
      lineMat.dispose()
      pointMat.dispose()
      hazeMat.dispose()
    }
  }, [lineMat, pointMat, hazeMat])

  useEffect(() => {
    return () => {
      if (mergedGeometries) {
        if (mergedGeometries.linesGeo) mergedGeometries.linesGeo.dispose()
        if (mergedGeometries.pointsGeo) mergedGeometries.pointsGeo.dispose()
        if (mergedGeometries.hazeGeo) mergedGeometries.hazeGeo.dispose()
      }
    }
  }, [mergedGeometries])

  // Render merged meshes directly at scene level with matrixAutoUpdate = false (Requirements 1 & 2)
  return createPortal(
    <group matrixAutoUpdate={false}>
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
