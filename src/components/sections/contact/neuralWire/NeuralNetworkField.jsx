import { memo, useMemo, useEffect, useLayoutEffect, useContext, useCallback } from 'react'
import * as THREE from 'three'
import { useThree, createPortal } from '@react-three/fiber'
import { H_VAL, N_HERO } from './generateWireGeometry'
import { createNeuralWaveTexture, generateRefinedNeuralField, getNeuralTravelOffset } from './neuralPocketBounds'
import { useWireframeConfig } from './WireframeConfigContext'
import { FlowTimeContext, FlowTrigContext } from './animationContract'
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

// Wings retain ribbon-local coordinates and select their transform in the shader.
function mergeWingGeometries(left, right) {
  const leftCount = left.getAttribute('position').count
  const rightCount = right.getAttribute('position').count
  if (leftCount + rightCount === 0) return null

  const merged = new THREE.BufferGeometry()
  for (const [name, leftAttr] of Object.entries(left.attributes)) {
    const rightAttr = right.getAttribute(name)
    const values = new Float32Array(leftAttr.array.length + rightAttr.array.length)
    values.set(leftAttr.array)
    values.set(rightAttr.array, leftAttr.array.length)
    merged.setAttribute(name, new THREE.BufferAttribute(values, leftAttr.itemSize))
  }

  const wingSide = new Float32Array(leftCount + rightCount)
  wingSide.fill(1, leftCount)
  merged.setAttribute('aWingSide', new THREE.BufferAttribute(wingSide, 1))
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
const WAVE_RAILS_GLSL = `
  uniform highp sampler2D uWaveRails;
  uniform vec4 uRailEnds[2];
  uniform mat4 uRibbonToClip[2];
  uniform vec2 uFlowTrig;
  uniform vec2 uCanvasSize;
  const int RAIL_LAST = ${N_HERO - 1};

  vec3 railSample(int row, int index, out vec4 motion) {
    motion = texelFetch(uWaveRails, ivec2(index, row + 1), 0);
    return texelFetch(uWaveRails, ivec2(index, row), 0).xyz;
  }

  vec3 movedRail(vec3 rest, vec4 motion) {
    return rest + vec3(0.0, motion.xy * (uFlowTrig.x - 1.0) + motion.zw * uFlowTrig.y);
  }

  float railSampleIndex(float u, int wing, int strand) {
    return clamp(u / uRailEnds[wing][strand], 0.0, 1.0) * float(RAIL_LAST);
  }
`

const POCKET_VERTEX_GLSL = `
  attribute vec4 aRelativeCoord;
  attribute float aWingSide;
  uniform vec2 uTravelOffset;
  uniform vec2 uInnerFadePair;
  uniform float uPixelRatio;
  varying float vFlowU;
  flat varying int vWing;
  flat varying ivec2 vOuterStrands;
  ${WAVE_RAILS_GLSL}

  float pocketEase(float x) {
    x = clamp(x, 0.0, 1.0);
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
  }

  float flowPocketVisibility(float u) {
    float innerFade = uInnerFadePair[vWing];
    float innerStart = clamp(innerFade * 0.28, 0.035, 0.09);
    float innerSpan = max(0.11, innerFade * 0.52);
    return pocketEase((u - innerStart) / innerSpan)
      * (1.0 - pocketEase((u - 0.945) / 0.055));
  }

  // Smooth maximum with a quadratic shoulder, bounded on the inside of the wall.
  float softFloor(float value, float floorY, float shoulder) {
    float d = value - floorY;
    float t = clamp(d + shoulder, 0.0, 2.0 * shoulder);
    return floorY + t * t / (4.0 * shoulder) + max(d - shoulder, 0.0);
  }

  struct PocketEval {
    vec4 clip;
    float viewDepth;
    float radius;
    float minStrandDist;
    float halfHeightPx;
    float wallClearancePx;
  };

  PocketEval evalPocketVertex(float u, int wing, float padCss) {
    vec4 walls;
    vec2 bias = vec2(0.0);
    vec2 ampSquared = vec2(0.0);

    for (int strand = 0; strand < 4; ++strand) {
      int row = wing * 8 + strand * 2;
      float index = railSampleIndex(u, wing, strand);
      int first = min(int(index), RAIL_LAST - 1);
      vec4 motionA, motionB;
      vec3 a = railSample(row, first, motionA);
      vec3 b = railSample(row, first + 1, motionB);
      float t = index - float(first);
      vec4 motion = mix(motionA, motionB, t);
      vec3 rest = mix(a, b, t);
      walls[strand] = movedRail(rest, motion).y;
      bias += rest.yz - motion.xy;
      ampSquared += motion.xy * motion.xy + motion.zw * motion.zw;
    }

    float lo = min(min(walls.x, walls.y), min(walls.z, walls.w));
    float hi = max(max(walls.x, walls.y), max(walls.z, walls.w));
    int lower = walls.x == lo ? 0 : walls.y == lo ? 1 : walls.z == lo ? 2 : 3;
    int upper = walls.w == hi ? 3 : walls.z == hi ? 2 : walls.y == hi ? 1 : 0;
    vOuterStrands = ivec2(lower, upper);
    float radius = 0.5 * (hi - lo);
    vec2 frame = 0.25 * bias;
    vec2 amplitude = sqrt(0.25 * ampSquared);
    float yTarget = frame.x + 0.90 * amplitude.x * aRelativeCoord.y;
    float shoulder = max(0.10 * radius, 1e-6);
    float y = radius > 1e-5
      ? -softFloor(-softFloor(yTarget, lo + shoulder, shoulder), -hi + shoulder, shoulder)
      : 0.5 * (lo + hi);
    float z = frame.y + aRelativeCoord.z * (amplitude.y + 0.025);
    float x = (wing == 0 ? -10.0 : 10.0) * u;
    mat4 toClip = uRibbonToClip[wing];
    vec4 clip = toClip * vec4(x, y, z, 1.0);

    PocketEval res;
    res.clip = clip;
    res.viewDepth = max(clip.w, 1e-4);
    res.radius = radius;
    vec4 strandDist = abs(y - walls);
    res.minStrandDist = min(min(strandDist.x, strandDist.y), min(strandDist.z, strandDist.w));
    float pxPerLocalY = 0.5 * length(toClip[1].xy * uCanvasSize) / res.viewDepth;
    res.halfHeightPx = radius * pxPerLocalY;
    res.wallClearancePx = min(y - lo, hi - y) * pxPerLocalY - padCss;
    return res;
  }
`

const POCKET_FRAGMENT_GLSL = `
  varying float vFlowU;
  flat varying int vWing;
  flat varying ivec2 vOuterStrands;
  uniform vec2 uDrawingBufferSize;
  uniform vec2 uGlobeBounds;
  ${WAVE_RAILS_GLSL}

  vec3 projectedRailSample(int row, int index, mat4 toClip) {
    vec4 motion;
    vec3 rest = railSample(row, index, motion);
    return (toClip * vec4(movedRail(rest, motion), 1.0)).xyw;
  }

  float crossingY(vec3 a, vec3 b, float da, float db) {
    float t = abs(da) / max(abs(da) + abs(db), 1e-8);
    vec3 p = mix(a, b, t);
    return p.y / p.z;
  }

  // Find a crossing on an actual projected core segment. Solving in homogeneous
  // coordinates keeps the result exact under the wing's yaw and perspective.
  bool projectedWallY(float x, int strand, mat4 toClip, out float y) {
    int row = vWing * 8 + strand * 2;
    int hint = min(int(railSampleIndex(vFlowU, vWing, strand)), RAIL_LAST - 1);
    vec3 p = projectedRailSample(row, hint, toClip);
    vec3 q = projectedRailSample(row, hint + 1, toClip);
    float dp = p.x - x * p.z;
    float dq = q.x - x * q.z;
    if (dp * dq <= 0.0 && min(p.z, q.z) > 1e-4) {
      y = crossingY(p, q, dp, dq);
      return true;
    }
    // Use the nearby projected segment to predict the raster column's sample.
    // Accept the prediction only after finding a real crossing on that segment.
    float slope = dq - dp;
    if (abs(slope) > 1e-7) {
      int guess = int(clamp(float(hint) - dp / slope, 0.0, float(RAIL_LAST - 1)));
      for (int attempt = 0; attempt < 2; ++attempt) {
        if (guess == hint || guess < 0 || guess >= RAIL_LAST) break;
        p = projectedRailSample(row, guess, toClip);
        q = projectedRailSample(row, guess + 1, toClip);
        dp = p.x - x * p.z;
        dq = q.x - x * q.z;
        if (dp * dq <= 0.0 && min(p.z, q.z) > 1e-4) {
          y = crossingY(p, q, dp, dq);
          return true;
        }
        guess += dp * slope > 0.0 ? -1 : 1;
      }
    }

    int low = 0;
    int high = RAIL_LAST;
    vec3 a = projectedRailSample(row, low, toClip);
    vec3 b = projectedRailSample(row, high, toClip);
    float da = a.x - x * a.z;
    float db = b.x - x * b.z;
    if (da * db > 0.0) return false;

    for (int step = 0; step < 9; ++step) {
      int index = (low + high) / 2;
      vec3 m = projectedRailSample(row, index, toClip);
      float d = m.x - x * m.z;
      if ((da < 0.0 && d < 0.0) || (da > 0.0 && d > 0.0)) {
        a = m;
        da = d;
        low = index;
      } else {
        b = m;
        db = d;
        high = index;
      }
      if (high - low == 1) break;
    }

    if (high - low != 1 || min(a.z, b.z) <= 1e-4) return false;
    y = crossingY(a, b, da, db);
    return true;
  }

  float projectedPocketVisibility() {
    vec2 ndc = 2.0 * gl_FragCoord.xy / uDrawingBufferSize - 1.0;
    float inner = vWing == 0 ? uGlobeBounds.x - ndc.x : ndc.x - uGlobeBounds.y;
    float outer = 1.0 - abs(ndc.x);
    float edgeFade = smoothstep(1.0, 18.0, inner * 0.5 * uCanvasSize.x)
      * smoothstep(1.0, 24.0, outer * 0.5 * uCanvasSize.x);
    if (edgeFade <= 0.0) return 0.0;

    mat4 toClip = uRibbonToClip[vWing];
    float lower, upper;
    bool hasLower = projectedWallY(ndc.x, vOuterStrands.x, toClip, lower);
    bool hasUpper = projectedWallY(ndc.x, vOuterStrands.y, toClip, upper);
    float lo = hasLower ? lower : 1e6;
    float hi = hasLower ? lower : -1e6;
    if (hasUpper) {
      lo = min(lo, upper);
      hi = max(hi, upper);
    }
    float halfBufferHeight = 0.5 * uDrawingBufferSize.y;
    // Any two real crossings bound a subset of the four-strand envelope.
    // Interior pixels can take the same full opacity without the other lookups.
    if (min(ndc.y - lo, hi - ndc.y) * halfBufferHeight >= 3.0) return edgeFade;

    for (int strand = 0; strand < 4; ++strand) {
      if (strand == vOuterStrands.x || strand == vOuterStrands.y) continue;
      float y;
      if (!projectedWallY(ndc.x, strand, toClip, y)) continue;
      lo = min(lo, y);
      hi = max(hi, y);
    }
    float clearance = min(ndc.y - lo, hi - ndc.y) * halfBufferHeight;
    return edgeFade * smoothstep(1.0, 3.0, clearance);
  }
`

const NeuralLineShader = {
  vertexShader: `
    attribute vec2 aLineStyle;
    attribute float aPartnerU;
    uniform vec2 uLineOpacityPair;
    varying float vAlpha;
    varying float vHubAccent;
    ${POCKET_VERTEX_GLSL}
    void main() {
      vWing = int(aWingSide);
      float travel = uTravelOffset[vWing];
      float a = aRelativeCoord.x + travel;
      float b = aPartnerU + travel;
      vFlowU = fract(a);
      vHubAccent = aLineStyle.y;
      if (floor(a) != floor(b)) {
        vAlpha = 0.0;
        gl_Position = vec4(2.0, 0.0, 0.0, 1.0);
        return;
      }
      float partnerU = fract(b);
      float seamDistance = min(min(vFlowU, 1.0 - vFlowU), min(partnerU, 1.0 - partnerU));
      float seamFade = pocketEase(seamDistance / 0.035);
      PocketEval p = evalPocketVertex(vFlowU, vWing, 0.5);
      float lineOpacity = mix(uLineOpacityPair.x, uLineOpacityPair.y, aWingSide);
      float strandYield = mix(0.52, 1.0, smoothstep(0.0, 0.07 * p.radius + 0.014, p.minStrandDist));
      vAlpha = aLineStyle.x * lineOpacity * flowPocketVisibility(vFlowU) * strandYield * seamFade;
      gl_Position = p.clip;
    }
  `,
  fragmentShader: `
    uniform vec3 uBaseColor;
    uniform vec3 uMidColor;
    uniform vec3 uHotColor;
    varying float vAlpha;
    varying float vHubAccent;
    ${POCKET_FRAGMENT_GLSL}
    void main() {
      if (vAlpha <= 0.001) discard;
      float visibility = projectedPocketVisibility();
      if (visibility <= 0.0) discard;
      vec3 webTint = mix(uBaseColor, uMidColor, 0.75);
      vec3 lineCol = mix(webTint, uHotColor, 0.24 * clamp(vHubAccent, 0.0, 1.0));
      gl_FragColor = vec4(lineCol, clamp(vAlpha, 0.0, 0.46) * visibility);
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
    ${POCKET_VERTEX_GLSL}
    void main() {
      vWing = int(aWingSide);
      vFlowU = fract(aRelativeCoord.x + uTravelOffset[vWing]);
      PocketEval p = evalPocketVertex(vFlowU, vWing, 1.5);
      vTier = aPointStyle.z;
      float glowIntensity = mix(uGlowIntensityPair.x, uGlowIntensityPair.y, aWingSide);
      float nodeScale = mix(uNodeScalePair.x, uNodeScalePair.y, aWingSide);
      float depthCue = mix(0.60, 1.0, clamp(0.5 + 0.5 * aRelativeCoord.z, 0.0, 1.0));
      float funnel = mix(0.75, 1.0, pocketEase((vFlowU - 0.06) / 0.22));
      float persp = clamp(8.0 / p.viewDepth, 0.75, 1.25);
      float targetCss = aPointStyle.x * nodeScale * funnel * persp;
      float maxCss = max(0.0, 2.0 * p.wallClearancePx);
      float pointCss = clamp(min(targetCss, maxCss), 0.0, 24.0);
      float wallFade = smoothstep(0.0, 1.5, p.wallClearancePx);
      float strandYield = mix(0.62, 1.0, smoothstep(0.0, 0.065 * p.radius + 0.014, p.minStrandDist));
      vAlpha = aPointStyle.y * glowIntensity * depthCue * flowPocketVisibility(vFlowU) * wallFade * strandYield;
      float safeDpr = clamp(uPixelRatio, 1.0, 2.5);
      if (pointCss <= 0.05 || vAlpha <= 0.001) {
        gl_PointSize = 0.0;
        vAlpha = 0.0;
      } else {
        gl_PointSize = min(pointCss * safeDpr, 56.0);
      }
      gl_Position = p.clip;
    }
  `,
  fragmentShader: `
    uniform vec3 uBaseColor;
    uniform vec3 uMidColor;
    uniform vec3 uHotColor;
    varying float vAlpha;
    varying float vTier;
    ${POCKET_FRAGMENT_GLSL}
    void main() {
      if (vAlpha <= 0.001) discard;
      vec2 p = gl_PointCoord - 0.5;
      float r2 = dot(p, p);
      if (r2 >= 0.25) discard;
      float visibility = projectedPocketVisibility();
      if (visibility <= 0.0) discard;
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
        gl_FragColor = vec4(col, clamp(vAlpha * light, 0.0, 1.0) * visibility);
      } else if (vTier > 0.5) {
        // Tier 2: Mid Constellation Vertex (clean luminous intersection, odd/even pixel stable)
        float core = exp(-26.0 * r2) * 0.92;
        float bloom = exp(-9.5 * r2) * 0.32 * cutoff;
        vec3 col = mix(uBaseColor, uMidColor, clamp(0.50 + core * 0.55 + bloom * 0.35, 0.0, 1.0));
        col = mix(col, uHotColor, clamp(core * 0.28, 0.0, 0.28));
        float light = (core + bloom) * cutoff;
        gl_FragColor = vec4(col, clamp(vAlpha * light, 0.0, 0.92) * visibility);
      } else {
        // Tier 3: Subtle Micro-Dust (dimmer colored background sparkle visible at DPR 1.0 & 1.5, zero white core)
        float core = exp(-12.0 * r2) * 0.85 * cutoff;
        vec3 col = mix(uBaseColor, uMidColor, clamp(0.30 + core * 0.60, 0.0, 0.88));
        gl_FragColor = vec4(col, clamp(vAlpha * core, 0.0, 0.44) * visibility);
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
    ${POCKET_VERTEX_GLSL}
    void main() {
      vWing = int(aWingSide);
      vFlowU = fract(aRelativeCoord.x + uTravelOffset[vWing]);
      PocketEval p = evalPocketVertex(vFlowU, vWing, 3.0);
      float hazeGlow = mix(uHazeGlowPair.x, uHazeGlowPair.y, aWingSide);
      float nodeScale = mix(uNodeScalePair.x, uNodeScalePair.y, aWingSide);
      float outerFadeHaze = 1.0 - pocketEase((vFlowU - 0.88) / 0.11);
      float persp = clamp(8.0 / p.viewDepth, 0.75, 1.25);
      float targetHazeCss = clamp(p.halfHeightPx * 1.05, 16.0, 74.0) * aHazeStyle.x * nodeScale * persp;
      float maxCss = max(0.0, 2.0 * p.wallClearancePx);
      float hazeCss = clamp(min(targetHazeCss, maxCss), 0.0, 76.0);
      float wallFade = smoothstep(0.0, 2.5, p.wallClearancePx);
      float chamberMask = smoothstep(0.008, 0.13 * p.radius + 0.015, p.minStrandDist);
      float tipMask = smoothstep(0.025, 0.11, p.radius);
      vAlpha = aHazeStyle.y * hazeGlow * flowPocketVisibility(vFlowU) * smoothstep(0.105, 0.22, vFlowU) * outerFadeHaze * wallFade * chamberMask * tipMask;
      float safeDpr = clamp(uPixelRatio, 1.0, 2.5);
      if (hazeCss <= 0.05 || vAlpha <= 0.0005) {
        gl_PointSize = 0.0;
        vAlpha = 0.0;
      } else {
        gl_PointSize = min(hazeCss * safeDpr, 160.0);
      }
      gl_Position = p.clip;
    }
  `,
  fragmentShader: `
    uniform vec3 uBaseColor;
    uniform vec3 uMidColor;
    varying float vAlpha;
    ${POCKET_FRAGMENT_GLSL}
    void main() {
      if (vAlpha <= 0.0005) discard;
      vec2 p = gl_PointCoord - 0.5;
      float r2 = dot(p, p);
      if (r2 >= 0.25) discard;
      float visibility = projectedPocketVisibility();
      if (visibility <= 0.0) discard;
      float falloff = exp(-4.5 * r2) * (1.0 - smoothstep(0.06, 0.25, r2));
      vec3 hazeCol = mix(uBaseColor, uMidColor, 0.14);
      gl_FragColor = vec4(hazeCol, min(vAlpha * falloff, 0.080) * visibility);
    }
  `,
}

/**
 * NeuralNetworkField:
 * Merges both left/right wings and all depth tiers into at most 3 total draw calls
 * (1 Haze Points, 1 LineSegments, 1 Star Constellation Points) with
 * a static wave texture and in-place uniform updates.
 */
export const NeuralNetworkField = memo(function NeuralNetworkField({
  leftWaves,
  rightWaves,
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
      leftWaves={leftWaves}
      rightWaves={rightWaves}
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
  leftWaves,
  rightWaves,
  themeConfig = {},
  nodeScale = 1.0,
  innerFade = 0.04,
}) {
  const { viewport, scene, gl, size: canvasSize, invalidate } = useThree()
  const flowTimeUniform = useContext(FlowTimeContext)
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
  const leftWaveNumber = leftWaves.heroWaveNumber
  const rightWaveNumber = rightWaves.heroWaveNumber

  const waveRails = useMemo(() => {
    const started = performance.now()
    const rails = createNeuralWaveTexture(leftWaves, rightWaves)
    return { ...rails, dt: performance.now() - started }
  }, [leftWaves, rightWaves])
  useEffect(() => () => waveRails.texture.dispose(), [waveRails])

  const motionUniforms = useMemo(() => ({
    uFlowTrig: flowTrigUniform,
    uTravelOffset: { value: new THREE.Vector2() },
    uWaveRails: { value: null },
    uRailEnds: { value: [new THREE.Vector4(), new THREE.Vector4()] },
    uRibbonToClip: { value: [new THREE.Matrix4(), new THREE.Matrix4()] },
    uGlobeBounds: { value: new THREE.Vector2(-1, 1) },
    uDrawingBufferSize: { value: new THREE.Vector2(1, 1) },
    uCanvasSize: { value: new THREE.Vector2(1, 1) },
  }), [flowTrigUniform])

  useLayoutEffect(() => {
    motionUniforms.uWaveRails.value = waveRails.texture
    motionUniforms.uRailEnds.value = waveRails.ends
  }, [motionUniforms, waveRails])

  useLayoutEffect(() => {
    const canvas = gl.domElement
    const globe = document.getElementById('contact-globe-inner')
    const measure = () => {
      const canvasRect = canvas.getBoundingClientRect()
      const globeRect = globe?.getBoundingClientRect()
      if (canvasRect.width <= 0 || !globeRect) return
      const left = 2 * (globeRect.left - canvasRect.left) / canvasRect.width - 1
      const right = 2 * (globeRect.right - canvasRect.left) / canvasRect.width - 1
      const bounds = motionUniforms.uGlobeBounds.value
      if (bounds.x === left && bounds.y === right) return
      bounds.set(left, right)
      invalidate()
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(canvas)
    if (globe) observer.observe(globe)
    return () => observer.disconnect()
  }, [gl, invalidate, motionUniforms])

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

    const mergedLinesGeo = mergeWingGeometries(leftField.linesGeo, rightField.linesGeo)
    const mergedPointsGeo = mergeWingGeometries(leftField.pointsGeo, rightField.pointsGeo)
    const mergedHazeGeo = mergeWingGeometries(leftField.hazeGeo, rightField.hazeGeo)
    const mergeDt = performance.now() - mergeStarted

    return {
      linesGeo: mergedLinesGeo,
      pointsGeo: mergedPointsGeo,
      hazeGeo: mergedHazeGeo,
      ribbonMatrices: [matLeft, matRight],
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

  const beforeRender = useCallback((renderer, _scene, camera) => {
    const time = flowTimeUniform.value
    motionUniforms.uTravelOffset.value.set(
      getNeuralTravelOffset(time, leftWaveNumber),
      getNeuralTravelOffset(time, rightWaveNumber)
    )
    renderer.getDrawingBufferSize(motionUniforms.uDrawingBufferSize.value)
    motionUniforms.uCanvasSize.value.set(Math.max(1, canvasSize.width), Math.max(1, canvasSize.height))
    const clipMatrices = motionUniforms.uRibbonToClip.value
    for (let wing = 0; wing < 2; wing++) {
      clipMatrices[wing].multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        .multiply(mergedGeometries.ribbonMatrices[wing])
    }
  }, [flowTimeUniform, leftWaveNumber, rightWaveNumber, motionUniforms, mergedGeometries, canvasSize.width, canvasSize.height])

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      const times = mergedGeometries.timings
      window.__neuralBuildTimes = { ...times, rails: waveRails.dt, total: times.total + waveRails.dt }
    }
  }, [mergedGeometries, waveRails])

  // 4. Create the 3 ShaderMaterials once per mount (uniforms updated in-place via useLayoutEffect)
  const lineMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        ...motionUniforms,
        uLineOpacityPair: { value: new THREE.Vector2(0.9, 0.9) },
        uInnerFadePair: { value: new THREE.Vector2(0.04, 0.04) },
        uBaseColor: { value: new THREE.Color() },
        uMidColor: { value: new THREE.Color() },
        uHotColor: { value: new THREE.Color() },
        uPixelRatio: { value: 1 },
      },
      vertexShader: NeuralLineShader.vertexShader,
      fragmentShader: NeuralLineShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    })
  }, [motionUniforms])

  const pointMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        ...motionUniforms,
        uGlowIntensityPair: { value: new THREE.Vector2(1, 1) },
        uNodeScalePair: { value: new THREE.Vector2(1, 1) },
        uInnerFadePair: { value: new THREE.Vector2(0.04, 0.04) },
        uBaseColor: { value: new THREE.Color() },
        uMidColor: { value: new THREE.Color() },
        uHotColor: { value: new THREE.Color() },
        uPixelRatio: { value: 1 },
      },
      vertexShader: NeuralPointShader.vertexShader,
      fragmentShader: NeuralPointShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    })
  }, [motionUniforms])

  const hazeMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        ...motionUniforms,
        uHazeGlowPair: { value: new THREE.Vector2(1, 1) },
        uNodeScalePair: { value: new THREE.Vector2(1, 1) },
        uInnerFadePair: { value: new THREE.Vector2(0.04, 0.04) },
        uBaseColor: { value: new THREE.Color() },
        uMidColor: { value: new THREE.Color() },
        uHotColor: { value: new THREE.Color() },
        uPixelRatio: { value: 1 },
      },
      vertexShader: NeuralHazeShader.vertexShader,
      fragmentShader: NeuralHazeShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    })
  }, [motionUniforms])

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
          onBeforeRender={beforeRender}
          matrixAutoUpdate={false}
          frustumCulled={false}
        />
      )}

      {/* 2. Triangulated Synaptic Spiderweb (1 draw call) */}
      {mergedGeometries.linesGeo && (
        <lineSegments
          geometry={mergedGeometries.linesGeo}
          material={lineMat}
          onBeforeRender={beforeRender}
          matrixAutoUpdate={false}
          frustumCulled={false}
        />
      )}

      {/* 3. 3-Tier Star Constellation: Micro-Dust + Mid Vertices + Hero Hubs (1 draw call) */}
      {mergedGeometries.pointsGeo && (
        <points
          geometry={mergedGeometries.pointsGeo}
          material={pointMat}
          onBeforeRender={beforeRender}
          matrixAutoUpdate={false}
          frustumCulled={false}
        />
      )}
    </group>,
    scene
  )
})

export default NeuralNetworkField
