/**
 * @file neuralPocketBounds.js
 * Mathematical Pocket Geometry & Shared Helper for the 3D Neural Wire Network.
 *
 * Implements the negative-space almond pocket boundary envelope, multi-ribbon sub-pocket
 * decomposition across all 4 wave streams, relative coordinate system
 * (u, v_rel, w_depth, r_norm) for Stage 2 helical synchronization, and invisible inner-margin anchor generation.
 */

import * as THREE from 'three'
import {
  heroY0,
  heroY1,
  heroY2,
  heroY3,
  heroZ,
  H_VAL,
  N_HERO,
  computeConstraintWeight,
  getHeroMotion,
} from './generateWireGeometry.js'
import { segmentsIntersect2D } from './neuralGraphModel.js'
import { FLOW_OMEGA } from './animationContract.js'

/**
 * Deterministic PRNG for neural pocket geometry.
 */
function createPrng(seed = 12345) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  const state = new Int32Array(1)
  state[0] = s
  return function () {
    const next = (state[0] * 16807) % 2147483647
    state[0] = next
    return (next - 1) / 2147483646
  }
}

/**
 * Computes the negative-space almond pocket boundary envelope at longitudinal coordinate u in [0, 1].
 *
 * Defined between Ribbon 0 (Upper Arch) and Ribbon 1 (Lower Arch), with safety
 * clearances evaluated against Ribbon 2 (Violet) and Ribbon 3 (Counter-Braid).
 * Also returns extended envelope properties covering all 4 ribbons for sub-pocket sampling.
 *
 * @param {number} u - Longitudinal coordinate along the wave flow [0, 1]
 * @param {number} [H=H_VAL] - Vertical wave scale
 * @param {object} [config={}] - Wave controller configuration parameters
 */
export function getAlmondPocketBounds(u, H = H_VAL, config = {}, out = {}) {
  const y0 = heroY0(u, H, config)
  const y1 = heroY1(u, H, config)
  const z0 = heroZ(0, u, H, config)
  const z1 = heroZ(1, u, H, config)

  const y2 = heroY2(u, H, config)
  const z2 = heroZ(2, u, H, config)
  const y3 = heroY3(u, H, config)
  const z3 = heroZ(3, u, H, config)

  const isY0Upper = y0 >= y1
  const yUpper = isY0Upper ? y0 : y1
  const yLower = isY0Upper ? y1 : y0
  const zUpper = isY0Upper ? z0 : z1
  const zLower = isY0Upper ? z1 : z0

  const gapHeight = Math.max(0.0, yUpper - yLower)
  const gapCenterY = 0.5 * (yUpper + yLower)
  const gapCenterZ = 0.5 * (z0 + z1)

  // Safe margin clearance (~0.028 units at baseline H)
  const safeMargin = 0.028 * H

  // Relaxed pinch-gate threshold
  const minGapHeight = 0.030

  // Elliptical cross-section half-radii strictly inside the almond chamber
  const Ry = Math.max(0.0, 0.5 * gapHeight - safeMargin * 0.4)
  const Rz = Math.max(0.0, Ry * 0.85)
  const isPinch = gapHeight < minGapHeight

  // Extended envelope across all 4 ribbons (Ribbon 0, 1, 2, 3)
  const envMinY = Math.min(y0, y1, y2, y3)
  const envMaxY = Math.max(y0, y1, y2, y3)
  const envMinZ = Math.min(z0, z1, z2, z3)
  const envMaxZ = Math.max(z0, z1, z2, z3)
  const envHeight = Math.max(0.0, envMaxY - envMinY)
  const envCenterY = 0.5 * (envMaxY + envMinY)
  const envCenterZ = 0.5 * (envMaxZ + envMinZ)
  const envRy = Math.max(0.0, 0.5 * envHeight - safeMargin * 0.3)
  const envRz = Math.max(0.005, 0.5 * (envMaxZ - envMinZ) + 0.035)

  out.u = u
  out.y0 = y0
  out.y1 = y1
  out.z0 = z0
  out.z1 = z1
  out.y2 = y2
  out.z2 = z2
  out.y3 = y3
  out.z3 = z3
  out.yUpper = yUpper
  out.yLower = yLower
  out.zUpper = zUpper
  out.zLower = zLower
  out.gapHeight = gapHeight
  out.gapCenterY = gapCenterY
  out.gapCenterZ = gapCenterZ
  out.safeMargin = safeMargin
  out.minGapHeight = minGapHeight
  out.Ry = Ry
  out.Rz = Rz
  out.isPinch = isPinch
  out.envMinY = envMinY
  out.envMaxY = envMaxY
  out.envMinZ = envMinZ
  out.envMaxZ = envMaxZ
  out.envHeight = envHeight
  out.envCenterY = envCenterY
  out.envCenterZ = envCenterZ
  out.envRy = envRy
  out.envRz = envRz
  return out
}

/**
 * Computes all valid open vertical sub-pockets between the sorted Y-coordinates of all active
 * wave ribbons at longitudinal coordinate u.
 */
export function getAllSubPockets(u, H = H_VAL, config = {}, minSubGap = 0.026) {
  const y0 = heroY0(u, H, config)
  const z0 = heroZ(0, u, H, config)
  const y1 = heroY1(u, H, config)
  const z1 = heroZ(1, u, H, config)
  const y2 = heroY2(u, H, config)
  const z2 = heroZ(2, u, H, config)
  const y3 = heroY3(u, H, config)
  const z3 = heroZ(3, u, H, config)

  const ribbons = [
    { id: 0, y: y0, z: z0 },
    { id: 1, y: y1, z: z1 },
    { id: 2, y: y2, z: z2 },
    { id: 3, y: y3, z: z3 },
  ].sort((a, b) => a.y - b.y)

  const subPockets = []
  for (let k = 0; k < ribbons.length - 1; k++) {
    const rLow = ribbons[k]
    const rHigh = ribbons[k + 1]
    const height = rHigh.y - rLow.y

    if (height >= minSubGap) {
      const centerY = 0.5 * (rLow.y + rHigh.y)
      const centerZ = 0.5 * (rLow.z + rHigh.z)
      const margin = Math.max(0.0010, 0.035 * height)
      const ry = Math.max(0.002, 0.5 * height - margin)
      const rz = Math.max(0.012, 0.5 * Math.abs(rHigh.z - rLow.z) + 0.022)

      subPockets.push({
        index: k,
        ribbonLow: rLow.id,
        ribbonHigh: rHigh.id,
        yLow: rLow.y,
        yHigh: rHigh.y,
        height,
        centerY,
        centerZ,
        margin,
        ry,
        rz,
        isCrossingChamber: (u >= 0.42 && u <= 0.70),
      })
    }
  }

  return subPockets
}

/**
 * Computes the relative coordinate Vector4 (u, v_rel, w_depth, r_norm) for a 3D point.
 */
export function computeRelativeCoord(pos, u, H = H_VAL, config = {}) {
  const bounds = getAlmondPocketBounds(u, H, config)
  const isOutsidePrimary = pos.y > bounds.yUpper || pos.y < bounds.yLower
  const centerY = isOutsidePrimary ? bounds.envCenterY : bounds.gapCenterY
  const centerZ = isOutsidePrimary ? bounds.envCenterZ : bounds.gapCenterZ
  const ry = isOutsidePrimary ? bounds.envRy : bounds.Ry
  const rz = isOutsidePrimary ? bounds.envRz : bounds.Rz

  const v_rel = ry > 0.0001 ? THREE.MathUtils.clamp((pos.y - centerY) / ry, -1.0, 1.0) : 0.0
  const w_depth = rz > 0.0001 ? THREE.MathUtils.clamp((pos.z - centerZ) / rz, -1.0, 1.0) : 0.0
  const r_norm = Math.min(1.0, Math.sqrt(v_rel * v_rel + w_depth * w_depth))

  return new THREE.Vector4(u, v_rel, w_depth, r_norm)
}

/**
 * Computes relative coordinates as a plain 4-element array [u, v_rel, w_depth, r_norm].
 */
