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
  constructor(H = H_VAL, config = {}, samples = 1024) {
    this.samples = samples
    this.H = H
    this.config = config
    // Float64 preserves the original double-precision interpolation decisions.
    this.data = new Float64Array((samples + 1) * 17)
    const sample = {}
    for (let i = 0; i <= samples; i++) {
      getAlmondPocketBounds(i / samples, H, config, sample)
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
    this._ribbons = Array.from({ length: 4 }, (_, id) => ({ id, y: 0, z: 0 }))
    this._pocketPool = Array.from({ length: 3 }, () => ({}))
    this._pockets = []
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
      const count = this.queryRadius(node.pos.x, node.pos.y, node.pos.z, 0.42 * (node.hu + 0.035) + 0.030, nodes)
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
        const k = this._key(ix, iy)
        this.cells.insert(k, edgeIdx)
      }
    }
  }

  hasCrossing(pA, pB, candI, candJ, edges, rawNodes, targetTier) {
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
          if (eA.depthTier === targetTier && eB.depthTier === targetTier) {
            if (segmentsIntersect2D(pA, pB, eA.pos, eB.pos)) {
              return true
            }
          }
        }
      }
    }
    return false
  }
}

/**
 * Checks if a candidate line segment intersects any wave ribbon filament core using the 1D LUT.
 * Uses squared distances to eliminate heavy Math.hypot / Math.sqrt calls across tens of thousands of edge tests.
 */
function crossesFilamentChord(ay, az, by, bz) {
  const dy = by - ay, dz = bz - az
  const length2 = dy * dy + dz * dz
  const t = length2 > 1e-16 ? Math.max(0, Math.min(1, -(ay * dy + az * dz) / length2)) : 0
  const y = ay + t * dy, z = az + t * dz
  return y * y + z * z < 0.007 * 0.007
}

function crossesRibbonIntervals(pA, uA, pB, uB, lut) {
  if (uB < uA) return crossesRibbonIntervals(pB, uB, pA, uA, lut)
  const du = uB - uA, dy = pB.y - pA.y, dz = pB.z - pA.z
  const b = lut.getBounds(uA)
  if (pA.y > b.envMaxY + 0.014 || pA.y < b.envMinY - 0.014) return true
  let y0 = pA.y - b.y0, z0 = pA.z - b.z0
  let y1 = pA.y - b.y1, z1 = pA.z - b.z1
  let y2 = pA.y - b.y2, z2 = pA.z - b.z2
  let y3 = pA.y - b.y3, z3 = pA.z - b.z3
  let t = 0
  while (t < 1) {
    const u = uA + t * du
    const nextKnot = (Math.floor(u * lut.samples + 1e-8) + 1) / lut.samples
    let nextT = du > 1e-12 ? Math.min(1, (nextKnot - uA) / du) : 1
    // Explicit midpoint, plus every LUT knot: the relative chord is linear
    // on each interval, so its closest approach cannot fall between tests.
    if (t < 0.5 && nextT > 0.5) nextT = 0.5
    const y = pA.y + nextT * dy, z = pA.z + nextT * dz
    lut.getBounds(uA + nextT * du, b)
    if (y > b.envMaxY + 0.014 || y < b.envMinY - 0.014) return true
    const ny0 = y - b.y0, nz0 = z - b.z0
    const ny1 = y - b.y1, nz1 = z - b.z1
    const ny2 = y - b.y2, nz2 = z - b.z2
    const ny3 = y - b.y3, nz3 = z - b.z3
    if (crossesFilamentChord(y0, z0, ny0, nz0) || crossesFilamentChord(y1, z1, ny1, nz1)
      || crossesFilamentChord(y2, z2, ny2, nz2) || crossesFilamentChord(y3, z3, ny3, nz3)) return true
    y0 = ny0; z0 = nz0
    y1 = ny1; z1 = nz1
    y2 = ny2; z2 = nz2
    y3 = ny3; z3 = nz3
    t = nextT
  }
  return false
}

function doesSegmentIntersectRibbonsLUT(pA, uA, pB, uB, lut, isTether = false) {
  if (!isTether) return crossesRibbonIntervals(pA, uA, pB, uB, lut)
  // Even subdivision includes the exact midpoint; endpoints are checked too.
  const samples = 8
  const marginTol = isTether ? 0.006 : 0.014
  const filamentTol = isTether ? 0.0060 : 0.0070
  const filamentTol2 = filamentTol * filamentTol
  const du = (uB - uA) / samples
  const dy = (pB.y - pA.y) / samples
  const dz = (pB.z - pA.z) / samples

  const bounds = lut._reusableBounds

  for (let s = 0; s <= samples; s++) {
    const ut = uA + s * du
    const yt = pA.y + s * dy
    const zt = pA.z + s * dz

    lut.getBounds(ut, bounds)
    if (yt > bounds.envMaxY + marginTol || yt < bounds.envMinY - marginTol) {
      return true
    }

    // Margin anchors terminate on the ribbon; only that endpoint is exempt.
    if (isTether && s === samples) continue
    const d0y = yt - bounds.y0
    const d0z = zt - bounds.z0
    if (d0y * d0y + d0z * d0z < filamentTol2) return true

    const d1y = yt - bounds.y1
    const d1z = zt - bounds.z1
    if (d1y * d1y + d1z * d1z < filamentTol2) return true

    const d2y = yt - bounds.y2
    const d2z = zt - bounds.z2
    if (d2y * d2y + d2z * d2z < filamentTol2) return true

    const d3y = yt - bounds.y3
    const d3z = zt - bounds.z3
    if (d3y * d3y + d3z * d3z < filamentTol2) return true
  }
  return false
}

function getMinFilamentClearance(y, z, b) {
  const d0y = y - b.y0, d0z = z - b.z0
  const d1y = y - b.y1, d1z = z - b.z1
  const d2y = y - b.y2, d2z = z - b.z2
  const d3y = y - b.y3, d3z = z - b.z3
  const d02 = d0y * d0y + d0z * d0z
  const d12 = d1y * d1y + d1z * d1z
  const d22 = d2y * d2y + d2z * d2z
  const d32 = d3y * d3y + d3z * d3z
  return Math.sqrt(Math.min(d02, d12, d22, d32))
}

