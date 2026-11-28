import { memo, useMemo, useEffect, useLayoutEffect, useContext, useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { useThree, useFrame, createPortal } from '@react-three/fiber'
import { H_VAL } from './generateWireGeometry'
import { generateRefinedNeuralField } from './neuralPocketBounds'
import { useWireframeConfig } from './WireframeConfigContext'
import { FlowTimeContext, FlowTrigContext } from './animationContract'
import { getWireThemeConfig } from './wireThemeConfig'

const ROLL_PERIOD_SECONDS = 56.0
const TWO_PI = Math.PI * 2.0

function computeWrappedRollAngle(timeVal) {
  const wrapped = ((timeVal % ROLL_PERIOD_SECONDS) + ROLL_PERIOD_SECONDS) % ROLL_PERIOD_SECONDS
  return (wrapped / ROLL_PERIOD_SECONDS) * TWO_PI
}

function subscribeReducedMotion(callback) {
  if (typeof window === 'undefined') return () => { }
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

function getReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getServerReducedMotion() {
  return false
}

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

    if (attrName === 'position' || attrName === 'aPeerPos' || attrName === 'aFlowAxis' || attrName === 'aFlowNormal') {
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
      if (attrName === 'aPocketFrame' && itemSize === 4) {
        for (let i = 0; i < vA; i++) arr[i * 4 + 3] = 0.0
        for (let i = 0; i < vB; i++) arr[(vA + i) * 4 + 3] = 1.0
      }
    }

    merged.setAttribute(attrName, new THREE.BufferAttribute(arr, itemSize))
  }

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
  if (themeConfig.neuralBaseColor && themeConfig.neuralMidColor && themeConfig.neuralHotColor) {
    outBase.set(themeConfig.neuralBaseColor)
    outMid.set(themeConfig.neuralMidColor)
    outHot.set(themeConfig.neuralHotColor)
    return
  }

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
  const isNeutral = _hslScratch.s < 0.18
  // Keep linear saturation vibrant while normalizing perceived luminance across all hues
  if (!isNeutral && _hslScratch.s < 0.85) {
    outBase.setHSL(_hslScratch.h, 0.85, _hslScratch.l)
  }
  const baseLum = Math.max(1e-4, 0.2126 * outBase.r + 0.7152 * outBase.g + 0.0722 * outBase.b)
  const targetBaseLum = isNeutral ? 0.085 : 0.135
  const maxBaseChan = Math.max(outBase.r, outBase.g, outBase.b, 1e-4)
  const baseScale = Math.min(targetBaseLum / baseLum, 0.72 / maxBaseChan)
  outBase.multiplyScalar(baseScale)

  // Rich saturated theme mid-tint (preserves deep cobalt/violet/emerald without grey-white wash)
  outMid.copy(_cNode).lerp(_cParticle, 0.24)
  const dR = _cNode.r - _cParticle.r
  const dG = _cNode.g - _cParticle.g
  const dB = _cNode.b - _cParticle.b
  const nodeSameAsParticle = (dR * dR + dG * dG + dB * dB) < 1e-4
  if (nodeSameAsParticle) {
    outMid.lerp(_cPrimary, 0.28)
  }
  if (!isNeutral) {
    outMid.getHSL(_hslScratch)
    if (_hslScratch.s < 0.80) {
      outMid.setHSL(_hslScratch.h, 0.80, _hslScratch.l)
    }
  }
  const midLum = Math.max(1e-4, 0.2126 * outMid.r + 0.7152 * outMid.g + 0.0722 * outMid.b)
  const maxMidLum = isNeutral ? 0.34 : 0.36
  if (midLum > maxMidLum) {
    outMid.multiplyScalar(maxMidLum / midLum)
  }

  // Crisp near-white hot core reserved strictly for Tier-1 pinpoint star centers
  outHot.copy(_cHighlight).lerp(_cWhite, 0.76)
}

// Compact attribute interface (12 custom + 3 Three.js built-ins = 15 <= 16 WebGL limit).
// ZERO per-vertex sin/cos in GLSL; driven purely by uFlowTrig, uRollAnglePair & uTime.
const SAFE_MAX_GLSL = `
  float safeMax(float a, float b) {
    float diff = a - b;
    return 0.5 * (a + b + sqrt(diff * diff + 1e-8) - 1e-4);
  }
`