export function computeRelativeCoordArray(pos, u, H = H_VAL, config = {}) {
  const bounds = getAlmondPocketBounds(u, H, config)
  const isOutsidePrimary = pos.y > bounds.yUpper || pos.y < bounds.yLower
  const centerY = isOutsidePrimary ? bounds.envCenterY : bounds.gapCenterY
  const centerZ = isOutsidePrimary ? bounds.envCenterZ : bounds.gapCenterZ
  const ry = isOutsidePrimary ? bounds.envRy : bounds.Ry
  const rz = isOutsidePrimary ? bounds.envRz : bounds.Rz

  const v_rel = ry > 0.0001 ? THREE.MathUtils.clamp((pos.y - centerY) / ry, -1.0, 1.0) : 0.0
  const w_depth = rz > 0.0001 ? THREE.MathUtils.clamp((pos.z - centerZ) / rz, -1.0, 1.0) : 0.0
  const r_norm = Math.min(1.0, Math.sqrt(v_rel * v_rel + w_depth * w_depth))

  return [u, v_rel, w_depth, r_norm]
}

/**
 * Soft smooth max matching POCKET_VISIBILITY_GLSL's safeMax() to 1e-5 precision.
 */
function safeMax(a, b) {
  const diff = a - b
  return 0.5 * (a + b + Math.sqrt(diff * diff + 1e-8) - 1e-4)
}

export function getNeuralTravelOffset(time, waveNumber) {
  const period = waveNumber / FLOW_OMEGA
  if (!Number.isFinite(time) || !Number.isFinite(period) || period <= 1e-6) return 0
  const offset = (time % period) / period
  return offset < 0 ? offset + 1 : offset
}

/** Each rail has two texture rows: the rendered rest position and both Y/Z harmonics. */
export function createNeuralWaveTexture(leftWaves, rightWaves) {
  const data = new Float32Array(N_HERO * 16 * 4)
  const ends = []

  for (const { primaryCoreGeo, secondaryGeo } of [leftWaves, rightWaves]) {
    const wing = ends.length
    const wingEnds = new THREE.Vector4()
    // The primary geometry contains strands 0, 1, and 3; the violet core is separate.
    const coreSlots = [0, 1, 0, 2]
    for (let strand = 0; strand < 4; strand++) {
      const core = strand === 2 ? secondaryGeo : primaryCoreGeo
      const start = coreSlots[strand] * N_HERO
      const position = core.getAttribute('position').array
      const cos = core.getAttribute('aFlowCos').array
      const sin = core.getAttribute('aFlowSin').array
      const u = core.getAttribute('aU').array
      const restRow = (wing * 8 + strand * 2) * N_HERO * 4
      const harmonicRow = restRow + N_HERO * 4
      wingEnds.setComponent(strand, u[start + N_HERO - 1])
      for (let sample = 0; sample < N_HERO; sample++) {
        const i = (start + sample) * 3
        const j = sample * 4
        data[restRow + j] = position[i]
        data[restRow + j + 1] = position[i + 1]
        data[restRow + j + 2] = position[i + 2]
        data[harmonicRow + j] = cos[i + 1]
        data[harmonicRow + j + 1] = cos[i + 2]
        data[harmonicRow + j + 2] = sin[i + 1]
        data[harmonicRow + j + 3] = sin[i + 2]
      }
    }
    ends.push(wingEnds)
  }

  const texture = new THREE.DataTexture(data, N_HERO, 16, THREE.RGBAFormat, THREE.FloatType)
  texture.needsUpdate = true
  return { texture, ends }
}

/** Preserve longitudinal order while distributing the seeds over the full wrap. */
function distributeTravelSeeds(nodes, seeds) {
  nodes.sort((a, b) => a.u - b.u)
  for (let rank = 0; rank < nodes.length; rank++) {
    seeds[nodes[rank].idx] = (rank + 0.5) / nodes.length
  }
}

/**
 * Generates invisible anchor vertices along the inner margins of the upper and lower waves.
 */
export function generateMarginAnchors(side, H = H_VAL, config = {}, count = 64) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const anchors = []

  for (let k = 0; k < count; k++) {
    const u = 0.095 + (k / (count - 1)) * (1.00 - 0.095)
    const bounds = getAlmondPocketBounds(u, H, config)
    if (bounds.envHeight < 0.024) continue

    const x = sign * 10.0 * u
    const margin = u > 0.65 ? 0.0020 : (u < 0.20 ? 0.0018 : 0.0035)
    const yUp = bounds.envMaxY - margin
    const yLow = bounds.envMinY + margin

    const upPos = new THREE.Vector3(x, yUp, bounds.envCenterZ + bounds.envRz * 0.25)
    const lowPos = new THREE.Vector3(x, yLow, bounds.envCenterZ - bounds.envRz * 0.25)

    const relUp = computeRelativeCoordArray(upPos, u, H, config)
    const relLow = computeRelativeCoordArray(lowPos, u, H, config)
    const weight = computeConstraintWeight(u)

    anchors.push({
      id: `anchor_upper_${k}`,
      pos: upPos,
      u,
      hu: bounds.envHeight,
      weight,
      isAnchor: true,
      connectedCount: 0,
      layer: 0.0,
      alpha: 0.0,
      size: 0.0,
      v_rel: 1.0,
      relativeCoord: relUp,
    })

    anchors.push({
      id: `anchor_lower_${k}`,
      pos: lowPos,
      u,
      hu: bounds.envHeight,
      weight,
      isAnchor: true,
      connectedCount: 0,
      layer: 0.0,
      alpha: 0.0,
      size: 0.0,
      v_rel: -1.0,
      relativeCoord: relLow,
    })
  }

  return anchors
}

/**
 * 1D Lookup Table (LUT) of sorted active ribbon bounds along u once per build (Requirement 4).
 */
export class RibbonBoundsLUT {
  constructor(H = H_VAL, config = {}, samples = 1024, phases = 8) {
    this.samples = samples
    this.phases = phases
    this.H = H
    this.config = config
    // Float64 preserves the original double-precision interpolation decisions.
    this.data = new Float64Array((samples + 1) * 17)
    this.phaseMinY = new Float64Array((samples + 1) * phases)
    this.phaseMaxY = new Float64Array((samples + 1) * phases)
    this.maxEnvHeight = 0.0

    const phaseCos = new Float64Array(phases)
    const phaseSin = new Float64Array(phases)
    for (let p = 0; p < phases; p++) {
      const theta = (p * 2.0 * Math.PI) / phases
      phaseCos[p] = Math.cos(theta)
      phaseSin[p] = Math.sin(theta)
    }

    const c = new Float64Array(3)
    const s = new Float64Array(3)
    const bias = new Float64Array(4)
    const cosY = new Float64Array(4)
    const sinY = new Float64Array(4)

    const sample = {}
    for (let i = 0; i <= samples; i++) {
      const u = i / samples
      getAlmondPocketBounds(u, H, config, sample)
      const offset = i * 17
      this.data[offset + 0] = sample.y0
      this.data[offset + 1] = sample.y1
      this.data[offset + 2] = sample.z0
      this.data[offset + 3] = sample.z1
      this.data[offset + 4] = sample.y2
      this.data[offset + 5] = sample.z2
      this.data[offset + 6] = sample.y3
      this.data[offset + 7] = sample.z3
      this.data[offset + 8] = sample.yUpper
      this.data[offset + 9] = sample.yLower
      this.data[offset + 10] = sample.envMinY
      this.data[offset + 11] = sample.envMaxY
      this.data[offset + 12] = sample.envHeight
      this.data[offset + 13] = sample.envCenterY
      this.data[offset + 14] = sample.envCenterZ
      this.data[offset + 15] = sample.safeMargin
      this.data[offset + 16] = sample.minGapHeight

      if (u >= 0.08 && u <= 0.99 && sample.envHeight > this.maxEnvHeight) {
        this.maxEnvHeight = sample.envHeight
      }

      for (let j = 0; j < 4; j++) {
        const y0 = j === 0 ? sample.y0 : j === 1 ? sample.y1 : j === 2 ? sample.y2 : sample.y3
        getHeroMotion(j, u, H, config, c, s, 0)
        bias[j] = y0 - c[1]
        cosY[j] = c[1]
        sinY[j] = s[1]
      }

      const pBase = i * phases
      for (let p = 0; p < phases; p++) {
        const ct = phaseCos[p]
        const st = phaseSin[p]
        const yA = bias[0] + cosY[0] * ct + sinY[0] * st
        const yB = bias[1] + cosY[1] * ct + sinY[1] * st
        const yC = bias[2] + cosY[2] * ct + sinY[2] * st
        const yD = bias[3] + cosY[3] * ct + sinY[3] * st
        this.phaseMinY[pBase + p] = -safeMax(safeMax(-yA, -yB), safeMax(-yC, -yD))
        this.phaseMaxY[pBase + p] = safeMax(safeMax(yA, yB), safeMax(yC, yD))
      }
    }
    this._reusableBounds = {
      u: -0,
      y0: -0, y1: -0, z0: -0, z1: -0,
      y2: -0, z2: -0, y3: -0, z3: -0,
      yUpper: -0, yLower: -0,
      envMinY: -0, envMaxY: -0,
      envHeight: -0,
      envCenterY: -0, envCenterZ: -0,
      safeMargin: -0,
      minGapHeight: -0,
    }
    this._reusablePhase = { lo: 0, hi: 0, center: 0, radius: 1e-5 }
    this._ribbons = Array.from({ length: 4 }, (_, id) => ({ id, y: 0, z: 0 }))
    this._pocketPool = Array.from({ length: 3 }, () => ({}))
    this._pockets = []
  }

