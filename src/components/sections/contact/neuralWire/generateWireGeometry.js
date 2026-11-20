import * as THREE from 'three'
import {
  NeuralWireGraph,
  GraphNode,
} from './neuralGraphModel.js'

/**
 * Deterministic PRNG to ensure reproducible, non-flickering static geometry.
 */
function createPrng(seed = 1337) {
  let s = seed
  return function () {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/**
 * Vertical scale H: 34% of canvas half-height.
 * With camera at z = 8, fov = 45 deg: half-height = 8 * tan(22.5 deg) = 3.3137.
 * 34% * 3.3137 = 1.1266 (~1.13).
 */
export const H_VAL = 1.13

/**
 * Computes boundary constraint weight w(u) in [0.0, 1.0].
 * Strictly 0.0 at u = 0 (near central globe) to guarantee zero collision with orbital rings.
 */
export function computeConstraintWeight(u) {
  const innerFactor = THREE.MathUtils.smoothstep(u, 0.0, 0.20)
  const outerFactor = 1.0 - 0.15 * THREE.MathUtils.smoothstep(u, 0.90, 1.05)
  return innerFactor * outerFactor
}

/**
 * Feather fade at inner tip (near globe) and outer tip (extended outer reach):
 * Softens both endpoints so ribbons dissolve seamlessly into the cosmos rather than cutting off bluntly.
 */
export function computeVertexAlpha(u, innerFade = 0.04, outerFade = 0.08, maxU = 1.0) {
  const fadeDist = Math.max(0.005, innerFade)
  const innerAlpha = THREE.MathUtils.smoothstep(u, 0.0, fadeDist)

  if (outerFade <= 0.001) return innerAlpha
  const safeMax = Math.max(0.2, maxU)
  const outerStart = safeMax - Math.max(0.01, outerFade * safeMax)
  const outerEnd = safeMax
  // As u increases from outerStart to outerEnd, smoothstep goes from 0.0 to 1.0,
  // so (1.0 - smoothstep) smoothly fades the tip from 1.0 down to 0.0!
  const outerS = Math.max(0.0, Math.min(1.0, 1.0 - THREE.MathUtils.smoothstep(u, outerStart, outerEnd)))
  return innerAlpha * Math.pow(outerS, 1.5)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SMOOTH ANALYTICAL HERO WAVES (EXACT FORMULA LOCK + PARAMETRIC CONTROLLERS)
// Continuous harmonic functions with N = 200 points per wave.
// Zero sparse 5-point CatmullRom keyframes that kink at the apex!
// ─────────────────────────────────────────────────────────────────────────────

export function wingSweep(u, H, sweepVal = 0.28) {
  return sweepVal * H * Math.pow(u, 2.0)
}

export function env(u, H) {
  return H * Math.pow(u, 0.85) * THREE.MathUtils.smootherstep(u, 0.0, 0.20)
}

/**
 * Computes live inter-ribbon distance & spacing offsets for ribbon index (0, 1, 2, 3) along coordinate u:
 * 1. Pairwise distance adjustments:
 *    - distRibbon01: distance between Ribbon 0 (Upper Arch) and Ribbon 1 (Lower Arch)
 *    - distRibbon12: distance between Ribbon 1 (Lower Arch) and Ribbon 2 (Violet Accent)
 *    - distRibbon23: distance between Ribbon 2 (Violet Accent) and Ribbon 3 (Counter-Braid)
 *    Uses exact linear decomposition ensuring zero global center drift:
 *      dy0 =  0.75 * d01 + 0.50 * d12 + 0.25 * d23
 *      dy1 = -0.25 * d01 + 0.50 * d12 + 0.25 * d23
 *      dy2 = -0.25 * d01 - 0.50 * d12 + 0.25 * d23
 *      dy3 = -0.25 * d01 - 0.50 * d12 - 0.75 * d23
 *
 * 2. Outer vs. Inner Spacing Taper:
 *    - ribbonSpacingOuter: multiplier for distance at outer wingtip (u=1)
 *    - ribbonSpacingInner: multiplier for distance at inner globe connection (u=0)
 */
export function computeRibbonSpacingOffset(index, u, H, config = {}) {
  const dist01 = config.distRibbon01 !== undefined ? config.distRibbon01 : 0.0
  const dist12 = config.distRibbon12 !== undefined ? config.distRibbon12 : 0.0
  const dist23 = config.distRibbon23 !== undefined ? config.distRibbon23 : 0.0
  const spOuter = config.ribbonSpacingOuter !== undefined ? config.ribbonSpacingOuter : 1.0
  const spInner = config.ribbonSpacingInner !== undefined ? config.ribbonSpacingInner : 1.0

  // If all parameters are at baseline defaults, return exactly 0.0 for zero perturbation
  if (dist01 === 0.0 && dist12 === 0.0 && dist23 === 0.0 && spOuter === 1.0 && spInner === 1.0) {
    return 0.0
  }

  // Exact linear decomposition for pairwise distance adjustments
  const pairwiseOffsets = [
     0.75 * dist01 + 0.50 * dist12 + 0.25 * dist23,
    -0.25 * dist01 + 0.50 * dist12 + 0.25 * dist23,
    -0.25 * dist01 - 0.50 * dist12 + 0.25 * dist23,
    -0.25 * dist01 - 0.50 * dist12 - 0.75 * dist23,
  ]
  const pairwiseDy = pairwiseOffsets[index] ?? 0.0

  const uNorm = Math.max(0.0, Math.min(1.0, u))

  // Smooth taper from inner (spInner) to outer (spOuter)
  const tTaper = spInner + (spOuter - spInner) * THREE.MathUtils.smootherstep(uNorm, 0.0, 1.0)

  // Smooth connection to globe at u=0 (ensures clean socket connection without tearing)
  const tGlobe = THREE.MathUtils.smootherstep(uNorm, 0.0, 0.22)

  // Natural vertical fanning signs for global outer/inner spacing multiplier:
  // Ribbon 0: expands upward (+0.45)
  // Ribbon 1: expands downward (-0.45)
  // Ribbon 2: expands downward-mid (-0.20)
  // Ribbon 3: expands upward-mid (+0.20)
  const fanSigns = [0.45, -0.45, -0.20, 0.20]
  const globalFanOuter = (spOuter - 1.0) * THREE.MathUtils.smootherstep(uNorm, 0.35, 1.0) * (fanSigns[index] ?? 0.0) * H
  const globalFanInner = (spInner - 1.0) * (1.0 - THREE.MathUtils.smootherstep(uNorm, 0.0, 0.50)) * (fanSigns[index] ?? 0.0) * H * THREE.MathUtils.smootherstep(uNorm, 0.0, 0.15)

  return pairwiseDy * tGlobe * tTaper + globalFanOuter + globalFanInner
}

/**
 * Core mathematical wave evaluator supporting live parametric adjustments:
 * - amplitude: scales vertical wave oscillation peaks
 * - frequency: scales wave cycle density
 * - wingSweep: controls outer parabolic wing lift
 * - innerYOffset: shifts inner connection point near the globe
 * - outerYOffset: lifts or lowers the outer wingtips
 * - outerFlexibility: fluid wave harmonic whip & flutter at the outer ends
 * - outerFlare: vertical separation & fanning out of the 4 ribbons at outer tips
 */
export function computeHeroWaveY(index, u, H, config = {}) {
  const amp = config.amplitude !== undefined ? config.amplitude : 1.0
  const freq = config.frequency !== undefined ? config.frequency : 1.0
  const sweep = config.wingSweep !== undefined ? config.wingSweep : 0.28
  const innerY = config.innerYOffset !== undefined ? config.innerYOffset : 0.0
  const outerY = config.outerYOffset !== undefined ? config.outerYOffset : 0.0

  const r1Amp = config.ribbon1Amp !== undefined ? config.ribbon1Amp : 1.0
  const r2Amp = config.ribbon2Amp !== undefined ? config.ribbon2Amp : 1.0
  const r3Amp = config.ribbon3Amp !== undefined ? config.ribbon3Amp : 1.0
  const r4Amp = config.ribbon4Amp !== undefined ? config.ribbon4Amp : 1.0

  const r1Y = config.ribbon1YOffset !== undefined ? config.ribbon1YOffset : 0.0
  const r2Y = config.ribbon2YOffset !== undefined ? config.ribbon2YOffset : 0.0
  const r3Y = config.ribbon3YOffset !== undefined ? config.ribbon3YOffset : 0.0
  const r4Y = config.ribbon4YOffset !== undefined ? config.ribbon4YOffset : 0.0

  const r1Freq = config.ribbon1Freq !== undefined ? config.ribbon1Freq : 1.0
  const r2Freq = config.ribbon2Freq !== undefined ? config.ribbon2Freq : 1.0
  const r3Freq = config.ribbon3Freq !== undefined ? config.ribbon3Freq : 1.0
  const r4Freq = config.ribbon4Freq !== undefined ? config.ribbon4Freq : 1.0

  const outerFlex = config.outerFlexibility !== undefined ? config.outerFlexibility : 1.0
  const outerFlare = config.outerFlare !== undefined ? config.outerFlare : 0.6

  // Two ends differential placement:
  // innerY dominates at u=0 and tapers off; outerY dominates as u approaches/exceeds 1.0
  const endsY = (1.0 - Math.pow(Math.min(1.0, u), 0.5)) * innerY + Math.pow(u, 1.6) * outerY
  const baseSweep = wingSweep(u, H, sweep)
  const e = env(u, H)

  // Outer end flexibility & harmonic wave whip (activates gracefully for u > 0.55):
  const outerT = Math.max(0.0, (u - 0.55) / 0.45)
  const outerWhip = Math.pow(outerT, 1.7) * 0.22 * H * outerFlex * Math.sin(u * Math.PI * 2.8 * freq + index * 0.9)

  // Outer flare offsets (fans out the 4 ribbons gracefully at the outer tips):
  // Ribbon 0 (Upper Arch): flares upward
  // Ribbon 1 (Lower Arch): flares downward
  // Ribbon 2 (Violet Accent): flows downward-mid
  // Ribbon 3 (Counter-Braid): flows upward-mid
  const flareSigns = [0.85, -0.85, -0.45, 0.45]
  const flareOffset = Math.pow(outerT, 1.7) * 0.28 * H * outerFlare * (flareSigns[index] ?? 0.0)

  // Live inter-ribbon distance & spacing offset (pairwise dist01/dist12/dist23 and outer/inner taper):
  const spacingOffset = computeRibbonSpacingOffset(index, u, H, config)

  switch (index) {
    case 0: {
      // Ribbon 1 (Upper Almond Arch, Cyan-White Core)
      // Pure harmonic formulation with natural outer lift, matching Ribbon 2's organic continuity with zero angular kinks
      const wave = 0.48 * Math.sin(u * Math.PI * 1.62 * freq * r1Freq + 0.08) - 0.14 * Math.cos(u * Math.PI * 2.8 * freq * r1Freq) + 0.32 * Math.pow(u, 1.8)
      return baseSweep + endsY + r1Y + flareOffset + outerWhip + spacingOffset + e * amp * r1Amp * wave
    }
    case 1:
      // Ribbon 2 (Lower Almond Arch, Cyan-White Core)
      return baseSweep + endsY + r2Y + flareOffset + outerWhip + spacingOffset + e * amp * r2Amp * (-0.50 * Math.sin(u * Math.PI * 1.68 * freq * r2Freq + 0.08) + 0.14 * Math.cos(u * Math.PI * 2.9 * freq * r2Freq))
    case 2: {
      // Ribbon 3 (Violet/Magenta Accent Wave #b83dff, Threads Center -> Lower Outer Sweep)
      // Inner boost enhances amplitude sensitivity at inner end (u < 0.65) while preserving outer change setting as it is:
      const r3InnerT = Math.max(0.0, Math.min(1.0, u / 0.65))
      const r3InnerTaper = 1.0 - r3InnerT * r3InnerT * (3.0 - 2.0 * r3InnerT)
      const r3InnerBoost = 0.52 * r3InnerTaper * Math.sin(u * Math.PI * 1.65 * freq * r3Freq)
      return baseSweep + endsY + r3Y + flareOffset + outerWhip + spacingOffset + e * amp * r3Amp * (0.18 * Math.sin(u * Math.PI * 2.2 * freq * r3Freq - 0.5) - 0.42 * Math.pow(u, 1.4) * Math.sin(u * Math.PI * 1.35 * freq * r3Freq) + r3InnerBoost)
    }
    case 3:
      // Ribbon 4 (Secondary Inner-to-Outer Counter-Braid, Electric Blue-Cyan)
      return baseSweep + endsY + r4Y + flareOffset + outerWhip + spacingOffset + e * amp * r4Amp * (-0.24 * Math.sin(u * Math.PI * 2.6 * freq * r4Freq + 0.9) + 0.30 * Math.pow(u, 1.6))
    default:
      return 0
  }
}

/**
 * Smooth Z-depth oscillation with optional zAmplitude control, outer flexibility and 3D end placement
 */
export function computeHeroWaveZ(index, u, H, config = {}) {
  const zAmp = config.zAmplitude !== undefined ? config.zAmplitude : 1.0
  const outerZ = config.outerZOffset !== undefined ? config.outerZOffset : 0.0
  const outerFlex = config.outerFlexibility !== undefined ? config.outerFlexibility : 1.0
  const rAmp = [
    config.ribbon1Amp ?? 1.0,
    config.ribbon2Amp ?? 1.0,
    config.ribbon3Amp ?? 1.0,
    config.ribbon4Amp ?? 1.0,
  ][index] ?? 1.0
  const rFreq = [
    config.ribbon1Freq ?? 1.0,
    config.ribbon2Freq ?? 1.0,
    config.ribbon3Freq ?? 1.0,
    config.ribbon4Freq ?? 1.0,
  ][index] ?? 1.0

  const outerT = Math.max(0.0, (u - 0.55) / 0.45)
  const zEnds = Math.pow(u, 1.6) * outerZ + Math.pow(outerT, 1.8) * 0.12 * H * outerFlex * Math.cos(u * Math.PI * 2.4 * rFreq)
  const rAmpClamped = Math.min(1.2, rAmp)

  return zEnds + 0.25 * H * zAmp * rAmpClamped * Math.cos(u * Math.PI * 2.0 * rFreq + index * 1.3)
}

// Backward-compatible individual functions
export function heroY0(u, H, config) { return computeHeroWaveY(0, u, H, config) }
export function heroY1(u, H, config) { return computeHeroWaveY(1, u, H, config) }
export function heroY2(u, H, config) { return computeHeroWaveY(2, u, H, config) }
export function heroY3(u, H, config) { return computeHeroWaveY(3, u, H, config) }
export function heroZ(i, u, H, config) { return computeHeroWaveZ(i, u, H, config) }

export const HERO_FUNCS = [heroY0, heroY1, heroY2, heroY3]

/**
 * 6-pass micro-offset additive glow bundle for each Hero Wave.
 * Renders smooth optical fiber aura rather than a jagged 1px wire.
 */
const HERO_AURA_OFFSETS = [
  { dy: 0.012, dz: 0.010 },
  { dy: -0.012, dz: -0.010 },
  { dy: 0.024, dz: 0.018 },
  { dy: -0.024, dz: -0.018 },
  { dy: 0.038, dz: -0.024 },
  { dy: -0.038, dz: 0.024 },
]

/**
 * Phase 2 Animation Parameter Table.
 */
export const WIRE_ANIMATION_PARAMS = {
  0: { phase: 0.0, amplitude: 0.14, freq: 1.25, speed: 0.75 },
  1: { phase: 3.14, amplitude: 0.14, freq: 1.25, speed: 0.75 },
  2: { phase: 1.57, amplitude: 0.16, freq: 1.15, speed: 0.70 },
  3: { phase: 4.71, amplitude: 0.13, freq: 1.30, speed: 0.72 },
}

/**
 * Parameterized line geometry builder for animation-ready BufferGeometries.
 */
class ParameterizedLineBuilder {
  constructor(innerFade = 0.04, outerFade = 0.15) {
    this.innerFade = innerFade
    this.outerFade = outerFade
    this.positions = []
    this.basePositions = []
    this.uParams = []
    this.wireIds = []
    this.weights = []
    this.alphas = []
    this.colors = []
  }

  addSegment(p1, u1, wireId1, w1, p2, u2, wireId2, w2, a1 = null, a2 = null, c1 = null, c2 = null, maxU = 1.0) {
    const alpha1 = a1 !== null ? a1 : computeVertexAlpha(u1, this.innerFade, this.outerFade, maxU)
    const alpha2 = a2 !== null ? a2 : computeVertexAlpha(u2, this.innerFade, this.outerFade, maxU)

    this.positions.push(p1.x, p1.y, p1.z)
    this.basePositions.push(p1.x, p1.y, p1.z)
    this.uParams.push(u1)
    this.wireIds.push(wireId1)
    this.weights.push(w1)
    this.alphas.push(alpha1)

    this.positions.push(p2.x, p2.y, p2.z)
    this.basePositions.push(p2.x, p2.y, p2.z)
    this.uParams.push(u2)
    this.wireIds.push(wireId2)
    this.weights.push(w2)
    this.alphas.push(alpha2)

    if (c1 && c2) {
      this.colors.push(c1.r, c1.g, c1.b)
      this.colors.push(c2.r, c2.g, c2.b)
    }
  }

  buildGeometry() {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    geo.setAttribute('aBasePos', new THREE.Float32BufferAttribute(this.basePositions, 3))
    geo.setAttribute('aU', new THREE.Float32BufferAttribute(this.uParams, 1))
    geo.setAttribute('aWireId', new THREE.Float32BufferAttribute(this.wireIds, 1))
    geo.setAttribute('aWeight', new THREE.Float32BufferAttribute(this.weights, 1))
    geo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(this.alphas, 1))
    if (this.colors.length > 0) {
      geo.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3))
    }
    geo.userData = { isAnimationReady: true, wireParams: WIRE_ANIMATION_PARAMS }
    return geo
  }
}