const POCKET_MASK_GLSL = `
  attribute vec4 aRelativeCoord;
  attribute vec4 aWaveBias;
  attribute vec4 aWaveCos;
  attribute vec4 aWaveSin;
  attribute vec4 aPocketFrame;
  uniform vec2 uFlowTrig;
  uniform vec2 uInnerFadePair;
  uniform float uPixelRatio;
  uniform float uViewportHeight;
  uniform vec3 uFlowAxisLeft;
  uniform vec3 uFlowAxisRight;
  uniform vec3 uDepthAxisLeft;
  uniform vec3 uDepthAxisRight;

  ${SAFE_MAX_GLSL}

  float pocketEase(float x) {
    x = clamp(x, 0.0, 1.0);
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
  }

  float flowPocketVisibility() {
    float innerFade = mix(uInnerFadePair.x, uInnerFadePair.y, aPocketFrame.w);
    float innerStart = clamp(innerFade * 0.28, 0.035, 0.09);
    float innerSpan = max(0.11, innerFade * 0.52);
    float innerMask = pocketEase((aRelativeCoord.x - innerStart) / innerSpan);
    float outerMask = 1.0 - pocketEase((aRelativeCoord.x - 0.945) / 0.055);
    return innerMask * outerMask;
  }

  struct PocketMaskEval {
    vec4 view;
    vec4 strandY;
    float lo;
    float hi;
    float radius;
    float minStrandDist;
    float distInsidePx;
    float halfHeightPx;
    float pxPerLocalY;
    vec2 axisScreenDir;
  };

  PocketMaskEval evalPocketMaskWaves(
    vec3 worldPos,
    float yLocal,
    vec4 waveBias,
    vec4 waveCos,
    vec4 waveSin,
    float wingSide
  ) {
    vec4 strandY = waveBias + waveCos * uFlowTrig.x + waveSin * uFlowTrig.y;
    float lo = -safeMax(safeMax(-strandY.x, -strandY.y), safeMax(-strandY.z, -strandY.w));
    float hi =  safeMax(safeMax( strandY.x,  strandY.y), safeMax( strandY.z,  strandY.w));
    float radius = max(0.5 * (hi - lo), 1e-5);

    float minStrandDist = min(
      min(abs(yLocal - strandY.x), abs(yLocal - strandY.y)),
      min(abs(yLocal - strandY.z), abs(yLocal - strandY.w))
    );

    vec3 flowAxis = mix(uFlowAxisLeft, uFlowAxisRight, wingSide);
    vec4 view = modelViewMatrix * vec4(worldPos, 1.0);
    float viewDepth = max(-view.z, 1e-4);
    vec2 axisViewXY = (modelViewMatrix * vec4(flowAxis, 0.0)).xy;
    float axisLen = length(axisViewXY);
    float safeAxisLen = max(axisLen, 1e-5);
    vec2 axisScreenDir = axisLen > 1e-5 ? (axisViewXY / axisLen) : vec2(0.0, 1.0);
    float pxPerLocalY = safeAxisLen * projectionMatrix[1][1] * 0.5 * max(uViewportHeight, 1.0) / viewDepth;
    float halfHeightPx = radius * pxPerLocalY;
    float distInsidePx = min(yLocal - lo, hi - yLocal) * pxPerLocalY;

    PocketMaskEval res;
    res.view = view;
    res.strandY = strandY;
    res.lo = lo;
    res.hi = hi;
    res.radius = radius;
    res.minStrandDist = minStrandDist;
    res.distInsidePx = distInsidePx;
    res.halfHeightPx = halfHeightPx;
    res.pxPerLocalY = pxPerLocalY;
    res.axisScreenDir = axisScreenDir;
    return res;
  }

  PocketMaskEval evalStaticPocketMask(vec3 fixedPos, float yLocal) {
    return evalPocketMaskWaves(fixedPos, yLocal, aWaveBias, aWaveCos, aWaveSin, aPocketFrame.w);
  }

  float evalStrandWake(PocketMaskEval p, float yLocal) {
    // Instantaneous vertical travel rate of each of the 4 wave strands (dY/dTheta)
    vec4 vel = aWaveSin * uFlowTrig.x - aWaveCos * uFlowTrig.y;
    vec4 absVel = abs(vel);
    // Restrict wake to actively sweeping inner crossing strands inside [lo, hi]
    vec4 speedMask = smoothstep(0.08 * p.radius, 0.35 * p.radius, absVel);
    vec4 marginIn = min(p.strandY - p.lo, p.hi - p.strandY);
    vec4 innerMask = smoothstep(0.03 * p.radius, 0.22 * p.radius, marginIn);
    // Signed distance strictly BEHIND each strand along its travel direction
    vec4 dir = mix(vec4(-1.0), vec4(1.0), step(vec4(0.0), vel));
    vec4 distBehindNorm = ((p.strandY - yLocal) * dir) / p.radius;
    // Narrow trailing shimmer behind the crossing strand (zero at crossing so dip stays intact)
    vec4 wakeRise = smoothstep(0.035, 0.125, distBehindNorm);
    vec4 wakeFall = 1.0 - smoothstep(0.125, 0.38, distBehindNorm);
    vec4 wake4 = wakeRise * wakeFall * speedMask * innerMask;
    return clamp(max(max(wake4.x, wake4.y), max(wake4.z, wake4.w)), 0.0, 1.0);
  }
`