  getPhaseBounds(u, phaseIdx, out = this._reusablePhase) {
    const su = Math.max(0, Math.min(1, u)) * this.samples
    const i = Math.floor(su)
    const f = su - i
    const phases = this.phases
    if (i >= this.samples) {
      const idx = this.samples * phases + phaseIdx
      const lo = this.phaseMinY[idx]
      const hi = this.phaseMaxY[idx]
      out.lo = lo
      out.hi = hi
      out.center = 0.5 * (lo + hi)
      out.radius = Math.max(0.5 * (hi - lo), 1e-5)
      return out
    }
    const idx0 = i * phases + phaseIdx
    const idx1 = idx0 + phases
    const lo = this.phaseMinY[idx0] + f * (this.phaseMinY[idx1] - this.phaseMinY[idx0])
    const hi = this.phaseMaxY[idx0] + f * (this.phaseMaxY[idx1] - this.phaseMaxY[idx0])
    out.lo = lo
    out.hi = hi
    out.center = 0.5 * (lo + hi)
    out.radius = Math.max(0.5 * (hi - lo), 1e-5)
    return out
  }

  getBounds(u, out = this._reusableBounds) {
    const su = Math.max(0, Math.min(1, u)) * this.samples
    const i = Math.floor(su)
    const f = su - i
    if (i >= this.samples) {
      const offset = this.samples * 17
      const data = this.data
      out.u = u
      out.y0 = data[offset + 0]
      out.y1 = data[offset + 1]
      out.z0 = data[offset + 2]
      out.z1 = data[offset + 3]
      out.y2 = data[offset + 4]
      out.z2 = data[offset + 5]
      out.y3 = data[offset + 6]
      out.z3 = data[offset + 7]
      out.yUpper = data[offset + 8]
      out.yLower = data[offset + 9]
      out.envMinY = data[offset + 10]
      out.envMaxY = data[offset + 11]
      out.envHeight = data[offset + 12]
      out.envCenterY = data[offset + 13]
      out.envCenterZ = data[offset + 14]
      out.safeMargin = data[offset + 15]
      out.minGapHeight = data[offset + 16]
      return out
    }
    const data = this.data
    const offset = i * 17
    const next = offset + 17

    out.u = u
    out.y0 = data[offset + 0] + f * (data[next + 0] - data[offset + 0])
    out.y1 = data[offset + 1] + f * (data[next + 1] - data[offset + 1])
    out.z0 = data[offset + 2] + f * (data[next + 2] - data[offset + 2])
    out.z1 = data[offset + 3] + f * (data[next + 3] - data[offset + 3])
    out.y2 = data[offset + 4] + f * (data[next + 4] - data[offset + 4])
    out.z2 = data[offset + 5] + f * (data[next + 5] - data[offset + 5])
    out.y3 = data[offset + 6] + f * (data[next + 6] - data[offset + 6])
    out.z3 = data[offset + 7] + f * (data[next + 7] - data[offset + 7])
    out.yUpper = data[offset + 8] + f * (data[next + 8] - data[offset + 8])
    out.yLower = data[offset + 9] + f * (data[next + 9] - data[offset + 9])
    out.envMinY = data[offset + 10] + f * (data[next + 10] - data[offset + 10])
    out.envMaxY = data[offset + 11] + f * (data[next + 11] - data[offset + 11])
    out.envHeight = data[offset + 12] + f * (data[next + 12] - data[offset + 12])
    out.envCenterY = data[offset + 13] + f * (data[next + 13] - data[offset + 13])
    out.envCenterZ = data[offset + 14] + f * (data[next + 14] - data[offset + 14])
    out.safeMargin = data[offset + 15]
    out.minGapHeight = data[offset + 16]
    return out
  }

  // Returned records are borrowed until the next query. Callers traversing pockets
  // while making nested queries supply their own three preallocated records.
  getSubPockets(u, minSubGap = 0.026, out = this._pockets, pool = this._pocketPool) {
    const b = this.getBounds(u)
    const ribbons = this._ribbons
    for (let i = 0; i < 4; i++) {
      const r = ribbons[i]
      r.y = r.id === 0 ? b.y0 : r.id === 1 ? b.y1 : r.id === 2 ? b.y2 : b.y3
      r.z = r.id === 0 ? b.z0 : r.id === 1 ? b.z1 : r.id === 2 ? b.z2 : b.z3
    }
    // Four-element insertion sort: no temporary array or comparator allocation.
    for (let i = 1; i < 4; i++) {
      const r = ribbons[i]
      let j = i - 1
      while (j >= 0 && ribbons[j].y > r.y) {
        ribbons[j + 1] = ribbons[j--]
      }
      ribbons[j + 1] = r
    }
    let count = 0
    for (let i = 0; i < ribbons.length - 1; i++) {
      const lower = ribbons[i]
      const upper = ribbons[i + 1]
      const height = upper.y - lower.y
      if (height >= minSubGap) {
        const margin = Math.max(0.0010, 0.035 * height)
        const ry = Math.max(0.002, 0.5 * height - margin)
        const rz = Math.max(0.012, 0.5 * Math.abs(upper.z - lower.z) + 0.022)
        const pocket = pool[count]
        pocket.lowerId = lower.id
        pocket.upperId = upper.id
        pocket.lowerY = lower.y
        pocket.upperY = upper.y
        pocket.centerY = 0.5 * (upper.y + lower.y)
        pocket.centerZ = 0.5 * (upper.z + lower.z)
        pocket.height = height
        pocket.ry = ry
        pocket.rz = rz
        out[count++] = pocket
      }
    }
    out.length = count
    return out
  }
}

/**
 * 3D Spatial Hash Grid for accelerated Poisson-disk sampling and k-NN edge queries (Requirement 4).
 */
// Integer-keyed buckets preserve the legacy hash collisions and insertion order.
// Capacities grow geometrically during construction; queries never allocate.
class IntegerBuckets {
  constructor(capacity = 8192, entries = 8192) {
    this.keys = new Int32Array(capacity)
    this.heads = new Int32Array(capacity)
    this.tails = new Int32Array(capacity)
    this.ids = new Int32Array(entries)
    this.next = new Int32Array(entries)
    this.used = 0
    this.length = 0
  }

  slot(key) {
    const mask = this.keys.length - 1
    let slot = (Math.imul(key ^ (key >>> 16), 0x45d9f3b) >>> 0) & mask
    while (this.heads[slot] && this.keys[slot] !== key) slot = (slot + 1) & mask
    return slot
  }

  first(key) { return this.heads[this.slot(key)] - 1 }