/**
 * Parameterized points geometry builder for animation-ready Nodes & Particles.
 */
class ParameterizedPointsBuilder {
  constructor() {
    this.positions = []
    this.basePositions = []
    this.uParams = []
    this.wireIds = []
    this.weights = []
    this.sizes = []
    this.alphas = []
    this.colors = []
  }

  addPoint(p, u, wireId, w, size = 1.0, alpha = 1.0, color = null) {
    this.positions.push(p.x, p.y, p.z)
    this.basePositions.push(p.x, p.y, p.z)
    this.uParams.push(u)
    this.wireIds.push(wireId)
    this.weights.push(w)
    this.sizes.push(size)
    this.alphas.push(alpha)
    if (color) {
      this.colors.push(color.r, color.g, color.b)
    }
  }

  buildGeometry(includeSizeAndAlpha = false, includeColors = false) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3))
    geo.setAttribute('aBasePos', new THREE.Float32BufferAttribute(this.basePositions, 3))
    geo.setAttribute('aU', new THREE.Float32BufferAttribute(this.uParams, 1))
    geo.setAttribute('aWireId', new THREE.Float32BufferAttribute(this.wireIds, 1))
    geo.setAttribute('aWeight', new THREE.Float32BufferAttribute(this.weights, 1))
    if (includeSizeAndAlpha) {
      geo.setAttribute('size', new THREE.Float32BufferAttribute(this.sizes, 1))
      geo.setAttribute('alpha', new THREE.Float32BufferAttribute(this.alphas, 1))
    }
    if (includeColors && this.colors.length > 0) {
      geo.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3))
    }
    geo.userData = { isAnimationReady: true, wireParams: WIRE_ANIMATION_PARAMS }
    return geo
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. COMPANION SILK STRANDS BUNDLED ALONG HERO WAVES (ZERO HAMMOCK NET!)
// 11 companion silk strands per Hero Wave (44 total per side).
// NEVER bridges across to the opposite Hero Wave — keeps almond eye dark & open!
// Organic trailing lengths at outer ends for natural silk flexibility.
// ─────────────────────────────────────────────────────────────────────────────

