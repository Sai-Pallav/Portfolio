import { memo, useMemo, useEffect, useLayoutEffect, useContext } from 'react'
import * as THREE from 'three'
import { useThree, createPortal } from '@react-three/fiber'
import { H_VAL } from './generateWireGeometry'
import { generateRefinedNeuralField } from './neuralPocketBounds'
import { useWireframeConfig } from './WireframeConfigContext'
import { FlowTrigContext } from './animationContract'
import { getWireThemeConfig } from './wireThemeConfig'

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

// Merge left and right wing BufferGeometries into a single draw call with full affine transforms
function mergeTransformedGeometries(geoA, matA, geoB, matB) {
  const vA = geoA?.attributes?.position ? geoA.attributes.position.count : 0
  const vB = geoB?.attributes?.position ? geoB.attributes.position.count : 0
  const total = vA + vB
  if (total === 0) return null

  const refGeo = vA > 0 ? geoA : geoB
  const merged = new THREE.BufferGeometry()

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

  for (const attrName in refGeo.attributes) {
    const attrA = vA > 0 ? geoA.attributes[attrName] : null
    const attrB = vB > 0 ? geoB.attributes[attrName] : null
    if (vA > 0 && !attrA) continue
    if (vB > 0 && !attrB) continue

    const sampleAttr = attrA || attrB
    const itemSize = sampleAttr.itemSize
    const arr = new sampleAttr.array.constructor(total * itemSize)

    if (attrName === 'position' || attrName === 'aFlowAxis' || attrName === 'aFlowNormal') {
      const isDirection = attrName === 'aFlowAxis' || attrName === 'aFlowNormal'
      if (attrA) {
        const srcA = attrA.array
        for (let i = 0, j = 0; i < vA; i++, j += 3) {
          const x = srcA[j], y = srcA[j + 1], z = srcA[j + 2]
          arr[j] = a0 * x + a4 * y + a8 * z + (isDirection ? 0 : a12)
          arr[j + 1] = a1 * x + a5 * y + a9 * z + (isDirection ? 0 : a13)
          arr[j + 2] = a2 * x + a6 * y + a10 * z + (isDirection ? 0 : a14)
        }
      }
      if (attrB) {
        const srcB = attrB.array
        const offset = vA * 3
        for (let i = 0, j = 0; i < vB; i++, j += 3) {
          const x = srcB[j], y = srcB[j + 1], z = srcB[j + 2]
          arr[offset + j] = b0 * x + b4 * y + b8 * z + (isDirection ? 0 : b12)
          arr[offset + j + 1] = b1 * x + b5 * y + b9 * z + (isDirection ? 0 : b13)
          arr[offset + j + 2] = b2 * x + b6 * y + b10 * z + (isDirection ? 0 : b14)
        }
      }
    } else {
      if (attrA) arr.set(attrA.array, 0)
      if (attrB) arr.set(attrB.array, vA * itemSize)
    }

    merged.setAttribute(attrName, new THREE.BufferAttribute(arr, itemSize))
  }

  // Track wing ownership (0.0 = left, 1.0 = right) so asymmetric left/right
  // nodeScale, innerFade, and glowIntensity work inside the merged 3-draw pipeline.
  const wingSide = new Float32Array(total)
  if (vB > 0) wingSide.fill(1.0, vA, total)
  merged.setAttribute('aWingSide', new THREE.BufferAttribute(wingSide, 1))

  if (geoA?.index || geoB?.index) {
    const idxA = geoA?.index ? geoA.index.array : []
    const idxB = geoB?.index ? geoB.index.array : []
    const IndexArray = total > 65535 ? Uint32Array : Uint16Array
    const indices = new IndexArray(idxA.length + idxB.length)
    if (idxA.length > 0) indices.set(idxA, 0)
    for (let i = 0; i < idxB.length; i++) {
      indices[idxA.length + i] = idxB[i] + vA
    }
    merged.setIndex(new THREE.BufferAttribute(indices, 1))
  }

  merged.computeBoundingBox()
  merged.computeBoundingSphere()
  return merged
}

