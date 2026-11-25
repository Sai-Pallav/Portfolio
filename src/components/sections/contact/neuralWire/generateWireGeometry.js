import * as THREE from 'three'
import {
  NeuralWireGraph,
  GraphNode,
  segmentsIntersect2D,
} from './neuralGraphModel.js'
import { computeNeuralDeformationJS, SIDE_ANIMATION_CONFIG, ANIMATION_CONTRACT_VERSION, DEPTH_NORM_EPS } from './animationContract.js'
import {
  getAlmondPocketBounds,
  computeRelativeCoordArray,
  generateMarginAnchors,
} from './neuralPocketBounds.js'

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
  const innerFactor = THREE.MathUtils.smootherstep(u, 0.0, 0.20)
  const outerFactor = 1.0 - 0.15 * THREE.MathUtils.smootherstep(u, 0.90, 1.05)
  return innerFactor * outerFactor
}

/**
 * Feather fade at inner tip (near globe) and outer tip (extended outer reach):
 * Softens both endpoints so ribbons dissolve seamlessly into the cosmos rather than cutting off bluntly.
 */
export function computeOuterVertexAlpha(u, outerFade = 0.08, maxU = 1.0) {
  if (outerFade <= 0.001) return 1.0
  const end = Math.max(0.2, maxU)
  const start = end - Math.max(0.01, outerFade * end)
  return Math.pow(1.0 - THREE.MathUtils.smootherstep(u, start, end), 1.5)
}

export function computeVertexAlpha(u, innerFade = 0.04, outerFade = 0.08, maxU = 1.0) {
  const inner = THREE.MathUtils.smootherstep(u, 0.0, Math.max(0.12, innerFade))
  return inner * computeOuterVertexAlpha(u, outerFade, maxU)
}

export const N_HERO = 400
export const N_SILK = 360

export function wingSweep(u, H, sweepVal = 0.28) {
  return sweepVal * H * Math.pow(u, 2.0)
}

export const TAPER_INNER_TIGHTNESS = 0.18 // Controls inner tip tightness near globe socket (u -> 0)
export const TAPER_MID_RAMP = 1.28        // Progressive ramp (1.20 - 1.35)
export const TAPER_OUTER_CAP = 0.82       // Controls maximum outer envelope height cap within viewport
export const TAPER_SATURATION_K = 0.55    // C2-smooth outer saturation cap factor

export function env(u, H) {
  const safeU = Math.max(0.0, u)
  const innerPinch = THREE.MathUtils.smootherstep(safeU, 0.0, TAPER_INNER_TIGHTNESS)
  const midRamp = Math.pow(safeU, TAPER_MID_RAMP)
  const sat = Math.tanh(TAPER_SATURATION_K * midRamp) / Math.tanh(TAPER_SATURATION_K)
  return H * TAPER_OUTER_CAP * innerPinch * sat
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

  // Continuous C² taper from inner (spInner) to outer (spOuter)
  const tTaper = spInner + (spOuter - spInner) * THREE.MathUtils.smootherstep(uNorm, 0.0, 1.0)

  // Controlled inner connection maintaining ribbon bundle separation at the globe socket
  const tGlobe = THREE.MathUtils.smootherstep(uNorm, 0.0, 0.22)

  // Natural vertical fanning signs for global outer/inner spacing multiplier:
  // Ribbon 0: expands upward (+0.45)
  // Ribbon 1: expands downward (-0.45)
  // Ribbon 2: expands downward-mid (-0.20)
  // Ribbon 3: expands upward-mid (+0.20)
  const fanSigns = [0.45, -0.45, -0.20, 0.20]
  const sign = fanSigns[index] ?? 0.0
  const fanMultiplier = (spInner - 1.0) + ((spOuter - 1.0) - (spInner - 1.0)) * THREE.MathUtils.smootherstep(uNorm, 0.10, 1.0)
  const globalFan = fanMultiplier * sign * H

  return (pairwiseDy * tTaper + globalFan) * tGlobe
}

const HERO_PHASES = [0, Math.PI, 0.5 * Math.PI, 1.5 * Math.PI]
export const HERO_SCALE = 0.46
const HERO_Y_SCALES = [HERO_SCALE, HERO_SCALE, HERO_SCALE, HERO_SCALE]
const HERO_FLARE_SIGNS = [0.85, -0.85, -0.45, 0.45]
const BEAD_PARENTS = [0, 0, 1, 1, 2]
const heroProfileScratch = new Float64Array(5)

/** Build-time analytic profile: [biasY, biasZ, amplitudeY, amplitudeZ, phase]. */
export function getHeroWaveProfile(index, u, H, config, out) {
  const rAmp = config[`ribbon${index + 1}Amp`] ?? 1.0
  let rY = config[`ribbon${index + 1}YOffset`] ?? 0.0
  // Symmetrically balance Ribbon 3 (Violet Accent, index 2) with Ribbon 4 (+0.04) and Arch Pair center (+0.010).
  // Historically defaulted to -0.10, which dragged the violet accent into a downward tilt and clumped with Ribbon 2.
  if (index === 2 && (rY === -0.1 || config.ribbon3YOffset === undefined)) {
    rY = -0.02
  }
  const outerT = THREE.MathUtils.smootherstep(u, 0.48, 1.0)
  const e = env(u, H) * (1.0 + 0.15 * (config.outerFlexibility ?? 1.0) * outerT)
  out[0] = wingSweep(u, H, config.wingSweep ?? 0.28)
    + (1.0 - THREE.MathUtils.smootherstep(u, 0.0, 0.35)) * (config.innerYOffset ?? 0)
    + THREE.MathUtils.smootherstep(u, 0.25, 1.0) * (config.outerYOffset ?? 0)
    + rY * THREE.MathUtils.smootherstep(u, 0.0, 0.22)
    + outerT * outerT * 0.28 * H * (config.outerFlare ?? 0.6) * HERO_FLARE_SIGNS[index]
    + computeRibbonSpacingOffset(index, u, H, config)
  out[1] = THREE.MathUtils.smootherstep(u, 0.30, 1.0) * (config.outerZOffset ?? 0)
  out[2] = e * (config.amplitude ?? 1.0) * HERO_Y_SCALES[index] * rAmp
  out[3] = e * (config.zAmplitude ?? 1.0) * 0.22 * Math.min(1.2, rAmp)
  out[4] = 2.5 * Math.PI * (config.frequency ?? 1.0) * u + HERO_PHASES[index]
  return out
}

export function computeHeroWaveY(index, u, H, config = {}) {
  const p = getHeroWaveProfile(index, u, H, config, heroProfileScratch)
  return p[0] + p[2] * Math.sin(p[4])
}

export function computeHeroWaveZ(index, u, H, config = {}) {
  const p = getHeroWaveProfile(index, u, H, config, heroProfileScratch)
  return p[1] + p[3] * Math.cos(p[4])
}

/** Harmonic coefficients for P(t) = P(0) + C(cos(wt)-1) + S sin(wt). */
export function getHeroMotion(index, u, H, config, cosOut, sinOut, offset = 0) {
  const p = getHeroWaveProfile(index, u, H, config, heroProfileScratch)
  const s = Math.sin(p[4]), c = Math.cos(p[4])
  cosOut[offset] = 0
  cosOut[offset + 1] = p[2] * s
  cosOut[offset + 2] = p[3] * c
  sinOut[offset] = 0
  sinOut[offset + 1] = -p[2] * c
  sinOut[offset + 2] = p[3] * s
}

/** Shared non-oscillating frame; independent of instantaneous strand crossings. */
export function getSharedWaveFrame(u, H, config, out, offset = 0) {
  let y = 0, z = 0, ry2 = 0, rz2 = 0
  for (let i = 0; i < 4; i++) {
    const p = getHeroWaveProfile(i, u, H, config, heroProfileScratch)
    y += p[0]
    z += p[1]
    ry2 += p[2] * p[2]
    rz2 += p[3] * p[3]
  }
  out[offset] = y * 0.25
  out[offset + 1] = z * 0.25
  out[offset + 2] = Math.sqrt(0.25 * ry2 + 0.08 * 0.08)
  out[offset + 3] = Math.sqrt(0.25 * rz2 + 0.06 * 0.06)
  return out
}