function generateCompanionSilkStrands(side, H, config = {}) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const N_SILK = 180
  const innerFade = config.innerFade !== undefined ? config.innerFade : 0.04
  const outerFade = config.outerFade !== undefined ? config.outerFade : 0.15
  const outerFlex = config.outerFlexibility !== undefined ? config.outerFlexibility : 1.0
  const strandSpread = config.strandSpread !== undefined ? config.strandSpread : 1.0
  const stringCount = config.stringCount !== undefined ? Math.max(2, Math.min(32, Math.round(config.stringCount))) : 11
  const stringWidth = config.stringWidth !== undefined ? Math.max(0.1, config.stringWidth) : 1.0
  const builder = new ParameterizedLineBuilder(innerFade, outerFade)

  for (let i = 0; i < 4; i++) {
    for (let k = 0; k < stringCount; k++) {
      const spreadSign = (k % 2 === 0 ? 1.0 : -1.0)
      const kFrac = stringCount > 1 ? k / (stringCount - 1) : 0.5
      const radialSpread = (0.03 + 0.13 * kFrac) * spreadSign * strandSpread * stringWidth
      const freq_k = 1.3 + (k % 4) * 0.45
      const phase_k = (k * 2.0 * Math.PI) / stringCount + i * 0.8
      const strandAlpha = (0.16 + 0.18 * ((k % 5) / 4.0)) * Math.min(1.5, 0.7 + 0.3 * stringWidth)

      // Organic staggered tip extensions so outer ends trail off like real silk fibers:
      const staggerFrac = ((k * 7 + i * 3) % 13) / 12.0 // [0.0, 1.0]
      const strandMaxU = 1.0 + (staggerFrac * 0.16 - 0.04) * outerFlex

      let hexColor
      if (i === 2) {
        // Violet hero companion strands: Violet (#9d30ff) & Royal-Blue (#0a52ff)
        hexColor = (k % 2 === 0 ? '#9d30ff' : '#0a52ff')
      } else if (i === 3) {
        // Counter-braid companion strands: Electric Blue (#1068ff) & Cyan (#30d5ff)
        hexColor = (k % 2 === 0 ? '#1068ff' : '#30d5ff')
      } else {
        // Hero 0 & 1 companion strands: Cyan (#30d5ff) & Royal-Blue (#0a52ff)
        hexColor = (k % 2 === 0 ? '#30d5ff' : '#0a52ff')
      }
      const color = new THREE.Color(hexColor)

      let prevPt = null
      let prevU = null

      for (let s = 0; s < N_SILK; s++) {
        const u = (s / (N_SILK - 1)) * strandMaxU
        const x = sign * 10.0 * u
        const e = env(u, H)
        // Soft tip taper for Ribbon 1 companion silk strands to prevent outer tangling/bunching:
        const tipTaper = i === 0 ? (1.0 - 0.35 * THREE.MathUtils.smootherstep(u, 0.75, strandMaxU)) : 1.0
        const y = HERO_FUNCS[i](u, H, config) + e * (radialSpread * tipTaper * Math.sin(u * Math.PI * freq_k + phase_k))
        const z = heroZ(i, u, H, config) + e * (0.08 * stringWidth * tipTaper * Math.cos(u * Math.PI * freq_k + phase_k))
        const pt = new THREE.Vector3(x, y, z)
        const w = computeConstraintWeight(u)

        if (prevPt) {
          const a1 = strandAlpha * computeVertexAlpha(prevU, innerFade, outerFade, strandMaxU)
          const a2 = strandAlpha * computeVertexAlpha(u, innerFade, outerFade, strandMaxU)
          builder.addSegment(
            prevPt,
            prevU,
            10 + i * 11 + k,
            w,
            pt,
            u,
            10 + i * 11 + k,
            w,
            a1,
            a2,
            color,
            color,
            strandMaxU
          )
        }
        prevPt = pt
        prevU = u
      }
    }
  }

  return builder.buildGeometry()
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 3D NEURAL TRIANGULATION MESH & 65 GRAPH NODES (DARK ALMOND LOBE INTERIOR)
// 65 Nodes distributed in almond chamber & outer halo.
// Connected to 2-3 nearest neighbors strictly within d < 0.28 * H.
// ─────────────────────────────────────────────────────────────────────────────