function disposeNeuralField(field) {
  field.linesGeo?.dispose()
  field.pointsGeo?.dispose()
  field.hazeGeo?.dispose()
}

// Compute 3-stop luminous ramp cleanly from active themeConfig
const _cPrimary = new THREE.Color()
const _cSecondary = new THREE.Color()
const _cNode = new THREE.Color()
const _cParticle = new THREE.Color()
const _cHighlight = new THREE.Color()
const _cWhite = new THREE.Color('#ffffff')
const _hslScratch = { h: 0, s: 0, l: 0 }

function computeThemeRamp(themeConfig, outBase, outMid, outHot) {
  _cPrimary.set(themeConfig.primaryWire || '#2563eb')
  _cSecondary.set(themeConfig.secondaryWire || themeConfig.primaryWire || '#6366f1')
  _cNode.set(themeConfig.connectionNode || themeConfig.primaryWire || '#3b82f6')
  _cParticle.set(themeConfig.particle || themeConfig.connectionNode || '#60a5fa')
  _cHighlight.set(themeConfig.highlightNode || '#ffffff')

  // Inverse perceived-luminance weighting keeps deeper base hues dominant over bright cyan
  const lum1 = 0.2126 * _cPrimary.r + 0.7152 * _cPrimary.g + 0.0722 * _cPrimary.b
  const lum2 = 0.2126 * _cSecondary.r + 0.7152 * _cSecondary.g + 0.0722 * _cSecondary.b
  const w1 = 1.0 / (lum1 + 0.15)
  const w2 = 1.0 / (lum2 + 0.15)
  const wSum = w1 + w2

  outBase.setRGB(
    (_cPrimary.r * w1 + _cSecondary.r * w2) / wSum,
    (_cPrimary.g * w1 + _cSecondary.g * w2) / wSum,
    (_cPrimary.b * w1 + _cSecondary.b * w2) / wSum
  )
  outBase.getHSL(_hslScratch)
  // Keep neutral low-saturation themes (e.g. graphite) slightly subdued so haze stays velvety
  const maxL = _hslScratch.s < 0.20 ? 0.24 : 0.34
  const minL = _hslScratch.s < 0.20 ? 0.18 : 0.24
  const clampedL = Math.max(minL, Math.min(maxL, _hslScratch.l))
  outBase.setHSL(_hslScratch.h, _hslScratch.s, clampedL)

  outMid.copy(_cNode).lerp(_cParticle, 0.28)
  outHot.copy(_cHighlight).lerp(_cWhite, 0.72)
}