  insert(key, id) {
    if ((this.used + 1) * 2 >= this.keys.length) {
      const keys = this.keys, heads = this.heads, tails = this.tails
      this.keys = new Int32Array(keys.length * 2)
      this.heads = new Int32Array(keys.length * 2)
      this.tails = new Int32Array(keys.length * 2)
      for (let i = 0; i < keys.length; i++) {
        if (!heads[i]) continue
        const slot = this.slot(keys[i])
        this.keys[slot] = keys[i]
        this.heads[slot] = heads[i]
        this.tails[slot] = tails[i]
      }
    }
    if (this.length === this.ids.length) {
      const ids = new Int32Array(this.length * 2), next = new Int32Array(this.length * 2)
      ids.set(this.ids); next.set(this.next)
      this.ids = ids; this.next = next
    }
    const slot = this.slot(key), entry = this.length++
    this.ids[entry] = id
    this.next[entry] = -1
    if (this.heads[slot]) this.next[this.tails[slot]] = entry
    else { this.keys[slot] = key; this.heads[slot] = entry + 1; this.used++ }
    this.tails[slot] = entry
  }
}

export class SpatialGrid3D {
  constructor(cellSize = 0.10) {
    this.cellSize = cellSize
    this.invCellSize = 1 / cellSize
    this.cells = new IntegerBuckets()
    this.queryIds = new Int32Array(256)
    this.queryDistances = new Float64Array(256)
  }

  _key(ix, iy, iz) {
    return ((ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791)) | 0
  }

  insert(x, y, z, id) {
    const ix = Math.floor(x * this.invCellSize)
    const iy = Math.floor(y * this.invCellSize)
    const iz = Math.floor(z * this.invCellSize)
    const k = this._key(ix, iy, iz)
    this.cells.insert(k, id)
  }

  isTooClose(x, y, z, reqRadius, nodes, projected = false, searchRadius = reqRadius) {
    const minX = Math.floor((x - searchRadius) * this.invCellSize)
    const maxX = Math.floor((x + searchRadius) * this.invCellSize)
    const minY = Math.floor((y - searchRadius) * this.invCellSize)
    const maxY = Math.floor((y + searchRadius) * this.invCellSize)
    const minZ = projected ? 0 : Math.floor((z - searchRadius) * this.invCellSize)
    const maxZ = projected ? 0 : Math.floor((z + searchRadius) * this.invCellSize)

    for (let ix = minX; ix <= maxX; ix++) {
      for (let iy = minY; iy <= maxY; iy++) {
        for (let iz = minZ; iz <= maxZ; iz++) {
          const cells = this.cells
          {
            for (let entry = cells.first(this._key(ix, iy, iz)); entry !== -1; entry = cells.next[entry]) {
              const other = nodes[cells.ids[entry]]
              const dx = other.pos.x - x
              const dy = (projected ? (other.projectedY ?? other.pos.y) : other.pos.y) - y
              const dz = projected ? 0 : other.pos.z - z
              const radius = Math.max(reqRadius, (projected ? other.projectedRadius : other.radius) || 0)
              const r2 = radius * radius
              if (dx * dx + dy * dy + dz * dz < r2) return true
            }
          }
        }
      }
    }
    return false
  }

  // All topology passes use the same immutable radius per node. Cache traversal
  // once in CSR order, including duplicate visits caused by legacy hash collisions.
  prepareQueries(nodes) {
    this.queryOffsets = new Int32Array(nodes.length + 1)
    let ids = new Int32Array(Math.max(256, nodes.length * 64))
    let distances = new Float64Array(ids.length)
    let used = 0
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const count = this.queryRadius(node.pos.x, node.pos.y, node.pos.z, Math.min(0.24, 0.42 * (node.hu + 0.035) + 0.030), nodes)
      while (used + count > ids.length) {
        const nextIds = new Int32Array(ids.length * 2), nextDistances = new Float64Array(ids.length * 2)
        nextIds.set(ids); nextDistances.set(distances)
        ids = nextIds; distances = nextDistances
      }
      for (let j = 0; j < count; j++) {
        ids[used + j] = this.queryIds[j]
        distances[used + j] = this.queryDistances[j]
      }
      used += count
      this.queryOffsets[i + 1] = used
    }
    this.queryIds = ids
    this.queryDistances = distances
  }

  queryRadius(x, y, z, radius, nodes) {
    let count = 0
    const r2 = radius * radius
    const minX = Math.floor((x - radius) * this.invCellSize)
    const maxX = Math.floor((x + radius) * this.invCellSize)
    const minY = Math.floor((y - radius) * this.invCellSize)
    const maxY = Math.floor((y + radius) * this.invCellSize)
    const minZ = Math.floor((z - radius) * this.invCellSize)
    const maxZ = Math.floor((z + radius) * this.invCellSize)

    for (let ix = minX; ix <= maxX; ix++) {
      for (let iy = minY; iy <= maxY; iy++) {
        for (let iz = minZ; iz <= maxZ; iz++) {
          const cells = this.cells
          {
            for (let entry = cells.first(this._key(ix, iy, iz)); entry !== -1; entry = cells.next[entry]) {
              const id = cells.ids[entry]
              const other = nodes[id]
              const dx = other.pos.x - x
              const dy = other.pos.y - y
              const dz = other.pos.z - z
              const d2 = dx * dx + dy * dy + dz * dz
              if (d2 <= r2) {
                if (count === this.queryIds.length) {
                  const ids = new Int32Array(count * 2), distances = new Float64Array(count * 2)
                  ids.set(this.queryIds); distances.set(this.queryDistances)
                  this.queryIds = ids; this.queryDistances = distances
                }
                this.queryIds[count] = id
                this.queryDistances[count++] = Math.sqrt(d2)
              }
            }
          }
        }
      }
    }
    return count
  }
}

/**
 * 2D Isotropic Spatial Grid for accelerated blue-noise spacing and k-NN queries.
 */
class IsotropicGrid2D {
  constructor(cellSize = 0.25) {
    this.cellSize = cellSize
    this.invCellSize = 1 / cellSize
    this.cells = new IntegerBuckets()
    this.queryIds = new Int32Array(256)
    this.queryDistances = new Float64Array(256)
  }

  _key(ix, iy) {
    return ((ix * 73856093) ^ (iy * 19349663)) | 0
  }

  insert(x, isoY, id) {
    const ix = Math.floor(x * this.invCellSize)
    const iy = Math.floor(isoY * this.invCellSize)
    this.cells.insert(this._key(ix, iy), id)
  }

  hasNeighborWithin(isoX, isoY, minDist, nodes, searchRadius = minDist, minHubDist = minDist) {
    const minX = Math.floor((isoX - searchRadius) * this.invCellSize)
    const maxX = Math.floor((isoX + searchRadius) * this.invCellSize)
    const minY = Math.floor((isoY - searchRadius) * this.invCellSize)
    const maxY = Math.floor((isoY + searchRadius) * this.invCellSize)

    for (let ix = minX; ix <= maxX; ix++) {
      for (let iy = minY; iy <= maxY; iy++) {
        for (let entry = this.cells.first(this._key(ix, iy)); entry !== -1; entry = this.cells.next[entry]) {
          const other = nodes[this.cells.ids[entry]]
          const dx = (other.isoX ?? other.pos.x) - isoX
          const dy = other.isoY - isoY
          const d2 = dx * dx + dy * dy
          const req = other.tier === 2 ? minHubDist : minDist
          if (d2 < req * req) return true
        }
      }
    }
    return false
  }

  queryRadius(isoX, isoY, radius, nodes) {
    let count = 0
    const r2 = radius * radius
    const minX = Math.floor((isoX - radius) * this.invCellSize)
    const maxX = Math.floor((isoX + radius) * this.invCellSize)
    const minY = Math.floor((isoY - radius) * this.invCellSize)
    const maxY = Math.floor((isoY + radius) * this.invCellSize)

    for (let ix = minX; ix <= maxX; ix++) {
      for (let iy = minY; iy <= maxY; iy++) {
        for (let entry = this.cells.first(this._key(ix, iy)); entry !== -1; entry = this.cells.next[entry]) {
          const id = this.cells.ids[entry]
          const other = nodes[id]
          const dx = (other.isoX ?? other.pos.x) - isoX
          const dy = other.isoY - isoY
          const d2 = dx * dx + dy * dy
          if (d2 <= r2) {
            if (count === this.queryIds.length) {
              const ids = new Int32Array(count * 2)
              const distances = new Float64Array(count * 2)
              ids.set(this.queryIds)
              distances.set(this.queryDistances)
              this.queryIds = ids
              this.queryDistances = distances
            }
            this.queryIds[count] = id
            this.queryDistances[count++] = Math.sqrt(d2)
          }
        }
      }
    }
    return count
  }
}