// Backward-compatible individual functions
export function heroY0(u, H, config) { return computeHeroWaveY(0, u, H, config) }
export function heroY1(u, H, config) { return computeHeroWaveY(1, u, H, config) }
export function heroY2(u, H, config) { return computeHeroWaveY(2, u, H, config) }
export function heroY3(u, H, config) { return computeHeroWaveY(3, u, H, config) }
export function heroZ(i, u, H, config) { return computeHeroWaveZ(i, u, H, config) }

export const HERO_FUNCS = [heroY0, heroY1, heroY2, heroY3]

/** The dominant harmonic of each existing hero ribbon, evaluated at build time. */
export function getTravelProfile(index, u, H, config, out) {
  const p = getHeroWaveProfile(index, u, H, config, heroProfileScratch)
  out[0] = p[2]
  out[1] = p[4]
  return out
}

/** Bake the wave phase for cores, auras, silk, beads, and stardust. */
export function addTravelFlowAttributes(geometry, H, config, kind = 'hero') {
  if (!geometry?.getAttribute('position')) return
  const positionArray = geometry.getAttribute('position').array
  const uArray = geometry.getAttribute('aU')?.array
  if (!uArray) return
  const wireIds = geometry.getAttribute('aWireId')?.array
  const count = uArray.length
  const profile = new Float32Array(count * 4)
  const meta = new Float32Array(count * 2)
  const axis = new Float32Array(count * 3)
  const frame = new Float32Array(count * 4)
  const wall = new Float32Array(count * 4)
  const center = new Float32Array(count * 3)
  const normal = new Float32Array(count * 3)
  const motionCos = new Float32Array(count * 3)
  const motionSin = new Float32Array(count * 3)
  const invRadiusZ = new Float32Array(count)
  const scratch = new Float64Array(2)
  const ys = new Float64Array(4)
  const zs = new Float64Array(4)
  const stringCount = Math.max(2, Math.min(32, Math.round(config.stringCount ?? 11)))
  const silkVerticesPerHero = geometry.index ? stringCount * N_SILK : stringCount * 2 * (N_SILK - 1)
  for (let i = 0; i < count; i++) {
    const u = uArray[i]
    let owner = wireIds?.[i] ?? 0
    if (kind === 'silk') owner = Math.min(3, Math.floor(i / silkVerticesPerHero))
    else if (kind === 'bead') owner = BEAD_PARENTS[owner - 80]
    getHeroMotion(owner, u, H, config, motionCos, motionSin, 3 * i)
    const cz = motionCos[3 * i + 2]
    const sz = motionSin[3 * i + 2]
    invRadiusZ[i] = 1.0 / Math.sqrt(cz * cz + sz * sz + DEPTH_NORM_EPS * DEPTH_NORM_EPS)
    getTravelProfile(owner, u, H, config, scratch)
    profile[4 * i] = scratch[0]
    profile[4 * i + 1] = scratch[1]
    profile[4 * i + 2] = scratch[0]
    profile[4 * i + 3] = scratch[1]

    ys[0] = heroY0(u, H, config)
    ys[1] = heroY1(u, H, config)
    ys[2] = heroY2(u, H, config)
    ys[3] = heroY3(u, H, config)
    zs[0] = heroZ(0, u, H, config)
    zs[1] = heroZ(1, u, H, config)
    zs[2] = heroZ(2, u, H, config)
    zs[3] = heroZ(3, u, H, config)
    const frameOffset = 4 * i
    getSharedWaveFrame(u, H, config, frame, frameOffset)
    center[3 * i] = positionArray[3 * i]
    center[3 * i + 1] = frame[frameOffset]
    center[3 * i + 2] = frame[frameOffset + 1]
    normal[3 * i + 1] = 1.0
    wall[frameOffset] = ys[owner] - frame[frameOffset]
    wall[frameOffset + 1] = zs[owner] - frame[frameOffset + 1]
    wall[frameOffset + 2] = ys[owner] - frame[frameOffset]
    wall[frameOffset + 3] = zs[owner] - frame[frameOffset + 1]
    meta[2 * i] = 0.5
    meta[2 * i + 1] = 0.0
    // u increases toward the outer edge on both wings. Preserve that signed
    // tangent so the shared phase is outward on left and right alike.
    axis[3 * i] = positionArray[3 * i] < -0.0001 ? -1.0 : 1.0
  }
  geometry.setAttribute('aFlowCos', new THREE.BufferAttribute(motionCos, 3))
  geometry.setAttribute('aFlowSin', new THREE.BufferAttribute(motionSin, 3))
  geometry.setAttribute('aFlowInvRadiusZ', new THREE.BufferAttribute(invRadiusZ, 1))
  geometry.setAttribute('aFlowPair', new THREE.BufferAttribute(profile, 4))
  geometry.setAttribute('aFlowMeta', new THREE.BufferAttribute(meta, 2))
  geometry.setAttribute('aFlowAxis', new THREE.BufferAttribute(axis, 3))
  geometry.setAttribute('aFlowFrame', new THREE.BufferAttribute(frame, 4))
  geometry.setAttribute('aFlowWall', new THREE.BufferAttribute(wall, 4))
  geometry.setAttribute('aFlowCenter', new THREE.BufferAttribute(center, 3))
  geometry.setAttribute('aFlowNormal', new THREE.BufferAttribute(normal, 3))
}

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
  constructor(innerFade = 0.04, outerFade = 0.15, H = H_VAL, config = {}) {
    this.innerFade = innerFade
    this.outerFade = outerFade
    this.H = H
    this.config = config
    this.positions = []
    this.basePositions = []
    this.uParams = []
    this.wireIds = []
    this.weights = []
    this.alphas = []
    this.colors = []
    this.layers = []
    this.relativeCoords = []
  }

  addSegment(
    p1, u1, wireId1, w1,
    p2, u2, wireId2, w2,
    a1 = null, a2 = null,
    c1 = null, c2 = null,
    maxU = 1.0,
    l1 = 0.0, l2 = 0.0,
    rel1 = null, rel2 = null
  ) {
    const alpha1 = a1 !== null ? a1 : computeOuterVertexAlpha(u1, this.outerFade, maxU)
    const alpha2 = a2 !== null ? a2 : computeOuterVertexAlpha(u2, this.outerFade, maxU)

    this.positions.push(p1.x, p1.y, p1.z)
    this.basePositions.push(p1.x, p1.y, p1.z)
    this.uParams.push(u1)
    this.wireIds.push(wireId1)
    this.weights.push(w1)
    this.alphas.push(alpha1)
    this.layers.push(l1)

    const r1 = rel1 || computeRelativeCoordArray(p1, u1, this.H, this.config)
    this.relativeCoords.push(r1[0], r1[1], r1[2], r1[3])

    this.positions.push(p2.x, p2.y, p2.z)
    this.basePositions.push(p2.x, p2.y, p2.z)
    this.uParams.push(u2)
    this.wireIds.push(wireId2)
    this.weights.push(w2)
    this.alphas.push(alpha2)
    this.layers.push(l2)

    const r2 = rel2 || computeRelativeCoordArray(p2, u2, this.H, this.config)
    this.relativeCoords.push(r2[0], r2[1], r2[2], r2[3])

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
    geo.setAttribute('aLayer', new THREE.Float32BufferAttribute(this.layers.length > 0 ? this.layers : new Array(this.positions.length / 3).fill(0), 1))
    geo.setAttribute('aRelativeCoord', new THREE.Float32BufferAttribute(this.relativeCoords, 4))
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
  constructor(H = H_VAL, config = {}) {
    this.H = H
    this.config = config
    this.positions = []
    this.basePositions = []
    this.uParams = []
    this.wireIds = []
    this.weights = []
    this.sizes = []
    this.alphas = []
    this.colors = []
    this.layers = []
    this.highlights = []
    this.relativeCoords = []
  }

  addPoint(p, u, wireId, w, size = 1.0, alpha = 1.0, color = null, layer = 0.0, isHighlight = 0.0, relCoord = null) {
    this.positions.push(p.x, p.y, p.z)
    this.basePositions.push(p.x, p.y, p.z)
    this.uParams.push(u)
    this.wireIds.push(wireId)
    this.weights.push(w)
    this.sizes.push(size)
    this.alphas.push(alpha)
    this.layers.push(layer)
    this.highlights.push(isHighlight)

    const r = relCoord || computeRelativeCoordArray(p, u, this.H, this.config)
    this.relativeCoords.push(r[0], r[1], r[2], r[3])

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
    geo.setAttribute('aLayer', new THREE.Float32BufferAttribute(this.layers.length > 0 ? this.layers : new Array(this.positions.length / 3).fill(0), 1))
    geo.setAttribute('aIsHighlight', new THREE.Float32BufferAttribute(this.highlights.length > 0 ? this.highlights : new Array(this.positions.length / 3).fill(0), 1))
    geo.setAttribute('aRelativeCoord', new THREE.Float32BufferAttribute(this.relativeCoords, 4))
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
  const outerFade = config.outerFade !== undefined ? config.outerFade : 0.15
  const outerFlex = config.outerFlexibility !== undefined ? config.outerFlexibility : 1.0
  const strandSpread = config.strandSpread !== undefined ? config.strandSpread : 1.0
  const stringCount = config.stringCount !== undefined ? Math.max(2, Math.min(32, Math.round(config.stringCount))) : 11
  const stringWidth = config.stringWidth !== undefined ? Math.max(0.1, config.stringWidth) : 1.0

  const totalStrands = 4 * stringCount
  const vertCount = totalStrands * N_SILK
  const indexCount = totalStrands * (N_SILK - 1) * 2

  const posArr = new Float32Array(vertCount * 3)
  const uArr = new Float32Array(vertCount)
  const alphaArr = new Float32Array(vertCount)
  const colArr = new Float32Array(vertCount * 3)
  const flowCosArr = new Float32Array(vertCount * 3)
  const flowSinArr = new Float32Array(vertCount * 3)
  const invRzArr = new Float32Array(vertCount)
  const IndexArray = vertCount > 65535 ? Uint32Array : Uint16Array
  const indexArr = new IndexArray(indexCount)

  const colorScratch = new THREE.Color()
  const prof = heroProfileScratch
  let vCursor = 0
  let iCursor = 0

  for (let i = 0; i < 4; i++) {
    const profileCache = new Map()

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
      colorScratch.set(hexColor)
      const cr = colorScratch.r
      const cg = colorScratch.g
      const cb = colorScratch.b

      let cached = profileCache.get(strandMaxU)
      if (!cached) {
        const xs = new Float64Array(N_SILK)
        const us = new Float64Array(N_SILK)
        const heroYs = new Float64Array(N_SILK)
        const heroZs = new Float64Array(N_SILK)
        const eInners = new Float64Array(N_SILK)
        const tipTapers = new Float64Array(N_SILK)
        const outerAlphas = new Float64Array(N_SILK)
        const cosY = new Float32Array(N_SILK)
        const cosZ = new Float32Array(N_SILK)
        const sinY = new Float32Array(N_SILK)
        const sinZ = new Float32Array(N_SILK)
        const invRz = new Float32Array(N_SILK)

        for (let s = 0; s < N_SILK; s++) {
          const u = (s / (N_SILK - 1)) * strandMaxU
          getHeroWaveProfile(i, u, H, config, prof)
          const biasY = prof[0]
          const biasZ = prof[1]
          const ampY = prof[2]
          const ampZ = prof[3]
          const phase = prof[4]
          const sinP = Math.sin(phase)
          const cosP = Math.cos(phase)

          xs[s] = sign * 10.0 * u
          us[s] = u
          heroYs[s] = biasY + ampY * sinP
          heroZs[s] = biasZ + ampZ * cosP
          eInners[s] = env(u, H) * THREE.MathUtils.smootherstep(u, 0.0, 0.22)
          tipTapers[s] = 1.0 - 0.48 * THREE.MathUtils.smootherstep(u, 0.55, strandMaxU)
          outerAlphas[s] = computeOuterVertexAlpha(u, outerFade, strandMaxU)

          const cy = ampY * sinP
          const cz = ampZ * cosP
          const sy = -ampY * cosP
          const sz = ampZ * sinP
          cosY[s] = cy
          cosZ[s] = cz
          sinY[s] = sy
          sinZ[s] = sz
          invRz[s] = 1.0 / Math.sqrt(cz * cz + sz * sz + DEPTH_NORM_EPS * DEPTH_NORM_EPS)
        }

        cached = { xs, us, heroYs, heroZs, eInners, tipTapers, outerAlphas, cosY, cosZ, sinY, sinZ, invRz }
        profileCache.set(strandMaxU, cached)
      }

      const { xs, us, heroYs, heroZs, eInners, tipTapers, outerAlphas, cosY, cosZ, sinY, sinZ, invRz } = cached
      const vBase = vCursor

      uArr.set(us, vBase)
      invRzArr.set(invRz, vBase)

      const zScale = 0.08 * stringWidth
      for (let s = 0; s < N_SILK; s++) {
        const u = us[s]
        const angleK = u * Math.PI * freq_k + phase_k
        const eInner = eInners[s]
        const tipTaper = tipTapers[s]
        const vIdx = vBase + s
        const v3 = vIdx * 3

        posArr[v3] = xs[s]
        posArr[v3 + 1] = heroYs[s] + eInner * (radialSpread * tipTaper * Math.sin(angleK))
        posArr[v3 + 2] = heroZs[s] + eInner * (zScale * tipTaper * Math.cos(angleK))

        alphaArr[vIdx] = strandAlpha * outerAlphas[s]

        colArr[v3] = cr
        colArr[v3 + 1] = cg
        colArr[v3 + 2] = cb

        flowCosArr[v3 + 1] = cosY[s]
        flowCosArr[v3 + 2] = cosZ[s]
        flowSinArr[v3 + 1] = sinY[s]
        flowSinArr[v3 + 2] = sinZ[s]
      }

      for (let s = 0; s < N_SILK - 1; s++) {
        indexArr[iCursor++] = vBase + s
        indexArr[iCursor++] = vBase + s + 1
      }

      vCursor += N_SILK
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  geo.setAttribute('aU', new THREE.BufferAttribute(uArr, 1))
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphaArr, 1))
  geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3))
  geo.setAttribute('aFlowCos', new THREE.BufferAttribute(flowCosArr, 3))
  geo.setAttribute('aFlowSin', new THREE.BufferAttribute(flowSinArr, 3))
  geo.setAttribute('aFlowInvRadiusZ', new THREE.BufferAttribute(invRzArr, 1))
  geo.setIndex(new THREE.BufferAttribute(indexArr, 1))
  geo.userData = { isAnimationReady: true, wireParams: WIRE_ANIMATION_PARAMS }
  return geo
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VOLUMETRIC 3-LAYER NEURAL NETWORK FIELD (STRICTLY IN ALMOND CHAMBERS)
// Nested strictly inside the negative-space almond chambers between Hero Waves.
// Elliptical volumetric 3-layer cross-section (bg, mid, fg + ice-white hubs).
// Tucks invisible anchor points along yUpper - safeMargin and yLower + safeMargin.
// Density ramps smoothly from u = 0.08 to 0.96 with distinct PRNG seeds (314159 / 271828).
// Zero floating disconnected nodes guaranteed with k-NN (k = 3–5, max edge <= 1.15 * h(u)).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates pocket-confined volumetric blue haze micro-cloud strictly inside the almond chamber.
 * Strictly within elliptical core (r_norm < 0.75, w_depth < -0.15) with soft Gaussian drop-off,
 * boundary fading, globe tapering, and pinch-gate clearance.
 */