// Compact 11-attribute vertex interface stays strictly below WebGL's 16-attribute minimum.
// ZERO per-vertex sin/cos in GLSL; driven purely by uFlowTrig = (cos(omega*t), sin(omega*t)).
const POCKET_VISIBILITY_GLSL = `
  attribute vec4 aRelativeCoord;
  attribute vec4 aWaveBias;
  attribute vec4 aWaveCos;
  attribute vec4 aWaveSin;
  attribute vec3 aPocketFrame;
  attribute vec2 aDepthMotion;
  attribute vec3 aFlowAxis;
  attribute vec3 aFlowNormal;
  attribute float aWingSide;
  uniform vec2 uFlowTrig;
  uniform vec2 uInnerFadePair;
  uniform float uPixelRatio;
  uniform float uViewportHeight;

  float pocketEase(float x) {
    x = clamp(x, 0.0, 1.0);
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
  }

  float safeMax(float a, float b) {
    float diff = a - b;
    return 0.5 * (a + b + sqrt(diff * diff + 1e-8) - 1e-4);
  }

  float flowPocketVisibility() {
    float innerFade = mix(uInnerFadePair.x, uInnerFadePair.y, aWingSide);
    float innerStart = clamp(innerFade * 0.28, 0.035, 0.09);
    float innerSpan = max(0.11, innerFade * 0.52);
    float innerMask = pocketEase((aRelativeCoord.x - innerStart) / innerSpan);
    float outerMask = 1.0 - pocketEase((aRelativeCoord.x - 0.945) / 0.055);
    return innerMask * outerMask;
  }

  struct PocketEval {
    vec4 view;
    float radius;
    float minStrandDist;
    float halfHeightPx;
    float wallClearancePx;
  };

  PocketEval evalPocketVertex(vec3 rest, float padCss) {
    vec4 y = aWaveBias + aWaveCos * uFlowTrig.x + aWaveSin * uFlowTrig.y;
    float lo = -safeMax(safeMax(-y.x, -y.y), safeMax(-y.z, -y.w));
    float hi =  safeMax(safeMax( y.x,  y.y), safeMax( y.z,  y.w));
    float center = 0.5 * (lo + hi);
    float radius = max(0.5 * (hi - lo), 1e-5);
    float yLocal = center + radius * aPocketFrame.x;
    float zLocal = aPocketFrame.y + aDepthMotion.x * (uFlowTrig.x - 1.0) + aDepthMotion.y * uFlowTrig.y;

    float minStrandDist = min(
      min(abs(yLocal - y.x), abs(yLocal - y.y)),
      min(abs(yLocal - y.z), abs(yLocal - y.w))
    );

    vec3 localPos = rest + aFlowAxis * yLocal + aFlowNormal * zLocal;
    vec4 view = modelViewMatrix * vec4(localPos, 1.0);
    float viewDepth = max(-view.z, 1e-4);
    float axisLen = max(length((modelViewMatrix * vec4(aFlowAxis, 0.0)).xy), 1e-5);
    float pxPerLocalY = axisLen * projectionMatrix[1][1] * 0.5 * max(uViewportHeight, 1.0) / viewDepth;
    float halfHeightPx = radius * pxPerLocalY;
    float wallClearancePx = (1.0 - abs(aPocketFrame.x)) * halfHeightPx - padCss;

    PocketEval res;
    res.view = view;
    res.radius = radius;
    res.minStrandDist = minStrandDist;
    res.halfHeightPx = halfHeightPx;
    res.wallClearancePx = wallClearancePx;
    return res;
  }
`

const NeuralLineShader = {
  vertexShader: `
    attribute vec2 aLineStyle;
    uniform vec2 uLineOpacityPair;
    varying float vAlpha;
    varying float vHubAccent;
    ${POCKET_VISIBILITY_GLSL}
    void main() {
      PocketEval p = evalPocketVertex(position, 0.5);
      float lineOpacity = mix(uLineOpacityPair.x, uLineOpacityPair.y, aWingSide);
      float strandYield = mix(0.52, 1.0, smoothstep(0.0, 0.07 * p.radius + 0.014, p.minStrandDist));
      vAlpha = aLineStyle.x * lineOpacity * flowPocketVisibility() * strandYield;
      vHubAccent = aLineStyle.y;
      gl_Position = projectionMatrix * p.view;
    }
  `,
  fragmentShader: `
    uniform vec3 uBaseColor;
    uniform vec3 uMidColor;
    uniform vec3 uHotColor;
    varying float vAlpha;
    varying float vHubAccent;
    void main() {
      if (vAlpha <= 0.001) discard;
      vec3 webTint = mix(uBaseColor, uMidColor, 0.75);
      vec3 lineCol = mix(webTint, uHotColor, 0.24 * clamp(vHubAccent, 0.0, 1.0));
      gl_FragColor = vec4(lineCol, clamp(vAlpha, 0.0, 0.46));
    }
  `,
}

