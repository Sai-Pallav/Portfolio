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
  computeConstraintWeight,
  getHeroMotion,
} from './generateWireGeometry.js'
import { segmentsIntersect2D } from './neuralGraphModel.js'

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

/** Bake all four live wall harmonics and a normalized vertical coordinate. */
function addPocketTravelAttributes(geometry, H, config, profiles, maxVClamp = 0.88, useCache = true) {
  const positions = geometry.getAttribute('position').array
  const relCoords = geometry.getAttribute('aRelativeCoord').array
  const count = relCoords.length / 4
  const bias = new Float32Array(count * 4)
  const cos = new Float32Array(count * 4)
  const sin = new Float32Array(count * 4)
  const frame = new Float32Array(count * 3)
  const axis = new Float32Array(count * 3)
  const normal = new Float32Array(count * 3)
  const depthMotion = new Float32Array(count * 2)
  const heroes = [heroY0, heroY1, heroY2, heroY3]
  const c = new Float64Array(3), s = new Float64Array(3)
  const scratchProfile = new Float64Array(26)

  for (let i = 0; i < count; i++) {
    const u = relCoords[4 * i]
    let p = useCache ? profiles.get(u) : null
    if (!p) {
      p = useCache ? new Float64Array(26) : scratchProfile
      for (let j = 0; j < 4; j++) {
        const y = heroes[j](u, H, config)
        getHeroMotion(j, u, H, config, c, s)
        p[j] = y - c[1]        // 0..3: bias
        p[4 + j] = c[1]        // 4..7: cos
        p[8 + j] = s[1]        // 8..11: sin
        p[12 + j] = y          // 12..15: restY
        p[16 + j] = c[2]       // 16..19: depthCos
        p[20 + j] = s[2]       // 20..23: depthSin
      }
      // Match safeMax envelope used in GLSL
      p[24] = -safeMax(
        safeMax(-p[12], -p[13]),
        safeMax(-p[14], -p[15])
      )
      p[25] = safeMax(
        safeMax(p[12], p[13]),
        safeMax(p[14], p[15])
      )
      if (useCache) profiles.set(u, p)
    }

    const i4 = 4 * i
    bias[i4] = p[0]; bias[i4 + 1] = p[1]; bias[i4 + 2] = p[2]; bias[i4 + 3] = p[3]
    cos[i4] = p[4]; cos[i4 + 1] = p[5]; cos[i4 + 2] = p[6]; cos[i4 + 3] = p[7]
    sin[i4] = p[8]; sin[i4 + 1] = p[9]; sin[i4 + 2] = p[10]; sin[i4 + 3] = p[11]

    const yRest = positions[3 * i + 1]
    const zRest = positions[3 * i + 2]

    // Inverse vertical proximity weighting across all 4 strands prevents phase cancellation
    const w0 = 1.0 / (Math.abs(yRest - p[12]) + 0.05)
    const w1 = 1.0 / (Math.abs(yRest - p[13]) + 0.05)
    const w2 = 1.0 / (Math.abs(yRest - p[14]) + 0.05)
    const w3 = 1.0 / (Math.abs(yRest - p[15]) + 0.05)
    const sumW = w0 + w1 + w2 + w3
    const invSumW = sumW > 1e-6 ? 1.0 / sumW : 0.25
    depthMotion[2 * i] = (w0 * p[16] + w1 * p[17] + w2 * p[18] + w3 * p[19]) * invSumW * 0.25
    depthMotion[2 * i + 1] = (w0 * p[20] + w1 * p[21] + w2 * p[22] + w3 * p[23]) * invSumW * 0.25

    const low = p[24]
    const high = p[25]
    const center = (low + high) * 0.5
    const radius = Math.max((high - low) * 0.5, 1e-5)
    const vFrame = Math.max(-maxVClamp, Math.min(maxVClamp, (yRest - center) / radius))

    frame[3 * i] = vFrame
    frame[3 * i + 1] = zRest
    frame[3 * i + 2] = radius

    // Keep synced v_frame in aRelativeCoord.y as well
    relCoords[i4 + 1] = vFrame

    positions[3 * i + 1] = 0
    positions[3 * i + 2] = 0
    axis[3 * i + 1] = 1
    normal[3 * i + 2] = 1
  }

  geometry.setAttribute('aWaveBias', new THREE.BufferAttribute(bias, 4))
  geometry.setAttribute('aWaveCos', new THREE.BufferAttribute(cos, 4))
  geometry.setAttribute('aWaveSin', new THREE.BufferAttribute(sin, 4))
  geometry.setAttribute('aDepthMotion', new THREE.BufferAttribute(depthMotion, 2))
  geometry.setAttribute('aPocketFrame', new THREE.BufferAttribute(frame, 3))
  geometry.setAttribute('aFlowAxis', new THREE.BufferAttribute(axis, 3))
  geometry.setAttribute('aFlowNormal', new THREE.BufferAttribute(normal, 3))
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
    this._phaseOrder = new Int32Array(phases)
    if (phases === 16) {
      this._phaseOrder.set([0, 8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15])
    } else {
      for (let p = 0; p < phases; p++) this._phaseOrder[p] = p
    }
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
  constructor(capacity = 2048, entries = 2048) {
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
 * 4-strand outer envelope across all 16 animation cycle phases at midpoints 0.25, 0.50, 0.75.
 */
function segmentInside8PhaseEnvelope(uA, vA, uB, vB, lut, marginFraction = 0.024) {
  const phases = lut.phases || 16
  const samples = lut.samples
  const phaseMinY = lut.phaseMinY
  const phaseMaxY = lut.phaseMaxY
  const phaseOrder = lut._phaseOrder

  const suA = Math.max(0, Math.min(1, uA)) * samples
  const iA = Math.min(samples - 1, Math.floor(suA))
  const fA = suA - iA
  const baseA = iA * phases

  const suB = Math.max(0, Math.min(1, uB)) * samples
  const iB = Math.min(samples - 1, Math.floor(suB))
  const fB = suB - iB
  const baseB = iB * phases

  const du = uB - uA
  const ut0 = uA + 0.5 * du
  const su0 = Math.max(0, Math.min(1, ut0)) * samples
  const i0 = Math.min(samples - 1, Math.floor(su0))
  const f0 = su0 - i0
  const base0 = i0 * phases

  const ut1 = uA + 0.25 * du
  const su1 = Math.max(0, Math.min(1, ut1)) * samples
  const i1 = Math.min(samples - 1, Math.floor(su1))
  const f1 = su1 - i1
  const base1 = i1 * phases

  const ut2 = uA + 0.75 * du
  const su2 = Math.max(0, Math.min(1, ut2)) * samples
  const i2 = Math.min(samples - 1, Math.floor(su2))
  const f2 = su2 - i2
  const base2 = i2 * phases

  for (let pi = 0; pi < phases; pi++) {
    const p = phaseOrder ? phaseOrder[pi] : pi

    const loA = phaseMinY[baseA + p] + fA * (phaseMinY[baseA + phases + p] - phaseMinY[baseA + p])
    const hiA = phaseMaxY[baseA + p] + fA * (phaseMaxY[baseA + phases + p] - phaseMaxY[baseA + p])
    const yA = 0.5 * (loA + hiA) + Math.max(0.5 * (hiA - loA), 1e-5) * vA

    const loB = phaseMinY[baseB + p] + fB * (phaseMinY[baseB + phases + p] - phaseMinY[baseB + p])
    const hiB = phaseMaxY[baseB + p] + fB * (phaseMaxY[baseB + phases + p] - phaseMaxY[baseB + p])
    const yB = 0.5 * (loB + hiB) + Math.max(0.5 * (hiB - loB), 1e-5) * vB

    const dy = yB - yA

    // Check t = 0.5 first (most likely midpoint bulge)
    const lo0 = phaseMinY[base0 + p] + f0 * (phaseMinY[base0 + phases + p] - phaseMinY[base0 + p])
    const hi0 = phaseMaxY[base0 + p] + f0 * (phaseMaxY[base0 + phases + p] - phaseMaxY[base0 + p])
    const h0 = hi0 > lo0 ? hi0 - lo0 : 0.0
    const m0 = marginFraction * h0 > 0.0035 ? marginFraction * h0 : 0.0035
    const yt0 = yA + 0.5 * dy
    if (yt0 > hi0 - m0 || yt0 < lo0 + m0) return false

    // Check t = 0.25
    const lo1 = phaseMinY[base1 + p] + f1 * (phaseMinY[base1 + phases + p] - phaseMinY[base1 + p])
    const hi1 = phaseMaxY[base1 + p] + f1 * (phaseMaxY[base1 + phases + p] - phaseMaxY[base1 + p])
    const h1 = hi1 > lo1 ? hi1 - lo1 : 0.0
    const m1 = marginFraction * h1 > 0.0035 ? marginFraction * h1 : 0.0035
    const yt1 = yA + 0.25 * dy
    if (yt1 > hi1 - m1 || yt1 < lo1 + m1) return false

    // Check t = 0.75
    const lo2 = phaseMinY[base2 + p] + f2 * (phaseMinY[base2 + phases + p] - phaseMinY[base2 + p])
    const hi2 = phaseMaxY[base2 + p] + f2 * (phaseMaxY[base2 + phases + p] - phaseMaxY[base2 + p])
    const h2 = hi2 > lo2 ? hi2 - lo2 : 0.0
    const m2 = marginFraction * h2 > 0.0035 ? marginFraction * h2 : 0.0035
    const yt2 = yA + 0.75 * dy
    if (yt2 > hi2 - m2 || yt2 < lo2 + m2) return false
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
    const xSpanMod = organicCluster ? Math.pow(Math.max(1.0, isoXScale / 1.15), 0.25) : 1.0
    const refIsoH = 1.15 * envScale
    const du = cellIso / (10.0 * isoXScale)
    for (let u0 = uStart; u0 < uEnd; u0 += du) {
      const u1 = Math.min(uEnd, u0 + du)
      const stripDu = u1 - u0
      if (stripDu < 0.002) continue
      const uMid = 0.5 * (u0 + u1)
      const bMid = lut.getBounds(uMid)
      const midIsoH = bMid.envHeight * isoYScale
      if (midIsoH < minIsoHeight) continue

      const vMax = computeVMax(bMid.envHeight, isoYScale, maxVFrac, minIsoMargin)
      if (vMax <= 0.05) continue
      const activeIsoH = isoYScale * bMid.envHeight * vMax
      let densityMod = 1.0
      let localHubMin = minDistHub
      let effCellIso = cellIso
      if (organicCluster) {
        const cellScale = Math.sqrt(envScale)
        const hRatio = Math.max(0.60, midIsoH / Math.max(0.25, refIsoH))
        effCellIso = cellIso * Math.pow(hRatio, 0.42) * xSpanMod
        densityMod = 0.72 + 0.54 * (0.5 + 0.5 * Math.sin(uMid * 18.7 + sign * 1.1))
        localHubMin = (0.39 + 0.16 * (0.5 + 0.5 * Math.cos(uMid * 14.3 - sign * 0.7))) * cellScale * Math.pow(hRatio, 0.30) * xSpanMod
      }
      const lambda = ((10.0 * isoXScale * stripDu * activeIsoH) / (effCellIso * effCellIso)) * densityMod
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
          const v_frame = Math.max(-0.945, Math.min(0.945, (y - phaseBuf.center) / phaseBuf.radius))
          const r_norm = Math.min(1.0, Math.hypot(v_frame, w_depth))
          const depthTier = w_depth > 0.25 ? 'fg' : (w_depth < -0.25 ? 'bg' : 'mid')
          const layer = w_depth > 0.25 ? 1.0 : (w_depth < -0.25 ? -1.0 : 0.0)
          const id = rawNodes.length
          const pos = { x, y, z }

          let size, alpha, lineAlpha, hubAccent, maxDeg
          if (tier === 2) {
            const locHScale = THREE.MathUtils.clamp(
              Math.sqrt((bLoc.envHeight * isoYScale) / Math.max(0.25, 0.72 * envScale)),
              0.68,
              1.04
            )
            size = (11.2 + 4.4 * Math.pow(prng(), 1.35)) * locHScale
            alpha = 0.95 + 0.05 * prng()
            lineAlpha = 0.36 + 0.08 * prng()
            hubAccent = 1.0
            maxDeg = 6
          } else if (tier === 1) {
            size = 4.5 + 2.4 * prng()
            alpha = 0.64 + 0.24 * prng()
            lineAlpha = 0.20 + 0.07 * prng()
            hubAccent = 0.24
            maxDeg = 4
          } else {
            size = isWeb ? (2.5 + 1.1 * prng()) : (2.3 + 1.4 * prng())
            alpha = isWeb ? (0.38 + 0.18 * prng()) : (0.44 + 0.24 * prng())
            lineAlpha = 0.14 + 0.06 * prng()
            hubAccent = 0.0
            maxDeg = isWeb ? 3 : 0
          }

          rawNodes.push({
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

  // Pass 1: Tier-1 Hero Starburst Hubs (~3-5 well-spaced focal anchors across pocket height)
  runTierPass({
    uStart: 0.170,
    uEnd: 0.955,
    cellIso: 0.60 * cellScale,
    minIsoHeight: 0.140 * envScale,
    maxVFrac: 0.78,
    minIsoMargin: 0.048 * envScale,
    minDistExisting: 0.34 * cellScale,
    minDistHub: 0.46 * cellScale,
    searchRadius: 0.62 * cellScale,
    tier: 2,
    isWeb: true,
    maxAttempts: 8,
    wDepthMin: 0.06,
    wDepthMax: 0.90,
    organicCluster: true,
  })

  // Pass 2: Tier-2 Mid Constellation Vertices (spread across center belly & upper/lower arches)
  runTierPass({
    uStart: 0.090,
    uEnd: 0.985,
    cellIso: 0.230 * cellScale,
    minIsoHeight: 0.055 * envScale,
    maxVFrac: 0.92,
    minIsoMargin: 0.022 * envScale,
    minDistExisting: 0.148 * cellScale,
    minDistHub: 0.175 * cellScale,
    searchRadius: 0.20 * cellScale,
    tier: 1,
    isWeb: true,
    maxAttempts: 6,
    wDepthMin: -0.82,
    wDepthMax: 0.88,
  })

  // Pass 3A: Tier-3 Delicate Web Connectors (tighter outer arch hugging without cage clutter)
  runTierPass({
    uStart: 0.088,
    uEnd: 0.986,
    cellIso: 0.250 * cellScale,
    minIsoHeight: 0.036 * envScale,
    maxVFrac: 0.945,
    minIsoMargin: 0.016 * envScale,
    minDistExisting: 0.128 * cellScale,
    minDistHub: 0.142 * cellScale,
    searchRadius: 0.158 * cellScale,
    tier: 0,
    isWeb: true,
    maxAttempts: 5,
    wDepthMin: -0.84,
    wDepthMax: 0.72,
  })

  // Pass 3B: Tier-3 Volumetric Micro-Dust (rich colored arch-hugging sparkles & deep background dust)
  runTierPass({
    uStart: 0.085,
    uEnd: 0.988,
    cellIso: 0.140 * cellScale,
    minIsoHeight: 0.034 * envScale,
    maxVFrac: 0.945,
    minIsoMargin: 0.015 * envScale,
    minDistExisting: 0.074 * cellScale,
    minDistHub: 0.095 * cellScale,
    searchRadius: 0.108 * cellScale,
    tier: 0,
    isWeb: false,
    maxAttempts: 4,
    wDepthMin: -0.88,
    wDepthMax: 0.65,
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

  function tryAddEdge(i, j, allowCrossing = false, cosLimit = 0.90, isFallback = false, capOverride = maxDegreeCap, envMemo = null, memoIdx = -1) {
    if (i === j || hasEdge(i, j)) return false
    if (envMemo && envMemo[memoIdx] === 1) return false
    const a = rawNodes[i]
    const b = rawNodes[j]
    if (!a.isWeb || !b.isWeb) return false
    const capA = Math.min(capOverride, a.maxDeg)
    const capB = Math.min(capOverride, b.maxDeg)
    if (a.connectedCount >= capA || b.connectedCount >= capB) return false
    if (cosLimit < 1.0 && (hasTightAngle(i, j, cosLimit) || hasTightAngle(j, i, cosLimit))) return false
    if (!allowCrossing && edgeGrid.hasCrossing(a.isoPos, b.isoPos, i, j, edges, rawNodes, false)) return false
    if (!segmentInside8PhaseEnvelope(a.u, a.v_frame, b.u, b.v_frame, lut, 0.024)) {
      if (envMemo) envMemo[memoIdx] = 1
      return false
    }

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
  const pairEnvRejected = new Uint8Array(pairCount)

  // Pass A: Shortest-first planar backbone up to degree 4
  for (let p = 0; p < pairCount; p++) {
    const idx = order[p]
    tryAddEdge(pairA[idx], pairB[idx], false, 0.90, false, 4, pairEnvRejected, idx)
  }

  // Pass B: Repair under-connected web vertices (< 2 edges) before triangulation closure
  let candIds = new Int32Array(128)
  let candDists = new Float64Array(128)
  function repairUnderConnected() {
    const repairDu = 0.11 / Math.max(0.75, isoXScale)
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < nCount; i++) {
        const nA = rawNodes[i]
        if (!nA.isWeb || nA.connectedCount >= 2) continue
        const hIso = nA.hu * isoYScale
        const searchR = Math.min(1.0 * envScale, Math.max(0.30 * envScale, 0.78 * hIso))
        const qCount = webGrid.queryRadius(nA.isoX, nA.isoY, searchR, rawNodes)

        let candCount = 0
        for (let q = 0; q < qCount; q++) {
          const j = webGrid.queryIds[q]
          if (j === i || hasEdge(i, j)) continue
          const nB = rawNodes[j]
          if (!nB.isWeb || nB.connectedCount >= nB.maxDeg || Math.abs(nA.u - nB.u) > repairDu) continue
          const d = webGrid.queryDistances[q]
          if (candCount === candIds.length) {
            const nextIds = new Int32Array(candIds.length * 2)
            const nextDists = new Float64Array(candDists.length * 2)
            nextIds.set(candIds)
            nextDists.set(candDists)
            candIds = nextIds
            candDists = nextDists
          }
          // Insertion sort keeps small candidate list ordered with zero heap allocations
          let pos = candCount - 1
          while (pos >= 0 && candDists[pos] > d) {
            candIds[pos + 1] = candIds[pos]
            candDists[pos + 1] = candDists[pos]
            pos--
          }
          candIds[pos + 1] = j
          candDists[pos + 1] = d
          candCount++
        }

        const allowCross = pass >= 2
        const cosLim = pass === 0 ? 0.93 : 0.98
        for (let c = 0; c < candCount && nA.connectedCount < 2; c++) {
          tryAddEdge(i, candIds[c], allowCross, cosLim, pass > 0, maxDegreeCap)
        }
      }
    }
  }
  repairUnderConnected()

  // Pass C: Triangulated spiderweb closure up to per-tier maxDegree (6 for Tier-1, 4 for Tier-2, 3 for Tier-3)
  for (let p = 0; p < pairCount; p++) {
    const idx = order[p]
    if (!pairEnvRejected[idx]) {
      tryAddEdge(pairA[idx], pairB[idx], false, 0.92, false, maxDegreeCap, pairEnvRejected, idx)
    }
  }

  // Pass D: Final repair ensuring every web node has >= 2 edges
  repairUnderConnected()

  return edges
}

const lutCache = new Map()

function getCachedRibbonBoundsLUT(H, config) {
  const key = [
    H,
    config.amplitude ?? 1.0,
    config.frequency ?? 1.0,
    config.zAmplitude ?? 1.0,
    config.wingSweep ?? 0.28,
    config.outerFlexibility ?? 1.0,
    config.outerFlare ?? 0.6,
    config.innerYOffset ?? 0,
    config.outerYOffset ?? 0,
    config.outerZOffset ?? 0,
    config.ribbon1Amp ?? 1.0,
    config.ribbon2Amp ?? 1.0,
    config.ribbon3Amp ?? 1.0,
    config.ribbon4Amp ?? 1.0,
    config.ribbon1YOffset ?? 0.0,
    config.ribbon2YOffset ?? 0.0,
    config.ribbon3YOffset ?? 0.0,
    config.ribbon4YOffset ?? 0.0,
    config.distRibbon01 ?? 0.0,
    config.distRibbon12 ?? 0.0,
    config.distRibbon23 ?? 0.0,
    config.ribbonSpacingOuter ?? 1.0,
    config.ribbonSpacingInner ?? 1.0,
  ].join(':')
  let lut = lutCache.get(key)
  if (!lut) {
    if (lutCache.size >= 4) {
      lutCache.delete(lutCache.keys().next().value)
    }
    lut = new RibbonBoundsLUT(H, config, 256, 16)
    lutCache.set(key, lut)
  }
  return lut
}

/**
 * Generates the refined volumetric neural field BufferGeometries (linesGeo, pointsGeo, hazeGeo).
 * Area-proportional stratified sampling across full wave arches with organic hub clustering,
 * triangulated indexed spiderweb, and velvety localized interior pocket nebula.
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

  // 0. Precompute 16-phase LUT of ribbon bounds along u (shared across left/right when wave config matches)
  const lut = getCachedRibbonBoundsLUT(H, config)
  const baselineMaxIsoH = 2.8
  const maxEnvIsoH = lut.maxEnvHeight * isoYScale
  const envScale = THREE.MathUtils.clamp(maxEnvIsoH / baselineMaxIsoH, 0.38, 1.30)

  // 1. Stratified organic constellation sampling + non-indexed synaptic spiderweb
  const { rawNodes, webGrid } = sampleStratifiedNodes(sign, safeXScale, isoYScale, lut, prng, envScale)
  const edges = connectNeuralNodes(rawNodes, webGrid, lut, safeXScale, isoYScale, envScale)

  // Keep connected web nodes + background micro-dust sparkles
  const visibleNodes = rawNodes.filter(n => !n.isWeb || n.connectedCount > 0)

  // 2. Build Non-Indexed Lines BufferGeometry (Per-edge length/depth/dendrite hierarchy & traveling pulse phase)
  const validEdgeIndices = []
  for (let eIdx = 0; eIdx < edges.length; eIdx++) {
    const iA = edges.i[eIdx]
    const iB = edges.j[eIdx]
    const nA = rawNodes[iA]
    const nB = rawNodes[iB]
    if (nA && nB && nA.isWeb && nB.isWeb && nA.connectedCount > 0 && nB.connectedCount > 0 && iA !== iB) {
      validEdgeIndices.push(eIdx)
    }
  }

  const lineVertCount = validEdgeIndices.length * 2
  const linePositions = new Float32Array(lineVertCount * 3)
  const lineStyles = new Float32Array(lineVertCount * 4)
  const lineRelativeCoords = new Float32Array(lineVertCount * 4)

  for (let k = 0; k < validEdgeIndices.length; k++) {
    const eIdx = validEdgeIndices[k]
    const nA = rawNodes[edges.i[eIdx]]
    const nB = rawNodes[edges.j[eIdx]]
    const isFallback = edges.fallback[eIdx] === 1

    const edgeIsoLen = Math.hypot(nA.isoX - nB.isoX, nA.isoY - nB.isoY)
    const lenFactor = THREE.MathUtils.clamp(1.18 - edgeIsoLen / (0.68 * envScale), 0.44, 1.15)
    const avgWDepth = 0.5 * (nA.w_depth + nB.w_depth)
    const zNormAvg = THREE.MathUtils.clamp(0.5 + 0.5 * avgWDepth, 0.0, 1.0)
    const depthWeight = 0.48 + 0.56 * zNormAvg

    const isHubA = nA.tier === 2
    const isHubB = nB.tier === 2
    const isMidA = nA.tier === 1
    const isMidB = nB.tier === 1

    let hubAccentA = 0.0
    let hubAccentB = 0.0
    let dendriteGainA = 0.72
    let dendriteGainB = 0.72

    if (isHubA || isHubB) {
      hubAccentA = isHubA ? (isHubB ? 0.58 : 0.78) : 0.14
      hubAccentB = isHubB ? (isHubA ? 0.58 : 0.78) : 0.14
      dendriteGainA = isHubA ? 1.36 : 0.98
      dendriteGainB = isHubB ? 1.36 : 0.98
    } else if (isMidA || isMidB) {
      hubAccentA = isMidA ? 0.12 : 0.0
      hubAccentB = isMidB ? 0.12 : 0.0
      dendriteGainA = 0.86
      dendriteGainB = 0.86
    }

    const fallbackScale = isFallback ? 0.82 : 1.0
    const alphaA = nA.lineAlpha * lenFactor * depthWeight * dendriteGainA * fallbackScale
    const alphaB = nB.lineAlpha * lenFactor * depthWeight * dendriteGainB * fallbackScale

    // Coherent traveling energy pulse: radiates smoothly outward from Tier-1 hubs along dendrites,
    // or ripples continuously outward along u across structural web edges (|deltaPhi| <= 0.95 rad).
    const basePhiA = 6.28318530718 * (1.15 * nA.u + 0.18 * Math.abs(nA.v_frame))
    const basePhiB = 6.28318530718 * (1.15 * nB.u + 0.18 * Math.abs(nB.v_frame))
    let phiA, phiB
    if (isHubA && !isHubB) {
      phiA = basePhiA
      phiB = phiA + THREE.MathUtils.clamp(0.45 + edgeIsoLen * 0.88, 0.45, 0.95)
    } else if (isHubB && !isHubA) {
      phiB = basePhiB
      phiA = phiB + THREE.MathUtils.clamp(0.45 + edgeIsoLen * 0.88, 0.45, 0.95)
    } else {
      const flowDir = nA.u <= nB.u ? 1 : -1
      const rawDelta = flowDir > 0 ? basePhiB - basePhiA : basePhiA - basePhiB
      const stepPhi = THREE.MathUtils.clamp(rawDelta < 0.38 ? 0.38 : rawDelta, 0.38, 0.95)
      if (flowDir > 0) {
        phiA = basePhiA
        phiB = basePhiA + stepPhi
      } else {
        phiB = basePhiB
        phiA = basePhiB + stepPhi
      }
    }

    const vA = k * 2
    const vB = vA + 1

    linePositions[vA * 3] = nA.pos.x
    linePositions[vA * 3 + 1] = nA.pos.y
    linePositions[vA * 3 + 2] = nA.pos.z
    lineStyles[vA * 4] = alphaA
    lineStyles[vA * 4 + 1] = hubAccentA
    lineStyles[vA * 4 + 2] = Math.cos(phiA)
    lineStyles[vA * 4 + 3] = Math.sin(phiA)
    lineRelativeCoords[vA * 4] = nA.relativeCoord[0]
    lineRelativeCoords[vA * 4 + 1] = nA.relativeCoord[1]
    lineRelativeCoords[vA * 4 + 2] = nA.relativeCoord[2]
    lineRelativeCoords[vA * 4 + 3] = nA.relativeCoord[3]

    linePositions[vB * 3] = nB.pos.x
    linePositions[vB * 3 + 1] = nB.pos.y
    linePositions[vB * 3 + 2] = nB.pos.z
    lineStyles[vB * 4] = alphaB
    lineStyles[vB * 4 + 1] = hubAccentB
    lineStyles[vB * 4 + 2] = Math.cos(phiB)
    lineStyles[vB * 4 + 3] = Math.sin(phiB)
    lineRelativeCoords[vB * 4] = nB.relativeCoord[0]
    lineRelativeCoords[vB * 4 + 1] = nB.relativeCoord[1]
    lineRelativeCoords[vB * 4 + 2] = nB.relativeCoord[2]
    lineRelativeCoords[vB * 4 + 3] = nB.relativeCoord[3]
  }

  const linesGeo = new THREE.BufferGeometry()
  linesGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
  linesGeo.setAttribute('aLineStyle', new THREE.BufferAttribute(lineStyles, 4))
  linesGeo.setAttribute('aRelativeCoord', new THREE.BufferAttribute(lineRelativeCoords, 4))
  if (lineVertCount > 0) {
    linesGeo.computeBoundingBox()
    linesGeo.computeBoundingSphere()
  }

  // 3. Build Points BufferGeometry (3-Tier Glowing Star Constellation)
  const pointCount = visibleNodes.length
  const pointPositions = new Float32Array(pointCount * 3)
  const pointStyles = new Float32Array(pointCount * 3)
  const pointRelativeCoords = new Float32Array(pointCount * 4)

  for (let nIdx = 0; nIdx < pointCount; nIdx++) {
    const n = visibleNodes[nIdx]
    pointPositions[nIdx * 3] = n.pos.x
    pointPositions[nIdx * 3 + 1] = n.pos.y
    pointPositions[nIdx * 3 + 2] = n.pos.z
    pointStyles[nIdx * 3] = n.size
    pointStyles[nIdx * 3 + 1] = n.alpha
    pointStyles[nIdx * 3 + 2] = n.tier
    pointRelativeCoords[nIdx * 4] = n.relativeCoord[0]
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

  // 4. Smooth Non-Blotchy Interior Atmospheric Mist (distributed evenly across open pockets, zero stacked neon blobs)
  const cellScale = Math.sqrt(envScale)
  const hazeSpanScale = Math.max(1.0, Math.sqrt(safeXScale / 1.55))
  const hazeCellIso = 0.160 * cellScale * hazeSpanScale
  const hazeDu = hazeCellIso / (10.0 * safeXScale)
  const hazeGrid = new IsotropicGrid2D(Math.max(0.08, 0.16 * cellScale * hazeSpanScale))
  const hazeNodes = []
  let hazeCap = 512
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

    const vMaxHaze = computeVMax(bMid.envHeight, isoYScale, 0.84, 0.042 * envScale)
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

        const vMaxLoc = computeVMax(bLoc.envHeight, isoYScale, 0.84, 0.042 * envScale)
        if (vMaxLoc <= 0.05) continue
        const v_rel = vMaxHaze > 1e-4 ? vRaw * (vMaxLoc / vMaxHaze) : vRaw
        if (Math.abs(v_rel) > vMaxLoc) continue

        const x = sign * 10.0 * u
        const y = bLoc.envCenterY + v_rel * 0.5 * bLoc.envHeight
        const isoX = x * safeXScale
        const isoY = y * isoYScale
        const minHazeDist = 0.088 * cellScale * hazeSpanScale
        if (hazeGrid.hasNeighborWithin(isoX, isoY, minHazeDist, hazeNodes, minHazeDist * 1.18)) continue

        const w_depth = -0.18 - prng() * 0.54
        const envMinZ = Math.min(bLoc.z0, bLoc.z1, bLoc.z2, bLoc.z3)
        const envMaxZ = Math.max(bLoc.z0, bLoc.z1, bLoc.z2, bLoc.z3)
        const envRz = Math.max(0.015, 0.5 * (envMaxZ - envMinZ) + 0.025)
        const z = bLoc.envCenterZ + w_depth * envRz

        lut.getPhaseBounds(u, 0, hazePhaseBuf)
        const v_frame = Math.max(-0.84, Math.min(0.84, (y - hazePhaseBuf.center) / hazePhaseBuf.radius))
        const r_norm = Math.min(1.0, Math.hypot(v_frame, w_depth))

        const innerTipFade = THREE.MathUtils.smoothstep(u, 0.105, 0.22)
        const vRatio = v_frame / Math.max(0.25, vMaxLoc)
        const vTaper = 1.0 - 0.30 * vRatio * vRatio
        const baseAlpha = 0.044 + prng() * 0.020
        const alpha = baseAlpha * innerTipFade * vTaper
        const sizeJitter = 0.94 + prng() * 0.24

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

  const hazeGeo = new THREE.BufferGeometry()
  hazeGeo.setAttribute('position', new THREE.BufferAttribute(hazePositions.slice(0, hazeCount * 3), 3))
  hazeGeo.setAttribute('aHazeStyle', new THREE.BufferAttribute(hazeStyles.slice(0, hazeCount * 2), 2))
  hazeGeo.setAttribute('aRelativeCoord', new THREE.BufferAttribute(hazeRelativeCoords.slice(0, hazeCount * 4), 4))
  if (hazeCount > 0) {
    hazeGeo.computeBoundingBox()
    hazeGeo.computeBoundingSphere()
  }

  const travelProfiles = new Map()
  addPocketTravelAttributes(pointsGeo, H, config, travelProfiles, 0.945, true)
  addPocketTravelAttributes(linesGeo, H, config, travelProfiles, 0.945, true)
  addPocketTravelAttributes(hazeGeo, H, config, travelProfiles, 0.84, false)

  return {
    linesGeo,
    pointsGeo,
    hazeGeo,
  }
}