/**
 * 2D Spatial Grid for fast edge crossing validation without heap allocations.
 */
class EdgeGrid2D {
  constructor(cellSize = 0.25, maxEdges = 20000) {
    this.cellSize = cellSize
    this.invCellSize = 1 / cellSize
    this.cells = new IntegerBuckets()
    this.visited = new Int32Array(maxEdges)
    this.stamp = 1
  }

  _key(ix, iy) {
    return ((ix * 73856093) ^ (iy * 19349663)) | 0
  }

  insert(edgeIdx, pA, pB) {
    if (edgeIdx >= this.visited.length) {
      const nextVisited = new Int32Array(Math.max(this.visited.length * 2, edgeIdx + 1024))
      nextVisited.set(this.visited)
      this.visited = nextVisited
    }

    const minX = Math.floor(Math.min(pA.x, pB.x) * this.invCellSize)
    const maxX = Math.floor(Math.max(pA.x, pB.x) * this.invCellSize)
    const minY = Math.floor(Math.min(pA.y, pB.y) * this.invCellSize)
    const maxY = Math.floor(Math.max(pA.y, pB.y) * this.invCellSize)

    for (let ix = minX; ix <= maxX; ix++) {
      for (let iy = minY; iy <= maxY; iy++) {
        this.cells.insert(this._key(ix, iy), edgeIdx)
      }
    }
  }

  hasCrossing(pA, pB, candI, candJ, edges, rawNodes, sameTierOnly = false, targetTier = null) {
    const minX = Math.floor(Math.min(pA.x, pB.x) * this.invCellSize)
    const maxX = Math.floor(Math.max(pA.x, pB.x) * this.invCellSize)
    const minY = Math.floor(Math.min(pA.y, pB.y) * this.invCellSize)
    const maxY = Math.floor(Math.max(pA.y, pB.y) * this.invCellSize)

    this.stamp++
    const stamp = this.stamp
    for (let ix = minX; ix <= maxX; ix++) {
      for (let iy = minY; iy <= maxY; iy++) {
        const cells = this.cells
        for (let entry = cells.first(this._key(ix, iy)); entry !== -1; entry = cells.next[entry]) {
          const eIdx = cells.ids[entry]
          if (this.visited[eIdx] === stamp) continue
          this.visited[eIdx] = stamp
          const i = edges.i[eIdx], j = edges.j[eIdx]
          if (i === candI || j === candI || i === candJ || j === candJ) continue
          const eA = rawNodes[i]
          const eB = rawNodes[j]
          if (sameTierOnly && (eA.depthTier !== targetTier || eB.depthTier !== targetTier)) continue
          if (segmentsIntersect2D(pA, pB, eA.isoPos, eB.isoPos)) {
            return true
          }
        }
      }
    }
    return false
  }
}

/**
 * Validates that a candidate line segment (A -> B) stays strictly inside the live
 * 4-strand outer envelope across all 8 animation cycle phases at midpoints 0.25, 0.50, 0.75.
 */
function segmentInside8PhaseEnvelope(uA, vA, uB, vB, lut, marginFraction = 0.045) {
  const b = lut._reusablePhase
  const phases = lut.phases || 8
  for (let p = 0; p < phases; p++) {
    lut.getPhaseBounds(uA, p, b)
    const yA = b.center + b.radius * vA
    lut.getPhaseBounds(uB, p, b)
    const yB = b.center + b.radius * vB

    for (let s = 1; s <= 3; s++) {
      const t = s * 0.25
      const ut = uA + t * (uB - uA)
      const yt = yA + t * (yB - yA)
      lut.getPhaseBounds(ut, p, b)
      const h = Math.max(0.0, b.hi - b.lo)
      const margin = Math.max(0.005, marginFraction * h)
      if (yt > b.hi - margin || yt < b.lo + margin) {
        return false
      }
    }
  }
  return true
}

function computeVMax(envHeight, isoYScale, maxFrac, minIsoMargin) {
  const halfIso = 0.5 * envHeight * isoYScale
  if (halfIso <= minIsoMargin + 1e-4) return 0.0
  return Math.max(0.0, Math.min(maxFrac, 1.0 - Math.max(1.0 - maxFrac, minIsoMargin / halfIso)))
}