const NeuralPointShader = {
  vertexShader: `
    attribute vec3 aPointStyle;
    uniform vec2 uGlowIntensityPair;
    uniform vec2 uNodeScalePair;
    varying float vAlpha;
    varying float vTier;
    ${POCKET_VISIBILITY_GLSL}
    void main() {
      PocketEval p = evalPocketVertex(position, 1.5);
      vTier = aPointStyle.z;
      float glowIntensity = mix(uGlowIntensityPair.x, uGlowIntensityPair.y, aWingSide);
      float nodeScale = mix(uNodeScalePair.x, uNodeScalePair.y, aWingSide);
      float depthCue = mix(0.60, 1.0, clamp(0.5 + 0.5 * aRelativeCoord.z, 0.0, 1.0));
      float funnel = mix(0.75, 1.0, pocketEase((aRelativeCoord.x - 0.06) / 0.22));
      float persp = clamp(8.0 / max(-p.view.z, 1e-4), 0.75, 1.25);
      float targetCss = aPointStyle.x * nodeScale * funnel * persp;
      float maxCss = max(0.0, 2.0 * p.wallClearancePx);
      float pointCss = clamp(min(targetCss, maxCss), 0.0, 24.0);
      float wallFade = smoothstep(0.0, 1.5, p.wallClearancePx);
      float strandYield = mix(0.62, 1.0, smoothstep(0.0, 0.065 * p.radius + 0.014, p.minStrandDist));
      vAlpha = aPointStyle.y * glowIntensity * depthCue * flowPocketVisibility() * wallFade * strandYield;
      float safeDpr = clamp(uPixelRatio, 1.0, 2.5);
      if (pointCss <= 0.05 || vAlpha <= 0.001) {
        gl_PointSize = 0.0;
        vAlpha = 0.0;
      } else {
        gl_PointSize = min(pointCss * safeDpr, 56.0);
      }
      gl_Position = projectionMatrix * p.view;
    }
  `,
  fragmentShader: `
    uniform vec3 uBaseColor;
    uniform vec3 uMidColor;
    uniform vec3 uHotColor;
    varying float vAlpha;
    varying float vTier;
    void main() {
      if (vAlpha <= 0.001) discard;
      vec2 p = gl_PointCoord - 0.5;
      float r2 = dot(p, p);
      if (r2 >= 0.25) discard;
      float cutoff = 1.0 - smoothstep(0.12, 0.25, r2);

      if (vTier > 1.5) {
        // Tier 1: Hero Starburst Hub (crisp bright center + luminous bloom + soft halo + subtle 4-point glint)
        float core = exp(-115.0 * r2);
        float bloom = exp(-25.0 * r2) * 0.62;
        float halo = exp(-8.5 * r2) * 0.30 * cutoff;
        float glint = (exp(-520.0 * p.x * p.x - 28.0 * p.y * p.y)
          + exp(-520.0 * p.y * p.y - 28.0 * p.x * p.x)) * 0.22 * cutoff;
        vec3 col = mix(uBaseColor, uMidColor, clamp(bloom * 1.35 + 0.38, 0.0, 1.0));
        col = mix(col, uHotColor, clamp(core * 1.25 + glint * 0.75, 0.0, 1.0));
        float light = core + bloom + halo + glint;
        gl_FragColor = vec4(col, clamp(vAlpha * light, 0.0, 1.0));
      } else if (vTier > 0.5) {
        // Tier 2: Mid Constellation Vertex (clean luminous intersection, odd/even pixel stable)
        float core = exp(-26.0 * r2) * 0.92;
        float bloom = exp(-9.5 * r2) * 0.32 * cutoff;
        vec3 col = mix(uBaseColor, uMidColor, clamp(0.50 + core * 0.55 + bloom * 0.35, 0.0, 1.0));
        col = mix(col, uHotColor, clamp(core * 0.28, 0.0, 0.28));
        float light = (core + bloom) * cutoff;
        gl_FragColor = vec4(col, clamp(vAlpha * light, 0.0, 0.92));
      } else {
        // Tier 3: Subtle Micro-Dust (dimmer colored background sparkle visible at DPR 1.0 & 1.5, zero white core)
        float core = exp(-12.0 * r2) * 0.85 * cutoff;
        vec3 col = mix(uBaseColor, uMidColor, clamp(0.30 + core * 0.60, 0.0, 0.88));
        gl_FragColor = vec4(col, clamp(vAlpha * core, 0.0, 0.44));
      }
    }
  `,
}

