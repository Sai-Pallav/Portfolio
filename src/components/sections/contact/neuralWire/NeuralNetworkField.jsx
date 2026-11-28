import { memo, useMemo, useEffect, useLayoutEffect, useContext, useRef, useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { useThree, useFrame, createPortal } from '@react-three/fiber'
import { H_VAL } from './generateWireGeometry'
import { generateRefinedNeuralField } from './neuralPocketBounds'
import { useWireframeConfig } from './WireframeConfigContext'
import { FlowTimeContext, FlowTrigContext } from './animationContract'
import { getWireThemeConfig } from './wireThemeConfig'

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

// Compact stationary attribute interface (<= 12 vertex attributes, strictly below WebGL's 16-attribute limit).
// ZERO per-vertex sin/cos in GLSL; driven purely by uFlowTrig = (cos(omega*t), sin(omega*t)) & uTime.
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
  attribute vec3 aPocketFrame;
  attribute vec3 aFlowAxis;
  attribute float aWingSide;
  uniform vec2 uFlowTrig;
  uniform vec2 uInnerFadePair;
  uniform float uPixelRatio;
  uniform float uViewportHeight;

  ${SAFE_MAX_GLSL}

  float pocketEase(float x) {
    x = clamp(x, 0.0, 1.0);
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
  }

  float flowPocketVisibility() {
    float innerFade = mix(uInnerFadePair.x, uInnerFadePair.y, aWingSide);
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

  PocketMaskEval evalStaticPocketMask(vec3 fixedPos, float yLocal) {
    vec4 strandY = aWaveBias + aWaveCos * uFlowTrig.x + aWaveSin * uFlowTrig.y;
    float lo = -safeMax(safeMax(-strandY.x, -strandY.y), safeMax(-strandY.z, -strandY.w));
    float hi =  safeMax(safeMax( strandY.x,  strandY.y), safeMax( strandY.z,  strandY.w));
    float radius = max(0.5 * (hi - lo), 1e-5);

    float minStrandDist = min(
      min(abs(yLocal - strandY.x), abs(yLocal - strandY.y)),
      min(abs(yLocal - strandY.z), abs(yLocal - strandY.w))
    );

    vec4 view = modelViewMatrix * vec4(fixedPos, 1.0);
    float viewDepth = max(-view.z, 1e-4);
    vec2 axisViewXY = (modelViewMatrix * vec4(aFlowAxis, 0.0)).xy;
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
`

const NeuralLineShader = {
  vertexShader: `
    attribute vec4 aLineStyle;
    attribute vec4 aPartnerBias;
    attribute vec4 aPartnerCos;
    attribute vec4 aPartnerSin;
    attribute vec4 aRouteIds;
    attribute vec4 aRouteProgress;
    uniform vec2 uLineOpacityPair;
    uniform float uSignalActive;
    uniform vec4 uPulseRouteIds[2];
    varying float vAlpha;
    varying float vImpulseMask;
    varying float vHubAccent;
    varying vec2 vPulseTrig;
    varying vec4 vStrandY;
    varying float vLocalY;
    varying float vPxPerLocalY;
    varying float vWallPadPx;
    varying float vFeatherPx;
    varying float vImpulseFeatherPx;
    varying vec4 vEdgeProg;
    varying float vWingSide;
    ${POCKET_MASK_GLSL}

    float evalLineWallMask(float distPx, float halfHPx, out float outPad, out float outFeather) {
      outPad = -min(2.0, 0.020 * halfHPx);
      outFeather = clamp(0.075 * halfHPx, 4.5, 11.0);
      return smoothstep(outPad, outPad + outFeather, distPx);
    }

    float evalImpulseWallMask(float distPx, float halfHPx, float padPx, float restFeather, out float outImpFeather) {
      outImpFeather = min(restFeather, max(0.35, 0.85 * halfHPx));
      return smoothstep(padPx, padPx + outImpFeather, distPx);
    }

    void main() {
      PocketMaskEval p = evalStaticPocketMask(position, aPocketFrame.x);
      vec4 partnerY = aPartnerBias + aPartnerCos * uFlowTrig.x + aPartnerSin * uFlowTrig.y;
      float loP = -safeMax(safeMax(-partnerY.x, -partnerY.y), safeMax(-partnerY.z, -partnerY.w));
      float hiP =  safeMax(safeMax( partnerY.x,  partnerY.y), safeMax( partnerY.z,  partnerY.w));
      float radP = max(0.5 * (hiP - loP), 1e-5);
      float distInPartnerPx = min(aPocketFrame.y - loP, hiP - aPocketFrame.y) * p.pxPerLocalY;
      float halfHP = radP * p.pxPerLocalY;

      float padSelf, featherSelf;
      float maskSelf = evalLineWallMask(p.distInsidePx, p.halfHeightPx, padSelf, featherSelf);
      float padPartner, featherPartner;
      float maskPartner = evalLineWallMask(distInPartnerPx, halfHP, padPartner, featherPartner);

      float impFeatherSelf, impFeatherPartner;
      float impMaskSelf = evalImpulseWallMask(p.distInsidePx, p.halfHeightPx, padSelf, featherSelf, impFeatherSelf);
      float impMaskPartner = evalImpulseWallMask(distInPartnerPx, halfHP, padPartner, featherPartner, impFeatherPartner);

      // Fade both endpoints smoothly together near moving boundaries so zero floating stub edges linger
      float jointMask = min(maskSelf, maskPartner);
      float impJointMask = min(impMaskSelf, impMaskPartner);
      float lineOpacity = mix(uLineOpacityPair.x, uLineOpacityPair.y, aWingSide);
      float strandYield = mix(0.68, 1.0, smoothstep(0.0, 0.052 * p.radius + 0.010, p.minStrandDist));
      float pocketMask = lineOpacity * flowPocketVisibility() * jointMask * strandYield;

      // Vertex-matched active slot progress (constant route ID across edge endpoints, interpolated progress along edge)
      vec4 edgeProg = vec4(-2.0);
      if (uSignalActive > 0.5) {
        vec4 activeIds = aWingSide < 0.5 ? uPulseRouteIds[0] : uPulseRouteIds[1];
        for (int s = 0; s < 4; s++) {
          float targetId = s == 0 ? activeIds.x : (s == 1 ? activeIds.y : (s == 2 ? activeIds.z : activeIds.w));
          if (targetId >= -0.5) {
            float matchedProg = -2.0;
            if (aRouteIds.x >= -0.5 && abs(aRouteIds.x - targetId) < 0.25) matchedProg = aRouteProgress.x;
            else if (aRouteIds.y >= -0.5 && abs(aRouteIds.y - targetId) < 0.25) matchedProg = aRouteProgress.y;
            else if (aRouteIds.z >= -0.5 && abs(aRouteIds.z - targetId) < 0.25) matchedProg = aRouteProgress.z;
            else if (aRouteIds.w >= -0.5 && abs(aRouteIds.w - targetId) < 0.25) matchedProg = aRouteProgress.w;
            if (s == 0) edgeProg.x = matchedProg;
            else if (s == 1) edgeProg.y = matchedProg;
            else if (s == 2) edgeProg.z = matchedProg;
            else edgeProg.w = matchedProg;
          }
        }
      }

      vAlpha = aLineStyle.x * pocketMask;
      vImpulseMask = lineOpacity * impJointMask * strandYield;
      vHubAccent = aLineStyle.y;
      vPulseTrig = aLineStyle.zw;
      vStrandY = p.strandY;
      vLocalY = aPocketFrame.x;
      vPxPerLocalY = p.pxPerLocalY;
      vWallPadPx = padSelf;
      vFeatherPx = featherSelf;
      vImpulseFeatherPx = impFeatherSelf;
      vEdgeProg = edgeProg;
      vWingSide = aWingSide;
      gl_Position = projectionMatrix * p.view;
    }
  `,
  fragmentShader: `
    uniform vec2 uFlowTrig;
    uniform float uSignalActive;
    uniform vec4 uPulseProgress[2];
    uniform vec4 uPulseIntensity[2];
    uniform float uRestingLineScale;
    uniform float uSignalGain;
    uniform vec3 uBaseColor;
    uniform vec3 uMidColor;
    uniform vec3 uHotColor;
    varying float vAlpha;
    varying float vImpulseMask;
    varying float vHubAccent;
    varying vec2 vPulseTrig;
    varying vec4 vStrandY;
    varying float vLocalY;
    varying float vPxPerLocalY;
    varying float vWallPadPx;
    varying float vFeatherPx;
    varying float vImpulseFeatherPx;
    varying vec4 vEdgeProg;
    varying float vWingSide;
    ${SAFE_MAX_GLSL}

    void evalSlotPacket(float segProg, float headPos, float slotInt, inout float totalPacket, inout float totalHead) {
      if (segProg < -0.5 || slotInt <= 0.001) return;
      float delta = headPos - segProg;
      if (delta >= -0.014 && delta <= 0.115) {
        float headCore = delta < 0.0 ? smoothstep(-0.014, 0.0, delta) : exp(-92.0 * delta);
        float silkyTail = delta < 0.0
          ? smoothstep(-0.014, 0.0, delta)
          : exp(-27.0 * delta) * (1.0 - smoothstep(0.075, 0.115, delta));
        float shape = delta < 0.0 ? headCore : (0.42 * headCore + 0.58 * silkyTail);
        float tipIgnite = smoothstep(0.0, 0.07, segProg);
        float outerExit = 1.0 - smoothstep(0.90, 1.0, segProg);
        float gate = tipIgnite * outerExit * slotInt;
        totalPacket += shape * gate;
        totalHead += headCore * gate;
      }
    }

    void main() {
      float maxEdgeProg = max(max(vEdgeProg.x, vEdgeProg.y), max(vEdgeProg.z, vEdgeProg.w));
      bool hasActivePulse = uSignalActive > 0.5 && maxEdgeProg >= -0.5;
      if (vAlpha <= 0.001 && !hasActivePulse) discard;

      float lo = -safeMax(safeMax(-vStrandY.x, -vStrandY.y), safeMax(-vStrandY.z, -vStrandY.w));
      float hi =  safeMax(safeMax( vStrandY.x,  vStrandY.y), safeMax( vStrandY.z,  vStrandY.w));
      float fragDistInPx = min(vLocalY - lo, hi - vLocalY) * vPxPerLocalY;
      float fragWallMask = smoothstep(vWallPadPx, vWallPadPx + max(vFeatherPx, 1.0), fragDistInPx);
      float alphaMask = vAlpha * fragWallMask * uRestingLineScale;
      if (alphaMask <= 0.001 && !hasActivePulse) discard;

      vec2 pDir = vPulseTrig * inversesqrt(max(dot(vPulseTrig, vPulseTrig), 1e-4));
      float pulse = 0.5 + 0.5 * dot(pDir, uFlowTrig);
      float accent = clamp(vHubAccent, 0.0, 1.0);
      float pulseBoost = mix(0.76, 1.24, pulse) * (1.0 + 0.12 * accent * pulse);
      vec3 webTint = mix(uBaseColor, uMidColor, 0.62 + 0.18 * pulse);
      vec3 lineCol = mix(webTint, uHotColor, clamp((0.12 + 0.10 * pulse) * accent, 0.0, 0.25));

      float packet = 0.0;
      float headWeight = 0.0;
      if (hasActivePulse) {
        vec4 activeProg = vWingSide < 0.5 ? uPulseProgress[0] : uPulseProgress[1];
        vec4 activeInt = vWingSide < 0.5 ? uPulseIntensity[0] : uPulseIntensity[1];
        evalSlotPacket(vEdgeProg.x, activeProg.x, activeInt.x, packet, headWeight);
        evalSlotPacket(vEdgeProg.y, activeProg.y, activeInt.y, packet, headWeight);
        evalSlotPacket(vEdgeProg.z, activeProg.z, activeInt.z, packet, headWeight);
        evalSlotPacket(vEdgeProg.w, activeProg.w, activeInt.w, packet, headWeight);
        packet = clamp(packet, 0.0, 1.25);
        headWeight = clamp(headWeight, 0.0, 1.0);
      }

      float fragImpulseWall = smoothstep(vWallPadPx, vWallPadPx + max(vImpulseFeatherPx, 0.35), fragDistInPx);
      vec3 trailTint = mix(uMidColor, uHotColor, 0.68);
      vec3 headTint = mix(uMidColor, uHotColor, 0.90);
      vec3 signalTint = mix(trailTint, headTint, headWeight);
      vec3 outCol = mix(lineCol, signalTint, clamp(packet * 0.92, 0.0, 1.0));
      float impulseGlow = packet * vImpulseMask * fragImpulseWall * 0.38 * uSignalGain;
      float outAlpha = clamp(alphaMask * pulseBoost + impulseGlow, 0.0, 0.58);
      if (outAlpha <= 0.001) discard;
      gl_FragColor = vec4(outCol, outAlpha);
    }
  `,
}

const NeuralPointShader = {
  vertexShader: `
    attribute vec4 aPointStyle;
    attribute vec4 aRouteIds;
    attribute vec4 aRouteProgress;
    uniform vec2 uGlowIntensityPair;
    uniform vec2 uNodeScalePair;
    uniform float uTime;
    uniform float uSignalActive;
    uniform vec4 uPulseRouteIds[2];
    uniform vec4 uPulseProgress[2];
    uniform vec4 uPulseIntensity[2];
    varying float vAlpha;
    varying float vTier;
    varying float vTwinkle;
    varying float vRelay;
    ${POCKET_MASK_GLSL}
    void main() {
      PocketMaskEval p = evalStaticPocketMask(position, aPocketFrame.x);
      vTier = aPointStyle.z;
      float glowIntensity = mix(uGlowIntensityPair.x, uGlowIntensityPair.y, aWingSide);
      float nodeScale = mix(uNodeScalePair.x, uNodeScalePair.y, aWingSide);
      float zNorm = clamp(0.5 + 0.5 * aRelativeCoord.z, 0.0, 1.0);
      float depthCue = vTier > 1.5
        ? mix(0.82, 1.04, zNorm)
        : mix(0.32, 1.06, zNorm);
      float depthSize = vTier > 1.5
        ? mix(0.92, 1.06, zNorm)
        : mix(0.64, 1.14, zNorm);
      float funnel = vTier > 1.5
        ? mix(0.58, 1.0, pocketEase((aRelativeCoord.x - 0.14) / 0.24))
        : mix(0.76, 1.0, pocketEase((aRelativeCoord.x - 0.06) / 0.20));
      float persp = clamp(8.0 / max(-p.view.z, 1e-4), 0.75, 1.25);
      float minFloor = vTier < 1.5 ? 1.45 : 0.0;
      float targetCss = max(minFloor, aPointStyle.x * nodeScale * funnel * persp * depthSize);
      float maxTierCss = vTier > 1.5 ? 16.5 : 10.5;
      float pointCss = clamp(targetCss, 0.0, maxTierCss);

      float wallEdgePx = vTier > 1.5
        ? (0.24 * pointCss + 0.8)
        : (0.14 * pointCss - min(1.2, 0.015 * p.halfHeightPx));
      float featherPx = vTier > 1.5
        ? clamp(0.08 * p.halfHeightPx, 5.0, 11.0)
        : clamp(0.065 * p.halfHeightPx, 4.0, 9.5);
      float pocketMask = smoothstep(wallEdgePx, wallEdgePx + featherPx, p.distInsidePx);
      float strandYield = vTier > 1.5
        ? mix(0.80, 1.0, smoothstep(0.0, 0.055 * p.radius + 0.012, p.minStrandDist))
        : mix(0.72, 1.0, smoothstep(0.0, 0.058 * p.radius + 0.012, p.minStrandDist));

      float relay = 0.0;
      if (uSignalActive > 0.5) {
        vec4 activeIds = aWingSide < 0.5 ? uPulseRouteIds[0] : uPulseRouteIds[1];
        vec4 activeProg = aWingSide < 0.5 ? uPulseProgress[0] : uPulseProgress[1];
        vec4 activeInt = aWingSide < 0.5 ? uPulseIntensity[0] : uPulseIntensity[1];
        for (int s = 0; s < 4; s++) {
          float targetId = s == 0 ? activeIds.x : (s == 1 ? activeIds.y : (s == 2 ? activeIds.z : activeIds.w));
          float slotInt = s == 0 ? activeInt.x : (s == 1 ? activeInt.y : (s == 2 ? activeInt.z : activeInt.w));
          if (targetId >= -0.5 && slotInt > 0.001) {
            float nodeProg = -2.0;
            if (aRouteIds.x >= -0.5 && abs(aRouteIds.x - targetId) < 0.25) nodeProg = aRouteProgress.x;
            else if (aRouteIds.y >= -0.5 && abs(aRouteIds.y - targetId) < 0.25) nodeProg = aRouteProgress.y;
            else if (aRouteIds.z >= -0.5 && abs(aRouteIds.z - targetId) < 0.25) nodeProg = aRouteProgress.z;
            else if (aRouteIds.w >= -0.5 && abs(aRouteIds.w - targetId) < 0.25) nodeProg = aRouteProgress.w;
            if (nodeProg >= -0.5) {
              float headPos = s == 0 ? activeProg.x : (s == 1 ? activeProg.y : (s == 2 ? activeProg.z : activeProg.w));
              float delta = headPos - nodeProg;
              if (delta >= -0.016 && delta <= 0.095) {
                float hitUp = smoothstep(-0.016, 0.004, delta);
                float hitDown = delta > 0.004
                  ? exp(-34.0 * (delta - 0.004)) * (1.0 - smoothstep(0.055, 0.095, delta))
                  : 1.0;
                float endFade = smoothstep(0.0, 0.07, nodeProg) * (1.0 - smoothstep(0.90, 1.0, nodeProg));
                relay = max(relay, hitUp * hitDown * endFade * slotInt);
              }
            }
          }
        }
      }
      vRelay = clamp(relay, 0.0, 1.0);

      vAlpha = aPointStyle.y * glowIntensity * depthCue * flowPocketVisibility() * pocketMask * strandYield * (1.0 + 0.30 * vRelay);
      vTwinkle = vTier > 1.5
        ? (1.0 + 0.10 * sin(mod(uTime, 12.0) * 0.52359878 + aPointStyle.w))
        : 1.0;

      float safeDpr = clamp(uPixelRatio, 1.0, 2.5);
      if (pointCss <= 0.05 || vAlpha <= 0.001) {
        gl_PointSize = 0.0;
        vAlpha = 0.0;
      } else {
        gl_PointSize = min(pointCss * (1.0 + 0.08 * vRelay) * safeDpr, 40.0);
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
    varying float vTwinkle;
    varying float vRelay;
    void main() {
      if (vAlpha <= 0.001) discard;
      vec2 p = gl_PointCoord - 0.5;
      float r2 = dot(p, p);
      if (r2 >= 0.25) discard;
      float cutoff = 1.0 - smoothstep(0.11, 0.25, r2);

      if (vTier > 1.5) {
        // Tier 1: Razor-sharp pinpoint core + luminous tight inner bloom + restrained aura + crisp 4-point glint
        float core = exp(-215.0 * r2);
        float bloom = exp(-34.0 * r2) * 0.72;
        float halo = exp(-12.0 * r2) * 0.24 * cutoff;
        float glint = (exp(-960.0 * p.x * p.x - 48.0 * p.y * p.y)
          + exp(-960.0 * p.y * p.y - 48.0 * p.x * p.x)) * 0.30 * cutoff;
        vec3 col = mix(uBaseColor, uMidColor, clamp(bloom * 1.32 + halo * 0.70 + 0.42, 0.0, 1.0));
        col = mix(col, uHotColor, clamp(core * 1.40 + glint * 0.72 + 0.16 * vRelay, 0.0, 1.0));
        float light = (core + bloom + halo + glint) * vTwinkle;
        gl_FragColor = vec4(col, clamp(vAlpha * light, 0.0, 1.0));
      } else if (vTier > 0.5) {
        // Tier 2: Mid Constellation Vertex (richly theme-colored with subtle crisp center)
        float core = exp(-32.0 * r2) * 0.96;
        float bloom = exp(-11.0 * r2) * 0.30 * cutoff;
        vec3 col = mix(uBaseColor, uMidColor, clamp(0.55 + core * 0.45, 0.0, 1.0));
        col = mix(col, uHotColor, clamp(core * 0.20 + 0.28 * vRelay, 0.0, 0.48));
        float light = (core + bloom) * cutoff;
        gl_FragColor = vec4(col, clamp(vAlpha * light, 0.0, 0.94));
      } else {
        // Tier 3: Volumetric Micro-Dust (rich theme-colored arch & pocket sparkles, zero white wash)
        float core = exp(-12.0 * r2) * 0.95 * cutoff;
        vec3 col = mix(uBaseColor, uMidColor, clamp(0.48 + core * 0.52, 0.0, 1.0));
        col = mix(col, uHotColor, clamp(0.30 * vRelay, 0.0, 0.35));
        gl_FragColor = vec4(col, clamp(vAlpha * core, 0.0, 0.74));
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
    varying vec2 vLoHiLocal;
    varying float vCenterYLocal;
    varying float vHazeCss;
    varying float vLocalYPerCss;
    varying vec2 vAxisScreenDir;
    varying float vWallPadLocal;
    varying float vFeatherLocal;
    ${POCKET_MASK_GLSL}
    void main() {
      PocketMaskEval p = evalStaticPocketMask(position, aPocketFrame.x);
      float hazeGlow = mix(uHazeGlowPair.x, uHazeGlowPair.y, aWingSide);
      float nodeScale = mix(uNodeScalePair.x, uNodeScalePair.y, aWingSide);
      float outerFadeHaze = 1.0 - pocketEase((aRelativeCoord.x - 0.88) / 0.11);
      float persp = clamp(8.0 / max(-p.view.z, 1e-4), 0.75, 1.25);
      float funnelHalfHeightPx = aPocketFrame.z * p.pxPerLocalY;
      float targetHazeCss = clamp(funnelHalfHeightPx * 1.06, 18.0, 74.0) * aHazeStyle.x * nodeScale * persp;
      float hazeCss = clamp(targetHazeCss, 0.0, 76.0);
      float outerArchMask = 1.0 - 0.22 * smoothstep(0.78, 0.98, abs(aRelativeCoord.y));
      float tipMask = smoothstep(0.025, 0.11, p.radius);
      vAlpha = aHazeStyle.y * hazeGlow * flowPocketVisibility() * outerFadeHaze * outerArchMask * tipMask;

      vLoHiLocal = vec2(p.lo, p.hi);
      vCenterYLocal = aPocketFrame.x;
      vHazeCss = hazeCss;
      vLocalYPerCss = 1.0 / max(p.pxPerLocalY, 1e-4);
      vAxisScreenDir = p.axisScreenDir;
      vWallPadLocal = -min(0.018, 0.032 * p.radius);
      vFeatherLocal = clamp(0.075 * p.radius, 0.014, 0.068);

      float safeDpr = clamp(uPixelRatio, 1.0, 2.5);
      if (hazeCss <= 0.05 || vAlpha <= 0.0005 || p.distInsidePx + 0.5 * hazeCss <= -6.0) {
        gl_PointSize = 0.0;
        vAlpha = 0.0;
      } else {
        gl_PointSize = min(hazeCss * safeDpr, 160.0);
      }
      gl_Position = projectionMatrix * p.view;
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

const PULSE_SLOT_COUNT = 4
const PULSE_TAIL_LENGTH = 0.105
const PULSE_RECENT_HISTORY = 6
const LEFT_INITIAL_PHASES = [0.06, 0.36, 0.68, -0.42]
const RIGHT_INITIAL_PHASES = [0.22, 0.52, 0.82, -0.24]

function nextSchedulerRand(wingState) {
  const next = (wingState.prngState * 16807) % 2147483647
  wingState.prngState = next
  return (next - 1) / 2147483646
}

function createWingScheduler(seed) {
  const slots = []
  for (let i = 0; i < PULSE_SLOT_COUNT; i++) {
    slots.push({
      routeId: -1,
      lane: -1,
      progress: 0.0,
      speed: 0.18,
      intensity: 0.0,
      cooldown: 0.0,
    })
  }
  return {
    seed,
    prngState: seed,
    slots,
    recentIds: new Int32Array(PULSE_RECENT_HISTORY).fill(-1),
    recentPtr: 0,
    laneScratch: [0, 0, 0],
    candidatesScratch: [],
  }
}

function recordRecentRoute(wingState, routeId) {
  wingState.recentIds[wingState.recentPtr] = routeId
  wingState.recentPtr = (wingState.recentPtr + 1) % PULSE_RECENT_HISTORY
}

function isRouteActiveOrRecent(wingState, routeId, excludeSlotIdx, checkRecent) {
  const slots = wingState.slots
  for (let s = 0; s < PULSE_SLOT_COUNT; s++) {
    if (s !== excludeSlotIdx && slots[s].routeId === routeId) return true
  }
  if (checkRecent) {
    const rec = wingState.recentIds
    for (let r = 0; r < rec.length; r++) {
      if (rec[r] === routeId) return true
    }
  }
  return false
}

function pickNextRouteForSlot(wingState, routes, slotIdx, preferredLane = -1) {
  if (!routes || routes.length === 0) return
  const slots = wingState.slots
  const laneCounts = wingState.laneScratch
  laneCounts[0] = 0
  laneCounts[1] = 0
  laneCounts[2] = 0
  for (let s = 0; s < PULSE_SLOT_COUNT; s++) {
    if (s !== slotIdx && slots[s].routeId >= 0) {
      const ln = slots[s].lane
      if (ln >= 0 && ln <= 2) laneCounts[ln]++
    }
  }

  let targetLane = preferredLane
  if (targetLane < 0 || targetLane > 2) {
    let minCount = Math.min(laneCounts[0], laneCounts[1], laneCounts[2])
    const tiedLanes = []
    for (let l = 0; l < 3; l++) {
      if (laneCounts[l] === minCount) tiedLanes.push(l)
    }
    targetLane = tiedLanes[Math.floor(nextSchedulerRand(wingState) * tiedLanes.length) % tiedLanes.length]
  }

  const cands = wingState.candidatesScratch
  // Tier 1: matching target lane + not active + not recently used
  cands.length = 0
  for (let i = 0; i < routes.length; i++) {
    const rt = routes[i]
    if (rt.lane === targetLane && !isRouteActiveOrRecent(wingState, rt.id, slotIdx, true)) {
      cands.push(rt)
    }
  }
  // Tier 2: any lane + not active + not recently used
  if (cands.length === 0) {
    for (let i = 0; i < routes.length; i++) {
      const rt = routes[i]
      if (!isRouteActiveOrRecent(wingState, rt.id, slotIdx, true)) {
        cands.push(rt)
      }
    }
  }
  // Tier 3: matching target lane + not active
  if (cands.length === 0) {
    for (let i = 0; i < routes.length; i++) {
      const rt = routes[i]
      if (rt.lane === targetLane && !isRouteActiveOrRecent(wingState, rt.id, slotIdx, false)) {
        cands.push(rt)
      }
    }
  }
  // Tier 4: any route not active on another slot, or any route
  if (cands.length === 0) {
    for (let i = 0; i < routes.length; i++) {
      if (!isRouteActiveOrRecent(wingState, routes[i].id, slotIdx, false)) cands.push(routes[i])
    }
  }
  if (cands.length === 0) {
    for (let i = 0; i < routes.length; i++) cands.push(routes[i])
  }

  const chosen = cands[Math.floor(nextSchedulerRand(wingState) * cands.length) % cands.length]
  const duration = 4.6 + 1.8 * nextSchedulerRand(wingState)
  const slot = slots[slotIdx]
  slot.routeId = chosen.id
  slot.lane = chosen.lane
  slot.progress = 0.0
  slot.speed = 1.0 / duration
  slot.intensity = 0.90 + 0.22 * nextSchedulerRand(wingState)
  slot.cooldown = 0.0
  recordRecentRoute(wingState, chosen.id)
}

function seedWingScheduler(wingState, routes, initialPhases) {
  wingState.prngState = wingState.seed
  wingState.recentIds.fill(-1)
  wingState.recentPtr = 0
  for (let s = 0; s < PULSE_SLOT_COUNT; s++) {
    const slot = wingState.slots[s]
    slot.routeId = -1
    slot.lane = -1
    slot.progress = 0.0
    slot.intensity = 0.0
    slot.cooldown = 0.0
  }
  if (!routes || routes.length === 0) return

  const initialLanes = [0, 1, 2, wingState.seed % 2 === 0 ? 0 : 2]
  for (let s = 0; s < PULSE_SLOT_COUNT; s++) {
    const phase = initialPhases[s]
    if (phase < 0) {
      wingState.slots[s].cooldown = Math.abs(phase)
    } else {
      pickNextRouteForSlot(wingState, routes, s, initialLanes[s])
      wingState.slots[s].progress = phase
    }
  }
}

function stepWingScheduler(wingState, routes, dt) {
  if (!routes || routes.length === 0 || dt <= 0) return
  const slots = wingState.slots
  for (let s = 0; s < PULSE_SLOT_COUNT; s++) {
    const slot = slots[s]
    if (slot.routeId < 0) {
      slot.cooldown -= dt
      if (slot.cooldown <= 0.0) {
        pickNextRouteForSlot(wingState, routes, s, -1)
      }
    } else {
      slot.progress += slot.speed * dt
      if (slot.progress >= 1.0 + PULSE_TAIL_LENGTH) {
        slot.routeId = -1
        slot.lane = -1
        slot.progress = 0.0
        slot.intensity = 0.0
        slot.cooldown = 0.32 + 0.86 * nextSchedulerRand(wingState)
      }
    }
  }
}

function syncSchedulerUniforms(wingState, idx, routeIdsUniform, progressUniform, intensityUniform, signalActive) {
  if (!signalActive) {
    routeIdsUniform.value[idx].set(-1, -1, -1, -1)
    progressUniform.value[idx].set(0, 0, 0, 0)
    intensityUniform.value[idx].set(0, 0, 0, 0)
    return
  }
  const s = wingState.slots
  routeIdsUniform.value[idx].set(s[0].routeId, s[1].routeId, s[2].routeId, s[3].routeId)
  progressUniform.value[idx].set(s[0].progress, s[1].progress, s[2].progress, s[3].progress)
  intensityUniform.value[idx].set(s[0].intensity, s[1].intensity, s[2].intensity, s[3].intensity)
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
  const neuralSignalGain = themeConfig.neuralSignalGain ?? 1.0
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

    const mergedLinesGeo = mergeTransformedGeometries(leftField.linesGeo, matLeft, rightField.linesGeo, matRight)
    const mergedPointsGeo = mergeTransformedGeometries(leftField.pointsGeo, matLeft, rightField.pointsGeo, matRight)
    const mergedHazeGeo = mergeTransformedGeometries(leftField.hazeGeo, matLeft, rightField.hazeGeo, matRight)
    const mergeDt = performance.now() - mergeStarted

    return {
      linesGeo: mergedLinesGeo,
      pointsGeo: mergedPointsGeo,
      hazeGeo: mergedHazeGeo,
      routes: {
        left: leftField.linesGeo?.userData?.routes ?? [],
        right: rightField.linesGeo?.userData?.routes ?? [],
      },
      signalPathCounts: {
        left: leftField.linesGeo?.userData?.signalPathCount ?? 0,
        right: rightField.linesGeo?.userData?.signalPathCount ?? 0,
      },
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
        signalPathCounts: mergedGeometries.signalPathCounts,
      }
    }
  }, [mergedGeometries])

  // Shared GPU uniform arrays for active dynamic impulse slots (index 0 = left wing, index 1 = right wing)
  const pulseRouteIdsUniform = useMemo(
    () => ({ value: [new THREE.Vector4(-1, -1, -1, -1), new THREE.Vector4(-1, -1, -1, -1)] }),
    []
  )
  const pulseProgressUniform = useMemo(
    () => ({ value: [new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0)] }),
    []
  )
  const pulseIntensityUniform = useMemo(
    () => ({ value: [new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0)] }),
    []
  )

  const schedulerRef = useRef(null)
  if (!schedulerRef.current) {
    schedulerRef.current = {
      left: createWingScheduler(7919),
      right: createWingScheduler(104729),
      lastTime: 0,
      seededRoutesRef: null,
    }
  }

  useLayoutEffect(() => {
    const sched = schedulerRef.current
    if (sched.seededRoutesRef !== mergedGeometries.routes) {
      seedWingScheduler(sched.left, mergedGeometries.routes.left, LEFT_INITIAL_PHASES)
      seedWingScheduler(sched.right, mergedGeometries.routes.right, RIGHT_INITIAL_PHASES)
      sched.seededRoutesRef = mergedGeometries.routes
      sched.lastTime = timeUniform.value
    }
    const active = !prefersReducedMotion
    syncSchedulerUniforms(sched.left, 0, pulseRouteIdsUniform, pulseProgressUniform, pulseIntensityUniform, active)
    syncSchedulerUniforms(sched.right, 1, pulseRouteIdsUniform, pulseProgressUniform, pulseIntensityUniform, active)
  }, [
    mergedGeometries,
    prefersReducedMotion,
    timeUniform,
    pulseRouteIdsUniform,
    pulseProgressUniform,
    pulseIntensityUniform,
  ])

  // 4. Create the 3 ShaderMaterials once per mount (uniforms updated in-place via useLayoutEffect)
  const lineMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uLineOpacityPair: { value: new THREE.Vector2(0.9, 0.9) },
        uInnerFadePair: { value: new THREE.Vector2(0.04, 0.04) },
        uFlowTrig: flowTrigUniform,
        uSignalActive: { value: 1 },
        uPulseRouteIds: pulseRouteIdsUniform,
        uPulseProgress: pulseProgressUniform,
        uPulseIntensity: pulseIntensityUniform,
        uRestingLineScale: { value: 1 },
        uSignalGain: { value: 1 },
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
  }, [flowTrigUniform, pulseRouteIdsUniform, pulseProgressUniform, pulseIntensityUniform])

  const pointMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uGlowIntensityPair: { value: new THREE.Vector2(1, 1) },
        uNodeScalePair: { value: new THREE.Vector2(1, 1) },
        uInnerFadePair: { value: new THREE.Vector2(0.04, 0.04) },
        uFlowTrig: flowTrigUniform,
        uTime: timeUniform,
        uSignalActive: { value: 1 },
        uPulseRouteIds: pulseRouteIdsUniform,
        uPulseProgress: pulseProgressUniform,
        uPulseIntensity: pulseIntensityUniform,
        uRestingLineScale: { value: 1 },
        uSignalGain: { value: 1 },
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
  }, [flowTrigUniform, timeUniform, pulseRouteIdsUniform, pulseProgressUniform, pulseIntensityUniform])

  useFrame(() => {
    const sched = schedulerRef.current
    const t = timeUniform.value
    if (prefersReducedMotion) {
      sched.lastTime = t
      syncSchedulerUniforms(sched.left, 0, pulseRouteIdsUniform, pulseProgressUniform, pulseIntensityUniform, false)
      syncSchedulerUniforms(sched.right, 1, pulseRouteIdsUniform, pulseProgressUniform, pulseIntensityUniform, false)
      return
    }
    let dt = t - sched.lastTime
    if (dt < 0) {
      seedWingScheduler(sched.left, mergedGeometries.routes.left, LEFT_INITIAL_PHASES)
      seedWingScheduler(sched.right, mergedGeometries.routes.right, RIGHT_INITIAL_PHASES)
      dt = Math.min(t, 0.05)
    } else if (dt > 0.25) {
      dt = 0.05
    }
    sched.lastTime = t
    if (dt > 0) {
      stepWingScheduler(sched.left, mergedGeometries.routes.left, dt)
      stepWingScheduler(sched.right, mergedGeometries.routes.right, dt)
    }
    syncSchedulerUniforms(sched.left, 0, pulseRouteIdsUniform, pulseProgressUniform, pulseIntensityUniform, true)
    syncSchedulerUniforms(sched.right, 1, pulseRouteIdsUniform, pulseProgressUniform, pulseIntensityUniform, true)
  })

  const hazeMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uHazeGlowPair: { value: new THREE.Vector2(1, 1) },
        uNodeScalePair: { value: new THREE.Vector2(1, 1) },
        uInnerFadePair: { value: new THREE.Vector2(0.04, 0.04) },
        uFlowTrig: flowTrigUniform,
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
    }

    lineMat.uniforms.uLineOpacityPair.value.set(
      Math.min(1.12, leftGlow * 0.80),
      Math.min(1.12, rightGlow * 0.80)
    )
    const signalActive = prefersReducedMotion ? 0.0 : 1.0
    lineMat.uniforms.uSignalActive.value = signalActive
    lineMat.uniforms.uRestingLineScale.value = neuralLineScale
    lineMat.uniforms.uSignalGain.value = neuralSignalGain
    pointMat.uniforms.uGlowIntensityPair.value.set(
      Math.min(1.32, leftGlow * 0.96 * neuralPointScale),
      Math.min(1.32, rightGlow * 0.96 * neuralPointScale)
    )
    pointMat.uniforms.uNodeScalePair.value.set(leftNS, rightNS)
    pointMat.uniforms.uSignalActive.value = signalActive
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
    neuralSignalGain,
    neuralPointScale,
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