function sampleStratifiedNodes(sign, isoXScale, isoYScale, lut, prng, envScale) {
  const rawNodes = []
  const gridCell = Math.max(0.08, 0.20 * envScale)
  const grid = new IsotropicGrid2D(gridCell)
  const phaseBuf = { lo: 0, hi: 0, center: 0, radius: 1e-5 }

  function runTierPass({
    uStart,
    uEnd,
    cellIso,
    minIsoHeight,
    maxVFrac,
    minIsoMargin,
    minDistExisting,
    minDistHub,
    searchRadius,
    tier,
    isWeb,
    maxAttempts,
    wDepthMin,
    wDepthMax,
    organicCluster = false,
  }) {
    const du = cellIso / (10.0 * isoXScale)
    for (let u0 = uStart; u0 < uEnd; u0 += du) {
      const u1 = Math.min(uEnd, u0 + du)
      const stripDu = u1 - u0
      if (stripDu < 0.002) continue
      const uMid = 0.5 * (u0 + u1)
      const bMid = lut.getBounds(uMid)
      if (bMid.envHeight * isoYScale < minIsoHeight) continue

      const vMax = computeVMax(bMid.envHeight, isoYScale, maxVFrac, minIsoMargin)
      if (vMax <= 0.05) continue
      const activeIsoH = isoYScale * bMid.envHeight * vMax
      let densityMod = 1.0
      let localHubMin = minDistHub
      if (organicCluster) {
        const cellScale = Math.sqrt(envScale)
        densityMod = 0.72 + 0.58 * (0.5 + 0.5 * Math.sin(uMid * 18.7 + sign * 1.1))
        localHubMin = (0.24 + 0.20 * (0.5 + 0.5 * Math.cos(uMid * 14.3 - sign * 0.7))) * cellScale
      }
      const lambda = ((10.0 * isoXScale * stripDu * activeIsoH) / (cellIso * cellIso)) * densityMod
      const baseCount = Math.floor(lambda)
      const count = baseCount + (prng() < (lambda - baseCount) ? 1 : 0)
      if (count <= 0) continue

      for (let k = 0; k < count; k++) {
        const vLo = -vMax + (2.0 * vMax) * (k / count)
        const vHi = -vMax + (2.0 * vMax) * ((k + 1) / count)

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const u = u0 + (0.06 + 0.88 * prng()) * stripDu
          const vRaw = vLo + (0.06 + 0.88 * prng()) * (vHi - vLo)
          const bLoc = lut.getBounds(u)
          if (bLoc.envHeight * isoYScale < minIsoHeight * 0.82) continue

          const vMaxLoc = computeVMax(bLoc.envHeight, isoYScale, maxVFrac, minIsoMargin)
          if (vMaxLoc <= 0.05) continue
          const v = vMax > 1e-4 ? vRaw * (vMaxLoc / vMax) : vRaw
          if (Math.abs(v) > vMaxLoc) continue

          const x = sign * 10.0 * u
          const y = bLoc.envCenterY + v * 0.5 * bLoc.envHeight
          const isoX = x * isoXScale
          const isoY = y * isoYScale

          const effSearch = Math.max(searchRadius, localHubMin)
          if (grid.hasNeighborWithin(isoX, isoY, minDistExisting, rawNodes, effSearch, localHubMin)) continue

          const w_depth = wDepthMin + prng() * (wDepthMax - wDepthMin)
          const envMinZ = Math.min(bLoc.z0, bLoc.z1, bLoc.z2, bLoc.z3)
          const envMaxZ = Math.max(bLoc.z0, bLoc.z1, bLoc.z2, bLoc.z3)
          const envRz = Math.max(0.015, 0.5 * (envMaxZ - envMinZ) + 0.025)
          const z = bLoc.envCenterZ + w_depth * envRz

          lut.getPhaseBounds(u, 0, phaseBuf)
          const v_frame = Math.max(-0.88, Math.min(0.88, (y - phaseBuf.center) / phaseBuf.radius))
          const r_norm = Math.min(1.0, Math.hypot(v_frame, w_depth))
          const depthTier = w_depth > 0.25 ? 'fg' : (w_depth < -0.25 ? 'bg' : 'mid')
          const layer = w_depth > 0.25 ? 1.0 : (w_depth < -0.25 ? -1.0 : 0.0)
          const id = rawNodes.length
          const pos = new THREE.Vector3(x, y, z)

          let size, alpha, lineAlpha, hubAccent, maxDeg
          if (tier === 2) {
            size = 13.5 + 5.0 * prng()
            alpha = 0.94 + 0.06 * prng()
            lineAlpha = 0.34 + 0.08 * prng()
            hubAccent = 1.0
            maxDeg = 6
          } else if (tier === 1) {
            size = 5.0 + 2.2 * prng()
            alpha = 0.64 + 0.20 * prng()
            lineAlpha = 0.21 + 0.08 * prng()
            hubAccent = 0.42
            maxDeg = 4
          } else {
            size = isWeb ? (2.5 + 0.9 * prng()) : (2.2 + 1.0 * prng())
            alpha = isWeb ? (0.28 + 0.14 * prng()) : (0.24 + 0.16 * prng())
            lineAlpha = 0.13 + 0.06 * prng()
            hubAccent = 0.0
            maxDeg = isWeb ? 3 : 0
          }

          rawNodes.push({
            id: `node_${id}`,
            idx: id,
            pos,
            isoX,
            isoY,
            isoPos: { x: isoX, y: isoY },
            u,
            hu: Math.max(0.020, bLoc.envHeight),
            v_frame,
            w_depth,
            r_norm,
            isWeb,
            connectedCount: 0,
            layer,
            depthTier,
            tier,
            maxDeg,
            alpha,
            lineAlpha,
            hubAccent,
            size,
            relativeCoord: [u, v_frame, w_depth, r_norm],
          })
          grid.insert(isoX, isoY, id)
          break
        }
      }
    }
  }

  const cellScale = Math.sqrt(envScale)

  // Pass 1: Tier-1 Hero Starburst Hubs (~6-7%, 2-4 per major open pocket + inner chamber anchor)
  runTierPass({
    uStart: 0.135,
    uEnd: 0.975,
    cellIso: 0.48 * cellScale,
    minIsoHeight: 0.130 * envScale,
    maxVFrac: 0.75,
    minIsoMargin: 0.056 * envScale,
    minDistExisting: 0.25 * cellScale,
    minDistHub: 0.27 * cellScale,
    searchRadius: 0.45 * cellScale,
    tier: 2,
    isWeb: true,
    maxAttempts: 8,
    wDepthMin: -0.22,
    wDepthMax: 0.85,
    organicCluster: true,
  })

  // Pass 2: Tier-2 Mid Constellation Vertices (~25%, full pocket height + inner throat anchors)
  runTierPass({
    uStart: 0.090,
    uEnd: 0.985,
    cellIso: 0.25 * cellScale,
    minIsoHeight: 0.055 * envScale,
    maxVFrac: 0.87,
    minIsoMargin: 0.038 * envScale,
    minDistExisting: 0.165 * cellScale,
    minDistHub: 0.185 * cellScale,
    searchRadius: 0.22 * cellScale,
    tier: 1,
    isWeb: true,
    maxAttempts: 6,
    wDepthMin: -0.78,
    wDepthMax: 0.82,
  })

  // Pass 3A: Tier-3 Delicate Web Connectors (complete full-height triangulation without cage clutter)
  runTierPass({
    uStart: 0.088,
    uEnd: 0.986,
    cellIso: 0.275 * cellScale,
    minIsoHeight: 0.040 * envScale,
    maxVFrac: 0.88,
    minIsoMargin: 0.032 * envScale,
    minDistExisting: 0.140 * cellScale,
    minDistHub: 0.150 * cellScale,
    searchRadius: 0.17 * cellScale,
    tier: 0,
    isWeb: true,
    maxAttempts: 5,
    wDepthMin: -0.82,
    wDepthMax: 0.55,
  })

  // Pass 3B: Tier-3 Volumetric Micro-Dust (dimmer background sparkles for 3D depth)
  runTierPass({
    uStart: 0.085,
    uEnd: 0.988,
    cellIso: 0.170 * cellScale,
    minIsoHeight: 0.042 * envScale,
    maxVFrac: 0.88,
    minIsoMargin: 0.030 * envScale,
    minDistExisting: 0.088 * cellScale,
    minDistHub: 0.105 * cellScale,
    searchRadius: 0.125 * cellScale,
    tier: 0,
    isWeb: false,
    maxAttempts: 4,
    wDepthMin: -0.88,
    wDepthMax: 0.25,
  })

  // Build dedicated spatial grid over web nodes only for fast edge queries
  const webGrid = new IsotropicGrid2D(gridCell)
  for (let i = 0; i < rawNodes.length; i++) {
    if (rawNodes[i].isWeb) {
      webGrid.insert(rawNodes[i].isoX, rawNodes[i].isoY, i)
    }
  }

  return { rawNodes, webGrid }
}