const NeuralHazeShader = {
  vertexShader: `
    attribute vec2 aHazeStyle;
    uniform vec2 uHazeGlowPair;
    uniform vec2 uNodeScalePair;
    varying float vAlpha;
    ${POCKET_VISIBILITY_GLSL}
    void main() {
      PocketEval p = evalPocketVertex(position, 3.0);
      float hazeGlow = mix(uHazeGlowPair.x, uHazeGlowPair.y, aWingSide);
      float nodeScale = mix(uNodeScalePair.x, uNodeScalePair.y, aWingSide);
      float outerFadeHaze = 1.0 - pocketEase((aRelativeCoord.x - 0.88) / 0.11);
      float persp = clamp(8.0 / max(-p.view.z, 1e-4), 0.75, 1.25);
      float targetHazeCss = clamp(p.halfHeightPx * 1.05, 16.0, 74.0) * aHazeStyle.x * nodeScale * persp;
      float maxCss = max(0.0, 2.0 * p.wallClearancePx);
      float hazeCss = clamp(min(targetHazeCss, maxCss), 0.0, 76.0);
      float wallFade = smoothstep(0.0, 2.5, p.wallClearancePx);
      float chamberMask = smoothstep(0.008, 0.13 * p.radius + 0.015, p.minStrandDist);
      float tipMask = smoothstep(0.025, 0.11, p.radius);
      vAlpha = aHazeStyle.y * hazeGlow * flowPocketVisibility() * outerFadeHaze * wallFade * chamberMask * tipMask;
      float safeDpr = clamp(uPixelRatio, 1.0, 2.5);
      if (hazeCss <= 0.05 || vAlpha <= 0.0005) {
        gl_PointSize = 0.0;
        vAlpha = 0.0;
      } else {
        gl_PointSize = min(hazeCss * safeDpr, 160.0);
      }
      gl_Position = projectionMatrix * p.view;
    }
  `,
  fragmentShader: `
    uniform vec3 uBaseColor;
    uniform vec3 uMidColor;
    varying float vAlpha;
    void main() {
      if (vAlpha <= 0.0005) discard;
      vec2 p = gl_PointCoord - 0.5;
      float r2 = dot(p, p);
      if (r2 >= 0.25) discard;
      float falloff = exp(-4.5 * r2) * (1.0 - smoothstep(0.06, 0.25, r2));
      vec3 hazeCol = mix(uBaseColor, uMidColor, 0.14);
      gl_FragColor = vec4(hazeCol, min(vAlpha * falloff, 0.080));
    }
  `,
}

/**
 * NeuralNetworkField:
 * Merges both left/right wings and all depth tiers into at most 3 total draw calls
 * (1 Haze Points, 1 Indexed LineSegments, 1 Star Constellation Points) with
 * zero per-frame CPU rasterization, zero DataTexture cutouts, and in-place uniform updates.
 */