// Keep the sampling and topology loops independently optimizable by the JS engine.
function sampleNeuralNodes(sign, projectionAspect, lut, prng, minSubGap) {
  // 2. True 3D Poisson-Disk Volumetric Sampling across all open sub-pockets
  const rawNodes = []
  const grid = new SpatialGrid3D(0.10)
  const projectedGrid = new SpatialGrid3D(0.10)
  const basePockets = []
  const basePocketPool = Array.from({ length: 3 }, () => ({}))

  // Equal longitudinal bins and area-weighted darts avoid density steps at
  // u=.12/.22/.90. A separate borrowed-record pool survives nested LUT queries.
  const du = 0.004
  for (let uBin = 0.078; uBin < 1.0; uBin += du) {
    const tipTaper = THREE.MathUtils.smoothstep(uBin, 0.06, 0.20)
    if (tipTaper <= 0.001) continue

    const pocketsCheck = lut.getSubPockets(uBin, minSubGap, basePockets, basePocketPool)
    if (pocketsCheck.length === 0) continue

    for (const basePocket of pocketsCheck) {
      const throatFactor = THREE.MathUtils.smoothstep(basePocket.height, minSubGap, 0.09)
      const baseDarts = Math.max(2, Math.round(
        (3 + 16 * basePocket.height) * (0.45 + 0.55 * throatFactor) * (0.65 + 0.35 * tipTaper)
      ))

      for (let d = 0; d < baseDarts; d++) {
        const u = THREE.MathUtils.clamp(
          uBin + (prng() - 0.5) * du * 0.92,
          0.061,
          0.999
        )

        const bLocal = lut.getBounds(u)
        const pLocalList = lut.getSubPockets(u, minSubGap)
        if (pLocalList.length === 0) continue

        // Follow the same ribbon pair through a bin; never jump across a braid.
        let pLocal = null
        for (let k = 0; k < pLocalList.length; k++) {
          const p = pLocalList[k]
          if (p.lowerId === basePocket.lowerId && p.upperId === basePocket.upperId) { pLocal = p; break }
        }
        if (!pLocal) continue

        // Allow nodes to populate right up to soft rim feathering
        const v_rel = (prng() - 0.5) * 1.90
        const w_depth = (prng() - 0.5) * 1.80
        const r_norm = Math.hypot(v_rel, w_depth)
        if (r_norm > 0.94) continue

        const localRz = u < 0.20
          ? Math.min(pLocal.rz, 1.1 * pLocal.height + 0.015)
          : pLocal.rz

        const y = pLocal.centerY + v_rel * pLocal.ry
        const z = pLocal.centerZ + w_depth * localRz
        const x = sign * 10.0 * u

        // Loosened margin clearance right up to soft rim feathering
        const marginClearance = Math.min(0.0016, 0.032 * bLocal.envHeight)
        if (y > bLocal.envMaxY - marginClearance || y < bLocal.envMinY + marginClearance) continue

        const minFilamentDist = getMinFilamentClearance(y, z, bLocal)
        const heroClearance = pLocal.height < 0.06
          ? Math.min(0.0032, 0.06 * pLocal.height)
          : (u > 0.65 ? 0.0052 : (u < 0.20 ? Math.min(0.0038, 0.07 * pLocal.height) : 0.0060))
        if (minFilamentDist < Math.max(0.0075, heroClearance)) continue

        // Smooth, flattened blue-noise acceptance
        const clusterNoise = 0.90 + 0.04 * Math.sin(0.9 * x + 0.3) * Math.cos(1.8 * y) + 0.02 * Math.sin(1.6 * x - 1.2 * z)
        const noiseAccept = THREE.MathUtils.clamp(clusterNoise, 0.84, 0.96)
        if (prng() > noiseAccept) continue

        const isFG = w_depth > 0.25
        const isBG = w_depth < -0.25
        const depthTier = isFG ? 'fg' : (isBG ? 'bg' : 'mid')
        const layer = isFG ? 1.0 : (isBG ? -1.0 : 0.0)

        // Raised world-space Poisson-disk minimum clearance floor r_min(u)
        // Calibrates uniform medium-coupled spacing across every pocket to match outer wing
        const tipFactor = THREE.MathUtils.smoothstep(u, 0.08, 0.24)
        const outerChamberBoost = 1.0 + 0.18 * THREE.MathUtils.smoothstep(u, 0.40, 0.95)
        const floorTier = (depthTier === 'fg'
          ? (0.025 + 0.024 * tipFactor)
          : (depthTier === 'mid'
            ? (0.020 + 0.020 * tipFactor)
            : (0.017 + 0.017 * tipFactor))) * outerChamberBoost

        const rMin = floorTier + 0.034 * Math.min(0.50, pLocal.height)

        if (grid.isTooClose(x, y, z, rMin, rawNodes, false, 0.09)) continue
        const projectedRadius = (0.022 + 0.026 * tipFactor) * (isFG ? 1.10 : 1.0)
        if (!isBG && projectedGrid.isTooClose(x, y * projectionAspect, 0, projectedRadius, rawNodes, true, 0.06)) continue

        const id = rawNodes.length
        const pos = new THREE.Vector3(x, y, z)
        const weight = computeConstraintWeight(u)
        const localHeight = Math.max(0.024, bLocal.envHeight)

        rawNodes.push({
          id: `node_${id}`,
          idx: id,
          pos,
          u,
          hu: localHeight,
          localSubHeight: pLocal.height,
          radius: rMin,
          projectedRadius,
          projectedY: y * projectionAspect,
          weight,
          isAnchor: false,
          connectedCount: 0,
          layer,
          depthTier,
          v_rel,
          w_depth,
          r_norm,
          isHighlight: 0.0,
          alpha: -0, lineAlpha: -0, size: -0,
          relativeCoord: [u, v_rel, w_depth, r_norm],
        })
        grid.insert(x, y, z, id)
        if (!isBG) projectedGrid.insert(x, y * projectionAspect, 0, id)
      }
    }
  }

  return { rawNodes, grid }
}