function generate3DNeuralTriangulation(side, H, prng, config = {}) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const innerFade = config.innerFade !== undefined ? config.innerFade : 0.04
  const nodes = []

  // Generate 65 Graph Nodes inside u in [0.18, 0.95]
  for (let i = 0; i < 65; i++) {
    const uNorm = i / 64.0
    // Stratified distribution along u
    const u = 0.20 + uNorm * (0.92 - 0.20) + (prng() - 0.5) * 0.03
    const clampedU = Math.min(0.95, Math.max(0.18, u))
    const yA = heroY0(clampedU, H, config)
    const yB = heroY1(clampedU, H, config)
    const yMin = Math.min(yA, yB)
    const yMax = Math.max(yA, yB)
    const gap = Math.max(0.04, yMax - yMin)

    let y
    if (i < 48) {
      // 48 Interior nodes inside the open almond eye & lobe volume
      const t = 0.12 + 0.76 * prng()
      y = yMin + t * gap
    } else {
      // 17 Peripheral nodes in the outer halo
      const pickTop = prng() > 0.5
      y = (pickTop ? yMax : yMin) + (prng() - 0.5) * 0.12 * H
    }
    const x = sign * 10.0 * clampedU
    const z = (prng() - 0.5) * 0.35 * H

    nodes.push({
      id: i,
      pos: new THREE.Vector3(x, y, z),
      u: clampedU,
      weight: computeConstraintWeight(clampedU),
    })
  }

  // Connect each node to 2-3 nearest neighbors within d < 0.28 * H
  const maxRadius = 0.28 * H
  const edgeSet = new Set()
  const edges = []

  for (let i = 0; i < nodes.length; i++) {
    const nA = nodes[i]
    const candidates = []

    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue
      const nB = nodes[j]
      const dist = nA.pos.distanceTo(nB.pos)
      if (dist < maxRadius && dist > 0.01) {
        candidates.push({ j, dist })
      }
    }

    candidates.sort((a, b) => a.dist - b.dist)
    const connectCount = Math.min(3, candidates.length)
    for (let c = 0; c < connectCount; c++) {
      const j = candidates[c].j
      const key = Math.min(i, j) + '-' + Math.max(i, j)
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        edges.push({ i, j, dist: candidates[c].dist })
      }
    }
  }

  // Build LineSegments geometry for delicate geometric neural triangles (opacity: 0.18)
  const lineBuilder = new ParameterizedLineBuilder(innerFade)
  const lineColor = new THREE.Color('#0a52ff').lerp(new THREE.Color('#30d5ff'), 0.45)

  edges.forEach(({ i, j }) => {
    const nA = nodes[i]
    const nB = nodes[j]
    lineBuilder.addSegment(
      nA.pos,
      nA.u,
      70,
      nA.weight,
      nB.pos,
      nB.u,
      70,
      nB.weight,
      0.18,
      0.18,
      lineColor,
      lineColor
    )
  })
  const triangulationGeo = lineBuilder.buildGeometry()

  // Build Points geometry for the 65 crisp glowing neural nodes
  const pointsBuilder = new ParameterizedPointsBuilder()
  const nodeColor = new THREE.Color('#30d5ff')

  nodes.forEach((n) => {
    pointsBuilder.addPoint(n.pos, n.u, 75, n.weight, 0.22, 0.85, nodeColor)
  })
  const nodesGeo = pointsBuilder.buildGeometry(true, true)

  return { triangulationGeo, nodesGeo, rawNodes: nodes }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SWEEPING OUTER BEADED DOT-ARCS & SOFT BOKEH CIRCLES