export const NeuralNetworkField = memo(function NeuralNetworkField({
  themeConfig = {},
  nodeScale = 1.0,
  innerFade = 0.04,
  side = 'left',
}) {
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

const GEOMETRY_EXCLUDED_KEYS = new Set(['glowIntensity', 'wireOpacity', 'nodeScale', 'innerFade'])

function buildGeometryKey(config) {
  return JSON.stringify(
    Object.entries(config)
      .filter(([key]) => !GEOMETRY_EXCLUDED_KEYS.has(key))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  )
}

const MergedNeuralNetworkField = memo(function MergedNeuralNetworkField({
  themeConfig = {},
  nodeScale = 1.0,
  innerFade = 0.04,
}) {
  const { viewport, scene, gl, size: canvasSize } = useThree()
  const flowTrigUniform = useContext(FlowTrigContext)
  const glow = themeConfig.glowIntensity ?? 1.0
  const primaryWire = themeConfig.primaryWire || '#2563eb'
  const secondaryWire = themeConfig.secondaryWire || primaryWire
  const connectionNode = themeConfig.connectionNode || primaryWire
  const particleColor = themeConfig.particle || connectionNode
  const highlightNode = themeConfig.highlightNode || '#ffffff'

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

  const leftKey = buildGeometryKey(leftConfig)
  const rightKey = buildGeometryKey(rightConfig)
  const vpWidth = viewport.width

  // 1. Generate left wing independently (nodeScale & innerFade are uniform-only!)
  const leftFieldData = useMemo(() => {
    const t0 = performance.now()
    const layout = calculateRibbonLayout(vpWidth, leftConfig)
    const worldX = layout.scaleX * Math.max(0.25, Math.abs(Math.cos(((leftConfig.yawY ?? 0) * Math.PI) / 180)))
    const aspect = layout.scaleY / worldX
    const xScale = Math.max(0.85, Math.min(2.2, worldX / 0.591))
    const field = generateRefinedNeuralField('left', H_VAL, leftConfig, aspect, xScale)
    return {
      field,
      dt: performance.now() - t0,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftKey, vpWidth])

  // 2. Generate right wing independently
  const rightFieldData = useMemo(() => {
    const t0 = performance.now()
    const layout = calculateRibbonLayout(vpWidth, rightConfig)
    const worldX = layout.scaleX * Math.max(0.25, Math.abs(Math.cos(((rightConfig.yawY ?? 0) * Math.PI) / 180)))
    const aspect = layout.scaleY / worldX
    const xScale = Math.max(0.85, Math.min(2.2, worldX / 0.591))
    const field = generateRefinedNeuralField('right', H_VAL, rightConfig, aspect, xScale)
    return {
      field,
      dt: performance.now() - t0,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightKey, vpWidth])

  useEffect(() => () => disposeNeuralField(leftFieldData.field), [leftFieldData])
  useEffect(() => () => disposeNeuralField(rightFieldData.field), [rightFieldData])

  // 3. Merge both wings into 3 single draw-call BufferGeometries
  const mergedGeometries = useMemo(() => {
    const mergeStarted = performance.now()
    const leftField = leftFieldData.field
    const rightField = rightFieldData.field

    const layoutLeft = calculateRibbonLayout(vpWidth, leftConfig)
    const layoutRight = calculateRibbonLayout(vpWidth, rightConfig)

    const matLeft = getRibbonMatrix({ ...leftConfig, side: 'left' }, layoutLeft)
    const matRight = getRibbonMatrix({ ...rightConfig, side: 'right' }, layoutRight)

    const mergedLinesGeo = mergeTransformedGeometries(leftField.linesGeo, matLeft, rightField.linesGeo, matRight)
    const mergedPointsGeo = mergeTransformedGeometries(leftField.pointsGeo, matLeft, rightField.pointsGeo, matRight)
    const mergedHazeGeo = mergeTransformedGeometries(leftField.hazeGeo, matLeft, rightField.hazeGeo, matRight)
    const mergeDt = performance.now() - mergeStarted

    return {
      linesGeo: mergedLinesGeo,
      pointsGeo: mergedPointsGeo,
      hazeGeo: mergedHazeGeo,
      timings: {
        left: leftFieldData.dt,
        right: rightFieldData.dt,
        merge: mergeDt,
        total: leftFieldData.dt + rightFieldData.dt + mergeDt,
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftFieldData, rightFieldData, vpWidth, leftKey, rightKey])

  useEffect(() => () => disposeNeuralField(mergedGeometries), [mergedGeometries])

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      window.__neuralBuildTimes = mergedGeometries.timings
    }
  }, [mergedGeometries])

  // 4. Create the 3 ShaderMaterials once per mount (uniforms updated in-place via useLayoutEffect)
  const lineMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uLineOpacityPair: { value: new THREE.Vector2(0.9, 0.9) },
        uInnerFadePair: { value: new THREE.Vector2(0.04, 0.04) },
        uFlowTrig: flowTrigUniform,
        uBaseColor: { value: new THREE.Color() },
        uMidColor: { value: new THREE.Color() },
        uHotColor: { value: new THREE.Color() },
        uPixelRatio: { value: 1 },
        uViewportHeight: { value: 800 },
      },
      vertexShader: NeuralLineShader.vertexShader,
      fragmentShader: NeuralLineShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    })
  }, [flowTrigUniform])

  const pointMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uGlowIntensityPair: { value: new THREE.Vector2(1, 1) },
        uNodeScalePair: { value: new THREE.Vector2(1, 1) },
        uInnerFadePair: { value: new THREE.Vector2(0.04, 0.04) },
        uFlowTrig: flowTrigUniform,
        uBaseColor: { value: new THREE.Color() },
        uMidColor: { value: new THREE.Color() },
        uHotColor: { value: new THREE.Color() },
        uPixelRatio: { value: 1 },
        uViewportHeight: { value: 800 },
      },
      vertexShader: NeuralPointShader.vertexShader,
      fragmentShader: NeuralPointShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    })
  }, [flowTrigUniform])

  const hazeMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uHazeGlowPair: { value: new THREE.Vector2(1, 1) },
        uNodeScalePair: { value: new THREE.Vector2(1, 1) },
        uInnerFadePair: { value: new THREE.Vector2(0.04, 0.04) },
        uFlowTrig: flowTrigUniform,
        uBaseColor: { value: new THREE.Color() },
        uMidColor: { value: new THREE.Color() },
        uHotColor: { value: new THREE.Color() },
        uPixelRatio: { value: 1 },
        uViewportHeight: { value: 800 },
      },
      vertexShader: NeuralHazeShader.vertexShader,
      fragmentShader: NeuralHazeShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    })
  }, [flowTrigUniform])

  const rightGlowMult = rightConfig.glowIntensity ?? 1.0
  const leftGlowMult = leftConfig.glowIntensity ?? 1.0
  const rightNodeScaleParam = rightConfig.nodeScale ?? 1.0
  const leftNodeScaleParam = leftConfig.nodeScale ?? 1.0
  const rightInnerFadeParam = rightConfig.innerFade ?? 0.04
  const leftInnerFadeParam = leftConfig.innerFade ?? 0.04
  const rightBreadth = rightConfig.breadthMultiplier ?? 1.0
  const rightLength = rightConfig.lengthMultiplier ?? 1.0
  const rightInnerExt = rightConfig.innerExtension ?? 0.0
  const rightInnerGap = rightConfig.innerGap ?? 0.0
  const rightOuterExt = rightConfig.outerExtension ?? 1.5
  const rightOuterX = rightConfig.outerXOffset ?? 0.0

  useLayoutEffect(() => {
    const rampBase = lineMat.uniforms.uBaseColor.value
    const rampMid = lineMat.uniforms.uMidColor.value
    const rampHot = lineMat.uniforms.uHotColor.value
    computeThemeRamp(
      { primaryWire, secondaryWire, connectionNode, particle: particleColor, highlightNode },
      rampBase,
      rampMid,
      rampHot
    )

    // Derive independent left/right wing glow, nodeScale, and innerFade
    // while keeping symmetric prop overrides working seamlessly.
    let baseGlow = 1.0
    if (leftGlowMult > 1e-4) {
      baseGlow = glow / leftGlowMult
    } else if (typeof document !== 'undefined') {
      const docTheme = document.documentElement.getAttribute('data-theme')
      baseGlow = getWireThemeConfig(docTheme)?.glowIntensity || 1.0
    }
    const leftGlow = glow
    const rightGlow = baseGlow * rightGlowMult

    const layoutLeft = calculateRibbonLayout(vpWidth, leftConfig)
    const layoutRight = calculateRibbonLayout(vpWidth, rightConfig)
    const leftNS = nodeScale
    const rightNS = layoutLeft.nodeScale > 1e-4
      ? layoutRight.nodeScale * (nodeScale / layoutLeft.nodeScale)
      : (leftNodeScaleParam === rightNodeScaleParam && Math.abs(layoutLeft.scaleY - layoutRight.scaleY) < 1e-4
        ? nodeScale
        : layoutRight.nodeScale)

    const leftFade = innerFade
    const rightFade = Math.abs(leftInnerFadeParam - innerFade) < 1e-4
      ? rightInnerFadeParam
      : innerFade

    for (const material of [lineMat, pointMat, hazeMat]) {
      material.uniforms.uBaseColor.value.copy(rampBase)
      material.uniforms.uMidColor.value.copy(rampMid)
      material.uniforms.uHotColor.value.copy(rampHot)
      material.uniforms.uPixelRatio.value = viewport.dpr
      material.uniforms.uViewportHeight.value = Math.max(1, canvasSize.height)
      material.uniforms.uInnerFadePair.value.set(leftFade, rightFade)
    }

    lineMat.uniforms.uLineOpacityPair.value.set(
      Math.min(1.12, leftGlow * 0.78),
      Math.min(1.12, rightGlow * 0.78)
    )
    pointMat.uniforms.uGlowIntensityPair.value.set(
      Math.min(1.30, leftGlow * 0.94),
      Math.min(1.30, rightGlow * 0.94)
    )
    pointMat.uniforms.uNodeScalePair.value.set(leftNS, rightNS)
    hazeMat.uniforms.uHazeGlowPair.value.set(
      Math.min(1.00, leftGlow * 0.70),
      Math.min(1.00, rightGlow * 0.70)
    )
    hazeMat.uniforms.uNodeScalePair.value.set(leftNS, rightNS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lineMat,
    pointMat,
    hazeMat,
    glow,
    innerFade,
    nodeScale,
    vpWidth,
    leftGlowMult,
    rightGlowMult,
    leftNodeScaleParam,
    rightNodeScaleParam,
    leftInnerFadeParam,
    rightInnerFadeParam,
    rightBreadth,
    rightLength,
    rightInnerExt,
    rightInnerGap,
    rightOuterExt,
    rightOuterX,
    primaryWire,
    secondaryWire,
    connectionNode,
    particleColor,
    highlightNode,
    viewport.dpr,
    canvasSize.height,
  ])

  useEffect(() => () => lineMat.dispose(), [lineMat])
  useEffect(() => () => pointMat.dispose(), [pointMat])
  useEffect(() => () => hazeMat.dispose(), [hazeMat])

  return createPortal(
    <group matrixAutoUpdate={false} dispose={null}>
      {/* 1. Velvety Interior Pocket Nebula (1 draw call) */}
      {mergedGeometries.hazeGeo && (
        <points
          geometry={mergedGeometries.hazeGeo}
          material={hazeMat}
          matrixAutoUpdate={false}
          frustumCulled={false}
        />
      )}

      {/* 2. Triangulated Synaptic Spiderweb (1 indexed draw call) */}
      {mergedGeometries.linesGeo && (
        <lineSegments
          geometry={mergedGeometries.linesGeo}
          material={lineMat}
          matrixAutoUpdate={false}
          frustumCulled={false}
        />
      )}

      {/* 3. 3-Tier Star Constellation: Micro-Dust + Mid Vertices + Hero Hubs (1 draw call) */}
      {mergedGeometries.pointsGeo && (
        <points
          geometry={mergedGeometries.pointsGeo}
          material={pointMat}
          matrixAutoUpdate={false}
          frustumCulled={false}
        />
      )}
    </group>,
    scene
  )
})

export default NeuralNetworkField