const NEURAL_3D_TRANSFORM_GLSL = `
  vec3 computeHarmonicDrift(
    vec3 restPos,
    vec4 driftParams,
    float uCoord,
    float distInsidePx,
    float halfHeightPx,
    float viewZ,
    float proj11,
    float vpHeight,
    float timeVal,
    float driftScale
  ) {
    if (driftScale <= 0.001) return vec3(0.0);

    // Tip damping: strictly 0 near inner tip for u < 0.08
    float tipDamp = smoothstep(0.08, 0.14, uCoord);

    // Outer envelope damping: taper smoothly only at the far outer edge (u > 0.94)
    float outerDamp = 1.0 - smoothstep(0.94, 0.985, uCoord);

    // Margin-localized wall damping: taper smoothly to 0.0 near the live ribbon wall
    float safeWallMargin = max(0.28 * halfHeightPx, 5.0);
    float normWallDist = clamp(distInsidePx / safeWallMargin, 0.0, 1.0);
    float wallDamp = smoothstep(0.0, 1.0, normWallDist);

    float driftDamp = tipDamp * outerDamp * wallDamp;
    if (driftDamp <= 0.001) return vec3(0.0);

    // Cleanly wrapped time to prevent long-session float precision degradation
    float t = mod(timeVal, 240.0);

    // Out-of-phase Lissajous orbital harmonics in 4.5-7.5 second periods:
    float f = driftParams.z;
    float thetaX = t * (0.96 * f) + driftParams.x;
    float thetaY = t * (1.22 * f) + driftParams.y;
    float thetaZ = t * (1.08 * f) + (driftParams.x + driftParams.y);

    float dispX = sin(thetaX) * 0.72 + cos(thetaY * 0.6) * 0.28;
    float dispY = cos(thetaY) * 0.78 + sin(thetaX * 0.5) * 0.22;
    float dispZ = sin(thetaZ) * 0.50;

    // View-depth perspective conversion: exact CSS px -> world units
    float viewDepth = max(-viewZ, 1e-4);
    float worldPerPx = viewDepth / (proj11 * 0.5 * max(vpHeight, 1.0));

    // Calibrated subtle peak drift radius (~1.5 - 2.5 CSS px) layered onto 3D axial roll
    float ampNorm = clamp((driftParams.w - 0.75) / 0.50, 0.0, 1.0);
    float baseRadiusPx = mix(1.5, 2.5, ampNorm);
    float rWorld = baseRadiusPx * worldPerPx * driftDamp * driftScale;

    return vec3(dispX, dispY, dispZ) * rWorld;
  }

  struct NeuralTransformResult {
    vec3 worldPos;
    float liveY;
    float liveZ;
    float depth01;
    PocketMaskEval pocket;
  };

  // Single shared 3D cylinder barrel-roll + endpoint-locked micro-drift transform
  // injected verbatim into both NeuralPointShader and NeuralLineShader.
  NeuralTransformResult applyNeural3DTransform(
    vec3 baseWorldPos,
    float yRestLocal,
    float y0,
    float z0,
    float localRadius,
    float uCoord,
    vec4 driftParams,
    vec4 waveBias,
    vec4 waveCos,
    vec4 waveSin,
    float wingSide,
    float rollAngle,
    float timeVal,
    float driftScale
  ) {
    float activeRoll = driftScale > 0.5 ? mod(rollAngle, 6.28318530718) : 0.0;
    float cRoll = cos(activeRoll);
    float sRoll = sin(activeRoll);
    float y0Rot = y0 * cRoll - z0 * sRoll;
    float z0Rot = y0 * sRoll + z0 * cRoll;
    float dYLocal = y0Rot - y0;
    float dZLocal = z0Rot - z0;
    float yRotLocal = yRestLocal + dYLocal;

    vec3 flowAxis = mix(uFlowAxisLeft, uFlowAxisRight, wingSide);
    vec3 depthAxis = mix(uDepthAxisLeft, uDepthAxisRight, wingSide);
    vec3 rotatedWorldPos = baseWorldPos + dYLocal * flowAxis + dZLocal * depthAxis;

    PocketMaskEval p = evalPocketMaskWaves(rotatedWorldPos, yRotLocal, waveBias, waveCos, waveSin, wingSide);

    vec3 driftOffset = computeHarmonicDrift(
      rotatedWorldPos,
      driftParams,
      uCoord,
      p.distInsidePx,
      p.halfHeightPx,
      p.view.z,
      projectionMatrix[1][1],
      uViewportHeight,
      timeVal,
      driftScale
    );

    vec3 finalWorldPos = rotatedWorldPos + driftOffset;
    float flowLen2 = max(dot(flowAxis, flowAxis), 1e-6);
    float liveY = yRotLocal + dot(driftOffset, flowAxis) / flowLen2;
    p.view = modelViewMatrix * vec4(finalWorldPos, 1.0);
    p.distInsidePx = min(liveY - p.lo, p.hi - liveY) * p.pxPerLocalY;
    p.minStrandDist = min(
      min(abs(liveY - p.strandY.x), abs(liveY - p.strandY.y)),
      min(abs(liveY - p.strandY.z), abs(liveY - p.strandY.w))
    );

    float safeR = max(localRadius, 0.002);
    float depth01 = smoothstep(-safeR, safeR, z0Rot);

    NeuralTransformResult res;
    res.worldPos = finalWorldPos;
    res.liveY = liveY;
    res.liveZ = z0Rot;
    res.depth01 = depth01;
    res.pocket = p;
    return res;
  }
`;