function connectNeuralNodes(rawNodes, webGrid, lut, isoXScale, isoYScale, envScale) {
  const nCount = rawNodes.length
  const maxDegreeCap = 6
  const edgeCapacity = Math.max(64, Math.ceil(nCount * maxDegreeCap / 2))
  const edges = {
    length: 0,
    i: new Int32Array(edgeCapacity),
    j: new Int32Array(edgeCapacity),
    fallback: new Uint8Array(edgeCapacity),
  }
  const adjacency = new Int32Array(nCount * maxDegreeCap)
  const edgeGrid = new EdgeGrid2D(Math.max(0.08, 0.24 * envScale), edgeCapacity)

  function hasEdge(i, j) {
    for (let k = 0; k < rawNodes[i].connectedCount; k++) {
      if (adjacency[i * maxDegreeCap + k] === j) return true
    }
    return false
  }

  function hasTightAngle(i, j, cosLimit = 0.90) {
    const a = rawNodes[i]
    const b = rawNodes[j]
    const dx = b.isoX - a.isoX
    const dy = b.isoY - a.isoY
    const l2 = dx * dx + dy * dy
    if (l2 < 1e-8) return true
    for (let slot = 0; slot < a.connectedCount; slot++) {
      const n = rawNodes[adjacency[i * maxDegreeCap + slot]]
      const nx = n.isoX - a.isoX
      const ny = n.isoY - a.isoY
      const dot = dx * nx + dy * ny
      if (dot > 0 && dot * dot > cosLimit * cosLimit * l2 * (nx * nx + ny * ny)) {
        return true
      }
    }
    return false
  }

  function tryAddEdge(i, j, allowCrossing = false, cosLimit = 0.90, isFallback = false, capOverride = maxDegreeCap) {
    if (i === j || hasEdge(i, j)) return false
    const a = rawNodes[i]
    const b = rawNodes[j]
    if (!a.isWeb || !b.isWeb) return false
    const capA = Math.min(capOverride, a.maxDeg)
    const capB = Math.min(capOverride, b.maxDeg)
    if (a.connectedCount >= capA || b.connectedCount >= capB) return false
    if (cosLimit < 1.0 && (hasTightAngle(i, j, cosLimit) || hasTightAngle(j, i, cosLimit))) return false
    if (!segmentInside8PhaseEnvelope(a.u, a.v_frame, b.u, b.v_frame, lut, 0.045)) return false
    if (!allowCrossing && edgeGrid.hasCrossing(a.isoPos, b.isoPos, i, j, edges, rawNodes, false)) return false

    const edgeIdx = edges.length
    edges.i[edgeIdx] = i
    edges.j[edgeIdx] = j
    edges.fallback[edgeIdx] = isFallback ? 1 : 0
    edges.length++
    adjacency[i * maxDegreeCap + rawNodes[i].connectedCount++] = j
    adjacency[j * maxDegreeCap + rawNodes[j].connectedCount++] = i
    edgeGrid.insert(edgeIdx, a.isoPos, b.isoPos)
    return true
  }

  // Gather short-range isotropic neighbor pairs across web nodes and sort shortest-first
  const pairCapacity = Math.max(256, nCount * 10)
  let pairA = new Int32Array(pairCapacity)
  let pairB = new Int32Array(pairCapacity)
  let pairScore = new Float32Array(pairCapacity)
  let pairCount = 0
  const maxDu = 0.095 / Math.max(0.75, isoXScale)

  for (let i = 0; i < nCount; i++) {
    const nA = rawNodes[i]
    if (!nA.isWeb) continue
    const hIsoA = nA.hu * isoYScale
    const searchR = Math.min(0.85 * envScale, Math.max(0.24 * envScale, 0.62 * hIsoA))
    const qCount = webGrid.queryRadius(nA.isoX, nA.isoY, searchR, rawNodes)

    for (let q = 0; q < qCount; q++) {
      const j = webGrid.queryIds[q]
      if (j <= i) continue
      const distIso = webGrid.queryDistances[q]
      if (distIso < 0.03 * envScale) continue
      const nB = rawNodes[j]
      if (!nB.isWeb || Math.abs(nA.u - nB.u) > maxDu) continue

      const avgHIso = 0.5 * (nA.hu + nB.hu) * isoYScale
      const maxEdgeDist = Math.min(0.68 * envScale, Math.max(0.18 * envScale, 0.50 * avgHIso))
      if (distIso > maxEdgeDist) continue

      const depthPenalty = 1.0 + 0.08 * Math.abs(nA.w_depth - nB.w_depth)
      const score = distIso * depthPenalty

      if (pairCount === pairA.length) {
        const nextLen = pairA.length * 2
        const nA2 = new Int32Array(nextLen)
        const nB2 = new Int32Array(nextLen)
        const nS2 = new Float32Array(nextLen)
        nA2.set(pairA); nB2.set(pairB); nS2.set(pairScore)
        pairA = nA2; pairB = nB2; pairScore = nS2
      }
      pairA[pairCount] = i
      pairB[pairCount] = j
      pairScore[pairCount] = score
      pairCount++
    }
  }

  const order = new Int32Array(pairCount)
  for (let p = 0; p < pairCount; p++) order[p] = p
  order.sort((a, b) => pairScore[a] - pairScore[b])

  // Pass A: Shortest-first planar backbone up to degree 4
  for (let p = 0; p < pairCount; p++) {
    const idx = order[p]
    tryAddEdge(pairA[idx], pairB[idx], false, 0.90, false, 4)
  }

  // Pass B: Repair under-connected web vertices (< 2 edges) before triangulation closure
  function repairUnderConnected() {
    const repairDu = 0.11 / Math.max(0.75, isoXScale)
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < nCount; i++) {
        const nA = rawNodes[i]
        if (!nA.isWeb || nA.connectedCount >= 2) continue
        const hIso = nA.hu * isoYScale
        const searchR = Math.min(1.0 * envScale, Math.max(0.30 * envScale, 0.78 * hIso))
        const qCount = webGrid.queryRadius(nA.isoX, nA.isoY, searchR, rawNodes)

        const cands = []
        for (let q = 0; q < qCount; q++) {
          const j = webGrid.queryIds[q]
          if (j === i || hasEdge(i, j)) continue
          const nB = rawNodes[j]
          if (!nB.isWeb || nB.connectedCount >= nB.maxDeg || Math.abs(nA.u - nB.u) > repairDu) continue
          cands.push({ j, d: webGrid.queryDistances[q] })
        }
        cands.sort((a, b) => a.d - b.d)

        for (let c = 0; c < cands.length && nA.connectedCount < 2; c++) {
          const allowCross = pass >= 2
          const cosLim = pass === 0 ? 0.93 : 0.98
          tryAddEdge(i, cands[c].j, allowCross, cosLim, pass > 0, maxDegreeCap)
        }
      }
    }
  }
  repairUnderConnected()

  // Pass C: Triangulated spiderweb closure up to per-tier maxDegree (6 for Tier-1, 4 for Tier-2, 3 for Tier-3)
  for (let p = 0; p < pairCount; p++) {
    const idx = order[p]
    tryAddEdge(pairA[idx], pairB[idx], false, 0.92, false, maxDegreeCap)
  }

  // Pass D: Final repair ensuring every web node has >= 2 edges
  repairUnderConnected()

  return edges
}

/**
 * Generates the refined volumetric neural field BufferGeometries (linesGeo, pointsGeo, hazeGeo).
 * Area-proportional stratified sampling across full wave arches with organic hub clustering,
 * triangulated spiderweb, and velvety localized interior pocket nebula.
 *
 * @param {'left' | 'right'} side
 * @param {number} [H=H_VAL]
 * @param {object} [config={}]
 * @returns {{ linesGeo: THREE.BufferGeometry, pointsGeo: THREE.BufferGeometry, hazeGeo: THREE.BufferGeometry }}
 */