// 5 independent sweeping outer arcs WELL OUTSIDE the main waves.
// 75 small, softly glowing cyan/blue dots along each arc (opacity: 0.55).
// 25 large, very low-opacity (0.08–0.18) out-of-focus bokeh circles.
// 5-6 exact curve-crossing flares strictly on intersections for u >= 0.35.
// ─────────────────────────────────────────────────────────────────────────────

function generate5SweepingOuterBeadedStreams(side, H, config = {}) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const N_DOTS = 75
  const innerFade = config.innerFade !== undefined ? config.innerFade : 0.04
  const pointsBuilder = new ParameterizedPointsBuilder()
  const beadColor = new THREE.Color('#30d5ff').lerp(new THREE.Color('#0055ff'), 0.35)

  // 5 outer arc definitions
  const arcConfigs = [
    // Arc 0: High upper canopy arc well above top wave
    {
      calcY: (u) => heroY0(u, H, config) + (0.28 + 0.35 * u) * H + 0.04 * H * Math.sin(u * Math.PI * 2.2),
      calcZ: (u) => heroZ(0, u, H, config) + 0.08 * Math.cos(u * Math.PI * 2.0),
      wireId: 80,
    },
    // Arc 1: Mid-high upper canopy arc
    {
      calcY: (u) => heroY0(u, H, config) + (0.20 + 0.26 * u) * H + 0.03 * H * Math.cos(u * Math.PI * 2.6),
      calcZ: (u) => heroZ(0, u, H, config) + 0.05 * Math.sin(u * Math.PI * 2.2),
      wireId: 81,
    },
    // Arc 2: Deep lower root arc well below bottom wave
    {
      calcY: (u) => heroY1(u, H, config) - (0.28 + 0.35 * u) * H - 0.04 * H * Math.cos(u * Math.PI * 2.2),
      calcZ: (u) => heroZ(1, u, H, config) - 0.08 * Math.cos(u * Math.PI * 2.0),
      wireId: 82,
    },
    // Arc 3: Mid-deep lower root arc
    {
      calcY: (u) => heroY1(u, H, config) - (0.20 + 0.26 * u) * H - 0.03 * H * Math.sin(u * Math.PI * 2.6),
      calcZ: (u) => heroZ(1, u, H, config) - 0.05 * Math.sin(u * Math.PI * 2.2),
      wireId: 83,
    },
    // Arc 4: Outer flaring canopy arc
    {
      calcY: (u) => (u < 0.58 ? heroY0(u, H, config) : heroY1(u, H, config)) + (0.35 + 0.40 * u) * H,
      calcZ: (u) => 0.10 * H * Math.sin(u * Math.PI * 2.4),
      wireId: 84,
    },
  ]

  arcConfigs.forEach(({ calcY, calcZ, wireId }) => {
    for (let idx = 0; idx < N_DOTS; idx++) {
      const t = idx / (N_DOTS - 1)
      const u = 0.22 + t * (0.98 - 0.22)
      const x = sign * 10.0 * u
      const y = calcY(u)
      const z = calcZ(u)
      const weight = computeConstraintWeight(u)
      const feather = computeVertexAlpha(u, innerFade)

      // Fading at both ends: Math.sin(t * PI)
      const fade = Math.sin(t * Math.PI)
      const alpha = 0.55 * fade * feather
      const size = 0.26 * (0.80 + 0.40 * fade)

      pointsBuilder.addPoint(
        new THREE.Vector3(x, y, z),
        u,
        wireId,
        weight,
        size,
        alpha,
        beadColor
      )
    }
  })

  return pointsBuilder.buildGeometry(true, true)
}

function generate25BackgroundBokehCircles(side, H, prng) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const pointsBuilder = new ParameterizedPointsBuilder()
  const bokehColor = new THREE.Color('#0048ff')

  for (let b = 0; b < 25; b++) {
    const u = 0.24 + (b / 24.0) * (0.98 - 0.24)
    const feather = computeVertexAlpha(u)
    const weight = computeConstraintWeight(u)

    const x = sign * (10.0 * u + (prng() - 0.5) * 0.40)
    const y = (prng() - 0.5) * 1.6 * H
    const z = -0.38 - prng() * 0.35

    const size = 0.45 + prng() * 0.30
    const alpha = (0.08 + prng() * 0.10) * feather

    pointsBuilder.addPoint(
      new THREE.Vector3(x, y, z),
      u,
      90,
      weight,
      size,
      alpha,
      bokehColor
    )
  }

  return pointsBuilder.buildGeometry(true, true)
}