function generateVolumetricBlueHaze(side, H, prng, config = {}) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const HAZE_POINTS = 520
  const pointsBuilder = new ParameterizedPointsBuilder(H, config)

  const baseNavy = new THREE.Color('#082878')
  const royalSapphire = new THREE.Color('#0048d0')

  for (let p = 0; p < HAZE_POINTS; p++) {
    const t = p / (HAZE_POINTS - 1)
    const u = 0.16 + t * (0.94 - 0.16) + (prng() - 0.5) * 0.02
    const safeU = Math.max(0.16, Math.min(0.94, u))
    const bounds = getAlmondPocketBounds(safeU, H, config)
    if (bounds.gapHeight < bounds.minGapHeight * 1.15 || bounds.Ry < 0.035) continue

    // Elliptical core sampling: r_norm < 0.70, w_depth < -0.15
    const rCore = Math.sqrt(prng()) * 0.65
    const theta = prng() * Math.PI * 2.0
    const v_rel = rCore * Math.sin(theta)
    // Background depth: strictly between -0.85 and -0.16
    const w_depth = -0.16 - prng() * 0.68

    const r_norm = Math.sqrt(v_rel * v_rel + w_depth * w_depth)
    if (r_norm >= 0.72 || w_depth >= -0.15) continue

    const y = bounds.gapCenterY + v_rel * bounds.Ry
    const z = bounds.gapCenterZ + w_depth * bounds.Rz
    const x = sign * 10.0 * safeU

    // Clearance check to ensure no ribbon collision
    const dHero = Math.min(
      Math.abs(y - bounds.y0),
      Math.abs(y - bounds.y1),
      Math.abs(y - bounds.y2),
      Math.abs(y - bounds.y3)
    )
    if (dHero < bounds.safeMargin * 0.50) continue

    // Boundary taper: smooth falloff at outer pocket envelope
    const boundaryFade = Math.max(0.0, Math.pow(1.0 - r_norm * r_norm, 1.8))
    // Globe taper: smoothly ramps from u = 0.16 to 0.30
    const globeTaper = THREE.MathUtils.smoothstep(safeU, 0.16, 0.30)
    // Pinch gate taper: smoothly extinguishes before reaching pinch threshold
    const pinchTaper = THREE.MathUtils.smoothstep(bounds.gapHeight, bounds.minGapHeight * 1.15, bounds.minGapHeight * 1.8)

    const weight = computeConstraintWeight(safeU)
    // Opacity strictly in calibrated 0.05 - 0.12 range
    const alpha = (0.055 + prng() * 0.055) * boundaryFade * globeTaper * pinchTaper * weight
    // Point size dynamically scales with local pocket height to prevent haze bleed
    const size = Math.max(12.0, Math.min(40.0, bounds.Ry * 135.0 + prng() * 5.0))
    const color = baseNavy.clone().lerp(royalSapphire, prng())

    // 12% Theme modulation if themeConfig provides an accent
    if (config.themeConfig && config.themeConfig.primaryWire) {
      color.lerp(new THREE.Color(config.themeConfig.primaryWire), 0.12)
    }

    const relCoord = [safeU, v_rel, w_depth, r_norm]
    pointsBuilder.addPoint(
      new THREE.Vector3(x, y, z),
      safeU,
      76,
      weight,
      size,
      alpha,
      color,
      -1.0,
      0.0,
      relCoord
    )
  }

  return pointsBuilder.buildGeometry(true, true)
}