export function generateRefinedNeuralField(side, H = H_VAL, config = {}, projectionAspect = 1.8 * (config.breadthMultiplier ?? 1), xScale = 1.0) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const seed = isLeft ? 314159 : 271828
  const prng = createPrng(seed)
  const safeXScale = Math.max(0.75, Math.min(2.6, xScale || 1.0))
  const safeAspect = Math.max(0.5, Math.min(8.0, projectionAspect || 1.8))
  const isoYScale = safeAspect * safeXScale

  // 0. Precompute 8-phase LUT of ribbon bounds along u once per build
  const lut = new RibbonBoundsLUT(H, config, 256, 8)
  const baselineMaxIsoH = 2.8
  const maxEnvIsoH = lut.maxEnvHeight * isoYScale
  const envScale = THREE.MathUtils.clamp(maxEnvIsoH / baselineMaxIsoH, 0.38, 1.30)

  // 1. Stratified organic constellation sampling + triangulated spiderweb
  const { rawNodes, webGrid } = sampleStratifiedNodes(sign, safeXScale, isoYScale, lut, prng, envScale)
  const edges = connectNeuralNodes(rawNodes, webGrid, lut, safeXScale, isoYScale, envScale)

  // Keep connected web nodes + background micro-dust sparkles
  const visibleNodes = rawNodes.filter(n => !n.isWeb || n.connectedCount > 0)

  // Build the original graph first, then assign a shared travel coordinate to each vertex.
  const connectedWebNodes = visibleNodes.filter(n => n.isWeb)
  const travelSeeds = new Float32Array(rawNodes.length)
  distributeTravelSeeds(connectedWebNodes, travelSeeds)
  distributeTravelSeeds(visibleNodes.filter(n => !n.isWeb), travelSeeds)

  // A line vertex carries its partner's seed so both ends agree on seam visibility.
  const lineVertCount = edges.length * 2
  const linePositions = new Float32Array(lineVertCount * 3)
  const lineStyles = new Float32Array(lineVertCount * 2)
  const lineRelativeCoords = new Float32Array(lineVertCount * 4)
  const partnerSeeds = new Float32Array(lineVertCount)

  for (let edge = 0; edge < edges.length; edge++) {
    const nodeA = rawNodes[edges.i[edge]]
    const nodeB = rawNodes[edges.j[edge]]
    for (let end = 0; end < 2; end++) {
      const n = end === 0 ? nodeA : nodeB
      const partner = end === 0 ? nodeB : nodeA
      const i = edge * 2 + end
      const u = travelSeeds[n.idx]
      const depthScale = 0.62 + 0.38 * (0.5 + 0.5 * n.w_depth)
      linePositions[i * 3] = sign * 10.0 * u
      linePositions[i * 3 + 1] = n.pos.y
      linePositions[i * 3 + 2] = n.pos.z
      lineStyles[i * 2] = n.lineAlpha * depthScale
      lineStyles[i * 2 + 1] = n.hubAccent
      lineRelativeCoords.set(n.relativeCoord, i * 4)
      lineRelativeCoords[i * 4] = u
      partnerSeeds[i] = travelSeeds[partner.idx]
    }
  }

  const linesGeo = new THREE.BufferGeometry()
  linesGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
  linesGeo.setAttribute('aLineStyle', new THREE.BufferAttribute(lineStyles, 2))
  linesGeo.setAttribute('aRelativeCoord', new THREE.BufferAttribute(lineRelativeCoords, 4))
  linesGeo.setAttribute('aPartnerU', new THREE.BufferAttribute(partnerSeeds, 1))

  // 3. Build Points BufferGeometry (3-Tier Glowing Star Constellation)
  const pointCount = visibleNodes.length
  const pointPositions = new Float32Array(pointCount * 3)
  const pointStyles = new Float32Array(pointCount * 3)
  const pointRelativeCoords = new Float32Array(pointCount * 4)

  for (let nIdx = 0; nIdx < pointCount; nIdx++) {
    const n = visibleNodes[nIdx]
    pointPositions[nIdx * 3] = sign * 10.0 * travelSeeds[n.idx]
    pointPositions[nIdx * 3 + 1] = n.pos.y
    pointPositions[nIdx * 3 + 2] = n.pos.z
    pointStyles[nIdx * 3] = n.size
    pointStyles[nIdx * 3 + 1] = n.alpha
    pointStyles[nIdx * 3 + 2] = n.tier
    pointRelativeCoords[nIdx * 4] = travelSeeds[n.idx]
    pointRelativeCoords[nIdx * 4 + 1] = n.relativeCoord[1]
    pointRelativeCoords[nIdx * 4 + 2] = n.relativeCoord[2]
    pointRelativeCoords[nIdx * 4 + 3] = n.relativeCoord[3]
  }

  const pointsGeo = new THREE.BufferGeometry()
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
  pointsGeo.setAttribute('aPointStyle', new THREE.BufferAttribute(pointStyles, 3))
  pointsGeo.setAttribute('aRelativeCoord', new THREE.BufferAttribute(pointRelativeCoords, 4))
  if (pointCount > 0) {
    pointsGeo.computeBoundingBox()
    pointsGeo.computeBoundingSphere()
  }

  // 4. Velvety Interior Pocket Nebula (localized luminous glow inside open chamber bellies)
  const cellScale = Math.sqrt(envScale)
  const hazeSpanScale = Math.max(1.0, Math.sqrt(safeXScale / 1.55))
  const hazeCellIso = 0.130 * cellScale * hazeSpanScale
  const hazeDu = hazeCellIso / (10.0 * safeXScale)
  const hazeGrid = new IsotropicGrid2D(Math.max(0.08, 0.15 * cellScale * hazeSpanScale))
  const hazeNodes = []
  let hazeCap = 960
  let hazePositions = new Float32Array(hazeCap * 3)
  let hazeStyles = new Float32Array(hazeCap * 2)
  let hazeRelativeCoords = new Float32Array(hazeCap * 4)
  const hazePhaseBuf = { lo: 0, hi: 0, center: 0, radius: 1e-5 }
  let hazeCount = 0

  for (let u0 = 0.105; u0 < 0.982; u0 += hazeDu) {
    const u1 = Math.min(0.982, u0 + hazeDu)
    const stripDu = u1 - u0
    if (stripDu < 0.002) continue
    const uMid = 0.5 * (u0 + u1)
    const bMid = lut.getBounds(uMid)
    if (bMid.envHeight * isoYScale < 0.062 * envScale) continue

    const vMaxHaze = computeVMax(bMid.envHeight, isoYScale, 0.78, 0.048 * envScale)
    if (vMaxHaze <= 0.05) continue
    const activeIsoH = isoYScale * bMid.envHeight * vMaxHaze
    const lambda = (10.0 * safeXScale * stripDu * activeIsoH) / (hazeCellIso * hazeCellIso)
    const baseCount = Math.floor(lambda)
    const count = baseCount + (prng() < (lambda - baseCount) ? 1 : 0)
    if (count <= 0) continue

    for (let k = 0; k < count; k++) {
      const vLo = -vMaxHaze + (2.0 * vMaxHaze) * (k / count)
      const vHi = -vMaxHaze + (2.0 * vMaxHaze) * ((k + 1) / count)

      for (let attempt = 0; attempt < 4; attempt++) {
        const u = u0 + (0.08 + 0.84 * prng()) * stripDu
        const vRaw = vLo + (0.08 + 0.84 * prng()) * (vHi - vLo)
        const bLoc = lut.getBounds(u)
        if (bLoc.envHeight * isoYScale < 0.055 * envScale) continue

        const vMaxLoc = computeVMax(bLoc.envHeight, isoYScale, 0.78, 0.048 * envScale)
        if (vMaxLoc <= 0.05) continue
        const v_rel = vMaxHaze > 1e-4 ? vRaw * (vMaxLoc / vMaxHaze) : vRaw
        if (Math.abs(v_rel) > vMaxLoc) continue

        const x = sign * 10.0 * u
        const y = bLoc.envCenterY + v_rel * 0.5 * bLoc.envHeight
        const isoX = x * safeXScale
        const isoY = y * isoYScale
        const minHazeDist = 0.068 * cellScale * hazeSpanScale
        if (hazeGrid.hasNeighborWithin(isoX, isoY, minHazeDist, hazeNodes, minHazeDist * 1.15)) continue

        const w_depth = -0.18 - prng() * 0.54
        const envMinZ = Math.min(bLoc.z0, bLoc.z1, bLoc.z2, bLoc.z3)
        const envMaxZ = Math.max(bLoc.z0, bLoc.z1, bLoc.z2, bLoc.z3)
        const envRz = Math.max(0.015, 0.5 * (envMaxZ - envMinZ) + 0.025)
        const z = bLoc.envCenterZ + w_depth * envRz

        lut.getPhaseBounds(u, 0, hazePhaseBuf)
        const v_frame = Math.max(-0.78, Math.min(0.78, (y - hazePhaseBuf.center) / hazePhaseBuf.radius))
        const r_norm = Math.min(1.0, Math.hypot(v_frame, w_depth))

        const vRatio = v_frame / Math.max(0.25, vMaxLoc)
        const vTaper = 1.0 - 0.14 * vRatio * vRatio
        const baseAlpha = 0.038 + prng() * 0.020
        const alpha = baseAlpha * vTaper
        const sizeJitter = 0.90 + prng() * 0.26

        if (hazeCount >= hazeCap) {
          const nextCap = hazeCap * 2
          const np = new Float32Array(nextCap * 3)
          const ns = new Float32Array(nextCap * 2)
          const nr = new Float32Array(nextCap * 4)
          np.set(hazePositions)
          ns.set(hazeStyles)
          nr.set(hazeRelativeCoords)
          hazePositions = np
          hazeStyles = ns
          hazeRelativeCoords = nr
          hazeCap = nextCap
        }

        hazeGrid.insert(isoX, isoY, hazeNodes.length)
        hazeNodes.push({ pos: { x, y, z }, isoX, isoY })

        hazePositions[hazeCount * 3] = x
        hazePositions[hazeCount * 3 + 1] = y
        hazePositions[hazeCount * 3 + 2] = z
        hazeStyles[hazeCount * 2] = sizeJitter
        hazeStyles[hazeCount * 2 + 1] = alpha
        hazeRelativeCoords[hazeCount * 4] = u
        hazeRelativeCoords[hazeCount * 4 + 1] = v_frame
        hazeRelativeCoords[hazeCount * 4 + 2] = w_depth
        hazeRelativeCoords[hazeCount * 4 + 3] = r_norm
        hazeCount++
        break
      }
    }
  }

  // Haze was sampled in ascending longitudinal strips.
  for (let i = 0; i < hazeCount; i++) {
    const u = (i + 0.5) / hazeCount
    hazePositions[i * 3] = sign * 10.0 * u
    hazeRelativeCoords[i * 4] = u
  }

  const hazeGeo = new THREE.BufferGeometry()
  hazeGeo.setAttribute('position', new THREE.BufferAttribute(hazePositions.slice(0, hazeCount * 3), 3))
  hazeGeo.setAttribute('aHazeStyle', new THREE.BufferAttribute(hazeStyles.slice(0, hazeCount * 2), 2))
  hazeGeo.setAttribute('aRelativeCoord', new THREE.BufferAttribute(hazeRelativeCoords.slice(0, hazeCount * 4), 4))
  if (hazeCount > 0) {
    hazeGeo.computeBoundingBox()
    hazeGeo.computeBoundingSphere()
  }

  return {
    linesGeo,
    pointsGeo,
    hazeGeo,
  }
}