function get6ExactCurveCrossingFlares(side, H, config = {}) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const innerFade = config.innerFade !== undefined ? config.innerFade : 0.04

  // Exact mathematical intersection coordinates of Hero Waves 0, 1, 2, 3 for u >= 0.35:
  const crossings = [
    { u: 0.565, y: heroY0(0.565, H, config), z: heroZ(0, 0.565, H, config) }, // Hero 0 & Hero 1 (Primary Pinch)
    { u: 0.415, y: heroY0(0.415, H, config), z: heroZ(0, 0.415, H, config) }, // Hero 0 & Hero 3
    { u: 0.526, y: heroY1(0.526, H, config), z: heroZ(1, 0.526, H, config) }, // Hero 1 & Hero 2
    { u: 0.620, y: heroY1(0.620, H, config), z: heroZ(1, 0.620, H, config) }, // Hero 1 & Hero 3
    { u: 0.706, y: heroY0(0.706, H, config), z: heroZ(0, 0.706, H, config) }, // Hero 0 & Hero 2
    { u: 0.842, y: heroY2(0.842, H, config), z: heroZ(2, 0.842, H, config) }, // Hero 2 & Hero 3
  ]

  const pointsBuilder = new ParameterizedPointsBuilder()

  crossings.forEach(({ u, y, z }, idx) => {
    const x = sign * 10.0 * u
    const weight = computeConstraintWeight(u)
    const feather = computeVertexAlpha(u, innerFade)
    pointsBuilder.addPoint(
      new THREE.Vector3(x, y, z),
      u,
      idx,
      weight,
      1.0,
      feather
    )
  })

  return pointsBuilder.buildGeometry(true, false)
}

function generate900PinpointStardust(side, H, prng, config = {}) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const STARDUST_COUNT = 900
  const innerFade = config.innerFade !== undefined ? config.innerFade : 0.04
  const pointsBuilder = new ParameterizedPointsBuilder()

  const colorPalette = [
    new THREE.Color('#1068ff'), // Electric Royal-Blue
    new THREE.Color('#0055ff'), // Deep Royal-Blue
    new THREE.Color('#30d5ff'), // Bright Cyan
    new THREE.Color('#00d8ff'), // Electric Cyan
    new THREE.Color('#9d30ff'), // Vibrant Violet
    new THREE.Color('#c084fc'), // Lavender Violet
    new THREE.Color('#e0ffff'), // Crisp White-Cyan
  ]

  for (let p = 0; p < STARDUST_COUNT; p++) {
    const u = 0.20 + prng() * (0.98 - 0.20)
    const curveId = Math.floor(prng() * 4)
    const yBase = HERO_FUNCS[curveId](u, H, config)
    const zBase = heroZ(curveId, u, H, config)

    const r1 = prng()
    const r2 = prng()
    const gaussY = Math.sqrt(-2.0 * Math.log(Math.max(1e-5, r1))) * Math.cos(2.0 * Math.PI * r2)
    const gaussZ = Math.sqrt(-2.0 * Math.log(Math.max(1e-5, r1))) * Math.sin(2.0 * Math.PI * r2)

    const x = sign * (10.0 * u + (prng() - 0.5) * 0.08)
    const y = yBase + gaussY * 0.07 * H
    const z = zBase + gaussZ * 0.07 * H

    const weight = computeConstraintWeight(u)
    const feather = computeVertexAlpha(u, innerFade)

    // Tiny 1.0px - 2.2px pinpoint stardust
    const size = (0.16 + prng() * 0.14) * (0.5 + 0.5 * feather)
    const alpha = (0.55 + prng() * 0.45) * feather
    const color = colorPalette[Math.floor(prng() * colorPalette.length)]

    pointsBuilder.addPoint(
      new THREE.Vector3(x, y, z),
      u,
      curveId,
      weight,
      size,
      alpha,
      color
    )
  }

  return pointsBuilder.buildGeometry(true, true)
}

/**
 * Generates all graph-based animation-ready geometries for one side ('left' or 'right'),
 * supporting live parametric adjustments from the wireframe controller.
 *
 * @param {'left' | 'right'} side
 * @param {object} [config]
 */