export function generateVolumetricNeuralField(side, H = H_VAL, prngOrConfig = {}, configOrGraph = {}, maybeGraph = null) {
  let prng = null
  let config = {}
  let graph = null

  if (typeof prngOrConfig === 'function') {
    prng = prngOrConfig
    config = configOrGraph || {}
    graph = (maybeGraph && typeof maybeGraph.addNode === 'function') ? maybeGraph : null
  } else {
    config = prngOrConfig || {}
    graph = (configOrGraph && typeof configOrGraph.addNode === 'function') ? configOrGraph : null
  }

  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const innerFade = config.innerFade !== undefined ? config.innerFade : 0.04
  const outerFade = config.outerFade !== undefined ? config.outerFade : 0.15
  const safeMargin = 0.052 * H // Minimum clearance from any primary wave strand (~0.059 units)

  // Distinct left/right PRNG seeds: 314159 (left) / 271828 (right)
  const localPrng = prng || createPrng(isLeft ? 314159 : 271828)

  // 1. Invisible Anchor Points along inner ribbon margins (alpha = 0, size = 0)
  const anchors = generateMarginAnchors(side, H, config, 28)

  // 2. Volumetric Nodes with smooth density ramping from u = 0.08 to 0.96 across S = 24 bands
  const nodes = []
  const S = 24 // 24 stratified longitudinal bands
  let nodeId = 0

  for (let s = 0; s < S; s++) {
    const t = (s + 0.5) / S
    const uStart = 0.08 + (s / S) * (0.96 - 0.08)
    const uEnd = 0.08 + ((s + 1) / S) * (0.96 - 0.08)
    // Smooth density ramping: fewer near globe (~3), richer toward outer wings (~10)
    const countInBand = Math.round(3 + 6.8 * t)

    for (let c = 0; c < countInBand; c++) {
      let nodeCreated = false
      for (let attempt = 0; attempt < 20 && !nodeCreated; attempt++) {
        const u = uStart + localPrng() * (uEnd - uStart)
        const bounds = getAlmondPocketBounds(u, H, config)

        // Skip tight crossover pinch points
        if (bounds.isPinch) continue

        // Polar coordinate sampling strictly inside the elliptical cross-section
        const rNorm = Math.sqrt(localPrng()) * 0.74
        const theta = 2.0 * Math.PI * localPrng()
        const v_rel = rNorm * Math.sin(theta)
        const w_depth = rNorm * Math.cos(theta)

        const y = bounds.gapCenterY + v_rel * bounds.Ry
        const z = bounds.gapCenterZ + w_depth * bounds.Rz
        const x = sign * 10.0 * u

        // Poisson-like spatial clearance to prevent clustering
        const posCandidate = new THREE.Vector3(x, y, z)
        const minDist = 0.14 * bounds.Ry
        let tooClose = false
        for (let ex = Math.max(0, nodes.length - 18); ex < nodes.length; ex++) {
          if (posCandidate.distanceTo(nodes[ex].pos) < minDist) {
            tooClose = true
            break
          }
        }
        if (tooClose) continue

        // Check clearance to all 4 hero ribbons
        const dYHero = Math.min(
          Math.abs(y - bounds.y0),
          Math.abs(y - bounds.y1),
          Math.abs(y - bounds.y2),
          Math.abs(y - bounds.y3)
        )
        if (dYHero < safeMargin * 0.70) continue
        if (Math.hypot(y - bounds.y2, z - bounds.z2) < safeMargin * 0.85) continue
        if (Math.hypot(y - bounds.y3, z - bounds.z3) < safeMargin * 0.85) continue

        // Verify dynamic deformation clearance across continuous 3D rotation
        const animParams = SIDE_ANIMATION_CONFIG[side] || SIDE_ANIMATION_CONFIG.left
        const { waveSpeed, waveFreq, rotIntensity, sidePhase } = animParams
        const weightVal = computeConstraintWeight(u)
        let dynamicClear = true
        for (let dt = 0; dt <= 30; dt += 2) {
          const { pos: defPt } = computeNeuralDeformationJS(
            posCandidate,
            u,
            weightVal,
            0.0,
            dt,
            waveSpeed,
            waveFreq,
            rotIntensity,
            sidePhase
          )
          const dDef = Math.min(
            Math.abs(defPt.y - bounds.y0),
            Math.abs(defPt.y - bounds.y1),
            Math.abs(defPt.y - bounds.y2),
            Math.abs(defPt.y - bounds.y3)
          )
          if (dDef < 0.0285 * H) {
            dynamicClear = false
            break
          }
        }
        if (!dynamicClear) continue

        // 3-layer volumetric classification based on w_depth
        let layer, depthTier, color, lineColor, alpha, size, isHighlight

        if (w_depth < -0.25) {
          // Background: deep sapphire/navy blue ~0.22 opacity
          depthTier = 'bg'
          layer = -1.0
          color = new THREE.Color('#0a1e4a').lerp(new THREE.Color('#0038b8'), localPrng())
          lineColor = color
          alpha = 0.22 + localPrng() * 0.04
          size = 1.5 + localPrng() * 0.3
          isHighlight = 0.0
        } else if (w_depth <= 0.25) {
          // Midground: electric royal-blue ~0.58 opacity
          depthTier = 'mid'
          layer = 0.0
          color = new THREE.Color('#0077ff').lerp(new THREE.Color('#00a8ff'), localPrng())
          lineColor = color
          alpha = 0.58 + localPrng() * 0.08
          size = 2.6 + localPrng() * 0.4
          isHighlight = 0.0
        } else {
          // Foreground: crisp cyan + prominent ice-white hubs ~0.90 opacity
          depthTier = 'fg'
          layer = 1.0
          if (localPrng() < 0.26) {
            // Radiant ice-white pinpoint hub
            color = new THREE.Color('#ffffff')
            lineColor = new THREE.Color('#00f0ff')
            alpha = 0.98
            size = 5.6 + localPrng() * 0.8
            isHighlight = 1.0
          } else {
            // Crisp cyan
            color = new THREE.Color('#00f0ff').lerp(new THREE.Color('#38d8ff'), localPrng() * 0.3)
            lineColor = color
            alpha = 0.90
            size = 4.0 + localPrng() * 0.5
            isHighlight = 0.0
          }
        }

        // Soft 12% chromatic blend with active portfolio theme accent
        if (config.themeConfig && config.themeConfig.primaryWire) {
          color.lerp(new THREE.Color(config.themeConfig.primaryWire), 0.12)
          lineColor.lerp(new THREE.Color(config.themeConfig.primaryWire), 0.12)
        }

        const relCoord = [u, v_rel, w_depth, rNorm]
        const weight = computeConstraintWeight(u)
        const targetK = 3 + Math.floor(localPrng() * 3) // k in [3, 5]

        nodes.push({
          id: `vol_node_${nodeId++}`,
          pos: posCandidate,
          u,
          hu: bounds.gapHeight,
          weight,
          isAnchor: false,
          connectedCount: 0,
          targetK,
          layer,
          depthTier,
          color,
          lineColor,
          alpha,
          size,
          isHighlight,
          relativeCoord: relCoord,
          v_rel,
          w_depth,
          r_norm: rNorm,
        })
        nodeCreated = true
      }
    }
  }

  // 3. Ribbon Non-Intersection Check for Candidate Segments
  function doesSegmentIntersectRibbons(pA, uA, pB, uB, isTether = false) {
    const samples = 6
    for (let s = 1; s < samples; s++) {
      const frac = s / samples
      const ut = uA + frac * (uB - uA)
      const yt = pA.y + frac * (pB.y - pA.y)
      const zt = pA.z + frac * (pB.z - pA.z)

      const bounds = getAlmondPocketBounds(ut, H, config)
      const marginTol = isTether ? 0.002 : 0.20 * safeMargin
      if (yt > bounds.yUpper + marginTol || yt < bounds.yLower - marginTol) {
        return true
      }

      const y2 = heroY2(ut, H, config)
      const z2 = heroZ(2, ut, H, config)
      const y3 = heroY3(ut, H, config)
      const z3 = heroZ(3, ut, H, config)
      if (Math.hypot(yt - y2, zt - z2) < 0.45 * safeMargin) return true
      if (Math.hypot(yt - y3, zt - z3) < 0.45 * safeMargin) return true
    }
    return false
  }

  // 4. Proximity-Constrained k-NN Edge Construction (k = 3-5)
  // Length clamping strictly bounded: 0.08 * h(u) <= length(e) <= 0.85 * h(u)
  const edges = []
  const edgeSet = new Set()

  for (let i = 0; i < nodes.length; i++) {
    const nA = nodes[i]
    const candidates = []

    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue
      const nB = nodes[j]
      if (nB.connectedCount >= 5) continue

      const du = Math.abs(nA.u - nB.u)
      if (du > 0.12) continue

      const avgHu = 0.5 * (nA.hu + nB.hu)
      const dist = nA.pos.distanceTo(nB.pos)
      // Strict length clamping: no long diagonal struts spanning the chamber
      if (dist < 0.08 * avgHu || dist > 0.85 * avgHu) continue

      if (doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u)) continue

      candidates.push({ j, dist })
    }

    candidates.sort((a, b) => a.dist - b.dist)

    for (const cand of candidates) {
      if (nA.connectedCount >= nA.targetK) break
      const nB = nodes[cand.j]
      if (nB.connectedCount >= 5) continue

      const key = Math.min(i, cand.j) + '-' + Math.max(i, cand.j)
      if (edgeSet.has(key)) continue

      // Same-layer cross-intersection prevention
      const avgZ1 = (nA.pos.z + nB.pos.z) * 0.5
      let crosses = false
      for (const e of edges) {
        if (e.i === i || e.j === i || e.i === cand.j || e.j === cand.j) continue
        const eA = nodes[e.i]
        const eB = nodes[e.j]
        const avgZ2 = (eA.pos.z + eB.pos.z) * 0.5
        if (Math.abs(avgZ1 - avgZ2) < 0.06) {
          if (segmentsIntersect2D(nA.pos, nB.pos, eA.pos, eB.pos)) {
            crosses = true
            break
          }
        }
      }
      if (crosses) continue

      edgeSet.add(key)
      edges.push({ i, j: cand.j, dist: cand.dist })
      nA.connectedCount++
      nB.connectedCount++
    }
  }

  // 5. Guaranteed Connectivity: zero floating disconnected nodes, every non-anchor node degree >= 1
  for (let i = 0; i < nodes.length; i++) {
    const nA = nodes[i]
    if (nA.connectedCount === 0) {
      let bestJ = -1
      let bestDist = Infinity
      // First pass: strictly require no ribbon intersection AND no same-layer crossing
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue
        const nB = nodes[j]
        const du = Math.abs(nA.u - nB.u)
        if (du > 0.18) continue
        const dist = nA.pos.distanceTo(nB.pos)
        if (dist < bestDist && !doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u)) {
          const avgZ1 = (nA.pos.z + nB.pos.z) * 0.5
          let crosses = false
          for (const e of edges) {
            if (e.i === i || e.j === i || e.i === j || e.j === j) continue
            const eA = nodes[e.i]
            const eB = nodes[e.j]
            const avgZ2 = (eA.pos.z + eB.pos.z) * 0.5
            if (Math.abs(avgZ1 - avgZ2) < 0.06) {
              if (segmentsIntersect2D(nA.pos, nB.pos, eA.pos, eB.pos)) {
                crosses = true
                break
              }
            }
          }
          if (!crosses) {
            bestDist = dist
            bestJ = j
          }
        }
      }
      // Fallback pass if no candidate found without same-layer crossing: find closest non-intersecting candidate
      if (bestJ === -1) {
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue
          const nB = nodes[j]
          const du = Math.abs(nA.u - nB.u)
          if (du > 0.22) continue
          const dist = nA.pos.distanceTo(nB.pos)
          if (dist < bestDist && !doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u)) {
            bestDist = dist
            bestJ = j
          }
        }
      }
      if (bestJ !== -1) {
        const key = Math.min(i, bestJ) + '-' + Math.max(i, bestJ)
        if (!edgeSet.has(key)) {
          edgeSet.add(key)
          edges.push({ i, j: bestJ, dist: bestDist })
          nA.connectedCount++
          nodes[bestJ].connectedCount++
        }
      }
    }
  }

  // Filter visible nodes to guarantee degree >= 1
  const visibleNodes = nodes.filter((n) => n.connectedCount > 0)

  // 6. Wave Margin Tethering:
  // Outer boundary nodes (r_norm > 0.62) establish clean tethering edges to nearest invisible margin anchors
  const tetherEdges = []
  for (const node of visibleNodes) {
    if (node.r_norm > 0.62) {
      let bestAnchor = null
      let bestAnchorDist = Infinity

      for (const anc of anchors) {
        const du = Math.abs(node.u - anc.u)
        if (du > 0.08) continue

        // Check if anchor is on the same vertical side (upper or lower)
        const isUpperAnchor = anc.id.includes('upper')
        if (node.v_rel > 0 && !isUpperAnchor) continue
        if (node.v_rel < 0 && isUpperAnchor) continue

        const dist = node.pos.distanceTo(anc.pos)
        if (dist <= 0.85 * node.hu && dist < bestAnchorDist) {
          if (!doesSegmentIntersectRibbons(node.pos, node.u, anc.pos, anc.u, true)) {
            bestAnchorDist = dist
            bestAnchor = anc
          }
        }
      }

      if (bestAnchor) {
        tetherEdges.push({
          node,
          anchor: bestAnchor,
          dist: bestAnchorDist,
        })
      }
    }
  }

  // 7. Build Line BufferGeometry (Internal Edges + Margin Tethers)
  const lineBuilder = new ParameterizedLineBuilder(innerFade, outerFade, H, config)

  // Add internal structural edges
  edges.forEach(({ i, j }) => {
    const nA = nodes[i]
    const nB = nodes[j]

    const aA = nA.layer > 0.5 ? 0.88 : (nA.layer < -0.5 ? 0.22 : 0.58)
    const aB = nB.layer > 0.5 ? 0.88 : (nB.layer < -0.5 ? 0.22 : 0.58)

    const cA = nA.lineColor || nA.color
    const cB = nB.lineColor || nB.color

    lineBuilder.addSegment(
      nA.pos,
      nA.u,
      75,
      nA.weight,
      nB.pos,
      nB.u,
      75,
      nB.weight,
      aA,
      aB,
      cA,
      cB,
      1.0,
      nA.layer,
      nB.layer,
      nA.relativeCoord,
      nB.relativeCoord
    )
  })

  // Add margin tether edges (alpha smoothly fades to 0.40 at the margin anchor)
  const tetherColor = new THREE.Color('#00c8ff')
  tetherEdges.forEach(({ node, anchor }) => {
    const aNode = node.layer > 0.5 ? 0.80 : (node.layer < -0.5 ? 0.20 : 0.50)
    const aAnchor = 0.40 // Smooth fade toward the wave margin (SPEC.md Section 5.3)

    lineBuilder.addSegment(
      node.pos,
      node.u,
      75,
      node.weight,
      anchor.pos,
      anchor.u,
      75,
      anchor.weight,
      aNode,
      aAnchor,
      node.color,
      tetherColor,
      1.0,
      node.layer,
      0.0,
      node.relativeCoord,
      anchor.relativeCoord
    )
  })
  const linesGeo = lineBuilder.buildGeometry()

  // 8. Build Points BufferGeometry (Zero anchor nodes included -> zero dots on wave filaments!)
  const pointsBuilder = new ParameterizedPointsBuilder(H, config)
  visibleNodes.forEach((n) => {
    pointsBuilder.addPoint(
      n.pos,
      n.u,
      75,
      n.weight,
      n.size,
      n.alpha,
      n.color,
      n.layer,
      n.isHighlight,
      n.relativeCoord
    )
  })
  const pointsGeo = pointsBuilder.buildGeometry(true, true)

  // 9. Generate Pocket-Confined Volumetric Blue Haze
  const hazeGeo = generateVolumetricBlueHaze(side, H, localPrng, config)

  // Register in canonical graph if provided
  if (graph && typeof graph.addNode === 'function') {
    visibleNodes.forEach((n) => {
      graph.addNode(
        new GraphNode({
          id: `${side}_node_${n.id}`,
          position: n.pos,
          u: n.u,
          wireId: 75,
          weight: n.weight,
          tier: n.isHighlight ? 'hero' : 'intersection',
          depthLayer: n.depthTier,
          relativeCoord: n.relativeCoord,
          meta: { isHighlight: n.isHighlight, layer: n.layer, relativeCoord: n.relativeCoord },
        })
      )
    })

    edges.forEach(({ i, j }) => {
      const nA = nodes[i]
      const nB = nodes[j]
      graph.addEdge(`${side}_node_${nA.id}`, `${side}_node_${nB.id}`, 'secondary', 75)
    })
  }

  return {
    linesGeo,
    pointsGeo,
    hazeGeo,
    triangulationGeo: linesGeo,
    nodesGeo: pointsGeo,
    rawNodes: visibleNodes,
    edges,
  }
}
// Backward-compatible aliases
export const generate3DNeuralNetwork = generateVolumetricNeuralField
export const generate3DNeuralTriangulation = generateVolumetricNeuralField

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
  const vertCount = BEAD_PARENTS.length * N_DOTS
  const innerFade = config.innerFade !== undefined ? config.innerFade : 0.04
  const width = Math.max(0.1, config.stringWidth ?? 1.0)

  const posArr = new Float32Array(vertCount * 3)
  const uArr = new Float32Array(vertCount)
  const sizeArr = new Float32Array(vertCount)
  const alphaArr = new Float32Array(vertCount)
  const flowCosArr = new Float32Array(vertCount * 3)
  const flowSinArr = new Float32Array(vertCount * 3)
  const invRzArr = new Float32Array(vertCount)
  const prof = heroProfileScratch
  let vIdx = 0

  for (let i = 0; i < BEAD_PARENTS.length; i++) {
    const owner = BEAD_PARENTS[i]
    const angle = (i * 2 * Math.PI) / BEAD_PARENTS.length
    const cosAng = Math.cos(angle)
    const sinAng = Math.sin(angle)

    for (let idx = 0; idx < N_DOTS; idx++) {
      const t = idx / (N_DOTS - 1)
      const u = 0.22 + t * (0.98 - 0.22)
      const offset = 0.018 * width * THREE.MathUtils.smootherstep(u, 0, 0.08)

      getHeroWaveProfile(owner, u, H, config, prof)
      const biasY = prof[0]
      const biasZ = prof[1]
      const ampY = prof[2]
      const ampZ = prof[3]
      const phase = prof[4]
      const sinP = Math.sin(phase)
      const cosP = Math.cos(phase)

      const x = sign * 10.0 * u
      const y = biasY + ampY * sinP + offset * cosAng
      const z = biasZ + ampZ * cosP + offset * sinAng

      const feather = computeVertexAlpha(u, innerFade)
      const fade = Math.sin(t * Math.PI)
      const alpha = 0.55 * fade * feather
      const size = 0.26 * (0.80 + 0.40 * fade)

      const cy = ampY * sinP
      const cz = ampZ * cosP
      const sy = -ampY * cosP
      const sz = ampZ * sinP

      const v3 = vIdx * 3
      posArr[v3] = x
      posArr[v3 + 1] = y
      posArr[v3 + 2] = z
      uArr[vIdx] = u
      sizeArr[vIdx] = size
      alphaArr[vIdx] = alpha
      flowCosArr[v3 + 1] = cy
      flowCosArr[v3 + 2] = cz
      flowSinArr[v3 + 1] = sy
      flowSinArr[v3 + 2] = sz
      invRzArr[vIdx] = 1.0 / Math.sqrt(cz * cz + sz * sz + DEPTH_NORM_EPS * DEPTH_NORM_EPS)
      vIdx++
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  geo.setAttribute('aU', new THREE.BufferAttribute(uArr, 1))
  geo.setAttribute('size', new THREE.BufferAttribute(sizeArr, 1))
  geo.setAttribute('alpha', new THREE.BufferAttribute(alphaArr, 1))
  geo.setAttribute('aFlowCos', new THREE.BufferAttribute(flowCosArr, 3))
  geo.setAttribute('aFlowSin', new THREE.BufferAttribute(flowSinArr, 3))
  geo.setAttribute('aFlowInvRadiusZ', new THREE.BufferAttribute(invRzArr, 1))
  geo.userData = { isAnimationReady: true, wireParams: WIRE_ANIMATION_PARAMS }
  return geo
}

export function get6ExactCurveCrossingFlares(side, H, config = {}) {
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

  const pointsBuilder = new ParameterizedPointsBuilder(H, config)

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

  const colorPalette = [
    new THREE.Color('#1068ff'), // Electric Royal-Blue
    new THREE.Color('#0055ff'), // Deep Royal-Blue
    new THREE.Color('#30d5ff'), // Bright Cyan
    new THREE.Color('#00d8ff'), // Electric Cyan
    new THREE.Color('#9d30ff'), // Vibrant Violet
    new THREE.Color('#c084fc'), // Lavender Violet
    new THREE.Color('#e0ffff'), // Crisp White-Cyan
  ]

  const posArr = new Float32Array(STARDUST_COUNT * 3)
  const sizeArr = new Float32Array(STARDUST_COUNT)
  const alphaArr = new Float32Array(STARDUST_COUNT)
  const colArr = new Float32Array(STARDUST_COUNT * 3)
  const flowCosArr = new Float32Array(STARDUST_COUNT * 3)
  const flowSinArr = new Float32Array(STARDUST_COUNT * 3)
  const prof = heroProfileScratch

  for (let p = 0; p < STARDUST_COUNT; p++) {
    const u = 0.20 + prng() * (0.98 - 0.20)
    const curveId = Math.floor(prng() * 4)
    getHeroWaveProfile(curveId, u, H, config, prof)
    const biasY = prof[0]
    const biasZ = prof[1]
    const ampY = prof[2]
    const ampZ = prof[3]
    const phase = prof[4]
    const sinP = Math.sin(phase)
    const cosP = Math.cos(phase)
    const yBase = biasY + ampY * sinP
    const zBase = biasZ + ampZ * cosP

    const r1 = prng()
    const r2 = prng()
    const gaussY = Math.sqrt(-2.0 * Math.log(Math.max(1e-5, r1))) * Math.cos(2.0 * Math.PI * r2)
    const gaussZ = Math.sqrt(-2.0 * Math.log(Math.max(1e-5, r1))) * Math.sin(2.0 * Math.PI * r2)

    const x = sign * (10.0 * u + (prng() - 0.5) * 0.08)
    const y = yBase + gaussY * 0.07 * H
    const z = zBase + gaussZ * 0.07 * H

    const feather = computeVertexAlpha(u, innerFade)

    // Tiny 1.0px - 2.2px pinpoint stardust
    const size = (0.16 + prng() * 0.14) * (0.5 + 0.5 * feather)
    const alpha = (0.55 + prng() * 0.45) * feather
    const color = colorPalette[Math.floor(prng() * colorPalette.length)]

    const p3 = p * 3
    posArr[p3] = x
    posArr[p3 + 1] = y
    posArr[p3 + 2] = z
    sizeArr[p] = size
    alphaArr[p] = alpha
    colArr[p3] = color.r
    colArr[p3 + 1] = color.g
    colArr[p3 + 2] = color.b
    flowCosArr[p3 + 1] = ampY * sinP
    flowCosArr[p3 + 2] = ampZ * cosP
    flowSinArr[p3 + 1] = -ampY * cosP
    flowSinArr[p3 + 2] = ampZ * sinP
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  geo.setAttribute('size', new THREE.BufferAttribute(sizeArr, 1))
  geo.setAttribute('alpha', new THREE.BufferAttribute(alphaArr, 1))
  geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3))
  geo.setAttribute('aFlowCos', new THREE.BufferAttribute(flowCosArr, 3))
  geo.setAttribute('aFlowSin', new THREE.BufferAttribute(flowSinArr, 3))
  geo.userData = { isAnimationReady: true, wireParams: WIRE_ANIMATION_PARAMS }
  return geo
}