const NeuralLineShader = {
  vertexShader: `
    attribute vec3 aPeerPos;
    attribute vec4 aLineStyle;
    attribute vec4 aPartnerBias;
    attribute vec4 aPartnerCos;
    attribute vec4 aPartnerSin;
    attribute vec4 aDriftParams;
    attribute vec4 aPeerDriftParams;
    uniform vec2 uLineOpacityPair;
    uniform vec2 uRollAnglePair;
    uniform vec2 uKWavePair;
    uniform vec3 uXAxisLeft;
    uniform vec3 uXAxisRight;
    uniform float uTime;
    uniform float uDriftScale;
    varying float vAlpha;
    varying float vHubAccent;
    varying vec2 vPulseTrig;
    varying vec4 vStrandY;
    varying float vLocalY;
    varying float vPxPerLocalY;
    varying float vWallPadPx;
    varying float vFeatherPx;
    varying float vLineBreath;
    varying float vWingSide;
    varying float vDepth01;
    ${POCKET_MASK_GLSL}
    ${NEURAL_3D_TRANSFORM_GLSL}

    float evalLineWallMask(float distPx, float halfHPx, out float outPad, out float outFeather) {
      outPad = -min(2.0, 0.020 * halfHPx);
      outFeather = clamp(0.075 * halfHPx, 4.5, 11.0);
      return smoothstep(outPad, outPad + outFeather, distPx);
    }

    void main() {
      float wingSide = aPocketFrame.w;
      float rollAngle = mix(uRollAnglePair.x, uRollAnglePair.y, wingSide);
      float y0A = aRelativeCoord.y * aPocketFrame.z;
      float z0A = aRelativeCoord.z * aPocketFrame.z;

      NeuralTransformResult resA = applyNeural3DTransform(
        position,
        aPocketFrame.x,
        y0A,
        z0A,
        aPocketFrame.z,
        aRelativeCoord.x,
        aDriftParams,
        aWaveBias,
        aWaveCos,
        aWaveSin,
        wingSide,
        rollAngle,
        uTime,
        uDriftScale
      );

      vec3 xAxis = mix(uXAxisLeft, uXAxisRight, wingSide);
      float signWing = mix(-1.0, 1.0, wingSide);
      float xLen2 = max(dot(xAxis, xAxis), 1e-6);
      float uB = clamp(aRelativeCoord.x + signWing * 0.1 * dot(aPeerPos - position, xAxis) / xLen2, 0.0, 1.0);

      vec4 absAmpB = sqrt(aPartnerCos * aPartnerCos + aPartnerSin * aPartnerSin);
      float fMinB = min(
        min(aPartnerBias.x - absAmpB.x, aPartnerBias.y - absAmpB.y),
        min(aPartnerBias.z - absAmpB.z, aPartnerBias.w - absAmpB.w)
      );
      float fMaxB = max(
        max(aPartnerBias.x + absAmpB.x, aPartnerBias.y + absAmpB.y),
        max(aPartnerBias.z + absAmpB.z, aPartnerBias.w + absAmpB.w)
      );
      float rB = max(0.5 * (fMaxB - fMinB), 1e-5);

      NeuralTransformResult resB = applyNeural3DTransform(
        aPeerPos,
        aPocketFrame.y,
        aLineStyle.z,
        aLineStyle.w,
        rB,
        uB,
        aPeerDriftParams,
        aPartnerBias,
        aPartnerCos,
        aPartnerSin,
        wingSide,
        rollAngle,
        uTime,
        uDriftScale
      );

      float padSelf, featherSelf;
      float maskSelf = evalLineWallMask(resA.pocket.distInsidePx, resA.pocket.halfHeightPx, padSelf, featherSelf);
      float padPartner, featherPartner;
      float maskPartner = evalLineWallMask(resB.pocket.distInsidePx, resB.pocket.halfHeightPx, padPartner, featherPartner);

      // Fade both endpoints smoothly together near moving boundaries so zero floating stub edges linger
      float jointMask = min(maskSelf, maskPartner);
      float lineOpacity = mix(uLineOpacityPair.x, uLineOpacityPair.y, wingSide);
      float strandYield = mix(0.68, 1.0, smoothstep(0.0, 0.052 * resA.pocket.radius + 0.010, resA.pocket.minStrandDist));
      float pocketMask = lineOpacity * flowPocketVisibility() * jointMask * strandYield;

      // Soft luminance breath (~8-12%) + trailing inner-strand wake shimmer (~13% boost)
      float tLineTwinkle = mod(uTime, 240.0) * (1.257 * aDriftParams.z) + aDriftParams.x;
      float lineBreath = 0.5 + 0.5 * cos(tLineTwinkle);
      float lineWake = uDriftScale > 0.5 ? evalStrandWake(resA.pocket, resA.liveY) : 0.0;
      float vBreath = uDriftScale > 0.5 ? mix(0.89, 1.11, lineBreath) * (1.0 + 0.13 * lineWake) : 1.0;

      float kWave = mix(uKWavePair.x, uKWavePair.y, wingSide);
      float phiA = kWave * aRelativeCoord.x;

      vAlpha = aLineStyle.x * pocketMask;
      vHubAccent = aLineStyle.y;
      vPulseTrig = vec2(cos(phiA), sin(phiA));
      vStrandY = resA.pocket.strandY;
      vLocalY = resA.liveY;
      vPxPerLocalY = resA.pocket.pxPerLocalY;
      vWallPadPx = padSelf;
      vFeatherPx = featherSelf;
      vLineBreath = vBreath;
      vWingSide = wingSide;
      vDepth01 = resA.depth01;

      gl_Position = projectionMatrix * resA.pocket.view;
    }
  `,
  fragmentShader: `
    uniform vec2 uFlowTrig;
    uniform float uRestingLineScale;
    uniform vec3 uBaseColor;
    uniform vec3 uMidColor;
    uniform vec3 uHotColor;
    varying float vAlpha;
    varying float vHubAccent;
    varying vec2 vPulseTrig;
    varying vec4 vStrandY;
    varying float vLocalY;
    varying float vPxPerLocalY;
    varying float vWallPadPx;
    varying float vFeatherPx;
    varying float vLineBreath;
    varying float vWingSide;
    varying float vDepth01;
    ${SAFE_MAX_GLSL}

    void main() {
      if (vAlpha <= 0.001) discard;

      float lo = -safeMax(safeMax(-vStrandY.x, -vStrandY.y), safeMax(-vStrandY.z, -vStrandY.w));
      float hi =  safeMax(safeMax( vStrandY.x,  vStrandY.y), safeMax( vStrandY.z,  vStrandY.w));
      float fragDistInPx = min(vLocalY - lo, hi - vLocalY) * vPxPerLocalY;
      float fragWallMask = smoothstep(vWallPadPx, vWallPadPx + max(vFeatherPx, 1.0), fragDistInPx);
      float alphaMask = vAlpha * fragWallMask * uRestingLineScale;
      if (alphaMask <= 0.001) discard;

      float depth01 = clamp(vDepth01, 0.0, 1.0);
      // Protected connector visibility: front hemisphere crisply legible (1.20x), back recedes softly (0.42x)
      float depthOpacity = mix(0.42, 1.20, depth01);

      vec2 pDir = vPulseTrig * inversesqrt(max(dot(vPulseTrig, vPulseTrig), 1e-4));
      float pulse = 0.5 + 0.5 * dot(pDir, uFlowTrig);
      float accent = clamp(vHubAccent, 0.0, 1.0);
      float pulseBoost = mix(0.76, 1.24, pulse) * (1.0 + 0.12 * accent * pulse);
      vec3 webTint = mix(uBaseColor, uMidColor, mix(0.40, 0.72, depth01) + 0.16 * pulse);
      vec3 lineCol = mix(webTint, uHotColor, clamp((0.06 + 0.10 * depth01 + 0.10 * pulse) * accent, 0.0, 0.28));

      // Calm, softly breathing synaptic filaments with protected Z-depth legibility
      float outAlpha = clamp(alphaMask * depthOpacity * pulseBoost * vLineBreath, 0.0, 0.62);
      if (outAlpha <= 0.001) discard;
      gl_FragColor = vec4(lineCol, outAlpha);
    }
  `,
};