export function generateSideWireData(side, config = {}) {
  const prng = createPrng(7771)
  const graph = new NeuralWireGraph(side)
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const H = H_VAL
  const N_HERO = 240
  const innerFade = config.innerFade !== undefined ? config.innerFade : 0.04
  const outerFade = config.outerFade !== undefined ? config.outerFade : 0.15
  const outerFlex = config.outerFlexibility !== undefined ? config.outerFlexibility : 1.0

  // 1. Build smooth continuous Hero Wave paths (N = 240 points per wave) with organic staggered outer tips
  const heroStrands = []
  for (let i = 0; i < 4; i++) {
    const pts = []
    const heroMaxU = 1.0 + ([0.05, 0.02, 0.07, 0.04][i] ?? 0.0) * outerFlex
    for (let s = 0; s < N_HERO; s++) {
      const u = (s / (N_HERO - 1)) * heroMaxU
      const x = sign * 10.0 * u
      const y = HERO_FUNCS[i](u, H, config)
      const z = heroZ(i, u, H, config)
      pts.push(new THREE.Vector3(x, y, z))
    }
    heroStrands.push({ wireId: i, pts, maxU: heroMaxU })
    graph.primaryFilamentPaths.push({ wireId: i, length: pts.length })
  }

  // 2. 6-pass micro-offset additive glow bundle builder for Hero Waves
  function buildCoreLineGeo(strandList) {
    const builder = new ParameterizedLineBuilder(innerFade, outerFade)
    strandList.forEach(({ wireId, pts, maxU = 1.0 }) => {
      const count = pts.length
      for (let i = 0; i < count - 1; i++) {
        const u1 = (i / (count - 1)) * maxU
        const u2 = ((i + 1) / (count - 1)) * maxU
        const w1 = computeConstraintWeight(u1)
        const w2 = computeConstraintWeight(u2)
        builder.addSegment(pts[i], u1, wireId, w1, pts[i + 1], u2, wireId, w2, null, null, null, null, maxU)
      }
    })
    return builder.buildGeometry()
  }

  function buildOffsetAuraLineGeo(strandList, offsets) {
    const builder = new ParameterizedLineBuilder(innerFade, outerFade)
    strandList.forEach(({ wireId, pts, maxU = 1.0 }) => {
      const count = pts.length
      offsets.forEach(({ dy, dz }) => {
        for (let i = 0; i < count - 1; i++) {
          const u1 = (i / (count - 1)) * maxU
          const u2 = ((i + 1) / (count - 1)) * maxU
          const w1 = computeConstraintWeight(u1)
          const w2 = computeConstraintWeight(u2)
          const p1 = new THREE.Vector3(pts[i].x, pts[i].y + dy, pts[i].z + dz)
          const p2 = new THREE.Vector3(pts[i + 1].x, pts[i + 1].y + dy, pts[i + 1].z + dz)
          builder.addSegment(p1, u1, wireId, w1, p2, u2, wireId, w2, null, null, null, null, maxU)
        }
      })
    })
    return builder.buildGeometry()
  }

  // Hero Waves 0, 1, 3: Cyan-White Core & 6-Pass Royal-Blue (#0048ff) Aura
  const stringWidth = config.stringWidth !== undefined ? Math.max(0.1, config.stringWidth) : 1.0
  const auraOffsets = HERO_AURA_OFFSETS.map(({ dy, dz }) => ({
    dy: dy * stringWidth,
    dz: dz * stringWidth,
  }))
  const cyanBlueStrands = [heroStrands[0], heroStrands[1], heroStrands[3]]
  const primaryCoreGeo = buildCoreLineGeo(cyanBlueStrands)
  const primaryHaloGeo = buildOffsetAuraLineGeo(cyanBlueStrands, auraOffsets)

  // Hero Wave 2: Violet/Magenta (#b83dff) Core & 6-Pass Violet Aura
  const violetStrand = [heroStrands[2]]
  const secondaryGeo = buildCoreLineGeo(violetStrand)
  const depthGeo = buildOffsetAuraLineGeo(violetStrand, auraOffsets)

  // 3. Companion Silk Strands bundled tightly along Hero Waves (ZERO HAMMOCK NET!)
  const subFilamentsGeo = generateCompanionSilkStrands(side, H, config)

  // 4. 3D Neural Triangulation Mesh & 65 Graph Nodes inside the dark almond chamber
  const { triangulationGeo: constellationGeo, nodesGeo: intersectionNodesGeo, rawNodes } =
    generate3DNeuralTriangulation(side, H, prng, config)

  rawNodes.forEach((n) => {
    graph.addNode(new GraphNode({
      id: `${side}_node_${n.id}`,
      position: n.pos,
      u: n.u,
      wireId: 75,
      weight: n.weight,
      tier: 'intersection',
      depthLayer: n.pos.z >= 0.05 ? 'fg' : 'mid',
    }))
  })

  // 5. 5 Sweeping Outer Beaded Dot-Streams floating well outside the main waves
  const beadedStreamsGeo = generate5SweepingOuterBeadedStreams(side, H, config)

  // 6. 25 Soft Out-of-Focus Background Bokeh Discs
  const bokehGeo = generate25BackgroundBokehCircles(side, H, prng)

  // 7. 6 Exact Curve-Crossing Flares strictly on Hero wave intersections
  const focalFlaresGeo = get6ExactCurveCrossingFlares(side, H, config)

  // 8. 900 Tiny Pinpoint Stardust Specks
  const stardustGeo = generate900PinpointStardust(side, H, prng, config)

  // Canonical graph exports
  const canonicalModel = graph.exportCanonicalModel()
  primaryCoreGeo.userData.graphModel = canonicalModel
  constellationGeo.userData.graphModel = canonicalModel

  return {
    primaryCoreGeo,
    primaryHaloGeo,
    primaryFgGeo: primaryCoreGeo,
    secondaryGeo,
    secondaryFgGeo: secondaryGeo,
    depthGeo,
    primaryBgGeo: depthGeo,
    secondaryBgGeo: depthGeo,
    subFilamentsGeo,
    tertiaryGeo: subFilamentsGeo,
    beadedStreamsGeo,
    constellationGeo,
    primaryConnectionsGeo: constellationGeo,
    backgroundConnectionsGeo: constellationGeo,
    focalFlaresGeo,
    heroNodesGeo: focalFlaresGeo,
    intersectionNodesGeo,
    connectionNodesGeo: intersectionNodesGeo,
    stardustGeo,
    particlesGeo: stardustGeo,
    bokehGeo,
    graph,
  }
}

/**
 * Module-level deterministic geometry cache with LRU cleanup to prevent leaks.
 */
const cachedGeometryMap = new Map()

export function getGeometryCacheKey(side, config = {}) {
  const amp = (config.amplitude !== undefined ? config.amplitude : 1.0).toFixed(2)
  const freq = (config.frequency !== undefined ? config.frequency : 1.0).toFixed(2)
  const sweep = (config.wingSweep !== undefined ? config.wingSweep : 0.28).toFixed(2)
  const innerY = (config.innerYOffset !== undefined ? config.innerYOffset : 0.0).toFixed(2)
  const outerY = (config.outerYOffset !== undefined ? config.outerYOffset : 0.0).toFixed(2)
  const zAmp = (config.zAmplitude !== undefined ? config.zAmplitude : 1.0).toFixed(2)
  const strandSpread = (config.strandSpread !== undefined ? config.strandSpread : 1.0).toFixed(2)
  const innerFade = (config.innerFade !== undefined ? config.innerFade : 0.04).toFixed(2)
  const strCount = (config.stringCount !== undefined ? config.stringCount : 11)
  const strWidth = (config.stringWidth !== undefined ? config.stringWidth : 1.0).toFixed(2)

  const r1Amp = (config.ribbon1Amp !== undefined ? config.ribbon1Amp : 1.0).toFixed(2)
  const r2Amp = (config.ribbon2Amp !== undefined ? config.ribbon2Amp : 1.0).toFixed(2)
  const r3Amp = (config.ribbon3Amp !== undefined ? config.ribbon3Amp : 1.0).toFixed(2)
  const r4Amp = (config.ribbon4Amp !== undefined ? config.ribbon4Amp : 1.0).toFixed(2)

  const r1Y = (config.ribbon1YOffset !== undefined ? config.ribbon1YOffset : 0.0).toFixed(2)
  const r2Y = (config.ribbon2YOffset !== undefined ? config.ribbon2YOffset : 0.0).toFixed(2)
  const r3Y = (config.ribbon3YOffset !== undefined ? config.ribbon3YOffset : 0.0).toFixed(2)
  const r4Y = (config.ribbon4YOffset !== undefined ? config.ribbon4YOffset : 0.0).toFixed(2)

  const r1F = (config.ribbon1Freq !== undefined ? config.ribbon1Freq : 1.0).toFixed(2)
  const r2F = (config.ribbon2Freq !== undefined ? config.ribbon2Freq : 1.0).toFixed(2)
  const r3F = (config.ribbon3Freq !== undefined ? config.ribbon3Freq : 1.0).toFixed(2)
  const r4F = (config.ribbon4Freq !== undefined ? config.ribbon4Freq : 1.0).toFixed(2)

  const oFlex = (config.outerFlexibility !== undefined ? config.outerFlexibility : 1.0).toFixed(2)
  const oFlare = (config.outerFlare !== undefined ? config.outerFlare : 0.6).toFixed(2)
  const oFade = (config.outerFade !== undefined ? config.outerFade : 0.15).toFixed(2)
  const oZ = (config.outerZOffset !== undefined ? config.outerZOffset : 0.0).toFixed(2)

  const d01 = (config.distRibbon01 !== undefined ? config.distRibbon01 : 0.0).toFixed(2)
  const d12 = (config.distRibbon12 !== undefined ? config.distRibbon12 : 0.0).toFixed(2)
  const d23 = (config.distRibbon23 !== undefined ? config.distRibbon23 : 0.0).toFixed(2)
  const spOuter = (config.ribbonSpacingOuter !== undefined ? config.ribbonSpacingOuter : 1.0).toFixed(2)
  const spInner = (config.ribbonSpacingInner !== undefined ? config.ribbonSpacingInner : 1.0).toFixed(2)

  return `v11:${side}:${amp}:${freq}:${sweep}:${innerY}:${outerY}:${zAmp}:${strandSpread}:${innerFade}:${strCount}:${strWidth}:${r1Amp}:${r2Amp}:${r3Amp}:${r4Amp}:${r1Y}:${r2Y}:${r3Y}:${r4Y}:${r1F}:${r2F}:${r3F}:${r4F}:${oFlex}:${oFlare}:${oFade}:${oZ}:${d01}:${d12}:${d23}:${spOuter}:${spInner}`
}