/**
 * Generates all graph-based animation-ready geometries for one side ('left' or 'right'),
 * supporting live parametric adjustments from the wireframe controller.
 *
 * @param {'left' | 'right'} side
 * @param {object} [config]
 */
export function generateSideWireData(side, config = {}) {
  const seed = side === 'left' ? 104729 : 1299709
  const prng = createPrng(seed)
  const graph = new NeuralWireGraph(side)
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const H = H_VAL
  const outerFade = config.outerFade !== undefined ? config.outerFade : 0.15
  const outerFlex = config.outerFlexibility !== undefined ? config.outerFlexibility : 1.0

  // 1. Precompute smooth continuous Hero Wave samples once per (i, s)
  const heroStrands = []
  const prof = heroProfileScratch
  for (let i = 0; i < 4; i++) {
    const heroMaxU = 1.0 + ([0.05, 0.02, 0.07, 0.04][i] ?? 0.0) * outerFlex
    const xs = new Float64Array(N_HERO)
    const ys = new Float64Array(N_HERO)
    const zs = new Float64Array(N_HERO)
    const us = new Float32Array(N_HERO)
    const alphas = new Float32Array(N_HERO)
    const tapers = new Float64Array(N_HERO)
    const cosY = new Float32Array(N_HERO)
    const cosZ = new Float32Array(N_HERO)
    const sinY = new Float32Array(N_HERO)
    const sinZ = new Float32Array(N_HERO)
    const invRz = new Float32Array(N_HERO)

    for (let s = 0; s < N_HERO; s++) {
      const u = (s / (N_HERO - 1)) * heroMaxU
      getHeroWaveProfile(i, u, H, config, prof)
      const biasY = prof[0]
      const biasZ = prof[1]
      const ampY = prof[2]
      const ampZ = prof[3]
      const phase = prof[4]
      const sinP = Math.sin(phase)
      const cosP = Math.cos(phase)

      xs[s] = sign * 10.0 * u
      ys[s] = biasY + ampY * sinP
      zs[s] = biasZ + ampZ * cosP
      us[s] = u
      alphas[s] = computeOuterVertexAlpha(u, outerFade, heroMaxU)
      tapers[s] = THREE.MathUtils.smootherstep(u, 0.0, 0.20)

      const cy = ampY * sinP
      const cz = ampZ * cosP
      const sy = -ampY * cosP
      const sz = ampZ * sinP
      cosY[s] = cy
      cosZ[s] = cz
      sinY[s] = sy
      sinZ[s] = sz
      invRz[s] = 1.0 / Math.sqrt(cz * cz + sz * sz + DEPTH_NORM_EPS * DEPTH_NORM_EPS)
    }

    heroStrands.push({
      wireId: i,
      count: N_HERO,
      xs,
      ys,
      zs,
      us,
      alphas,
      tapers,
      cosY,
      cosZ,
      sinY,
      sinZ,
      invRz,
    })
    graph.primaryFilamentPaths.push({ wireId: i, length: N_HERO })
  }

  // 2. Indexed LineSegments builders for Hero Wave cores and 6-pass aura bundles
  function buildCoreLineGeo(strandList) {
    let vertCount = 0
    let indexCount = 0
    for (let i = 0; i < strandList.length; i++) {
      const c = strandList[i].count
      vertCount += c
      indexCount += (c - 1) * 2
    }

    const posArr = new Float32Array(vertCount * 3)
    const uArr = new Float32Array(vertCount)
    const alphaArr = new Float32Array(vertCount)
    const flowCosArr = new Float32Array(vertCount * 3)
    const flowSinArr = new Float32Array(vertCount * 3)
    const invRzArr = new Float32Array(vertCount)
    const IndexArray = vertCount > 65535 ? Uint32Array : Uint16Array
    const indexArr = new IndexArray(indexCount)

    let vOffset = 0
    let iCursor = 0
    for (let l = 0; l < strandList.length; l++) {
      const { count, xs, ys, zs, us, alphas, cosY, cosZ, sinY, sinZ, invRz } = strandList[l]
      uArr.set(us, vOffset)
      alphaArr.set(alphas, vOffset)
      invRzArr.set(invRz, vOffset)

      for (let s = 0; s < count; s++) {
        const v3 = (vOffset + s) * 3
        posArr[v3] = xs[s]
        posArr[v3 + 1] = ys[s]
        posArr[v3 + 2] = zs[s]
        flowCosArr[v3 + 1] = cosY[s]
        flowCosArr[v3 + 2] = cosZ[s]
        flowSinArr[v3 + 1] = sinY[s]
        flowSinArr[v3 + 2] = sinZ[s]
      }
      for (let s = 0; s < count - 1; s++) {
        indexArr[iCursor++] = vOffset + s
        indexArr[iCursor++] = vOffset + s + 1
      }
      vOffset += count
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    geo.setAttribute('aU', new THREE.BufferAttribute(uArr, 1))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphaArr, 1))
    geo.setAttribute('aFlowCos', new THREE.BufferAttribute(flowCosArr, 3))
    geo.setAttribute('aFlowSin', new THREE.BufferAttribute(flowSinArr, 3))
    geo.setAttribute('aFlowInvRadiusZ', new THREE.BufferAttribute(invRzArr, 1))
    geo.setIndex(new THREE.BufferAttribute(indexArr, 1))
    geo.userData = { isAnimationReady: true, wireParams: WIRE_ANIMATION_PARAMS }
    return geo
  }

  function buildOffsetAuraLineGeo(strandList, offsets) {
    let vertCount = 0
    let indexCount = 0
    for (let i = 0; i < strandList.length; i++) {
      const c = strandList[i].count
      vertCount += c * offsets.length
      indexCount += (c - 1) * 2 * offsets.length
    }

    const posArr = new Float32Array(vertCount * 3)
    const uArr = new Float32Array(vertCount)
    const alphaArr = new Float32Array(vertCount)
    const flowCosArr = new Float32Array(vertCount * 3)
    const flowSinArr = new Float32Array(vertCount * 3)
    const invRzArr = new Float32Array(vertCount)
    const IndexArray = vertCount > 65535 ? Uint32Array : Uint16Array
    const indexArr = new IndexArray(indexCount)

    let vOffset = 0
    let iCursor = 0
    for (let l = 0; l < strandList.length; l++) {
      const { count, xs, ys, zs, us, alphas, tapers, cosY, cosZ, sinY, sinZ, invRz } = strandList[l]
      for (let o = 0; o < offsets.length; o++) {
        const { dy, dz } = offsets[o]
        uArr.set(us, vOffset)
        alphaArr.set(alphas, vOffset)
        invRzArr.set(invRz, vOffset)

        for (let s = 0; s < count; s++) {
          const v3 = (vOffset + s) * 3
          const taper = tapers[s]
          posArr[v3] = xs[s]
          posArr[v3 + 1] = ys[s] + dy * taper
          posArr[v3 + 2] = zs[s] + dz * taper
          flowCosArr[v3 + 1] = cosY[s]
          flowCosArr[v3 + 2] = cosZ[s]
          flowSinArr[v3 + 1] = sinY[s]
          flowSinArr[v3 + 2] = sinZ[s]
        }
        for (let s = 0; s < count - 1; s++) {
          indexArr[iCursor++] = vOffset + s
          indexArr[iCursor++] = vOffset + s + 1
        }
        vOffset += count
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    geo.setAttribute('aU', new THREE.BufferAttribute(uArr, 1))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphaArr, 1))
    geo.setAttribute('aFlowCos', new THREE.BufferAttribute(flowCosArr, 3))
    geo.setAttribute('aFlowSin', new THREE.BufferAttribute(flowSinArr, 3))
    geo.setAttribute('aFlowInvRadiusZ', new THREE.BufferAttribute(invRzArr, 1))
    geo.setIndex(new THREE.BufferAttribute(indexArr, 1))
    geo.userData = { isAnimationReady: true, wireParams: WIRE_ANIMATION_PARAMS }
    return geo
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

  // 4. Volumetric 3-Layer Neural Network Field (handled independently by MergedNeuralNetworkField)
  const neuralLinesGeo = new THREE.BufferGeometry()
  const neuralPointsGeo = new THREE.BufferGeometry()
  const neuralHazeGeo = new THREE.BufferGeometry()

  // 5. 5 Sweeping Outer Beaded Dot-Streams floating well outside the main waves
  const beadedStreamsGeo = generate5SweepingOuterBeadedStreams(side, H, config)

  // 6. 6 Exact Curve-Crossing Flares (obsolete / unused by active render tree)
  const focalFlaresGeo = new THREE.BufferGeometry()

  // 7. Skip dead bokehGeo build while advancing PRNG by 25 * 5 = 125 calls
  // so stardustGeo positions & attributes stay bit-identical to baseline.
  for (let b = 0; b < 125; b++) prng()
  const bokehGeo = null

  // 8. 900 Tiny Pinpoint Stardust Specks
  const stardustGeo = generate900PinpointStardust(side, H, prng, config)

  // Canonical graph exports
  const canonicalModel = graph.exportCanonicalModel()
  primaryCoreGeo.userData.graphModel = canonicalModel
  neuralLinesGeo.userData.graphModel = canonicalModel

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
    neuralLinesGeo,
    neuralPointsGeo,
    neuralHazeGeo,
    constellationGeo: neuralLinesGeo,
    primaryConnectionsGeo: neuralLinesGeo,
    backgroundConnectionsGeo: neuralLinesGeo,
    focalFlaresGeo,
    heroNodesGeo: focalFlaresGeo,
    intersectionNodesGeo: neuralPointsGeo,
    connectionNodesGeo: neuralPointsGeo,
    minorNodesGeo: neuralPointsGeo,
    neuralNodesGeo: neuralPointsGeo,
    neuralEdgesGeo: neuralLinesGeo,
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
  let r3YVal = config.ribbon3YOffset !== undefined ? config.ribbon3YOffset : 0.0
  if (r3YVal === -0.1 || config.ribbon3YOffset === undefined) r3YVal = -0.02
  const r3Y = r3YVal.toFixed(2)
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

  return `v13:${side}:${amp}:${freq}:${sweep}:${innerY}:${outerY}:${zAmp}:${strandSpread}:${innerFade}:${strCount}:${strWidth}:${r1Amp}:${r2Amp}:${r3Amp}:${r4Amp}:${r1Y}:${r2Y}:${r3Y}:${r4Y}:${r1F}:${r2F}:${r3F}:${r4F}:${oFlex}:${oFlare}:${oFade}:${oZ}:${d01}:${d12}:${d23}:${spOuter}:${spInner}:${ANIMATION_CONTRACT_VERSION}`
}

export function getSideWireData(side, config = {}) {
  const key = getGeometryCacheKey(side, config)
  if (!cachedGeometryMap.has(key)) {
    // Keep at most 4 entries in cache to bound GPU memory
    if (cachedGeometryMap.size > 4) {
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
