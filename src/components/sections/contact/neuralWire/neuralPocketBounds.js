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
  getHeroWaveProfile,
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

/**
 * Bake stationary 4-strand wave harmonics and static funnel radius for GPU live-pocket masking.
 * Preserves fixed 3D vertex positions (zero vertical accordion compression or horizontal slide).
 */
function addStaticPocketMaskAttributes(geometry, H, config, profiles, isLineSegments = false, useCache = true) {
  const positions = geometry.getAttribute('position').array
  const relCoords = geometry.getAttribute('aRelativeCoord').array
  const count = relCoords.length / 4
  const bias = new Float32Array(count * 4)
  const cos = new Float32Array(count * 4)
  const sin = new Float32Array(count * 4)
  const frame = new Float32Array(count * 3)
  const axis = new Float32Array(count * 3)
  const prof = new Float64Array(5)
  const scratchProfile = new Float64Array(13)

  for (let i = 0; i < count; i++) {
    const u = relCoords[4 * i]
    let p = useCache ? profiles.get(u) : null
    if (!p) {
      p = useCache ? new Float64Array(13) : scratchProfile
      let fMinY = Infinity
      let fMaxY = -Infinity
      for (let j = 0; j < 4; j++) {
        getHeroWaveProfile(j, u, H, config, prof)
        const biasY = prof[0]
        const ampY = prof[2]
        const absAmpY = Math.abs(ampY)
        const phase = prof[4]
        p[j] = biasY
        p[4 + j] = ampY * Math.sin(phase)
        p[8 + j] = -ampY * Math.cos(phase)
        if (biasY - absAmpY < fMinY) fMinY = biasY - absAmpY
        if (biasY + absAmpY > fMaxY) fMaxY = biasY + absAmpY
      }
      p[12] = Math.max(0.5 * (fMaxY - fMinY), 1e-5)
      if (useCache) profiles.set(u, p)
    }

    const i4 = 4 * i
    bias[i4] = p[0]; bias[i4 + 1] = p[1]; bias[i4 + 2] = p[2]; bias[i4 + 3] = p[3]
    cos[i4] = p[4]; cos[i4 + 1] = p[5]; cos[i4 + 2] = p[6]; cos[i4 + 3] = p[7]
    sin[i4] = p[8]; sin[i4 + 1] = p[9]; sin[i4 + 2] = p[10]; sin[i4 + 3] = p[11]

    const yRest = positions[3 * i + 1]
    const zRest = positions[3 * i + 2]
    frame[3 * i] = yRest
    frame[3 * i + 1] = zRest
    frame[3 * i + 2] = p[12]
    axis[3 * i + 1] = 1
  }

  geometry.setAttribute('aWaveBias', new THREE.BufferAttribute(bias, 4))
  geometry.setAttribute('aWaveCos', new THREE.BufferAttribute(cos, 4))
  geometry.setAttribute('aWaveSin', new THREE.BufferAttribute(sin, 4))
  geometry.setAttribute('aPocketFrame', new THREE.BufferAttribute(frame, 3))
  geometry.setAttribute('aFlowAxis', new THREE.BufferAttribute(axis, 3))

  if (isLineSegments) {
    const partnerBias = new Float32Array(count * 4)
    const partnerCos = new Float32Array(count * 4)
    const partnerSin = new Float32Array(count * 4)
    for (let k = 0; k + 1 < count; k += 2) {
      const a4 = k * 4
      const b4 = (k + 1) * 4
      for (let c = 0; c < 4; c++) {
        partnerBias[a4 + c] = bias[b4 + c]
        partnerCos[a4 + c] = cos[b4 + c]
        partnerSin[a4 + c] = sin[b4 + c]
        partnerBias[b4 + c] = bias[a4 + c]
        partnerCos[b4 + c] = cos[a4 + c]
        partnerSin[b4 + c] = sin[a4 + c]
      }
      frame[k * 3 + 1] = positions[(k + 1) * 3 + 1]
      frame[(k + 1) * 3 + 1] = positions[k * 3 + 1]
    }
    geometry.setAttribute('aPartnerBias', new THREE.BufferAttribute(partnerBias, 4))
    geometry.setAttribute('aPartnerCos', new THREE.BufferAttribute(partnerCos, 4))
    geometry.setAttribute('aPartnerSin', new THREE.BufferAttribute(partnerSin, 4))
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
    this.funnelData = new Float64Array((samples + 1) * 8)
    this.phaseMinY = new Float64Array((samples + 1) * phases)
    this.phaseMaxY = new Float64Array((samples + 1) * phases)
    this.maxEnvHeight = 0.0
    this.maxFunnelHeight = 0.0

    const phaseCos = new Float64Array(phases)
    const phaseSin = new Float64Array(phases)
    for (let p = 0; p < phases; p++) {
      const theta = (p * 2.0 * Math.PI) / phases
      phaseCos[p] = Math.cos(theta)
      phaseSin[p] = Math.sin(theta)
    }

    const prof = new Float64Array(5)
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

      let fMinY = Infinity
      let fMaxY = -Infinity
      let fMinZ = Infinity
      let fMaxZ = -Infinity
      for (let j = 0; j < 4; j++) {
        getHeroWaveProfile(j, u, H, config, prof)
        const bY = prof[0]
        const bZ = prof[1]
        const aY = prof[2]
        const aZ = prof[3]
        const absAY = Math.abs(aY)
        const absAZ = Math.abs(aZ)
        const ph = prof[4]
        bias[j] = bY
        cosY[j] = aY * Math.sin(ph)
        sinY[j] = -aY * Math.cos(ph)
        if (bY - absAY < fMinY) fMinY = bY - absAY
        if (bY + absAY > fMaxY) fMaxY = bY + absAY
        if (bZ - absAZ < fMinZ) fMinZ = bZ - absAZ
        if (bZ + absAZ > fMaxZ) fMaxZ = bZ + absAZ
      }

      const fHeight = Math.max(0.0, fMaxY - fMinY)
      const fCenterY = 0.5 * (fMinY + fMaxY)
      const fCenterZ = 0.5 * (fMinZ + fMaxZ)
      const fRz = Math.max(0.015, 0.5 * (fMaxZ - fMinZ) + 0.025)
      const fOffset = i * 8
      this.funnelData[fOffset + 0] = fMinY
      this.funnelData[fOffset + 1] = fMaxY
      this.funnelData[fOffset + 2] = fHeight
      this.funnelData[fOffset + 3] = fCenterY
      this.funnelData[fOffset + 4] = fMinZ
      this.funnelData[fOffset + 5] = fMaxZ
      this.funnelData[fOffset + 6] = fCenterZ
      this.funnelData[fOffset + 7] = fRz
      if (u >= 0.08 && u <= 0.99 && fHeight > this.maxFunnelHeight) {
        this.maxFunnelHeight = fHeight
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
    this._reusableFunnel = {
      u: 0,
      funnelMinY: 0,
      funnelMaxY: 0,
      funnelHeight: 0,
      funnelCenterY: 0,
      funnelMinZ: 0,
      funnelMaxZ: 0,
      funnelCenterZ: 0,
      funnelRz: 0.015,
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

  getFunnelBounds(u, out = this._reusableFunnel) {
    const su = Math.max(0, Math.min(1, u)) * this.samples
    const i = Math.floor(su)
    const f = su - i
    const fd = this.funnelData
    if (i >= this.samples) {
      const off = this.samples * 8
      out.u = u
      out.funnelMinY = fd[off + 0]
      out.funnelMaxY = fd[off + 1]
      out.funnelHeight = fd[off + 2]
      out.funnelCenterY = fd[off + 3]
      out.funnelMinZ = fd[off + 4]
      out.funnelMaxZ = fd[off + 5]
      out.funnelCenterZ = fd[off + 6]
      out.funnelRz = fd[off + 7]
      return out
    }
    const off = i * 8
    const next = off + 8
    out.u = u
    out.funnelMinY = fd[off + 0] + f * (fd[next + 0] - fd[off + 0])
    out.funnelMaxY = fd[off + 1] + f * (fd[next + 1] - fd[off + 1])
    out.funnelHeight = fd[off + 2] + f * (fd[next + 2] - fd[off + 2])
    out.funnelCenterY = fd[off + 3] + f * (fd[next + 3] - fd[off + 3])
    out.funnelMinZ = fd[off + 4] + f * (fd[next + 4] - fd[off + 4])
    out.funnelMaxZ = fd[off + 5] + f * (fd[next + 5] - fd[off + 5])
    out.funnelCenterZ = fd[off + 6] + f * (fd[next + 6] - fd[off + 6])
    out.funnelRz = fd[off + 7] + f * (fd[next + 7] - fd[off + 7])
    return out
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
 * Validates that a stationary candidate line segment (A -> B) stays strictly inside the
 * swept full-funnel outer envelope at midpoints 0.25, 0.50, 0.75.
 */
function segmentInsideFunnel(uA, yA, uB, yB, lut, marginFraction = 0.004) {
  const du = uB - uA
  const dy = yB - yA
  for (let s = 1; s <= 3; s++) {
    const frac = s * 0.25
    const b = lut.getFunnelBounds(uA + frac * du)
    const m = Math.max(0.001, marginFraction * b.funnelHeight)
    const yt = yA + frac * dy
    if (yt > b.funnelMaxY - m || yt < b.funnelMinY + m) return false
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
      const bMid = lut.getFunnelBounds(uMid)
      const midIsoH = bMid.funnelHeight * isoYScale
      if (midIsoH < minIsoHeight) continue

      const vMax = computeVMax(bMid.funnelHeight, isoYScale, maxVFrac, minIsoMargin)
      if (vMax <= 0.05) continue
      const activeIsoH = isoYScale * bMid.funnelHeight * vMax
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
          const bLoc = lut.getFunnelBounds(u)
          if (bLoc.funnelHeight * isoYScale < minIsoHeight * 0.82) continue

          const vMaxLoc = computeVMax(bLoc.funnelHeight, isoYScale, maxVFrac, minIsoMargin)
          if (vMaxLoc <= 0.05) continue
          const v = vMax > 1e-4 ? vRaw * (vMaxLoc / vMax) : vRaw
          if (Math.abs(v) > vMaxLoc) continue

          const x = sign * 10.0 * u
          const y = bLoc.funnelCenterY + v * 0.5 * bLoc.funnelHeight
          const isoX = x * isoXScale
          const isoY = y * isoYScale

          const effSearch = Math.max(searchRadius, localHubMin)
          if (grid.hasNeighborWithin(isoX, isoY, minDistExisting, rawNodes, effSearch, localHubMin)) continue

          const w_depth = wDepthMin + prng() * (wDepthMax - wDepthMin)
          const z = bLoc.funnelCenterZ + w_depth * bLoc.funnelRz

          const v_funnel = Math.max(-0.995, Math.min(0.995, v))
          const r_norm = Math.min(1.0, Math.hypot(v_funnel, w_depth))
          const depthTier = w_depth > 0.25 ? 'fg' : (w_depth < -0.25 ? 'bg' : 'mid')
          const layer = w_depth > 0.25 ? 1.0 : (w_depth < -0.25 ? -1.0 : 0.0)
          const id = rawNodes.length
          const pos = { x, y, z }
          const twinklePhase = prng() * Math.PI * 2.0

          let size, alpha, lineAlpha, hubAccent, maxDeg
          if (tier === 2) {
            const locHScale = THREE.MathUtils.clamp(
              Math.sqrt((bLoc.funnelHeight * isoYScale) / Math.max(0.25, 0.72 * envScale)),
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
            hu: Math.max(0.020, bLoc.funnelHeight),
            v_funnel,
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
            twinklePhase,
            relativeCoord: [u, v_funnel, w_depth, r_norm],
          })
          grid.insert(isoX, isoY, id)
          break
        }
      }
    }
  }

  const cellScale = Math.sqrt(envScale)

  // Pass 1: Tier-1 Hero Starburst Hubs (reach ~89% outer crest zone without cores exiting outer ribbon edge)
  runTierPass({
    uStart: 0.170,
    uEnd: 0.955,
    cellIso: 0.60 * cellScale,
    minIsoHeight: 0.140 * envScale,
    maxVFrac: 0.89,
    minIsoMargin: 0.028 * envScale,
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

  // Pass 2: Tier-2 Mid Constellation Vertices (flush to ~98.5% outer ribbon envelope)
  runTierPass({
    uStart: 0.090,
    uEnd: 0.985,
    cellIso: 0.230 * cellScale,
    minIsoHeight: 0.055 * envScale,
    maxVFrac: 0.985,
    minIsoMargin: 0.008 * envScale,
    minDistExisting: 0.148 * cellScale,
    minDistHub: 0.175 * cellScale,
    searchRadius: 0.20 * cellScale,
    tier: 1,
    isWeb: true,
    maxAttempts: 6,
    wDepthMin: -0.82,
    wDepthMax: 0.88,
  })

  // Pass 3A: Tier-3 Delicate Web Connectors (tuck flush up to 99.5% outer arch border)
  runTierPass({
    uStart: 0.088,
    uEnd: 0.986,
    cellIso: 0.250 * cellScale,
    minIsoHeight: 0.036 * envScale,
    maxVFrac: 0.995,
    minIsoMargin: 0.004 * envScale,
    minDistExisting: 0.128 * cellScale,
    minDistHub: 0.142 * cellScale,
    searchRadius: 0.158 * cellScale,
    tier: 0,
    isWeb: true,
    maxAttempts: 5,
    wDepthMin: -0.84,
    wDepthMax: 0.72,
  })

  // Pass 3B: Tier-3 Volumetric Micro-Dust (tuck flush up to 99.5% outer arch border)
  runTierPass({
    uStart: 0.085,
    uEnd: 0.988,
    cellIso: 0.140 * cellScale,
    minIsoHeight: 0.034 * envScale,
    maxVFrac: 0.995,
    minIsoMargin: 0.004 * envScale,
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
    if (!segmentInsideFunnel(a.u, a.pos.y, b.u, b.pos.y, lut, 0.004)) {
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

const MAX_ROUTES_PER_ELEMENT = 4
const TARGET_ROUTE_COUNT = 21

/**
 * Adds a lightweight converged inner-tip trunk stem (u <= 0.06 -> earliest constellation nodes)
 * strictly inside the swept funnel so every synaptic route originates uniformly from the inner tip
 * without altering the resting interior web (masked below u ≈ 0.07 by flowPocketVisibility).
 */
function addInnerTipFeederTrunk(rawNodes, edges, sign, isoXScale, isoYScale, lut) {
  const tipSpecs = [
    // 6 Converged inner-tip root origins (strictly u <= 0.06, 6 * 4 = 24 route capacity)
    { u: 0.038, v: 0.40 },
    { u: 0.040, v: 0.0 },
    { u: 0.042, v: -0.40 },
    { u: 0.054, v: 0.58 },
    { u: 0.056, v: 0.0 },
    { u: 0.058, v: -0.58 },
    // 7 Transitional inner-funnel relay knots bridging across upper, mid, and lower lanes (7 * 4 = 28 capacity)
    { u: 0.073, v: 0.70 },
    { u: 0.075, v: 0.40 },
    { u: 0.077, v: 0.16 },
    { u: 0.076, v: 0.0 },
    { u: 0.078, v: -0.16 },
    { u: 0.075, v: -0.40 },
    { u: 0.073, v: -0.70 },
  ]

  const baseNodeCount = rawNodes.length
  const feederIndices = []
  for (let s = 0; s < tipSpecs.length; s++) {
    const spec = tipSpecs[s]
    const bLoc = lut.getFunnelBounds(spec.u)
    const vClamped = THREE.MathUtils.clamp(spec.v, -0.78, 0.78)
    const x = sign * 10.0 * spec.u
    const y = bLoc.funnelCenterY + vClamped * 0.5 * bLoc.funnelHeight
    const z = bLoc.funnelCenterZ
    const isoX = x * isoXScale
    const isoY = y * isoYScale
    const id = rawNodes.length
    rawNodes.push({
      idx: id,
      pos: { x, y, z },
      isoX,
      isoY,
      isoPos: { x: isoX, y: isoY },
      u: spec.u,
      hu: Math.max(0.002, bLoc.funnelHeight),
      v_funnel: vClamped,
      w_depth: 0.0,
      r_norm: Math.abs(vClamped),
      isWeb: true,
      connectedCount: 0,
      layer: 0.0,
      depthTier: 'mid',
      tier: 0,
      maxDeg: 8,
      alpha: 0.28,
      lineAlpha: 0.13,
      hubAccent: 0.0,
      size: 2.1,
      twinklePhase: s * 0.7,
      relativeCoord: [spec.u, vClamped, 0.0, Math.abs(vClamped)],
      isInnerTrunk: true,
    })
    feederIndices.push(id)
  }

  const extraEdges = []
  const edgeKeys = new Set()
  for (let k = 0; k < edges.length; k++) {
    const a = edges.i[k]
    const b = edges.j[k]
    edgeKeys.add(a < b ? `${a}:${b}` : `${b}:${a}`)
  }

  function pushTrunkEdge(i, j) {
    if (i === j) return false
    const key = i < j ? `${i}:${j}` : `${j}:${i}`
    if (edgeKeys.has(key)) return false
    const a = rawNodes[i]
    const b = rawNodes[j]
    if (!segmentInsideFunnel(a.u, a.pos.y, b.u, b.pos.y, lut, 0.001)) return false
    edgeKeys.add(key)
    extraEdges.push({ i, j })
    a.connectedCount++
    b.connectedCount++
    return true
  }

  // Stage 1: Connect u ~ 0.04 origins -> u ~ 0.056 origins and directly to u ~ 0.075 relay knots
  // so 0..2 never bottleneck on 3..5's 4-route node cap.
  pushTrunkEdge(feederIndices[0], feederIndices[3])
  pushTrunkEdge(feederIndices[0], feederIndices[4])
  pushTrunkEdge(feederIndices[0], feederIndices[6])
  pushTrunkEdge(feederIndices[0], feederIndices[7])
  pushTrunkEdge(feederIndices[1], feederIndices[4])
  pushTrunkEdge(feederIndices[1], feederIndices[8])
  pushTrunkEdge(feederIndices[1], feederIndices[9])
  pushTrunkEdge(feederIndices[1], feederIndices[10])
  pushTrunkEdge(feederIndices[2], feederIndices[4])
  pushTrunkEdge(feederIndices[2], feederIndices[5])
  pushTrunkEdge(feederIndices[2], feederIndices[11])
  pushTrunkEdge(feederIndices[2], feederIndices[12])

  // Stage 2: Connect u ~ 0.056 origins -> u ~ 0.075 relay knots
  pushTrunkEdge(feederIndices[3], feederIndices[6])
  pushTrunkEdge(feederIndices[3], feederIndices[7])
  pushTrunkEdge(feederIndices[3], feederIndices[8])
  pushTrunkEdge(feederIndices[4], feederIndices[7])
  pushTrunkEdge(feederIndices[4], feederIndices[8])
  pushTrunkEdge(feederIndices[4], feederIndices[9])
  pushTrunkEdge(feederIndices[4], feederIndices[10])
  pushTrunkEdge(feederIndices[4], feederIndices[11])
  pushTrunkEdge(feederIndices[5], feederIndices[10])
  pushTrunkEdge(feederIndices[5], feederIndices[11])
  pushTrunkEdge(feederIndices[5], feederIndices[12])

  // Stage 3: Ensure every web node in the narrow inner neck (u in [0.08, 0.40]) has >= 2 distinct forward
  // links so routes never dead-end or choke through 3-4 bottleneck nodes before fanning into the wide pocket.
  const neckNodes = []
  const neckOutDeg = new Int32Array(baseNodeCount)
  const neckInDeg = new Int32Array(baseNodeCount)
  for (let k = 0; k < edges.length; k++) {
    const a = edges.i[k]
    const b = edges.j[k]
    if (a < baseNodeCount && b < baseNodeCount) {
      if (rawNodes[b].u > rawNodes[a].u + 0.001) {
        neckOutDeg[a]++
        neckInDeg[b]++
      } else if (rawNodes[a].u > rawNodes[b].u + 0.001) {
        neckOutDeg[b]++
        neckInDeg[a]++
      }
    }
  }
  for (let i = 0; i < baseNodeCount; i++) {
    const n = rawNodes[i]
    if (n.isWeb && n.connectedCount > 0 && n.u >= 0.082 && n.u <= 0.40) {
      neckNodes.push(n)
    }
  }
  neckNodes.sort((a, b) => a.u - b.u)
  for (let i = 0; i < neckNodes.length; i++) {
    const src = neckNodes[i]
    if (neckOutDeg[src.idx] >= 2) continue
    const cands = []
    for (let j = i + 1; j < neckNodes.length; j++) {
      const dst = neckNodes[j]
      const du = dst.u - src.u
      if (du <= 0.006 || du > 0.11) continue
      const d = Math.hypot(dst.isoX - src.isoX, dst.isoY - src.isoY)
      if (d > 0.72) continue
      cands.push({ idx: dst.idx, score: d + 0.28 * Math.abs(dst.v_funnel - src.v_funnel) + 0.30 * neckInDeg[dst.idx] })
    }
    cands.sort((a, b) => a.score - b.score)
    for (let c = 0; c < cands.length && neckOutDeg[src.idx] < 2; c++) {
      const dstIdx = cands[c].idx
      if (pushTrunkEdge(src.idx, dstIdx)) {
        neckOutDeg[src.idx]++
        neckInDeg[dstIdx]++
      }
    }
  }

  // Stage 4: Distribute u ~ 0.075 relay knots across distinct early constellation web nodes (u in [0.082, 0.28])
  const earlyTargets = []
  for (let i = 0; i < baseNodeCount; i++) {
    const n = rawNodes[i]
    if (n.isWeb && n.connectedCount > 0 && neckOutDeg[i] > 0 && n.u >= 0.082 && n.u <= 0.28) {
      earlyTargets.push(n)
    }
  }
  const targetFanIn = new Int32Array(baseNodeCount)

  for (let f = 6; f < feederIndices.length; f++) {
    const src = rawNodes[feederIndices[f]]
    const candidates = []
    for (let t = 0; t < earlyTargets.length; t++) {
      const dst = earlyTargets[t]
      if (dst.u <= src.u + 0.008) continue
      const d = Math.hypot(dst.isoX - src.isoX, dst.isoY - src.isoY)
      const dv = Math.abs(dst.v_funnel - src.v_funnel)
      candidates.push({ idx: dst.idx, d, dv })
    }
    let linked = 0
    for (let pass = 0; pass < 2 && linked < 5; pass++) {
      candidates.sort((a, b) => {
        const sA = a.d + 0.45 * a.dv + targetFanIn[a.idx] * 1.15
        const sB = b.d + 0.45 * b.dv + targetFanIn[b.idx] * 1.15
        return sA - sB
      })
      for (let c = 0; c < candidates.length && linked < 5; c++) {
        const dstIdx = candidates[c].idx
        if (pass === 0 && targetFanIn[dstIdx] > 0) continue
        if (pushTrunkEdge(src.idx, dstIdx)) {
          targetFanIn[dstIdx]++
          linked++
        }
      }
    }
  }

  if (extraEdges.length === 0) return edges

  const totalEdges = edges.length + extraEdges.length
  const nextI = new Int32Array(totalEdges)
  const nextJ = new Int32Array(totalEdges)
  const nextFallback = new Uint8Array(totalEdges)
  nextI.set(edges.i.subarray(0, edges.length))
  nextJ.set(edges.j.subarray(0, edges.length))
  nextFallback.set(edges.fallback.subarray(0, edges.length))
  for (let k = 0; k < extraEdges.length; k++) {
    nextI[edges.length + k] = extraEdges[k].i
    nextJ[edges.length + k] = extraEdges[k].j
    nextFallback[edges.length + k] = 0
  }
  return {
    length: totalEdges,
    i: nextI,
    j: nextJ,
    fallback: nextFallback,
  }
}

/**
 * Traces 16–24 distinct outward-flowing full-span synaptic routes per wing:
 * - Every route starts strictly at u <= 0.06 and advances monotonically outward to u >= 0.94.
 * - Balanced coverage across upper (lane 0), central (lane 1), and lower (lane 2) wing arches.
 * - Parameterized by cumulative isotropic arc-length [0.0 -> 1.0] for uniform physical speed.
 * - Packs up to 4 route memberships per wire and per star vertex with zero extra geometry.
 */
function traceOutwardSignalPaths(rawNodes, validEdgeIndices, edges, prng) {
  const nCount = rawNodes.length
  const eCount = validEdgeIndices.length
  const forwardAdj = Array.from({ length: nCount }, () => [])

  for (let k = 0; k < eCount; k++) {
    const eIdx = validEdgeIndices[k]
    const i = edges.i[eIdx]
    const j = edges.j[eIdx]
    const uI = rawNodes[i].u
    const uJ = rawNodes[j].u
    if (uJ > uI + 0.001) {
      forwardAdj[i].push({ edgePos: k, other: j })
    } else if (uI > uJ + 0.001) {
      forwardAdj[j].push({ edgePos: k, other: i })
    }
  }

  const edgeRouteIds = Array.from({ length: eCount }, () => [])
  const edgeSlotData = Array.from({ length: eCount }, () => [])
  const nodeSlotData = Array.from({ length: nCount }, () => [])
  const edgeBodySets = []
  const routes = []

  const startSeeds = rawNodes
    .filter((n) => n.isWeb && n.connectedCount > 0 && n.u <= 0.06 && forwardAdj[n.idx].length > 0)
    .sort((a, b) => a.u - b.u || a.v_funnel - b.v_funnel)

  // Interleaved lane schedule (7 upper, 7 mid, 7 lower = 21 target routes)
  const laneSpecs = []
  const upperTargets = [0.76, 0.42, 0.62, 0.32, 0.84, 0.50, 0.68]
  const midTargets = [0.0, -0.16, 0.16, -0.08, 0.08, -0.22, 0.22]
  const lowerTargets = [-0.76, -0.42, -0.62, -0.32, -0.84, -0.50, -0.68]
  for (let b = 0; b < 7; b++) {
    laneSpecs.push({ lane: 0, targetV: upperTargets[b], swayAmp: (b % 2 === 0 ? 0.14 : -0.12), swayPhase: b * 1.1 })
    laneSpecs.push({ lane: 1, targetV: midTargets[b], swayAmp: (b % 2 === 0 ? 0.16 : -0.16), swayPhase: b * 1.3 + 0.5 })
    laneSpecs.push({ lane: 2, targetV: lowerTargets[b], swayAmp: (b % 2 === 0 ? -0.14 : 0.12), swayPhase: b * 1.1 + 0.9 })
  }

  const dist = new Float64Array(nCount)
  const parentNode = new Int32Array(nCount)
  const parentEdge = new Int32Array(nCount)
  const closed = new Uint8Array(nCount)
  const heapCap = Math.max(256, nCount * 4)
  const heapNodes = new Int32Array(heapCap)
  const heapCosts = new Float64Array(heapCap)
  let heapLen = 0

  function heapPush(nodeIdx, cost) {
    if (heapLen >= heapCap) return
    let idx = heapLen++
    while (idx > 0) {
      const p = (idx - 1) >> 1
      if (heapCosts[p] <= cost) break
      heapNodes[idx] = heapNodes[p]
      heapCosts[idx] = heapCosts[p]
      idx = p
    }
    heapNodes[idx] = nodeIdx
    heapCosts[idx] = cost
  }

  function heapPop() {
    const topNode = heapNodes[0]
    const lastIdx = --heapLen
    if (lastIdx > 0) {
      const lastNode = heapNodes[lastIdx]
      const lastCost = heapCosts[lastIdx]
      let idx = 0
      const half = lastIdx >> 1
      while (idx < half) {
        let child = (idx << 1) + 1
        const right = child + 1
        if (right < lastIdx && heapCosts[right] < heapCosts[child]) {
          child = right
        }
        if (lastCost <= heapCosts[child]) break
        heapNodes[idx] = heapNodes[child]
        heapCosts[idx] = heapCosts[child]
        idx = child
      }
      heapNodes[idx] = lastNode
      heapCosts[idx] = lastCost
    }
    return topNode
  }

  function findFullSpanPath(seedIdx, targetV, swayAmp, swayPhase, bodyReuseScale) {
    dist.fill(Infinity)
    parentNode.fill(-1)
    parentEdge.fill(-1)
    closed.fill(0)
    heapLen = 0

    dist[seedIdx] = 0
    heapPush(seedIdx, 0)

    let bestGoal = -1
    let bestGoalScore = Infinity

    while (heapLen > 0) {
      if (heapCosts[0] >= bestGoalScore) break
      const currIdx = heapPop()
      if (closed[currIdx]) continue
      closed[currIdx] = 1

      const curr = rawNodes[currIdx]
      if (curr.u >= 0.94) {
        const goalPenalty =
          nodeSlotData[currIdx].length * 3.0 +
          Math.abs(curr.v_funnel - targetV) * 2.4 +
          Math.max(0.0, 0.965 - curr.u) * 2.0
        const goalScore = dist[currIdx] + goalPenalty
        if (goalScore < bestGoalScore) {
          bestGoalScore = goalScore
          bestGoal = currIdx
        }
        continue
      }

      const neighbors = forwardAdj[currIdx]
      for (let m = 0; m < neighbors.length; m++) {
        const nb = neighbors[m]
        const otherIdx = nb.other
        if (closed[otherIdx]) continue
        const edgeUse = edgeRouteIds[nb.edgePos].length
        if (edgeUse >= MAX_ROUTES_PER_ELEMENT) continue
        const nodeUse = nodeSlotData[otherIdx].length

        const other = rawNodes[otherIdx]
        const stepLen = Math.max(0.012, Math.hypot(other.isoX - curr.isoX, other.isoY - curr.isoY))
        const uMid = 0.5 * (curr.u + other.u)
        const ramp = THREE.MathUtils.smoothstep(other.u, 0.055, 0.28)
        const guideV = THREE.MathUtils.clamp(
          targetV * ramp + swayAmp * Math.sin(swayPhase + other.u * Math.PI * 2.0) * Math.sin(other.u * Math.PI),
          -0.95,
          0.95
        )
        const lanePenalty = 1.9 * Math.abs(other.v_funnel - guideV)
        const bodyWeight = uMid > 0.14 ? bodyReuseScale : 0.04
        const reuseEdgePenalty = edgeUse * (4.4 * bodyWeight + 0.14)
        const reuseNodePenalty = nodeUse * nodeUse * (2.6 * bodyWeight + 0.08)
        const hubBonus = other.tier === 2 ? -0.10 : 0.0

        const edgeCost = Math.max(
          0.004,
          stepLen * (1.0 + lanePenalty + hubBonus) + reuseEdgePenalty + reuseNodePenalty
        )
        const nextDist = dist[currIdx] + edgeCost
        if (nextDist < dist[otherIdx]) {
          dist[otherIdx] = nextDist
          parentNode[otherIdx] = currIdx
          parentEdge[otherIdx] = nb.edgePos
          heapPush(otherIdx, nextDist)
        }
      }
    }

    if (bestGoal === -1) return null

    const revNodes = []
    const revEdges = []
    let walk = bestGoal
    while (walk !== -1) {
      revNodes.push(walk)
      if (parentEdge[walk] !== -1) {
        revEdges.push({ edgePos: parentEdge[walk], from: parentNode[walk], to: walk })
      }
      walk = parentNode[walk]
    }
    if (revEdges.length < 4) return null

    revNodes.reverse()
    revEdges.reverse()

    const firstNode = rawNodes[revNodes[0]]
    const lastNode = rawNodes[revNodes[revNodes.length - 1]]
    if (firstNode.u > 0.06 || lastNode.u < 0.94) return null

    return { pathNodes: revNodes, pathEdges: revEdges }
  }

  function isRouteDistinct(pathEdges, threshold = 0.78) {
    const bodyEdges = []
    for (let s = 0; s < pathEdges.length; s++) {
      const e = pathEdges[s]
      const uMid = 0.5 * (rawNodes[e.from].u + rawNodes[e.to].u)
      if (uMid > 0.24) bodyEdges.push(e.edgePos)
    }
    if (bodyEdges.length === 0) return false
    for (let r = 0; r < edgeBodySets.length; r++) {
      const existing = edgeBodySets[r]
      let shared = 0
      for (let b = 0; b < bodyEdges.length; b++) {
        if (existing.has(bodyEdges[b])) shared++
      }
      if (shared / bodyEdges.length > threshold) return false
    }
    return true
  }

  function commitRoute(found, laneSpec) {
    const { pathNodes, pathEdges } = found
    const cumDist = new Float64Array(pathNodes.length)
    for (let s = 0; s < pathEdges.length; s++) {
      const nA = rawNodes[pathEdges[s].from]
      const nB = rawNodes[pathEdges[s].to]
      cumDist[s + 1] = cumDist[s] + Math.max(1e-4, Math.hypot(nB.isoX - nA.isoX, nB.isoY - nA.isoY))
    }
    const totalDist = Math.max(1e-4, cumDist[pathNodes.length - 1])
    const routeId = routes.length

    const bodySet = new Set()
    for (let s = 0; s < pathEdges.length; s++) {
      const step = pathEdges[s]
      const uMid = 0.5 * (rawNodes[step.from].u + rawNodes[step.to].u)
      if (uMid > 0.24) bodySet.add(step.edgePos)
      edgeRouteIds[step.edgePos].push(routeId)
      edgeSlotData[step.edgePos].push({
        routeId,
        from: step.from,
        to: step.to,
        progFrom: cumDist[s] / totalDist,
        progTo: cumDist[s + 1] / totalDist,
      })
    }

    for (let s = 0; s < pathNodes.length; s++) {
      const nSlots = nodeSlotData[pathNodes[s]]
      if (nSlots.length < MAX_ROUTES_PER_ELEMENT) {
        nSlots.push({
          routeId,
          prog: cumDist[s] / totalDist,
        })
      }
    }

    edgeBodySets.push(bodySet)
    routes.push({
      id: routeId,
      lane: laneSpec.lane,
      startU: rawNodes[pathNodes[0]].u,
      endU: rawNodes[pathNodes[pathNodes.length - 1]].u,
      totalDist,
      nodeCount: pathNodes.length,
    })
  }

  // Pass 1 & Pass 2: Trace diverse routes across all 21 lane targets
  const filledSpec = new Uint8Array(laneSpecs.length)
  for (let pass = 0; pass < 2 && routes.length < TARGET_ROUTE_COUNT; pass++) {
    const reuseScale = pass === 0 ? 1.0 : 0.35
    const distinctThresh = pass === 0 ? 0.78 : 0.90
    const maxSeedTries = pass === 0 ? 2 : 4
    for (let idx = 0; idx < laneSpecs.length && routes.length < TARGET_ROUTE_COUNT; idx++) {
      if (filledSpec[idx]) continue
      const spec = laneSpecs[idx]
      const seedOrder = startSeeds
        .slice()
        .sort((a, b) => {
          const scoreA = nodeSlotData[a.idx].length * 2.5 + Math.abs(a.v_funnel - spec.targetV * 0.55) + prng() * 0.25
          const scoreB = nodeSlotData[b.idx].length * 2.5 + Math.abs(b.v_funnel - spec.targetV * 0.55) + prng() * 0.25
          return scoreA - scoreB
        })

      let chosen = null
      for (let s = 0; s < Math.min(maxSeedTries, seedOrder.length); s++) {
        const candidate = findFullSpanPath(seedOrder[s].idx, spec.targetV, spec.swayAmp, spec.swayPhase, reuseScale)
        if (candidate && isRouteDistinct(candidate.pathEdges, distinctThresh)) {
          chosen = candidate
          break
        }
      }
      if (!chosen) continue
      commitRoute(chosen, spec)
      filledSpec[idx] = 1
    }
  }

  return { edgeSlotData, nodeSlotData, routes }
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

  // 0. Precompute swept full-funnel LUT of ribbon bounds along u (shared across left/right when wave config matches)
  const lut = getCachedRibbonBoundsLUT(H, config)
  const baselineMaxIsoH = 2.8
  const maxEnvIsoH = lut.maxFunnelHeight * isoYScale
  const envScale = THREE.MathUtils.clamp(maxEnvIsoH / baselineMaxIsoH, 0.38, 1.30)
  const waveFreq = config.frequency ?? 1.0
  const kWave = 2.5 * Math.PI * waveFreq

  // 1. Stratified organic constellation sampling + non-indexed synaptic spiderweb
  const { rawNodes, webGrid } = sampleStratifiedNodes(sign, safeXScale, isoYScale, lut, prng, envScale)
  const baseEdges = connectNeuralNodes(rawNodes, webGrid, lut, safeXScale, isoYScale, envScale)
  const edges = addInnerTipFeederTrunk(rawNodes, baseEdges, sign, safeXScale, isoYScale, lut)

  // Keep connected web nodes + background micro-dust sparkles
  const visibleNodes = rawNodes.filter(n => !n.isWeb || n.connectedCount > 0)

  // 2. Build Non-Indexed Lines BufferGeometry (Per-edge length/depth/dendrite hierarchy & multi-route packing)
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

  const { edgeSlotData, nodeSlotData, routes } = traceOutwardSignalPaths(
    rawNodes,
    validEdgeIndices,
    edges,
    prng
  )

  const lineVertCount = validEdgeIndices.length * 2
  const linePositions = new Float32Array(lineVertCount * 3)
  const lineStyles = new Float32Array(lineVertCount * 4)
  const lineRelativeCoords = new Float32Array(lineVertCount * 4)
  const lineRouteIds = new Float32Array(lineVertCount * 4)
  lineRouteIds.fill(-1.0)
  const lineRouteProgress = new Float32Array(lineVertCount * 4)

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

    // Coherent outward traveling wave pulse synchronized with the exact wavelength and direction of the side waves.
    const phiA = kWave * nA.u
    const phiB = kWave * nB.u

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

    const eRoutes = edgeSlotData[k]
    const slotCount = Math.min(MAX_ROUTES_PER_ELEMENT, eRoutes.length)
    for (let s = 0; s < slotCount; s++) {
      const sig = eRoutes[s]
      const aIsFrom = nA.idx === sig.from
      lineRouteIds[vA * 4 + s] = sig.routeId
      lineRouteProgress[vA * 4 + s] = aIsFrom ? sig.progFrom : sig.progTo
      lineRouteIds[vB * 4 + s] = sig.routeId
      lineRouteProgress[vB * 4 + s] = aIsFrom ? sig.progTo : sig.progFrom
    }
  }

  const linesGeo = new THREE.BufferGeometry()
  linesGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
  linesGeo.setAttribute('aLineStyle', new THREE.BufferAttribute(lineStyles, 4))
  linesGeo.setAttribute('aRelativeCoord', new THREE.BufferAttribute(lineRelativeCoords, 4))
  linesGeo.setAttribute('aRouteIds', new THREE.BufferAttribute(lineRouteIds, 4))
  linesGeo.setAttribute('aRouteProgress', new THREE.BufferAttribute(lineRouteProgress, 4))
  linesGeo.userData.signalPathCount = routes.length
  linesGeo.userData.routes = routes
  if (lineVertCount > 0) {
    linesGeo.computeBoundingBox()
    linesGeo.computeBoundingSphere()
  }

  // 3. Build Points BufferGeometry (3-Tier Glowing Star Constellation with Multi-Route Node Relay)
  const pointCount = visibleNodes.length
  const pointPositions = new Float32Array(pointCount * 3)
  const pointStyles = new Float32Array(pointCount * 4)
  const pointRelativeCoords = new Float32Array(pointCount * 4)
  const pointRouteIds = new Float32Array(pointCount * 4)
  pointRouteIds.fill(-1.0)
  const pointRouteProgress = new Float32Array(pointCount * 4)

  for (let nIdx = 0; nIdx < pointCount; nIdx++) {
    const n = visibleNodes[nIdx]
    pointPositions[nIdx * 3] = n.pos.x
    pointPositions[nIdx * 3 + 1] = n.pos.y
    pointPositions[nIdx * 3 + 2] = n.pos.z
    pointStyles[nIdx * 4] = n.size
    pointStyles[nIdx * 4 + 1] = n.alpha
    pointStyles[nIdx * 4 + 2] = n.tier
    pointStyles[nIdx * 4 + 3] = n.twinklePhase
    pointRelativeCoords[nIdx * 4] = n.relativeCoord[0]
    pointRelativeCoords[nIdx * 4 + 1] = n.relativeCoord[1]
    pointRelativeCoords[nIdx * 4 + 2] = n.relativeCoord[2]
    pointRelativeCoords[nIdx * 4 + 3] = n.relativeCoord[3]

    const nRoutes = nodeSlotData[n.idx]
    const slotCount = Math.min(MAX_ROUTES_PER_ELEMENT, nRoutes.length)
    for (let s = 0; s < slotCount; s++) {
      pointRouteIds[nIdx * 4 + s] = nRoutes[s].routeId
      pointRouteProgress[nIdx * 4 + s] = nRoutes[s].prog
    }
  }

  const pointsGeo = new THREE.BufferGeometry()
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
  pointsGeo.setAttribute('aPointStyle', new THREE.BufferAttribute(pointStyles, 4))
  pointsGeo.setAttribute('aRelativeCoord', new THREE.BufferAttribute(pointRelativeCoords, 4))
  pointsGeo.setAttribute('aRouteIds', new THREE.BufferAttribute(pointRouteIds, 4))
  pointsGeo.setAttribute('aRouteProgress', new THREE.BufferAttribute(pointRouteProgress, 4))
  if (pointCount > 0) {
    pointsGeo.computeBoundingBox()
    pointsGeo.computeBoundingSphere()
  }

  // 4. Smooth Non-Blotchy Interior Atmospheric Mist (distributed evenly across full swept funnel, zero stacked neon blobs)
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
  let hazeCount = 0

  for (let u0 = 0.105; u0 < 0.982; u0 += hazeDu) {
    const u1 = Math.min(0.982, u0 + hazeDu)
    const stripDu = u1 - u0
    if (stripDu < 0.002) continue
    const uMid = 0.5 * (u0 + u1)
    const bMid = lut.getFunnelBounds(uMid)
    if (bMid.funnelHeight * isoYScale < 0.062 * envScale) continue

    const vMaxHaze = computeVMax(bMid.funnelHeight, isoYScale, 0.985, 0.006 * envScale)
    if (vMaxHaze <= 0.05) continue
    const activeIsoH = isoYScale * bMid.funnelHeight * vMaxHaze
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
        const bLoc = lut.getFunnelBounds(u)
        if (bLoc.funnelHeight * isoYScale < 0.055 * envScale) continue

        const vMaxLoc = computeVMax(bLoc.funnelHeight, isoYScale, 0.985, 0.006 * envScale)
        if (vMaxLoc <= 0.05) continue
        const v_rel = vMaxHaze > 1e-4 ? vRaw * (vMaxLoc / vMaxHaze) : vRaw
        if (Math.abs(v_rel) > vMaxLoc) continue

        const x = sign * 10.0 * u
        const y = bLoc.funnelCenterY + v_rel * 0.5 * bLoc.funnelHeight
        const isoX = x * safeXScale
        const isoY = y * isoYScale
        const minHazeDist = 0.088 * cellScale * hazeSpanScale
        if (hazeGrid.hasNeighborWithin(isoX, isoY, minHazeDist, hazeNodes, minHazeDist * 1.18)) continue

        const w_depth = -0.18 - prng() * 0.54
        const z = bLoc.funnelCenterZ + w_depth * bLoc.funnelRz

        const v_funnel = Math.max(-0.985, Math.min(0.985, v_rel))
        const r_norm = Math.min(1.0, Math.hypot(v_funnel, w_depth))

        const innerTipFade = THREE.MathUtils.smoothstep(u, 0.105, 0.22)
        const vRatio = v_funnel / Math.max(0.25, vMaxLoc)
        const vTaper = 1.0 - 0.16 * vRatio * vRatio
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
        hazeRelativeCoords[hazeCount * 4 + 1] = v_funnel
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
  addStaticPocketMaskAttributes(pointsGeo, H, config, travelProfiles, false, true)
  addStaticPocketMaskAttributes(linesGeo, H, config, travelProfiles, true, true)
  addStaticPocketMaskAttributes(hazeGeo, H, config, travelProfiles, false, false)

  return {
    linesGeo,
    pointsGeo,
    hazeGeo,
  }
}