const NeuralPointShader = {
  vertexShader: `
    attribute vec4 aPointStyle;
    attribute vec4 aDriftParams;
    uniform vec2 uGlowIntensityPair;
    uniform vec2 uNodeScalePair;
    uniform vec2 uRollAnglePair;
    uniform float uTime;
    uniform float uDriftScale;
    varying float vAlpha;
    varying float vTier;
    varying float vTwinkle;
    varying float vBreath;
    varying float vWake;
    varying float vDepth01;
    ${POCKET_MASK_GLSL}
    ${NEURAL_3D_TRANSFORM_GLSL}

    void main() {
      float wingSide = aPocketFrame.w;
      float rollAngle = mix(uRollAnglePair.x, uRollAnglePair.y, wingSide);
      float y0 = aRelativeCoord.y * aPocketFrame.z;
      float z0 = aRelativeCoord.z * aPocketFrame.z;

      NeuralTransformResult res = applyNeural3DTransform(
        position,
        aPocketFrame.x,
        y0,
        z0,
        aPocketFrame.z,
        aRelativeCoord.x,
        aDriftParams,
        aWaveBias,
        aWaveCos,
        aWaveSin,
        wingSide,
        rollAngle,
        uTime,
        uDriftScale
      );

      vTier = aPointStyle.z;
      float glowIntensity = mix(uGlowIntensityPair.x, uGlowIntensityPair.y, wingSide);
      float nodeScale = mix(uNodeScalePair.x, uNodeScalePair.y, wingSide);
      float depth01 = res.depth01;
      float depthCue = vTier > 1.5
        ? mix(0.45, 1.08, depth01)
        : mix(0.36, 1.06, depth01);
      float depthSize = vTier > 1.5
        ? mix(0.78, 1.12, depth01)
        : mix(0.72, 1.12, depth01);
      float funnel = vTier > 1.5
        ? mix(0.58, 1.0, pocketEase((aRelativeCoord.x - 0.14) / 0.24))
        : mix(0.76, 1.0, pocketEase((aRelativeCoord.x - 0.06) / 0.20));
      float persp = clamp(8.0 / max(-res.pocket.view.z, 1e-4), 0.75, 1.25);
      float minFloor = vTier < 1.5 ? 1.45 : 0.0;
      float targetCss = max(minFloor, aPointStyle.x * nodeScale * funnel * persp * depthSize);
      float maxTierCss = vTier > 1.5 ? 16.5 : 10.5;
      float pointCss = clamp(targetCss, 0.0, maxTierCss);

      float wallEdgePx = vTier > 1.5
        ? (0.24 * pointCss + 0.8)
        : (0.14 * pointCss - min(1.2, 0.015 * res.pocket.halfHeightPx));
      float featherPx = vTier > 1.5
        ? clamp(0.08 * res.pocket.halfHeightPx, 5.0, 11.0)
        : clamp(0.065 * res.pocket.halfHeightPx, 4.0, 9.5);
      float pocketMask = smoothstep(wallEdgePx, wallEdgePx + featherPx, res.pocket.distInsidePx);
      float strandYield = vTier > 1.5
        ? mix(0.80, 1.0, smoothstep(0.0, 0.055 * res.pocket.radius + 0.012, res.pocket.minStrandDist))
        : mix(0.72, 1.0, smoothstep(0.0, 0.058 * res.pocket.radius + 0.012, res.pocket.minStrandDist));

      // Dual-harmonic non-repeating star breathing (blending slow cosine & sine cycles)
      float freqNorm = aDriftParams.z;
      float tWrapped = mod(uTime, 240.0);
      float cyc1 = 0.5 + 0.5 * cos(tWrapped * (1.18 * freqNorm) + aPointStyle.w);
      float cyc2 = 0.5 + 0.5 * sin(tWrapped * (0.73 * freqNorm) + aDriftParams.y * 1.37 + aDriftParams.x * 0.5);
      float organicBreath = smoothstep(0.04, 0.96, mix(cyc1, cyc2, 0.42));
      // Clearly readable ~0.55x to 1.25x brightness modulation
      float twinkleMod = uDriftScale > 0.5 ? mix(0.55, 1.25, organicBreath) : 1.0;
      float pointWake = uDriftScale > 0.5 ? evalStrandWake(res.pocket, res.liveY) : 0.0;
      vTwinkle = twinkleMod;
      vBreath = uDriftScale > 0.5 ? organicBreath : 0.5;
      vWake = pointWake;
      vDepth01 = depth01;

      vAlpha = aPointStyle.y * glowIntensity * depthCue * flowPocketVisibility() * pocketMask * strandYield;

      float safeDpr = clamp(uPixelRatio, 1.0, 2.5);
      if (pointCss <= 0.05 || vAlpha <= 0.001) {
        gl_PointSize = 0.0;
        vAlpha = 0.0;
      } else {
        // Organic size breathing from 0.92x to 1.12x for immediately readable depth
        float sizeBreath = uDriftScale > 0.5 ? mix(0.92, 1.12, organicBreath) : 1.0;
        gl_PointSize = min(pointCss * sizeBreath * safeDpr, 40.0);
      }

      gl_Position = projectionMatrix * res.pocket.view;
    }
  `,
  fragmentShader: `
    uniform vec3 uBaseColor;
    uniform vec3 uMidColor;
    uniform vec3 uHotColor;
    varying float vAlpha;
    varying float vTier;
    varying float vTwinkle;
    varying float vBreath;
    varying float vWake;
    varying float vDepth01;

    void main() {
      if (vAlpha <= 0.001) discard;
      vec2 p = gl_PointCoord - 0.5;
      float r2 = dot(p, p);
      if (r2 >= 0.25) discard;
      float cutoff = 1.0 - smoothstep(0.11, 0.25, r2);
      float breath = clamp(vBreath, 0.0, 1.0);
      float peakCool = smoothstep(0.50, 1.0, breath);
      float troughDeep = 1.0 - smoothstep(0.0, 0.50, breath);
      float wakeClamp = clamp(vWake, 0.0, 1.0);
      float wakeLift = 1.0 + 0.14 * wakeClamp;
      float wakeTint = wakeClamp * 0.14;
      float depth01 = clamp(vDepth01, 0.0, 1.0);
      float frontFocus = smoothstep(0.25, 0.92, depth01);
      float backDeep = 1.0 - smoothstep(0.05, 0.65, depth01);
      float depthHotScale = mix(0.45, 1.10, frontFocus);

      if (vTier > 1.5) {
        // Tier 1: Razor-sharp front silver-lavender core; deeper indigo back hemisphere
        float core = exp(-215.0 * r2);
        float bloom = exp(-34.0 * r2) * 0.72;
        float halo = exp(-12.0 * r2) * 0.24 * cutoff;
        float glint = (exp(-960.0 * p.x * p.x - 48.0 * p.y * p.y)
          + exp(-960.0 * p.y * p.y - 48.0 * p.x * p.x)) * 0.30 * cutoff;
        float midMix = clamp(bloom * 1.32 + halo * 0.70 + 0.42 - 0.18 * troughDeep - 0.24 * backDeep, 0.0, 1.0);
        vec3 col = mix(uBaseColor, uMidColor, midMix);
        float hotWeight = clamp(
          ((core * 1.40 + glint * 0.72) * (1.0 - 0.30 * troughDeep) + (core * 0.42 + bloom * 0.20) * peakCool + core * wakeTint) * depthHotScale,
          0.0,
          0.95
        );
        col = mix(col, uHotColor, hotWeight);
        float light = (core * 0.85 + bloom * 0.65 + halo * 1.10 + glint * 0.75) * vTwinkle * wakeLift;
        gl_FragColor = vec4(col, clamp(vAlpha * light, 0.0, 0.96));
      } else if (vTier > 0.5) {
        // Tier 2: Mid Constellation Vertex (silver-lavender front focus, deeper indigo back)
        float core = exp(-32.0 * r2) * 0.96;
        float bloom = exp(-11.0 * r2) * 0.35 * cutoff;
        vec3 col = mix(uBaseColor, uMidColor, clamp(0.55 + core * 0.45 - 0.22 * troughDeep - 0.28 * backDeep, 0.0, 1.0));
        col = mix(col, uHotColor, clamp((core * (0.20 + 0.24 * peakCool - 0.10 * troughDeep) + core * wakeTint) * depthHotScale, 0.0, 0.48));
        float light = (core * 0.88 + bloom * 1.15) * vTwinkle * wakeLift;
        gl_FragColor = vec4(col, clamp(vAlpha * light, 0.0, 0.92));
      } else {
        // Tier 3: Volumetric Micro-Dust (rich theme-colored sparkles, deeper indigo in back)
        float core = exp(-12.0 * r2) * 0.95 * cutoff;
        vec3 col = mix(uBaseColor, uMidColor, clamp(0.48 + core * 0.52 - 0.18 * troughDeep - 0.26 * backDeep, 0.0, 1.0));
        col = mix(col, uHotColor, clamp(core * (0.16 * peakCool + wakeTint) * depthHotScale, 0.0, 0.26));
        float light = core * mix(0.65, 1.20, (vTwinkle - 0.55) / 0.70) * wakeLift;
        gl_FragColor = vec4(col, clamp(vAlpha * light, 0.0, 0.74));
      }
    }
  `,
};
const NeuralHazeShader = {
  vertexShader: `
    attribute vec2 aHazeStyle;
    uniform vec2 uHazeGlowPair;
    uniform vec2 uNodeScalePair;
    uniform float uTime;
    uniform float uDriftScale;
    varying float vAlpha;
    varying vec2 vLoHiLocal;
    varying float vCenterYLocal;
    varying float vHazeCss;
    varying float vLocalYPerCss;
    varying vec2 vAxisScreenDir;
    varying float vWallPadLocal;
    varying float vFeatherLocal;
    ${POCKET_MASK_GLSL}
    void main() {
      float wingSide = aPocketFrame.w;
      PocketMaskEval p = evalStaticPocketMask(position, aPocketFrame.x);
      float hazeGlow = mix(uHazeGlowPair.x, uHazeGlowPair.y, wingSide);
      float nodeScale = mix(uNodeScalePair.x, uNodeScalePair.y, wingSide);
      float outerFadeHaze = 1.0 - pocketEase((aRelativeCoord.x - 0.88) / 0.11);
      float persp = clamp(8.0 / max(-p.view.z, 1e-4), 0.75, 1.25);
      float funnelHalfHeightPx = aPocketFrame.z * p.pxPerLocalY;
      float targetHazeCss = clamp(funnelHalfHeightPx * 1.06, 18.0, 74.0) * aHazeStyle.x * nodeScale * persp;
      float hazeCss = clamp(targetHazeCss, 0.0, 76.0);
      float outerArchMask = 1.0 - 0.22 * smoothstep(0.78, 0.98, abs(aRelativeCoord.y));
      float tipMask = smoothstep(0.025, 0.11, p.radius);
      vAlpha = aHazeStyle.y * hazeGlow * flowPocketVisibility() * outerFadeHaze * outerArchMask * tipMask;

      // Ultra-slow buoyant mist drift (~2-3 CSS px over 10-14s cycles), strictly bounded by live [lo, hi] wall mask
      vec2 mistOffsetCss = vec2(0.0);
      if (uDriftScale > 0.5) {
        float tipMistDamp = smoothstep(0.08, 0.16, aRelativeCoord.x);
        float outerMistDamp = 1.0 - smoothstep(0.90, 0.96, aRelativeCoord.x);
        float mistDamp = tipMistDamp * outerMistDamp;
        if (mistDamp > 0.001) {
          float tMist = mod(uTime, 240.0);
          float phaseX = aRelativeCoord.x * 19.7 + aRelativeCoord.y * 7.3 + wingSide * 2.3;
          float phaseY = aRelativeCoord.y * 17.1 + aRelativeCoord.z * 11.3 + aHazeStyle.x * 14.2;
          float freqScale = 0.86 + 0.28 * fract(aRelativeCoord.x * 37.0 + aRelativeCoord.y * 19.0);
          float thetaX = tMist * (0.49 * freqScale) + phaseX;
          float thetaY = tMist * (0.56 * freqScale) + phaseY;
          float dx = sin(thetaX) * 0.72 + cos(thetaY * 0.65) * 0.28;
          float dy = cos(thetaY) * 0.76 + sin(thetaX * 0.55) * 0.24;
          mistOffsetCss = vec2(dx, dy) * (2.6 * mistDamp);
        }
      }

      float viewDepth = max(-p.view.z, 1e-4);
      float worldPerPx = viewDepth / (projectionMatrix[1][1] * 0.5 * max(uViewportHeight, 1.0));
      float localYPerCss = 1.0 / max(p.pxPerLocalY, 1e-4);
      float driftedCenterY = aPocketFrame.x + dot(mistOffsetCss, p.axisScreenDir) * localYPerCss;
      float driftedDistInsidePx = min(driftedCenterY - p.lo, p.hi - driftedCenterY) * p.pxPerLocalY;

      vLoHiLocal = vec2(p.lo, p.hi);
      vCenterYLocal = driftedCenterY;
      vHazeCss = hazeCss;
      vLocalYPerCss = localYPerCss;
      vAxisScreenDir = p.axisScreenDir;
      vWallPadLocal = -min(0.018, 0.032 * p.radius);
      vFeatherLocal = clamp(0.075 * p.radius, 0.014, 0.068);

      float safeDpr = clamp(uPixelRatio, 1.0, 2.5);
      if (hazeCss <= 0.05 || vAlpha <= 0.0005 || driftedDistInsidePx + 0.5 * hazeCss <= -6.0) {
        gl_PointSize = 0.0;
        vAlpha = 0.0;
      } else {
        gl_PointSize = min(hazeCss * safeDpr, 160.0);
      }
      vec4 mistView = p.view + vec4(mistOffsetCss * worldPerPx, 0.0, 0.0);
      gl_Position = projectionMatrix * mistView;
    }
  `,
  fragmentShader: `
    uniform vec3 uHazeColor;
    uniform float uHazeAlphaCap;
    varying float vAlpha;
    varying vec2 vLoHiLocal;
    varying float vCenterYLocal;
    varying float vHazeCss;
    varying float vLocalYPerCss;
    varying vec2 vAxisScreenDir;
    varying float vWallPadLocal;
    varying float vFeatherLocal;
    void main() {
      if (vAlpha <= 0.0005) discard;
      vec2 p = gl_PointCoord - 0.5;
      float r2 = dot(p, p);
      if (r2 >= 0.25) discard;
      vec2 offsetCss = vec2(p.x, -p.y) * vHazeCss;
      float fragYLocal = vCenterYLocal + dot(offsetCss, vAxisScreenDir) * vLocalYPerCss;
      float distInLocal = min(fragYLocal - vLoHiLocal.x, vLoHiLocal.y - fragYLocal);
      float lensMask = smoothstep(vWallPadLocal, vWallPadLocal + max(vFeatherLocal, 1e-4), distInLocal);
      if (lensMask <= 0.001) discard;
      float falloff = exp(-4.8 * r2) * (1.0 - smoothstep(0.06, 0.25, r2));
      gl_FragColor = vec4(uHazeColor, min(vAlpha * falloff * lensMask, uHazeAlphaCap));
    }
  `,
}