function connectNeuralNodes(rawNodes, grid, lut, projectionAspect) {
  grid.prepareQueries(rawNodes)

  // 3. Topology Connection using Spatial Hash Grid (Requirement 4)
  const edgeCapacity = Math.ceil(rawNodes.length * 7 / 2)
  const edges = {
    length: 0,
    i: new Int32Array(edgeCapacity), j: new Int32Array(edgeCapacity),
    interLayer: new Uint8Array(edgeCapacity), fallback: new Uint8Array(edgeCapacity),
  }
  // Degree is capped at seven. Fixed adjacency slots also provide exact edge membership.
  const adjacency = new Int32Array(rawNodes.length * 7)
  const neighborIds = new Int32Array(7)
  function hasEdge(i, j) {
    for (let k = 0; k < rawNodes[i].connectedCount; k++) {
      if (adjacency[i * 7 + k] === j) return true
    }
    return false
  }
  const edgeGrid = new EdgeGrid2D(0.20)

  function crowdedDirection(i, j) {
    const a = rawNodes[i], b = rawNodes[j]
    const dx = b.pos.x - a.pos.x, dy = (b.pos.y - a.pos.y) * projectionAspect
    const length2 = dx * dx + dy * dy
    if (length2 < 0.000064) return true
    const vertical = Math.abs(dy) > 2.4 * Math.abs(dx)
    for (let slot = 0; slot < a.connectedCount; slot++) {
      const k = adjacency[i * 7 + slot]
      const n = rawNodes[k]
      const nx = n.pos.x - a.pos.x, ny = (n.pos.y - a.pos.y) * projectionAspect
      // One steep strut is natural; repeated steep struts form ladders.
      if (vertical && Math.abs(ny) > 2.4 * Math.abs(nx)) return true
      if (n.depthTier !== b.depthTier) continue
      const dot = dx * nx + dy * ny
      if (dot > 0 && dot * dot > 0.88 * length2 * (nx * nx + ny * ny)) return true
    }
    return false
  }

  function addEdge(i, j, dist, isInterLayer = false, isFallback = false) {
    if (hasEdge(i, j)) return false
    const a = rawNodes[i], b = rawNodes[j]
    if (a.connectedCount >= 7 || b.connectedCount >= 7) return false
    if (crowdedDirection(i, j) || crowdedDirection(j, i)) return false
    if (doesSegmentIntersectRibbonsLUT(a.pos, a.u, b.pos, b.u, lut)) return false
    if (a.depthTier === b.depthTier && edgeGrid.hasCrossing(a.pos, b.pos, i, j, edges, rawNodes, a.depthTier)) return false
    const edgeIdx = edges.length
    edges.i[edgeIdx] = i
    edges.j[edgeIdx] = j
    edges.interLayer[edgeIdx] = isInterLayer
    edges.fallback[edgeIdx] = isFallback
    edges.length++
    adjacency[i * 7 + rawNodes[i].connectedCount++] = j
    adjacency[j * 7 + rawNodes[j].connectedCount++] = i
    edgeGrid.insert(edgeIdx, rawNodes[i].pos, rawNodes[j].pos)
    return true
  }

  let candidateIds = new Int32Array(Math.max(256, rawNodes.length))
  let candidateDistances = new Float64Array(candidateIds.length)
  let candidateCount = 0
  function insertCandidate(j, distance) {
    if (candidateCount === candidateIds.length) {
      const ids = new Int32Array(candidateCount * 2), distances = new Float64Array(candidateCount * 2)
      ids.set(candidateIds); distances.set(candidateDistances)
      candidateIds = ids; candidateDistances = distances
    }
    let slot = candidateCount++
    while (slot > 0 && candidateDistances[slot - 1] > distance) {
      candidateIds[slot] = candidateIds[slot - 1]
      candidateDistances[slot] = candidateDistances[slot - 1]
      slot--
    }
    candidateIds[slot] = j
    candidateDistances[slot] = distance
  }

  // 3a. Intra-layer Delaunay/k-NN connections
  const layerIndices = new Int32Array(rawNodes.length)
  const depthLayers = ['fg', 'mid', 'bg']
  for (const lyr of depthLayers) {
    let layerCount = 0
    for (let i = 0; i < rawNodes.length; i++) {
      if (rawNodes[i].depthTier === lyr) layerIndices[layerCount++] = i
    }

    const targetK = lyr === 'mid' ? 4 : (lyr === 'fg' ? 4 : 3)

    for (let a = 0; a < layerCount; a++) {
      const i = layerIndices[a]
      const nA = rawNodes[i]
      candidateCount = 0

      for (let nearby = grid.queryOffsets[i]; nearby < grid.queryOffsets[i + 1]; nearby++) {
        const j = grid.queryIds[nearby], dist3D = grid.queryDistances[nearby]
        if (i === j) continue
        if (dist3D < 0.008) continue
        const nB = rawNodes[j]
        if (nB.depthTier !== lyr) continue
        if (Math.abs(nA.u - nB.u) > 0.090) continue
        const localH = Math.max(nA.hu, nB.hu)

        const dx = Math.abs(nA.pos.x - nB.pos.x)
        const dy = Math.abs(nA.pos.y - nB.pos.y)
        if (localH > 0.18 && dist3D > 0.22 * localH && dy > 1.8 * dx) continue

        if (crowdedDirection(i, j) || crowdedDirection(j, i)) continue

        // Slightly widened valid diagonal edge reach to match new Poisson-disk spacing
        const isDiagonal = dx > 0.012 && dy <= 1.25 * dx
        const maxEdgeDist = isDiagonal ? (0.42 * localH + 0.030) : (0.38 * localH + 0.025)
        if (dist3D > maxEdgeDist) continue

        insertCandidate(j, dist3D)
      }


      for (let c = 0; c < candidateCount; c++) {
        if (nA.connectedCount >= targetK) break
        const j = candidateIds[c]
        const nB = rawNodes[j]
        if (nB.connectedCount >= targetK + 2) continue

        addEdge(i, j, candidateDistances[c])
      }
    }

    // Triangular face completion within layer
    for (let a = 0; a < layerCount; a++) {
      const i = layerIndices[a]
      let neighborCount = 0
      for (let slot = 0; slot < rawNodes[i].connectedCount; slot++) {
        const nb = adjacency[i * 7 + slot]
        if (rawNodes[nb].depthTier === lyr) neighborIds[neighborCount++] = nb
      }
      if (neighborCount < 2) continue

      for (let p1 = 0; p1 < neighborCount; p1++) {
        for (let p2 = p1 + 1; p2 < neighborCount; p2++) {
          const j = neighborIds[p1]
          const k = neighborIds[p2]
          if (hasEdge(j, k)) continue
          const nJ = rawNodes[j]
          const nK = rawNodes[k]
          if (nJ.connectedCount >= targetK + 1 || nK.connectedCount >= targetK + 1) continue

          const dist3D = nJ.pos.distanceTo(nK.pos)
          if (dist3D < 0.008) continue
          if (Math.abs(nJ.u - nK.u) > 0.090) continue

          const localH = Math.max(nJ.hu, nK.hu)
          const dx = Math.abs(nJ.pos.x - nK.pos.x)
          const dy = Math.abs(nJ.pos.y - nK.pos.y)
          if (localH > 0.18 && dist3D > 0.22 * localH && dy > 1.8 * dx) continue

          // Keep open polygon cells rather than closing skinny sliver triangles.
          const area2 = Math.abs((nJ.pos.x - rawNodes[i].pos.x) * (nK.pos.y - rawNodes[i].pos.y)
            - (nJ.pos.y - rawNodes[i].pos.y) * (nK.pos.x - rawNodes[i].pos.x))
          if (area2 < 0.16 * dist3D * dist3D) continue

          const isDiagonal = dx > 0.012 && dy <= 1.25 * dx
          const maxEdgeDist = isDiagonal ? (0.42 * localH + 0.030) : (0.38 * localH + 0.025)
          if (dist3D > maxEdgeDist) continue

          addEdge(j, k, dist3D)
        }
      }
    }
  }

  // 3b. Dual-tier FG-to-MID/BG links (FG -> MID, MID -> BG)
  for (let i = 0; i < rawNodes.length; i++) {
    const nA = rawNodes[i]
    if (nA.depthTier !== 'fg') continue
    candidateCount = 0

    for (let nearby = grid.queryOffsets[i]; nearby < grid.queryOffsets[i + 1]; nearby++) {
      const j = grid.queryIds[nearby], dist3D = grid.queryDistances[nearby]
      const nB = rawNodes[j]
      if (nB.depthTier !== 'mid') continue
      if (Math.abs(nA.u - nB.u) > 0.085) continue
      const localH = Math.max(nA.hu, nB.hu)
      const dx = Math.abs(nA.pos.x - nB.pos.x)
      const dy = Math.abs(nA.pos.y - nB.pos.y)
      if (crowdedDirection(i, j) || crowdedDirection(j, i)) continue
      const isDiagonal = dx > 0.012 && dy <= 1.25 * dx
      const maxEdgeDist = isDiagonal ? (0.42 * localH + 0.030) : (0.38 * localH + 0.025)
      if (dist3D > maxEdgeDist || dist3D < 0.008) continue
      if (doesSegmentIntersectRibbonsLUT(nA.pos, nA.u, nB.pos, nB.u, lut)) continue
      insertCandidate(j, dist3D)
    }

    for (let m = 0; m < Math.min(2, candidateCount); m++) {
      addEdge(i, candidateIds[m], candidateDistances[m], true)
    }
  }

  for (let i = 0; i < rawNodes.length; i++) {
    const nA = rawNodes[i]
    if (nA.depthTier !== 'bg') continue
    candidateCount = 0

    for (let nearby = grid.queryOffsets[i]; nearby < grid.queryOffsets[i + 1]; nearby++) {
      const j = grid.queryIds[nearby], dist3D = grid.queryDistances[nearby]
      const nB = rawNodes[j]
      if (nB.depthTier !== 'mid') continue
      if (Math.abs(nA.u - nB.u) > 0.085) continue
      const localH = Math.max(nA.hu, nB.hu)
      const dx = Math.abs(nA.pos.x - nB.pos.x)
      const dy = Math.abs(nA.pos.y - nB.pos.y)
      if (crowdedDirection(i, j) || crowdedDirection(j, i)) continue
      const isDiagonal = dx > 0.012 && dy <= 1.25 * dx
      const maxEdgeDist = isDiagonal ? (0.42 * localH + 0.030) : (0.38 * localH + 0.025)
      if (dist3D > maxEdgeDist || dist3D < 0.008) continue
      if (doesSegmentIntersectRibbonsLUT(nA.pos, nA.u, nB.pos, nB.u, lut)) continue
      insertCandidate(j, dist3D)
    }

    for (let m = 0; m < Math.min(1, candidateCount); m++) {
      addEdge(i, candidateIds[m], candidateDistances[m], true)
    }
  }

  // Cross-layer connections in the narrow tip (u < 0.20)
  for (let i = 0; i < rawNodes.length; i++) {
    const nA = rawNodes[i]
    if (nA.u >= 0.20) continue
    if (nA.connectedCount >= 2) continue

    for (let nearby = grid.queryOffsets[i]; nearby < grid.queryOffsets[i + 1]; nearby++) {
      const j = grid.queryIds[nearby], dist3D = grid.queryDistances[nearby]
      if (i === j) continue
      if (nA.connectedCount >= 2) continue
      const nB = rawNodes[j]
      if (nB.u >= 0.22) continue
      if (Math.abs(nA.u - nB.u) > 0.045) continue
      const localH = Math.max(nA.hu, nB.hu)
      const dx = Math.abs(nA.pos.x - nB.pos.x)
      const dy = Math.abs(nA.pos.y - nB.pos.y)
      const isDiagonal = dx > 0.010 && dy <= 1.25 * dx
      const maxEdgeDist = isDiagonal ? (0.42 * localH + 0.030) : (0.38 * localH + 0.025)
      if (dist3D > maxEdgeDist || dist3D < 0.005) continue

      if (!doesSegmentIntersectRibbonsLUT(nA.pos, nA.u, nB.pos, nB.u, lut)) {
        addEdge(i, j, dist3D, true)
      }
    }
  }

  // 3c. Local nearest-neighbor fallback
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < rawNodes.length; i++) {
      const nA = rawNodes[i]
      const minDegree = 2
      while (nA.connectedCount < minDegree) {
        let bestJ = -1
        let bestDist = Infinity
        let bestScore = Infinity

        for (let nearby = grid.queryOffsets[i]; nearby < grid.queryOffsets[i + 1]; nearby++) {
          const j = grid.queryIds[nearby], dist3D = grid.queryDistances[nearby]
          if (i === j) continue
          if (hasEdge(i, j)) continue
          const nB = rawNodes[j]
          if (nB.connectedCount >= 7 || crowdedDirection(i, j) || crowdedDirection(j, i)) continue
          if (nA.depthTier === nB.depthTier && edgeGrid.hasCrossing(nA.pos, nB.pos, i, j, edges, rawNodes, nA.depthTier)) continue
          if (Math.abs(nA.u - nB.u) > 0.090) continue
          const localH = Math.max(nA.hu, nB.hu)
          const dx = Math.abs(nA.pos.x - nB.pos.x)
          const dy = Math.abs(nA.pos.y - nB.pos.y)
          const isDiagonal = dx > 0.012 && dy <= 1.25 * dx
          const maxEdgeDist = isDiagonal ? (0.42 * localH + 0.030) : (0.38 * localH + 0.025)
          if (dist3D > maxEdgeDist) continue

          // Strongly favor diagonal connections over vertical segments in fallback
          const score = dist3D + (dy > 1.25 * dx ? 0.035 : 0.0)
          if (score < bestScore) {
            if (!doesSegmentIntersectRibbonsLUT(nA.pos, nA.u, nB.pos, nB.u, lut)) {
              bestScore = score
              bestDist = dist3D
              bestJ = j
            }
          }
        }

        if (bestJ !== -1) {
          if (!addEdge(i, bestJ, bestDist, nA.depthTier !== rawNodes[bestJ].depthTier, true)) break
        } else {
          break
        }
      }
    }
  }

  return edges
}