export function getSideWireData(side, config = {}) {
  const key = getGeometryCacheKey(side, config)
  if (!cachedGeometryMap.has(key)) {
    // Keep at most 16 entries in cache to bound GPU memory
    if (cachedGeometryMap.size > 16) {
      const oldestKey = cachedGeometryMap.keys().next().value
      const oldData = cachedGeometryMap.get(oldestKey)
      if (oldData) {
        Object.values(oldData).forEach((v) => {
          if (v && typeof v.dispose === 'function') v.dispose()
        })
      }
      cachedGeometryMap.delete(oldestKey)
    }
    cachedGeometryMap.set(key, generateSideWireData(side, config))
  }
  return cachedGeometryMap.get(key)
}

/**
 * Programmatic soft radial glow texture.
 */
export function createGlowTexture(size = 64) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const center = size / 2

  const grad = ctx.createRadialGradient(center, center, 0, center, center, center)
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)')
  grad.addColorStop(0.18, 'rgba(255, 255, 255, 0.88)')
  grad.addColorStop(0.42, 'rgba(255, 255, 255, 0.35)')
  grad.addColorStop(0.72, 'rgba(255, 255, 255, 0.06)')
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * Programmatic radiant bloom flare texture for Curve-Crossing Flares:
 * Tiny blazing white-cyan pinpoint core (exp(-r * 18.0)) + wide soft Electric Royal-Blue halo (exp(-r * 3.5)).
 */
export function createHeroGlowTexture(size = 128) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const center = size / 2

  // 1. Soft Electric Royal-Blue halo: exp(-r * 3.5)
  const radHalo = ctx.createRadialGradient(center, center, 0, center, center, center)
  radHalo.addColorStop(0.0, 'rgba(0, 72, 255, 0.95)')
  radHalo.addColorStop(0.18, 'rgba(0, 130, 255, 0.70)')
  radHalo.addColorStop(0.38, 'rgba(0, 72, 255, 0.35)')
  radHalo.addColorStop(0.68, 'rgba(0, 40, 200, 0.10)')
  radHalo.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')
  ctx.fillStyle = radHalo
  ctx.fillRect(0, 0, size, size)

  // 2. Tiny blazing white-cyan pinpoint core: exp(-r * 18.0)
  const radCore = ctx.createRadialGradient(center, center, 0, center, center, center * 0.22)
  radCore.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)')
  radCore.addColorStop(0.20, 'rgba(220, 250, 255, 0.95)')
  radCore.addColorStop(0.45, 'rgba(100, 220, 255, 0.50)')
  radCore.addColorStop(0.80, 'rgba(0, 180, 255, 0.15)')
  radCore.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)')
  ctx.fillStyle = radCore
  ctx.fillRect(0, 0, size, size)

  // 3. Crisp horizontal glint
  const flareH = ctx.createLinearGradient(0, center, size, center)
  flareH.addColorStop(0.0, 'rgba(0, 180, 255, 0.0)')
  flareH.addColorStop(0.45, 'rgba(100, 220, 255, 0.35)')
  flareH.addColorStop(0.50, 'rgba(255, 255, 255, 0.95)')
  flareH.addColorStop(0.55, 'rgba(100, 220, 255, 0.35)')
  flareH.addColorStop(1.0, 'rgba(0, 180, 255, 0.0)')
  ctx.fillStyle = flareH
  ctx.fillRect(center * 0.2, center - 0.75, size - center * 0.4, 1.5)

  // 4. Crisp vertical glint
  const flareV = ctx.createLinearGradient(center, 0, center, size)
  flareV.addColorStop(0.0, 'rgba(0, 180, 255, 0.0)')
  flareV.addColorStop(0.45, 'rgba(100, 220, 255, 0.35)')
  flareV.addColorStop(0.50, 'rgba(255, 255, 255, 0.95)')
  flareV.addColorStop(0.55, 'rgba(100, 220, 255, 0.35)')
  flareV.addColorStop(1.0, 'rgba(0, 180, 255, 0.0)')
  ctx.fillStyle = flareV
  ctx.fillRect(center - 0.75, center * 0.2, 1.5, size - center * 0.4)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * Programmatic soft out-of-focus background bokeh disc texture.
 */
export function createBokehTexture(size = 64) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const center = size / 2

  const grad = ctx.createRadialGradient(center, center, 0, center, center, center * 0.90)
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.45)')
  grad.addColorStop(0.60, 'rgba(255, 255, 255, 0.60)')
  grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.80)')
  grad.addColorStop(0.95, 'rgba(255, 255, 255, 0.25)')
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

const cachedGlowTextures = {}
let cachedHeroTexture = null
let cachedBokehTexture = null

export function getGlowTexture(size = 64) {
  if (typeof document === 'undefined') return null
  if (!cachedGlowTextures[size]) {
    cachedGlowTextures[size] = createGlowTexture(size)
  }
  return cachedGlowTextures[size]
}

export function getHeroGlowTexture(size = 128) {
  if (typeof document === 'undefined') return null
  if (!cachedHeroTexture) {
    cachedHeroTexture = createHeroGlowTexture(size)
  }
  return cachedHeroTexture
}

export function getBokehTexture(size = 64) {
  if (typeof document === 'undefined') return null
  if (!cachedBokehTexture) {
    cachedBokehTexture = createBokehTexture(size)
  }
  return cachedBokehTexture
}