/**
 * NeuralNetworkField:
 * Merges both left/right wings and all depth tiers into at most 3 total draw calls
 * (1 Localized Haze Points, 1 Non-Indexed LineSegments, 1 Star Constellation Points) with
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
  const timeUniform = useContext(FlowTimeContext)
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerReducedMotion
  )
  const glow = themeConfig.glowIntensity ?? 1.0
  const primaryWire = themeConfig.primaryWire || '#2563eb'
  const secondaryWire = themeConfig.secondaryWire || primaryWire
  const connectionNode = themeConfig.connectionNode || primaryWire
  const particleColor = themeConfig.particle || connectionNode
  const highlightNode = themeConfig.highlightNode || '#ffffff'
  const neuralHazeColor = themeConfig.neuralHazeColor || ''
  const neuralBaseColor = themeConfig.neuralBaseColor || ''
  const neuralMidColor = themeConfig.neuralMidColor || ''
  const neuralHotColor = themeConfig.neuralHotColor || ''
  const neuralHazeScale = themeConfig.neuralHazeScale ?? 1.0
  const neuralHazeAlphaCap = themeConfig.neuralHazeAlphaCap ?? 0.088
  const neuralLineScale = themeConfig.neuralLineScale ?? 1.0
  const neuralPointScale = themeConfig.neuralPointScale ?? 1.0

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

    const leftXAxis = new THREE.Vector3().setFromMatrixColumn(matLeft, 0)
    const leftFlowAxis = new THREE.Vector3().setFromMatrixColumn(matLeft, 1)
    const leftDepthAxis = new THREE.Vector3().setFromMatrixColumn(matLeft, 2)
    const rightXAxis = new THREE.Vector3().setFromMatrixColumn(matRight, 0)
    const rightFlowAxis = new THREE.Vector3().setFromMatrixColumn(matRight, 1)
    const rightDepthAxis = new THREE.Vector3().setFromMatrixColumn(matRight, 2)

    const mergedLinesGeo = mergeTransformedGeometries(leftField.linesGeo, matLeft, rightField.linesGeo, matRight)
    const mergedPointsGeo = mergeTransformedGeometries(leftField.pointsGeo, matLeft, rightField.pointsGeo, matRight)
    const mergedHazeGeo = mergeTransformedGeometries(leftField.hazeGeo, matLeft, rightField.hazeGeo, matRight)
    const mergeDt = performance.now() - mergeStarted

    return {
      linesGeo: mergedLinesGeo,
      pointsGeo: mergedPointsGeo,
      hazeGeo: mergedHazeGeo,
      leftXAxis,
      leftFlowAxis,
      leftDepthAxis,
      rightXAxis,
      rightFlowAxis,
      rightDepthAxis,
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
      window.__neuralBuildTimes = {
        ...mergedGeometries.timings,
      }
    }
  }, [mergedGeometries])

  // 4. Create the 3 ShaderMaterials once per mount (uniforms updated in-place via useLayoutEffect)
  const lineMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uLineOpacityPair: { value: new THREE.Vector2(0.9, 0.9) },
        uInnerFadePair: { value: new THREE.Vector2(0.04, 0.04) },
        uRollAnglePair: { value: new THREE.Vector2(0.0, 0.0) },
        uKWavePair: { value: new THREE.Vector2(2.5 * Math.PI, 2.5 * Math.PI) },
        uXAxisLeft: { value: new THREE.Vector3(1, 0, 0) },
        uXAxisRight: { value: new THREE.Vector3(1, 0, 0) },
        uFlowAxisLeft: { value: new THREE.Vector3(0, 1, 0) },
        uFlowAxisRight: { value: new THREE.Vector3(0, 1, 0) },
        uDepthAxisLeft: { value: new THREE.Vector3(0, 0, 1) },
        uDepthAxisRight: { value: new THREE.Vector3(0, 0, 1) },
        uFlowTrig: flowTrigUniform,
        uTime: timeUniform,
        uDriftScale: { value: 1.0 },
        uRestingLineScale: { value: 1 },
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
  }, [flowTrigUniform, timeUniform])

  const pointMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uGlowIntensityPair: { value: new THREE.Vector2(1, 1) },
        uNodeScalePair: { value: new THREE.Vector2(1, 1) },
        uInnerFadePair: { value: new THREE.Vector2(0.04, 0.04) },
        uRollAnglePair: { value: new THREE.Vector2(0.0, 0.0) },
        uFlowAxisLeft: { value: new THREE.Vector3(0, 1, 0) },
        uFlowAxisRight: { value: new THREE.Vector3(0, 1, 0) },
        uDepthAxisLeft: { value: new THREE.Vector3(0, 0, 1) },
        uDepthAxisRight: { value: new THREE.Vector3(0, 0, 1) },
        uFlowTrig: flowTrigUniform,
        uTime: timeUniform,
        uDriftScale: { value: 1.0 },
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
  }, [flowTrigUniform, timeUniform])

  const hazeMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uHazeGlowPair: { value: new THREE.Vector2(1, 1) },
        uNodeScalePair: { value: new THREE.Vector2(1, 1) },
        uInnerFadePair: { value: new THREE.Vector2(0.04, 0.04) },
        uFlowAxisLeft: { value: new THREE.Vector3(0, 1, 0) },
        uFlowAxisRight: { value: new THREE.Vector3(0, 1, 0) },
        uDepthAxisLeft: { value: new THREE.Vector3(0, 0, 1) },
        uDepthAxisRight: { value: new THREE.Vector3(0, 0, 1) },
        uFlowTrig: flowTrigUniform,
        uTime: timeUniform,
        uDriftScale: { value: 1.0 },
        uHazeColor: { value: new THREE.Color() },
        uHazeAlphaCap: { value: 0.088 },
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
  }, [flowTrigUniform, timeUniform])

  useFrame(() => {
    if (prefersReducedMotion) {
      lineMat.uniforms.uRollAnglePair.value.set(0.0, 0.0)
      pointMat.uniforms.uRollAnglePair.value.set(0.0, 0.0)
      return
    }
    const rollAngle = computeWrappedRollAngle(timeUniform.value)
    lineMat.uniforms.uRollAnglePair.value.set(rollAngle, -rollAngle)
    pointMat.uniforms.uRollAnglePair.value.set(rollAngle, -rollAngle)
  })

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
      {
        primaryWire,
        secondaryWire,
        connectionNode,
        particle: particleColor,
        highlightNode,
        neuralBaseColor,
        neuralMidColor,
        neuralHotColor,
      },
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
      material.uniforms.uFlowAxisLeft.value.copy(mergedGeometries.leftFlowAxis)
      material.uniforms.uFlowAxisRight.value.copy(mergedGeometries.rightFlowAxis)
      material.uniforms.uDepthAxisLeft.value.copy(mergedGeometries.leftDepthAxis)
      material.uniforms.uDepthAxisRight.value.copy(mergedGeometries.rightDepthAxis)
    }

    lineMat.uniforms.uLineOpacityPair.value.set(
      Math.min(1.12, leftGlow * 0.80),
      Math.min(1.12, rightGlow * 0.80)
    )
    lineMat.uniforms.uKWavePair.value.set(
      2.5 * Math.PI * (leftConfig.frequency ?? 1.0),
      2.5 * Math.PI * (rightConfig.frequency ?? 1.0)
    )
    lineMat.uniforms.uXAxisLeft.value.copy(mergedGeometries.leftXAxis)
    lineMat.uniforms.uXAxisRight.value.copy(mergedGeometries.rightXAxis)
    const driftActive = prefersReducedMotion ? 0.0 : 1.0
    const rollAngle = prefersReducedMotion ? 0.0 : computeWrappedRollAngle(timeUniform.value)
    lineMat.uniforms.uRollAnglePair.value.set(rollAngle, -rollAngle)
    pointMat.uniforms.uRollAnglePair.value.set(rollAngle, -rollAngle)
    lineMat.uniforms.uDriftScale.value = driftActive
    lineMat.uniforms.uRestingLineScale.value = neuralLineScale
    pointMat.uniforms.uGlowIntensityPair.value.set(
      Math.min(1.32, leftGlow * 0.96 * neuralPointScale),
      Math.min(1.32, rightGlow * 0.96 * neuralPointScale)
    )
    pointMat.uniforms.uNodeScalePair.value.set(leftNS, rightNS)
    pointMat.uniforms.uDriftScale.value = driftActive
    hazeMat.uniforms.uDriftScale.value = driftActive
    if (typeof window !== 'undefined') {
      window.__neuralMotionState = {
        driftActive,
        peakDriftRadiusPx: 2.5,
        rollPeriodSeconds: ROLL_PERIOD_SECONDS,
        rollAnglePair: lineMat.uniforms.uRollAnglePair.value,
        timeUniform,
        pointMat,
        lineMat,
        hazeMat,
      }
    }
    hazeMat.uniforms.uHazeGlowPair.value.set(
      Math.min(1.06, leftGlow * 0.76 * neuralHazeScale),
      Math.min(1.06, rightGlow * 0.76 * neuralHazeScale)
    )
    if (neuralHazeColor) {
      hazeMat.uniforms.uHazeColor.value.set(neuralHazeColor)
    } else {
      hazeMat.uniforms.uHazeColor.value.copy(rampBase).lerp(rampMid, 0.18)
    }
    hazeMat.uniforms.uHazeAlphaCap.value = neuralHazeAlphaCap
    hazeMat.uniforms.uNodeScalePair.value.set(leftNS, rightNS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lineMat,
    pointMat,
    hazeMat,
    timeUniform,
    prefersReducedMotion,
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
    neuralHazeColor,
    neuralBaseColor,
    neuralMidColor,
    neuralHotColor,
    neuralHazeScale,
    neuralHazeAlphaCap,
    neuralLineScale,
    neuralPointScale,
    viewport.dpr,
    canvasSize.height,
    mergedGeometries,
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