/**
 * Generates the refined volumetric neural field BufferGeometries (linesGeo, pointsGeo, hazeGeo).
 * Highly optimized with 1D LUT and 3D spatial hash grid (Requirement 4).
 * Precomputes bounding boxes and spheres; all emitted attribute values retain baseline precision.
 *
 * @param {'left' | 'right'} side
 * @param {number} [H=H_VAL]
 * @param {object} [config={}]
 * @returns {{ linesGeo: THREE.BufferGeometry, pointsGeo: THREE.BufferGeometry, hazeGeo: THREE.BufferGeometry }}
 */
export function generateRefinedNeuralField(side, H = H_VAL, config = {}, projectionAspect = 1.8 * (config.breadthMultiplier ?? 1)) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const seed = isLeft ? 314159 : 271828
  const prng = createPrng(seed)

  const themeConfig = config.themeConfig || {}
  const minSubGap = 0.026

  // 0. Precompute 1D LUT of sorted active ribbon bounds along u once per build (Requirement 4)
  const lut = new RibbonBoundsLUT(H, config, 1024)

  // 1. Invisible Anchor Points along inner ribbon margins (alpha = 0, size = 0)
  const anchors = generateMarginAnchors(side, H, config, 64)

  const { rawNodes, grid } = sampleNeuralNodes(sign, projectionAspect, lut, prng, minSubGap)
  const edges = connectNeuralNodes(rawNodes, grid, lut, projectionAspect)

  // Each open chamber may be separated by an actual ribbon. Preserve its valid
  // local graph instead of deleting small components to force a single wing graph.
  // Repair above is bounded; only genuinely isolated samples are omitted.
  const visibleNodes = rawNodes.filter(n => n.connectedCount > 0)

  // Hub Selection: Sparse, well-spaced FG pinpoint hubs with clean tip tapering and outer extension
  const fgNodes = visibleNodes.filter(n => n.depthTier === 'fg')
  const targetHubCount = Math.min(22, Math.max(16, Math.round(0.045 * fgNodes.length)))

  const eligibleHubs = fgNodes.filter(n => n.connectedCount >= 3 && Math.abs(n.v_rel) < 0.70 && n.u >= 0.10 && n.u <= 0.98)
  const hubFlags = new Uint8Array(rawNodes.length)
  const chosenHubs = new Int32Array(targetHubCount)
  let hubCount = 0
  // Farthest-point selection spreads highlights across chambers instead of
  // concentrating them wherever the degree-first ordering finds a dense cluster.
  while (hubCount < targetHubCount) {
    let best = null, bestScore = -Infinity
    for (const cand of eligibleHubs) {
      if (hubFlags[cand.idx]) continue
      let nearest = Infinity
      for (let h = 0; h < hubCount; h++) {
        const hIdx = chosenHubs[h]
        const hub = rawNodes[hIdx]
        const dx = cand.pos.x - hub.pos.x, dy = (cand.pos.y - hub.pos.y) * projectionAspect
        nearest = Math.min(nearest, dx * dx + dy * dy)
      }
      const clearance = Math.max(0.34, 0.24 + 0.34 * cand.localSubHeight)
      if (nearest < clearance * clearance) continue
      const quality = cand.connectedCount + 1 - Math.abs(cand.v_rel)
      const score = hubCount ? Math.min(nearest, 1.5) * (1 + 0.06 * quality) : quality
      if (score > bestScore) { best = cand; bestScore = score }
    }
    if (!best) break
    chosenHubs[hubCount++] = best.idx
    hubFlags[best.idx] = 1
  }

  // Reuse color arithmetic objects; retain exact doubles in flat node-color pools.
  const palette = {
    c0: new THREE.Color('#ffffff'),
    c1: new THREE.Color('#38aaff'),
    c2: new THREE.Color('#28d8ff'),
    c3: new THREE.Color('#38e0ff'),
    c4: new THREE.Color('#2888ff'),
    c5: new THREE.Color('#1460ff'),
    c6: new THREE.Color('#1c84ff'),
    c7: new THREE.Color('#1c60f0'),
    c8: new THREE.Color('#061a55'),
    c9: new THREE.Color('#08226c'),
    c10: new THREE.Color('#06184c'),
    c11: new THREE.Color('#5e48ff'),
    c12: new THREE.Color('#7858ff'),
    c13: new THREE.Color('#104fe0'),
    c14: new THREE.Color('#041038'),
    c15: new THREE.Color('#061b4d'),
    c16: new THREE.Color('#1a164c'),
  }
  const colorScratch = new THREE.Color(), lineColorScratch = new THREE.Color()
  const tintScratch = new THREE.Color(), endpointA = new THREE.Color(), endpointB = new THREE.Color()
  const nodeColors = new Float64Array(rawNodes.length * 3)
  const nodeLineColors = new Float64Array(rawNodes.length * 3)
  const themeColor = themeConfig.primaryWire ? new THREE.Color(themeConfig.primaryWire) : null

  // Node styling
  for (const node of visibleNodes) {
    const isHighlight = hubFlags[node.idx] ? 1.0 : 0.0
    node.isHighlight = isHighlight

    const bLocal = lut.getBounds(node.u)
    const dHero2 = Math.hypot(node.pos.y - bLocal.y2, node.pos.z - bLocal.z2)
    const violetProx = Math.max(0.0, 1.0 - dHero2 / Math.max(0.04, 0.32 * bLocal.envHeight))
    const marginProx = Math.max(0.0, (Math.abs(node.v_rel) - 0.70) / 0.30)
    const isAdjacentToViolet = (dHero2 < 0.20) || ((node.v_rel > 0 && bLocal.y2 > bLocal.envCenterY) || (node.v_rel < 0 && bLocal.y2 < bLocal.envCenterY))
    const rimTintFactor = isAdjacentToViolet ? Math.max(violetProx * 0.95, marginProx * 0.85) : (violetProx * 0.65)

    let color, lineColor, alpha, lineAlpha, size

    if (node.depthTier === 'fg') {
      if (isHighlight > 0.5) {
        color = colorScratch.copy(palette.c0)
        lineColor = lineColorScratch.copy(palette.c1)
        const tipScale = THREE.MathUtils.smoothstep(node.u, 0.08, 0.24)
        const chamberScale = THREE.MathUtils.clamp(node.hu / 0.22, 0.70, 1.0)
        const hubScale = (0.65 + 0.35 * tipScale) * chamberScale
        size = (3.2 + prng() * 0.5) * hubScale
        alpha = 1.0
        lineAlpha = 0.40 + prng() * 0.04
      } else {
        color = colorScratch.copy(palette.c2).lerp(palette.c3, prng() * 0.35)
        lineColor = lineColorScratch.copy(palette.c4)
        size = 1.45 + prng() * 0.35
        alpha = 0.92 + prng() * 0.06
        lineAlpha = 0.36 + prng() * 0.04
      }
    } else if (node.depthTier === 'mid') {
      color = colorScratch.copy(palette.c5).lerp(palette.c6, prng() * 0.40)
      lineColor = lineColorScratch.copy(palette.c7)
      size = 1.15 + prng() * 0.35
      alpha = 0.72 + prng() * 0.08
      lineAlpha = 0.24 + prng() * 0.04
    } else {
      color = colorScratch.copy(palette.c8).lerp(palette.c9, prng() * 0.40)
      lineColor = lineColorScratch.copy(palette.c10)
      size = 0.8 + prng() * 0.3
      alpha = 0.25 + prng() * 0.06
      lineAlpha = 0.07 + prng() * 0.02
    }

    if (Math.abs(node.v_rel) > 0.78) {
      const marginFeather = 1.0 - THREE.MathUtils.smoothstep(Math.abs(node.v_rel), 0.78, 0.96)
      alpha *= Math.max(0.08, marginFeather)
      lineAlpha *= Math.max(0.08, marginFeather)
    }

    if (node.localSubHeight < 0.09) {
      const throatFactor2 = THREE.MathUtils.smoothstep(node.localSubHeight, minSubGap, 0.09)
      alpha *= (0.50 + 0.50 * throatFactor2)
      lineAlpha *= (0.50 + 0.50 * throatFactor2)
      size *= (0.65 + 0.35 * throatFactor2)
    }

    if (rimTintFactor > 0.06) {
      const violetTint = tintScratch.copy(palette.c11).lerp(palette.c12, prng() * 0.30)
      if (!isHighlight) color.lerp(violetTint, rimTintFactor * 0.30)
      lineColor.lerp(violetTint, rimTintFactor * 0.25)
    }

    if (themeConfig && themeConfig.primaryWire) {
      color.lerp(themeColor, 0.08)
      lineColor.lerp(themeColor, 0.08)
    }

    const colorOffset = node.idx * 3
    nodeColors[colorOffset] = color.r
    nodeColors[colorOffset + 1] = color.g
    nodeColors[colorOffset + 2] = color.b
    nodeLineColors[colorOffset] = lineColor.r
    nodeLineColors[colorOffset + 1] = lineColor.g
    nodeLineColors[colorOffset + 2] = lineColor.b
    node.alpha = alpha
    node.lineAlpha = lineAlpha
    node.size = size
  }

  // 4. Wave Margin Tethering
  const tetherNodes = new Int32Array(visibleNodes.length)
  const tetherAnchors = new Int32Array(visibleNodes.length)
  let tetherCount = 0
  for (const node of visibleNodes) {
    if (Math.abs(node.v_rel) >= 0.65) {
      let bestAnchor = -1
      let bestDist = Infinity

      for (let aIdx = 0; aIdx < anchors.length; aIdx++) {
        const anc = anchors[aIdx]
        if (Math.abs(node.u - anc.u) > 0.080) continue

        const isUpperAnchor = anc.id.includes('upper')
        if (node.v_rel > 0 && !isUpperAnchor) continue
        if (node.v_rel < 0 && isUpperAnchor) continue

        const dist = node.pos.distanceTo(anc.pos)
        const localH = Math.min(node.hu, anc.hu)
        const maxEdgeDist = 0.38 * localH + 0.025
        if (dist <= maxEdgeDist && dist < bestDist) {
          if (!doesSegmentIntersectRibbonsLUT(node.pos, node.u, anc.pos, anc.u, lut, true)) {
            bestDist = dist
            bestAnchor = aIdx
          }
        }
      }

      if (bestAnchor !== -1) {
        tetherNodes[tetherCount] = node.idx
        tetherAnchors[tetherCount++] = bestAnchor
      }
    }
  }

  // 5. Build Lines BufferGeometry (Internal Constellation Edges + Wave Margin Tethers)
  const lineVertexCount = (edges.length + tetherCount) * 2
  let lineCursor = 0
  const linePositions = new Float32Array(lineVertexCount * 3)
  const lineUs = new Float32Array(lineVertexCount * 1)
  const lineWeights = new Float32Array(lineVertexCount * 1)
  const lineLayers = new Int8Array(lineVertexCount * 1)
  const lineAlphas = new Float32Array(lineVertexCount * 1)
  const lineRelativeCoords = new Float32Array(lineVertexCount * 4)
  const lineColors = new Float32Array(lineVertexCount * 3)

  function addLineSegment(p1, u1, w1, l1, a1, rel1, c1, p2, u2, w2, l2, a2, rel2, c2) {
    const vertex = lineCursor
    lineCursor += 2
    linePositions[vertex * 3] = p1.x
    linePositions[vertex * 3 + 1] = p1.y
    linePositions[vertex * 3 + 2] = p1.z
    linePositions[vertex * 3 + 3] = p2.x
    linePositions[vertex * 3 + 4] = p2.y
    linePositions[vertex * 3 + 5] = p2.z
    lineUs[vertex] = u1
    lineUs[vertex * 1 + 1] = u2
    lineWeights[vertex] = w1
    lineWeights[vertex * 1 + 1] = w2
    lineLayers[vertex] = l1
    lineLayers[vertex * 1 + 1] = l2
    lineAlphas[vertex] = a1
    lineAlphas[vertex * 1 + 1] = a2
    lineRelativeCoords[vertex * 4] = rel1[0]
    lineRelativeCoords[vertex * 4 + 1] = rel1[1]
    lineRelativeCoords[vertex * 4 + 2] = rel1[2]
    lineRelativeCoords[vertex * 4 + 3] = rel1[3]
    lineRelativeCoords[vertex * 4 + 4] = rel2[0]
    lineRelativeCoords[vertex * 4 + 5] = rel2[1]
    lineRelativeCoords[vertex * 4 + 6] = rel2[2]
    lineRelativeCoords[vertex * 4 + 7] = rel2[3]
    lineColors[vertex * 3] = c1.r
    lineColors[vertex * 3 + 1] = c1.g
    lineColors[vertex * 3 + 2] = c1.b
    lineColors[vertex * 3 + 3] = c2.r
    lineColors[vertex * 3 + 4] = c2.g
    lineColors[vertex * 3 + 5] = c2.b
  }

  function getTierAlpha(node) {
    if (node.depthTier === 'fg') {
      return (node.isHighlight > 0.5) ? 0.44 : (0.35 + prng() * 0.07)
    }
    if (node.depthTier === 'bg') {
      return 0.065 + prng() * 0.025
    }
    return 0.22 + prng() * 0.05
  }

  for (let eIdx = 0; eIdx < edges.length; eIdx++) {
    const i = edges.i[eIdx], j = edges.j[eIdx]
    const isInterLayer = edges.interLayer[eIdx], isFallback = edges.fallback[eIdx]
    const nA = rawNodes[i]
    const nB = rawNodes[j]

    let alphaBaseA = getTierAlpha(nA)
    let alphaBaseB = getTierAlpha(nB)

    if (isFallback) {
      // A repair edge must remain readable beside its node, especially FG hubs.
      alphaBaseA *= 0.80
      alphaBaseB *= 0.80
    } else if (isInterLayer) {
      alphaBaseA = Math.min(alphaBaseA, 0.26)
      alphaBaseB = Math.min(alphaBaseB, 0.26)
      if (nA.depthTier === 'bg') alphaBaseA = Math.min(alphaBaseA, 0.09)
      if (nB.depthTier === 'bg') alphaBaseB = Math.min(alphaBaseB, 0.09)
    }

    const featherA = 1.0 - THREE.MathUtils.smoothstep(Math.abs(nA.v_rel), 0.78, 0.96)
    const featherB = 1.0 - THREE.MathUtils.smoothstep(Math.abs(nB.v_rel), 0.78, 0.96)

    const throatA = 0.50 + 0.50 * THREE.MathUtils.smoothstep(nA.localSubHeight, minSubGap, 0.09)
    const throatB = 0.50 + 0.50 * THREE.MathUtils.smoothstep(nB.localSubHeight, minSubGap, 0.09)
    const aA = alphaBaseA * Math.max(0.08, featherA) * throatA
    const aB = alphaBaseB * Math.max(0.08, featherB) * throatB
    const cA = endpointA.fromArray(nodeLineColors, nA.idx * 3)
    const cB = endpointB.fromArray(nodeLineColors, nB.idx * 3)

    addLineSegment(
      nA.pos, nA.u, nA.weight, nA.layer, aA, nA.relativeCoord, cA,
      nB.pos, nB.u, nB.weight, nB.layer, aB, nB.relativeCoord, cB
    )
  }

  const defaultTetherColor = new THREE.Color('#104fe0')
  const violetTetherColor = new THREE.Color('#5e48ff')

  for (let tIdx = 0; tIdx < tetherCount; tIdx++) {
    const node = rawNodes[tetherNodes[tIdx]], anchor = anchors[tetherAnchors[tIdx]]
    const tetherFeather = 1.0 - THREE.MathUtils.smoothstep(Math.abs(node.v_rel), 0.74, 0.98)
    const aNode = THREE.MathUtils.clamp((node.lineAlpha || 0.16) * 0.35 * tetherFeather, 0.0, 0.10)
    const aAnchor = 0.0

    const bLocal = lut.getBounds(node.u)
    const dHero2 = Math.hypot(node.pos.y - bLocal.y2, node.pos.z - bLocal.z2)
    const isAdjacentToViolet = dHero2 < 0.22 || Math.abs(node.v_rel) >= 0.70
    const tColor = isAdjacentToViolet ? violetTetherColor : defaultTetherColor
    const nColor = endpointA.fromArray(nodeLineColors, node.idx * 3)
    if (isAdjacentToViolet) nColor.lerp(violetTetherColor, 0.80)

    addLineSegment(
      node.pos, node.u, node.weight, node.layer, aNode, node.relativeCoord, nColor,
      anchor.pos, anchor.u, anchor.weight, 0.0, aAnchor, anchor.relativeCoord, tColor
    )
  }

  const linesGeo = new THREE.BufferGeometry()
  linesGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
  linesGeo.setAttribute('aBasePos', linesGeo.getAttribute('position'))
  linesGeo.setAttribute('aU', new THREE.BufferAttribute(lineUs, 1))
  linesGeo.setAttribute('aWeight', new THREE.BufferAttribute(lineWeights, 1))
  linesGeo.setAttribute('aLayer', new THREE.BufferAttribute(lineLayers, 1))
  linesGeo.setAttribute('aAlpha', new THREE.BufferAttribute(lineAlphas, 1))
  linesGeo.setAttribute('aRelativeCoord', new THREE.BufferAttribute(lineRelativeCoords, 4))
  linesGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))
  linesGeo.computeBoundingBox()
  linesGeo.computeBoundingSphere()

  // 6. Build Points BufferGeometry (Multi-Scale Starlight Field: micro-nodes + ice-white hubs)
  const pointPositions = new Float32Array(visibleNodes.length * 3)
  const pointUs = new Float32Array(visibleNodes.length * 1)
  const pointWeights = new Float32Array(visibleNodes.length * 1)
  const pointLayers = new Int8Array(visibleNodes.length * 1)
  const pointSizes = new Float32Array(visibleNodes.length * 1)
  const pointAlphas = new Float32Array(visibleNodes.length * 1)
  const pointColors = new Float32Array(visibleNodes.length * 3)
  const pointHighlights = new Uint8Array(visibleNodes.length * 1)
  const pointRelativeCoords = new Float32Array(visibleNodes.length * 4)

  for (let nIdx = 0; nIdx < visibleNodes.length; nIdx++) {
    const n = visibleNodes[nIdx]
    pointPositions[nIdx * 3] = n.pos.x
    pointPositions[nIdx * 3 + 1] = n.pos.y
    pointPositions[nIdx * 3 + 2] = n.pos.z
    pointUs[nIdx] = n.u
    pointWeights[nIdx] = n.weight
    pointLayers[nIdx] = n.layer
    pointSizes[nIdx] = n.size
    pointAlphas[nIdx] = n.alpha
    pointColors[nIdx * 3] = nodeColors[n.idx * 3 + 0]
    pointColors[nIdx * 3 + 1] = nodeColors[n.idx * 3 + 1]
    pointColors[nIdx * 3 + 2] = nodeColors[n.idx * 3 + 2]
    pointHighlights[nIdx] = n.isHighlight
    pointRelativeCoords[nIdx * 4] = n.relativeCoord[0]
    pointRelativeCoords[nIdx * 4 + 1] = n.relativeCoord[1]
    pointRelativeCoords[nIdx * 4 + 2] = n.relativeCoord[2]
    pointRelativeCoords[nIdx * 4 + 3] = n.relativeCoord[3]
  }

  const pointsGeo = new THREE.BufferGeometry()
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
  pointsGeo.setAttribute('aBasePos', pointsGeo.getAttribute('position'))
  pointsGeo.setAttribute('aU', new THREE.BufferAttribute(pointUs, 1))
  pointsGeo.setAttribute('aWeight', new THREE.BufferAttribute(pointWeights, 1))
  pointsGeo.setAttribute('aLayer', new THREE.BufferAttribute(pointLayers, 1))
  pointsGeo.setAttribute('size', new THREE.BufferAttribute(pointSizes, 1))
  pointsGeo.setAttribute('alpha', new THREE.BufferAttribute(pointAlphas, 1))
  pointsGeo.setAttribute('color', new THREE.BufferAttribute(pointColors, 3))
  pointsGeo.setAttribute('aIsHighlight', new THREE.BufferAttribute(pointHighlights, 1))
  pointsGeo.setAttribute('aRelativeCoord', new THREE.BufferAttribute(pointRelativeCoords, 4))
  pointsGeo.computeBoundingBox()
  pointsGeo.computeBoundingSphere()

  // 7. Restrained Deep Sapphire Chamber Haze (Answer 5)
  const hazePositions = new Float32Array(180 * 3)
  const hazeUs = new Float32Array(180 * 1)
  const hazeWeights = new Float32Array(180 * 1)
  const hazeSizes = new Float32Array(180 * 1)
  const hazeAlphas = new Float32Array(180 * 1)
  const hazeColors = new Float32Array(180 * 3)
  const hazeRelativeCoords = new Float32Array(180 * 4)

  const hazeCountTarget = 180
  const hazeGrid = new SpatialGrid3D(0.18)
  const hazeNodes = []
  let hazeAttempts = 0
  let hazeCount = 0

  while (hazeCount < hazeCountTarget && hazeAttempts++ < 6000) {
    const u = 0.12 + prng() * (0.98 - 0.12)
    const b = lut.getBounds(u)
    if (b.envHeight < 0.09) continue

    const pockets = lut.getSubPockets(u, 0.08)
    if (pockets.length === 0) continue

    const chosenPocket = pockets[Math.floor(prng() * pockets.length)]
    if (chosenPocket.height < 0.08) continue

    const w_depth = -0.22 - prng() * 0.48
    const maxV = Math.sqrt(Math.max(0.0, 0.64 * 0.64 - w_depth * w_depth))
    if (maxV <= 0.01) continue

    const v_rel = (prng() - 0.5) * 2.0 * maxV
    const r_norm = Math.hypot(v_rel, w_depth)
    if (r_norm >= 0.65) continue

    const y = chosenPocket.centerY + v_rel * chosenPocket.ry
    const z = chosenPocket.centerZ + w_depth * chosenPocket.rz
    const x = sign * 10.0 * u
    // Projected separation limits additive accumulation behind narrow chambers.
    if (hazeGrid.isTooClose(x, y, 0, 0.15, hazeNodes, true)) continue
    const pos = new THREE.Vector3(x, y, z)

    const dHero = getMinFilamentClearance(y, z, b)
    if (dHero < 0.009) continue

    const boundaryFade = Math.max(0.0, 1.0 - Math.pow(r_norm / 0.65, 2.0))
    const weight = computeConstraintWeight(u)

    const baseAlpha = 0.018 + prng() * 0.005
    const alpha = baseAlpha * boundaryFade * weight
    const baseSize = Math.max(20.0, Math.min(65.0, chosenPocket.height * 80.0 + prng() * 10.0))
    const col = colorScratch.copy(palette.c14).lerp(palette.c15, prng())

    const dHero2 = Math.hypot(y - b.y2, z - b.z2)
    if (dHero2 < 0.16) {
      col.lerp(palette.c16, 0.25)
    }

    hazeGrid.insert(x, y, 0, hazeNodes.length)
    hazeNodes.push({ pos })
    hazePositions[hazeCount * 3] = pos.x
    hazePositions[hazeCount * 3 + 1] = pos.y
    hazePositions[hazeCount * 3 + 2] = pos.z
    hazeUs[hazeCount] = u
    hazeWeights[hazeCount] = weight
    hazeSizes[hazeCount] = baseSize
    hazeAlphas[hazeCount] = alpha
    hazeColors[hazeCount * 3] = col.r
    hazeColors[hazeCount * 3 + 1] = col.g
    hazeColors[hazeCount * 3 + 2] = col.b
    hazeRelativeCoords[hazeCount * 4] = u
    hazeRelativeCoords[hazeCount * 4 + 1] = v_rel
    hazeRelativeCoords[hazeCount * 4 + 2] = w_depth
    hazeRelativeCoords[hazeCount * 4 + 3] = r_norm
    hazeCount++
  }

  const hazeGeo = new THREE.BufferGeometry()
  hazeGeo.setAttribute('position', new THREE.BufferAttribute(hazePositions.slice(0, hazeCount * 3), 3))
  hazeGeo.setAttribute('aBasePos', hazeGeo.getAttribute('position'))
  hazeGeo.setAttribute('aU', new THREE.BufferAttribute(hazeUs.slice(0, hazeCount * 1), 1))
  hazeGeo.setAttribute('aWeight', new THREE.BufferAttribute(hazeWeights.slice(0, hazeCount * 1), 1))
  hazeGeo.setAttribute('size', new THREE.BufferAttribute(hazeSizes.slice(0, hazeCount * 1), 1))
  hazeGeo.setAttribute('alpha', new THREE.BufferAttribute(hazeAlphas.slice(0, hazeCount * 1), 1))
  hazeGeo.setAttribute('color', new THREE.BufferAttribute(hazeColors.slice(0, hazeCount * 3), 3))
  hazeGeo.setAttribute('aRelativeCoord', new THREE.BufferAttribute(hazeRelativeCoords.slice(0, hazeCount * 4), 4))
  hazeGeo.computeBoundingBox()
  hazeGeo.computeBoundingSphere()

  return {
    linesGeo,
    pointsGeo,
    hazeGeo,
  }
}
