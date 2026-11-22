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
  return function () {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
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
export function getAlmondPocketBounds(u, H = H_VAL, config = {}) {
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
  const allY = [y0, y1, y2, y3]
  const allZ = [z0, z1, z2, z3]
  const envMinY = Math.min(...allY)
  const envMaxY = Math.max(...allY)
  const envMinZ = Math.min(...allZ)
  const envMaxZ = Math.max(...allZ)
  const envHeight = Math.max(0.0, envMaxY - envMinY)
  const envCenterY = 0.5 * (envMaxY + envMinY)
  const envCenterZ = 0.5 * (envMaxZ + envMinZ)
  const envRy = Math.max(0.0, 0.5 * envHeight - safeMargin * 0.3)
  const envRz = Math.max(0.005, 0.5 * (envMaxZ - envMinZ) + 0.035)

  return {
    u,
    y0,
    y1,
    z0,
    z1,
    y2,
    z2,
    y3,
    z3,
    yUpper,
    yLower,
    zUpper,
    zLower,
    gapHeight,
    gapCenterY,
    gapCenterZ,
    safeMargin,
    minGapHeight,
    Ry,
    Rz,
    isPinch,
    // Extended envelope covering all four wave ribbons
    envMinY,
    envMaxY,
    envMinZ,
    envMaxZ,
    envHeight,
    envCenterY,
    envCenterZ,
    envRy,
    envRz,
  }
}

/**
 * Computes all valid open vertical sub-pockets between the sorted Y-coordinates of all active
 * wave ribbons at longitudinal coordinate u.
 * Strictly rejects any narrow slice below minSubGap to eliminate 1D collapsing spines.
 *
 * @param {number} u
 * @param {number} [H=H_VAL]
 * @param {object} [config={}]
 * @param {number} [minSubGap=0.028]
 * @returns {Array<object>}
 */
export function getAllSubPockets(u, H = H_VAL, config = {}, minSubGap = 0.028) {
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

    // Strictly reject any narrow slice below minSubGap
    if (height >= minSubGap) {
      const centerY = 0.5 * (rLow.y + rHigh.y)
      const centerZ = 0.5 * (rLow.z + rHigh.z)
      const margin = u > 0.65 ? Math.max(0.0022, 0.05 * height) : (u < 0.20 ? Math.max(0.0018, 0.06 * height) : Math.max(0.0030, 0.07 * height))
      const ry = Math.max(0.0001, 0.5 * height - margin)
      const rz = Math.max(0.008, 0.5 * Math.abs(rHigh.z - rLow.z) + 0.025)

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
 * Computes the relative coordinate Vector4 (u, v_rel, w_depth, r_norm) for a 3D point
 * relative to the local almond chamber / wave envelope.
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
 * Computes relative coordinates as a plain 4-element array [u, v_rel, w_depth, r_norm]
 * for high-performance direct buffer insertion.
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
 * Extends longitudinal sampling across the full wave span all the way to u = 1.0 (flush with viewport edge).
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
 * Fast 3D spatial hash grid for accelerated Poisson-disk distance queries.
 */
class SpatialGrid3D {
  constructor(cellSize = 0.035) {
    this.cellSize = cellSize
    this.cells = new Map()
  }

  _key(ix, iy, iz) {
    return `${ix},${iy},${iz}`
  }

  insert(x, y, z, id) {
    const ix = Math.floor(x / this.cellSize)
    const iy = Math.floor(y / this.cellSize)
    const iz = Math.floor(z / this.cellSize)
    const k = this._key(ix, iy, iz)
    let list = this.cells.get(k)
    if (!list) {
      list = []
      this.cells.set(k, list)
    }
    list.push(id)
  }

  isTooClose(x, y, z, reqRadius, nodes) {
    const r2 = reqRadius * reqRadius
    const minX = Math.floor((x - reqRadius) / this.cellSize)
    const maxX = Math.floor((x + reqRadius) / this.cellSize)
    const minY = Math.floor((y - reqRadius) / this.cellSize)
    const maxY = Math.floor((y + reqRadius) / this.cellSize)
    const minZ = Math.floor((z - reqRadius) / this.cellSize)
    const maxZ = Math.floor((z + reqRadius) / this.cellSize)

    for (let ix = minX; ix <= maxX; ix++) {
      for (let iy = minY; iy <= maxY; iy++) {
        for (let iz = minZ; iz <= maxZ; iz++) {
          const list = this.cells.get(this._key(ix, iy, iz))
          if (list) {
            for (let i = 0; i < list.length; i++) {
              const other = nodes[list[i]]
              const dx = other.pos.x - x
              const dy = other.pos.y - y
              const dz = other.pos.z - z
              const d2 = dx * dx + dy * dy + dz * dz
              if (d2 < r2) return true
            }
          }
        }
      }
    }
    return false
  }
}

/**
 * Checks if a candidate line segment intersects any wave ribbon filament core or crosses pocket envelopes.
 */
function doesSegmentIntersectRibbons(pA, uA, pB, uB, H = H_VAL, config = {}, isTether = false) {
  const samples = 7
  for (let s = 1; s < samples; s++) {
    const frac = s / samples
    const ut = uA + frac * (uB - uA)
    const yt = pA.y + frac * (pB.y - pA.y)
    const zt = pA.z + frac * (pB.z - pA.z)

    const bounds = getAlmondPocketBounds(ut, H, config)
    const marginTol = isTether ? 0.006 : 0.014
    if (yt > bounds.envMaxY + marginTol || yt < bounds.envMinY - marginTol) {
      return true
    }

    const filamentTol = isTether ? 0.0060 : 0.0070
    if (Math.hypot(yt - bounds.y0, zt - bounds.z0) < filamentTol) return true
    if (Math.hypot(yt - bounds.y1, zt - bounds.z1) < filamentTol) return true
    if (Math.hypot(yt - bounds.y2, zt - bounds.z2) < filamentTol) return true
    if (Math.hypot(yt - bounds.y3, zt - bounds.z3) < filamentTol) return true
  }
  return false
}

/**
 * Helper to compute minimum distance from a 3D point (y, z) at u to all 4 ribbon filaments.
 */
function getMinFilamentClearance(y, z, b) {
  const d0 = Math.hypot(y - b.y0, z - b.z0)
  const d1 = Math.hypot(y - b.y1, z - b.z1)
  const d2 = Math.hypot(y - b.y2, z - b.z2)
  const d3 = Math.hypot(y - b.y3, z - b.z3)
  return Math.min(d0, d1, d2, d3)
}

/**
 * Generates the refined volumetric neural field BufferGeometries (linesGeo, pointsGeo, hazeGeo).
 *
 * Implements all 5 finalized blueprint answers:
 * (1) True 3D Poisson-disk volumetric sampling across open sub-pockets with subtle low-frequency clustering noise,
 *     rejecting narrow slices below minSubGap so 1D curve-following trails are impossible.
 * (2) Proximity-constrained 3D Delaunay/k-NN edges clamped to <= 0.38 * h(u) + 0.025 with midpoint ribbon-crossing rejection,
 *     tall vertical-strut gating (dy > 1.8 * dx on long spans), dual-tier FG-to-MID/BG links, and local fallback (degree >= 2).
 * (3) Continuous smoothstep tapering of density, scale, and alpha to zero across u in [0.06, 0.20], dynamic h(u) feathering
 *     inside crossing throats, full-volume sampling flush to u = 1.00, and soft margin alpha feathering past |v_rel| = 0.78.
 * (4) 3-tier Z-depth stratification with narrow smoothstep blends around w_depth = -0.25 and +0.25 — sparse 12–15% FG purely
 *     circular ice-white pinpoint hubs (14–22px quad, sharp 15–20% core, tight exponential cyan-blue halo, zero 4-point star spikes
 *     or bokeh blobs) plus 6–10px cyan FG stars, MID 4–7px cobalt/royal-blue nodes and crisp webbing, BG 1.5–3px dim sapphire micro-dots
 *     and faint deep-navy sub-web, plus subtle electric-indigo/violet rim tinting near purple wave edges.
 * (5) Pocket haze capped at 350–500 deep sapphire (#041038 to #061b4d) particles per side strictly inside r_norm < 0.65 and
 *     w_depth < -0.20 with peak opacity 0.025–0.032, radius scaled to h(u), slight bias behind dense node clusters, smooth Gaussian falloff,
 *     and zero throat bleed.
 *
 * @param {'left' | 'right'} side
 * @param {number} [H=H_VAL]
 * @param {object} [config={}]
 * @returns {{ linesGeo: THREE.BufferGeometry, pointsGeo: THREE.BufferGeometry, hazeGeo: THREE.BufferGeometry }}
 */
export function generateRefinedNeuralField(side, H = H_VAL, config = {}) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const seed = isLeft ? 314159 : 271828
  const prng = createPrng(seed)

  const themeConfig = config.themeConfig || {}
  const minSubGap = 0.028

  // 1. Invisible Anchor Points along inner ribbon margins (alpha = 0, size = 0)
  const anchors = generateMarginAnchors(side, H, config, 64)

  // 2. True 3D Poisson-Disk Volumetric Sampling across all open sub-pockets
  const rawNodes = []
  const grid = new SpatialGrid3D(0.035)

  // Adaptive longitudinal resolution ensuring delta_x <= maxEdgeDist everywhere
  const uList = []
  for (let u = 0.082; u < 0.12; u += 0.0016) uList.push(u)
  for (let u = 0.12; u < 0.22; u += 0.0022) uList.push(u)
  for (let u = 0.22; u < 0.94; u += 0.0045) uList.push(u)
  for (let u = 0.94; u <= 1.00; u += 0.0020) uList.push(u)

  for (let b = 0; b < uList.length; b++) {
    const uBin = uList[b]
    const tipTaper = THREE.MathUtils.smoothstep(uBin, 0.06, 0.20)
    if (tipTaper <= 0.001) continue

    const pocketsCheck = getAllSubPockets(uBin, H, config, minSubGap)
    if (pocketsCheck.length === 0) continue

    for (const basePocket of pocketsCheck) {
      const throatFactor = THREE.MathUtils.smoothstep(basePocket.height, minSubGap, 0.09)
      const baseDarts = uBin < 0.22
        ? Math.max(3, Math.round((4 + 16 * basePocket.height) * (0.50 + 0.50 * tipTaper)))
        : Math.max(3, Math.round((4 + 24 * basePocket.height) * (0.45 + 0.55 * throatFactor)))

      for (let d = 0; d < baseDarts; d++) {
        const du = uBin < 0.12 ? 0.0016 : (uBin < 0.22 ? 0.0022 : (uBin > 0.94 ? 0.0020 : 0.0045))
        const u = THREE.MathUtils.clamp(
          uBin + (prng() - 0.5) * du * 0.92,
          0.061,
          0.999
        )

        const bLocal = getAlmondPocketBounds(u, H, config)
        const pLocalList = getAllSubPockets(u, H, config, minSubGap)
        if (pLocalList.length === 0) continue

        let pLocal = pLocalList[0]
        let minDistY = Math.abs(pLocal.centerY - basePocket.centerY)
        for (let k = 1; k < pLocalList.length; k++) {
          const dy = Math.abs(pLocalList[k].centerY - basePocket.centerY)
          if (dy < minDistY) {
            minDistY = dy
            pLocal = pLocalList[k]
          }
        }
        if (pLocal.height < minSubGap) continue

        const v_rel = (prng() - 0.5) * 1.68
        const w_depth = (prng() - 0.5) * 1.68
        const r_norm = Math.hypot(v_rel, w_depth)
        if (r_norm > 0.86) continue

        // Dynamic cross-section depth scaling at narrow tip
        const localRz = u < 0.20
          ? Math.min(pLocal.rz, 1.1 * pLocal.height + 0.015)
          : pLocal.rz

        const y = pLocal.centerY + v_rel * pLocal.ry
        const z = pLocal.centerZ + w_depth * localRz
        const x = sign * 10.0 * u

        const marginClearance = u > 0.65 ? 0.0022 : (u < 0.20 ? 0.0018 : 0.0035)
        if (y > bLocal.envMaxY - marginClearance || y < bLocal.envMinY + marginClearance) continue

        const minFilamentDist = getMinFilamentClearance(y, z, bLocal)
        const heroClearance = pLocal.height < 0.06
          ? Math.min(0.0055, 0.12 * pLocal.height)
          : (u > 0.65 ? 0.0070 : (u < 0.20 ? Math.min(0.0060, 0.10 * pLocal.height) : 0.0080))
        if (minFilamentDist < heroClearance) continue

        // Subtle low-frequency galactic clustering noise (gentle modulation, never starving narrow necks)
        const clusterNoise = 0.65 + 0.18 * Math.sin(1.6 * x + 0.4) * Math.cos(4.0 * y) + 0.10 * Math.sin(3.0 * x - 2.0 * z) + 0.07 * Math.cos(5.0 * y + 3.0 * z)
        const noiseAccept = u < 0.22 ? 0.88 : THREE.MathUtils.clamp(clusterNoise, 0.40, 1.0)
        if (prng() > noiseAccept) continue

        // 3-tier Z-depth stratification
        const isFG = w_depth > 0.25
        const isBG = w_depth < -0.25
        const depthTier = isFG ? 'fg' : (isBG ? 'bg' : 'mid')
        const layer = isFG ? 1.0 : (isBG ? -1.0 : 0.0)

        // Multi-scale Poisson clearance: wider for FG hubs and stars, tighter for MID/BG
        const rMin = u < 0.20
          ? (0.025 * pLocal.height + 0.012)
          : (isFG ? (0.062 * pLocal.height + 0.030) : (0.044 * pLocal.height + 0.019))

        if (grid.isTooClose(x, y, z, rMin, rawNodes)) continue

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
          weight,
          isAnchor: false,
          connectedCount: 0,
          layer,
          depthTier,
          v_rel,
          w_depth,
          r_norm,
          isHighlight: 0.0,
          relativeCoord: [u, v_rel, w_depth, r_norm],
        })
        grid.insert(x, y, z, id)
      }
    }
  }

  // 3. Proximity-Constrained 3D Delaunay/k-NN Graph Topology
  const edges = []
  const edgeSet = new Set()
  const adj = Array.from({ length: rawNodes.length }, () => [])

  function addEdge(i, j, dist, isInterLayer = false, isFallback = false) {
    const key = Math.min(i, j) + '-' + Math.max(i, j)
    if (edgeSet.has(key)) return false
    edgeSet.add(key)
    edges.push({ i, j, dist, isInterLayer, isFallback })
    rawNodes[i].connectedCount++
    rawNodes[j].connectedCount++
    adj[i].push(j)
    adj[j].push(i)
    return true
  }

  // 3a. Intra-layer Delaunay/k-NN connections
  const depthLayers = ['fg', 'mid', 'bg']
  for (const lyr of depthLayers) {
    const layerIndices = rawNodes
      .map((n, idx) => (n.depthTier === lyr ? idx : -1))
      .filter(idx => idx >= 0)

    const targetK = lyr === 'mid' ? 4 : (lyr === 'fg' ? 4 : 3)

    for (let a = 0; a < layerIndices.length; a++) {
      const i = layerIndices[a]
      const nA = rawNodes[i]
      const candidates = []

      for (let b = 0; b < layerIndices.length; b++) {
        if (a === b) continue
        const j = layerIndices[b]
        const nB = rawNodes[j]
        if (Math.abs(nA.u - nB.u) > 0.090) continue

        const dist3D = nA.pos.distanceTo(nB.pos)
        const localH = Math.max(nA.hu, nB.hu)
        const maxEdgeDist = 0.38 * localH + 0.025
        if (dist3D < 0.008 || dist3D > maxEdgeDist) continue

        // Tall vertical-strut gating: dy over 1.8 * dx on long spans
        const dx = Math.abs(nA.pos.x - nB.pos.x)
        const dy = Math.abs(nA.pos.y - nB.pos.y)
        if (dist3D > 0.18 * localH && dy > 1.8 * dx) continue

        if (doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) continue

        candidates.push({ j, dist3D })
      }

      candidates.sort((c1, c2) => c1.dist3D - c2.dist3D)

      for (const cand of candidates) {
        if (nA.connectedCount >= targetK) break
        const nB = rawNodes[cand.j]
        if (nB.connectedCount >= targetK + 2) continue

        let crosses = false
        for (const e of edges) {
          if (e.i === i || e.j === i || e.i === cand.j || e.j === cand.j) continue
          const eA = rawNodes[e.i]
          const eB = rawNodes[e.j]
          if (eA.depthTier === lyr && eB.depthTier === lyr) {
            if (segmentsIntersect2D(nA.pos, nB.pos, eA.pos, eB.pos)) {
              crosses = true
              break
            }
          }
        }
        if (crosses) continue

        addEdge(i, cand.j, cand.dist3D)
      }
    }

    // Triangular face completion within layer
    for (let a = 0; a < layerIndices.length; a++) {
      const i = layerIndices[a]
      const nbrs = adj[i].filter(nb => rawNodes[nb].depthTier === lyr)
      if (nbrs.length < 2) continue

      for (let p1 = 0; p1 < nbrs.length; p1++) {
        for (let p2 = p1 + 1; p2 < nbrs.length; p2++) {
          const j = nbrs[p1]
          const k = nbrs[p2]
          const nJ = rawNodes[j]
          const nK = rawNodes[k]
          if (nJ.connectedCount >= targetK + 1 || nK.connectedCount >= targetK + 1) continue

          const dist3D = nJ.pos.distanceTo(nK.pos)
          const localH = Math.max(nJ.hu, nK.hu)
          const maxEdgeDist = 0.38 * localH + 0.025
          if (dist3D > maxEdgeDist || dist3D < 0.008) continue
          if (Math.abs(nJ.u - nK.u) > 0.090) continue

          const dx = Math.abs(nJ.pos.x - nK.pos.x)
          const dy = Math.abs(nJ.pos.y - nK.pos.y)
          if (dist3D > 0.18 * localH && dy > 1.8 * dx) continue

          if (doesSegmentIntersectRibbons(nJ.pos, nJ.u, nK.pos, nK.u, H, config)) continue

          let crosses = false
          for (const e of edges) {
            if (e.i === j || e.j === j || e.i === k || e.j === k) continue
            const eA = rawNodes[e.i]
            const eB = rawNodes[e.j]
            if (eA.depthTier === lyr && eB.depthTier === lyr) {
              if (segmentsIntersect2D(nJ.pos, nK.pos, eA.pos, eB.pos)) {
                crosses = true
                break
              }
            }
          }
          if (crosses) continue

          addEdge(j, k, dist3D)
        }
      }
    }
  }

  // 3b. Dual-tier FG-to-MID/BG links (FG -> MID, MID -> BG)
  for (let i = 0; i < rawNodes.length; i++) {
    const nA = rawNodes[i]
    if (nA.depthTier !== 'fg') continue
    const candidates = []
    for (let j = 0; j < rawNodes.length; j++) {
      const nB = rawNodes[j]
      if (nB.depthTier !== 'mid') continue
      if (Math.abs(nA.u - nB.u) > 0.085) continue
      const dist3D = nA.pos.distanceTo(nB.pos)
      const localH = Math.max(nA.hu, nB.hu)
      const maxEdgeDist = 0.38 * localH + 0.025
      if (dist3D > maxEdgeDist || dist3D < 0.008) continue
      if (doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) continue
      candidates.push({ j, dist3D })
    }
    candidates.sort((a, b) => a.dist3D - b.dist3D)
    for (let m = 0; m < Math.min(2, candidates.length); m++) {
      addEdge(i, candidates[m].j, candidates[m].dist3D, true)
    }
  }

  for (let i = 0; i < rawNodes.length; i++) {
    const nA = rawNodes[i]
    if (nA.depthTier !== 'bg') continue
    const candidates = []
    for (let j = 0; j < rawNodes.length; j++) {
      const nB = rawNodes[j]
      if (nB.depthTier !== 'mid') continue
      if (Math.abs(nA.u - nB.u) > 0.085) continue
      const dist3D = nA.pos.distanceTo(nB.pos)
      const localH = Math.max(nA.hu, nB.hu)
      const maxEdgeDist = 0.38 * localH + 0.025
      if (dist3D > maxEdgeDist || dist3D < 0.008) continue
      if (doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) continue
      candidates.push({ j, dist3D })
    }
    candidates.sort((a, b) => a.dist3D - b.dist3D)
    for (let m = 0; m < Math.min(1, candidates.length); m++) {
      addEdge(i, candidates[m].j, candidates[m].dist3D, true)
    }
  }

  // Cross-layer connections in the narrow tip (u < 0.20) where layers converge
  for (let i = 0; i < rawNodes.length; i++) {
    const nA = rawNodes[i]
    if (nA.u >= 0.20) continue
    if (nA.connectedCount >= 2) continue
    for (let j = 0; j < rawNodes.length; j++) {
      if (i === j) continue
      const nB = rawNodes[j]
      if (nB.u >= 0.22) continue
      if (Math.abs(nA.u - nB.u) > 0.035) continue
      const dist3D = nA.pos.distanceTo(nB.pos)
      const localH = Math.max(nA.hu, nB.hu)
      const maxEdgeDist = 0.38 * localH + 0.025
      if (dist3D <= maxEdgeDist && dist3D >= 0.005) {
        if (!doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) {
          addEdge(i, j, dist3D, true)
          if (nA.connectedCount >= 2) break
        }
      }
    }
  }

  // 3c. Local nearest-neighbor fallback (degree >= 2 where valid) with whisper-thin alpha so zero nodes float
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < rawNodes.length; i++) {
      const nA = rawNodes[i]
      while (nA.connectedCount < 2) {
        let bestJ = -1
        let bestDist = Infinity
        for (let j = 0; j < rawNodes.length; j++) {
          if (i === j) continue
          const nB = rawNodes[j]
          const key = Math.min(i, j) + '-' + Math.max(i, j)
          if (edgeSet.has(key)) continue
          if (Math.abs(nA.u - nB.u) > 0.090) continue
          const dist3D = nA.pos.distanceTo(nB.pos)
          const localH = Math.max(nA.hu, nB.hu)
          const maxEdgeDist = 0.38 * localH + 0.025
          if (dist3D <= maxEdgeDist && dist3D < bestDist) {
            if (!doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) {
              bestDist = dist3D
              bestJ = j
            }
          }
        }
        if (bestJ !== -1) {
          addEdge(i, bestJ, bestDist, false, true)
        } else {
          break
        }
      }
    }
  }

  // Component Unification Pass: merge any isolated components into a single spanning graph
  function getComponents() {
    const visited = new Uint8Array(rawNodes.length)
    const comps = []
    for (let i = 0; i < rawNodes.length; i++) {
      if (rawNodes[i].connectedCount === 0 || visited[i]) continue
      const comp = []
      const queue = [i]
      visited[i] = 1
      while (queue.length > 0) {
        const curr = queue.shift()
        comp.push(curr)
        const nbrs = adj[curr] || []
        for (let k = 0; k < nbrs.length; k++) {
          const neighbor = nbrs[k]
          if (!visited[neighbor]) {
            visited[neighbor] = 1
            queue.push(neighbor)
          }
        }
      }
      comps.push(comp)
    }
    comps.sort((a, b) => b.length - a.length)
    return comps
  }

  let loopCount = 0
  while (loopCount++ < 120) {
    const comps = getComponents()
    if (comps.length <= 1) break

    let bestI = -1, bestJ = -1, bestD = Infinity

    for (let c1 = 0; c1 < comps.length; c1++) {
      for (let c2 = c1 + 1; c2 < comps.length; c2++) {
        const compA = comps[c1]
        const compB = comps[c2]

        for (let oi = 0; oi < compA.length; oi++) {
          const i = compA[oi]
          const nA = rawNodes[i]
          for (let mi = 0; mi < compB.length; mi++) {
            const j = compB[mi]
            const nB = rawNodes[j]
            if (Math.abs(nA.u - nB.u) > 0.090) continue
            const dist3D = nA.pos.distanceTo(nB.pos)
            const localH = Math.max(nA.hu, nB.hu)
            const maxEdgeDist = 0.38 * localH + 0.025

            if (dist3D <= maxEdgeDist && dist3D < bestD) {
              if (!doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) {
                bestD = dist3D
                bestI = i
                bestJ = j
              }
            }
          }
        }
      }
    }

    if (bestI !== -1 && bestJ !== -1) {
      addEdge(bestI, bestJ, bestD, false, true)
    } else {
      break
    }
  }

  // Retain all valid chamber networks (components with >= 4 nodes) and prune any node with degree < 2
  const preComps = getComponents()
  let mainSet = new Set()
  for (const comp of preComps) {
    if (comp.length >= 4) {
      for (const idx of comp) mainSet.add(idx)
    }
  }

  const unifiedEdges = []
  for (const e of edges) {
    if (mainSet.has(e.i) && mainSet.has(e.j)) {
      unifiedEdges.push(e)
    } else {
      rawNodes[e.i].connectedCount = Math.max(0, rawNodes[e.i].connectedCount - 1)
      rawNodes[e.j].connectedCount = Math.max(0, rawNodes[e.j].connectedCount - 1)
    }
  }
  edges.length = 0
  edges.push(...unifiedEdges)

  // Iteratively prune any leaf nodes (degree < 2) to strictly guarantee zero floating nodes
  let pruneChanged = true
  while (pruneChanged) {
    pruneChanged = false
    for (let i = 0; i < rawNodes.length; i++) {
      if (mainSet.has(i) && rawNodes[i].connectedCount < 2) {
        mainSet.delete(i)
        for (let eIdx = edges.length - 1; eIdx >= 0; eIdx--) {
          const e = edges[eIdx]
          if (e.i === i || e.j === i) {
            rawNodes[e.i].connectedCount = Math.max(0, rawNodes[e.i].connectedCount - 1)
            rawNodes[e.j].connectedCount = Math.max(0, rawNodes[e.j].connectedCount - 1)
            edges.splice(eIdx, 1)
          }
        }
        pruneChanged = true
      }
    }
  }

  const visibleNodes = rawNodes.filter((n, idx) => mainSet.has(idx) && n.connectedCount >= 2)

  // Calibrated Hub Selection: Sparse 12–15% FG purely circular ice-white pinpoint hubs (Requirement 4)
  const fgNodes = visibleNodes.filter(n => n.depthTier === 'fg')
  const targetHubCount = Math.round(0.135 * fgNodes.length) // 13.5% target

  // Eligible FG candidates: inside chamber body, good height, not right at the apex tip
  const eligibleHubs = fgNodes.filter(n => Math.abs(n.v_rel) < 0.65 && n.u >= 0.22 && n.u <= 0.88 && n.hu >= 0.10)
  eligibleHubs.sort((a, b) => {
    const scoreA = a.connectedCount * 2.0 + (1.0 - Math.abs(a.v_rel)) + (1.0 - Math.abs(a.w_depth - 0.50))
    const scoreB = b.connectedCount * 2.0 + (1.0 - Math.abs(b.v_rel)) + (1.0 - Math.abs(b.w_depth - 0.50))
    return scoreB - scoreA
  })

  const chosenHubs = new Set()
  for (const cand of eligibleHubs) {
    if (chosenHubs.size >= targetHubCount) break
    let tooClose = false
    for (const hIdx of chosenHubs) {
      const hNode = rawNodes[hIdx]
      const d = cand.pos.distanceTo(hNode.pos)
      const minHubDist = 0.08 * cand.hu + 0.04
      if (d < minHubDist) {
        tooClose = true
        break
      }
    }
    if (!tooClose) {
      chosenHubs.add(cand.idx)
    }
  }

  if (chosenHubs.size < Math.ceil(0.12 * fgNodes.length)) {
    for (const cand of eligibleHubs) {
      if (chosenHubs.size >= targetHubCount) break
      chosenHubs.add(cand.idx)
    }
  }

  // Assign final node styling, colors, and sizes
  for (const node of visibleNodes) {
    const isHighlight = chosenHubs.has(node.idx) ? 1.0 : 0.0
    node.isHighlight = isHighlight

    // Proximity to Ribbon 2 (purple wave) for subtle electric-indigo/violet rim tinting (#5e48ff)
    const bLocal = getAlmondPocketBounds(node.u, H, config)
    const dHero2 = Math.hypot(node.pos.y - bLocal.y2, node.pos.z - bLocal.z2)
    const violetProx = Math.max(0.0, 1.0 - dHero2 / Math.max(0.04, 0.32 * bLocal.envHeight))
    const marginProx = Math.max(0.0, (Math.abs(node.v_rel) - 0.70) / 0.30)
    const isAdjacentToViolet = (dHero2 < 0.20) || ((node.v_rel > 0 && bLocal.y2 > bLocal.envCenterY) || (node.v_rel < 0 && bLocal.y2 < bLocal.envCenterY))
    const rimTintFactor = isAdjacentToViolet ? Math.max(violetProx * 0.95, marginProx * 0.85) : (violetProx * 0.65)

    let color, lineColor, alpha, lineAlpha, size

    if (node.depthTier === 'fg') {
      if (isHighlight > 0.5) {
        // Sparse 12–15% FG purely circular ice-white pinpoint hubs (#ffffff)
        color = new THREE.Color('#ffffff')
        lineColor = new THREE.Color('#28a0ff')
        size = 3.8 + prng() * 0.8 // Sized for 14-22px quad in shader
        alpha = 1.0
        lineAlpha = 0.35 + prng() * 0.03
      } else {
        // 6–10px cyan FG stars
        color = new THREE.Color('#28d8ff').lerp(new THREE.Color('#38e0ff'), prng() * 0.35)
        lineColor = new THREE.Color('#1c70e8')
        size = 1.6 + prng() * 0.5 // Sized for 6-10px quad in shader
        alpha = 0.92 + prng() * 0.06
        lineAlpha = 0.30 + prng() * 0.04
      }
    } else if (node.depthTier === 'mid') {
      // MID 4–7px cobalt/royal-blue nodes and crisp webbing
      color = new THREE.Color('#1460ff').lerp(new THREE.Color('#1c84ff'), prng() * 0.40)
      lineColor = new THREE.Color('#0e4cd8')
      size = 1.2 + prng() * 0.4 // Sized for 4-7px quad in shader
      alpha = 0.72 + prng() * 0.08
      lineAlpha = 0.18 + prng() * 0.04
    } else {
      // BG 1.5–3px dim sapphire micro-dots and faint deep-navy sub-web
      color = new THREE.Color('#061a55').lerp(new THREE.Color('#08226c'), prng() * 0.40)
      lineColor = new THREE.Color('#06184c')
      size = 0.8 + prng() * 0.3 // Sized for 1.5-3px quad in shader
      alpha = 0.25 + prng() * 0.06
      lineAlpha = 0.07 + prng() * 0.02
    }

    // Soft margin alpha feathering past |v_rel| = 0.78
    if (Math.abs(node.v_rel) > 0.78) {
      const marginFeather = 1.0 - THREE.MathUtils.smoothstep(Math.abs(node.v_rel), 0.78, 0.96)
      alpha *= Math.max(0.08, marginFeather)
      lineAlpha *= Math.max(0.08, marginFeather)
    }

    // Dynamic h(u) feathering inside crossing throats
    if (node.localSubHeight < 0.09) {
      const throatFactor2 = THREE.MathUtils.smoothstep(node.localSubHeight, minSubGap, 0.09)
      alpha *= (0.50 + 0.50 * throatFactor2)
      lineAlpha *= (0.50 + 0.50 * throatFactor2)
      size *= (0.65 + 0.35 * throatFactor2)
    }

    // Subtle electric-indigo/violet rim tinting near purple wave edges
    if (rimTintFactor > 0.06) {
      const violetTint = new THREE.Color('#5e48ff').lerp(new THREE.Color('#7858ff'), prng() * 0.30)
      color.lerp(violetTint, rimTintFactor * 0.75)
      lineColor.lerp(violetTint, rimTintFactor * 0.70)
    }

    // Theme modulation
    if (themeConfig && themeConfig.primaryWire) {
      color.lerp(new THREE.Color(themeConfig.primaryWire), 0.08)
      lineColor.lerp(new THREE.Color(themeConfig.primaryWire), 0.08)
    }

    node.color = color
    node.lineColor = lineColor
    node.alpha = alpha
    node.lineAlpha = lineAlpha
    node.size = size
  }

  // 4. Wave Margin Tethering:
  // Outer boundary nodes (|v_rel| >= 0.65) tether cleanly to nearest invisible margin anchors extending all the way to u = 1.0
  const tetherEdges = []
  for (const node of visibleNodes) {
    if (Math.abs(node.v_rel) >= 0.65) {
      let bestAnchor = null
      let bestDist = Infinity

      for (const anc of anchors) {
        if (Math.abs(node.u - anc.u) > 0.080) continue

        const isUpperAnchor = anc.id.includes('upper')
        if (node.v_rel > 0 && !isUpperAnchor) continue
        if (node.v_rel < 0 && isUpperAnchor) continue

        const dist = node.pos.distanceTo(anc.pos)
        const localH = Math.min(node.hu, anc.hu)
        const maxEdgeDist = 0.38 * localH + 0.025
        if (dist <= maxEdgeDist && dist < bestDist) {
          if (!doesSegmentIntersectRibbons(node.pos, node.u, anc.pos, anc.u, H, config, true)) {
            bestDist = dist
            bestAnchor = anc
          }
        }
      }

      if (bestAnchor) {
        tetherEdges.push({
          node,
          anchor: bestAnchor,
          dist: bestDist,
        })
      }
    }
  }

  // 5. Build Lines BufferGeometry (Internal Constellation Edges + Wave Margin Tethers)
  const linePositions = []
  const lineBasePositions = []
  const lineUs = []
  const lineWeights = []
  const lineLayers = []
  const lineAlphas = []
  const lineRelativeCoords = []
  const lineColors = []

  function addLineSegment(p1, u1, w1, l1, a1, rel1, c1, p2, u2, w2, l2, a2, rel2, c2) {
    linePositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z)
    lineBasePositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z)
    lineUs.push(u1, u2)
    lineWeights.push(w1, w2)
    lineLayers.push(l1, l2)
    lineAlphas.push(a1, a2)
    lineRelativeCoords.push(rel1[0], rel1[1], rel1[2], rel1[3], rel2[0], rel2[1], rel2[2], rel2[3])
    lineColors.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b)
  }

  function getTierAlpha(node) {
    if (node.depthTier === 'fg') {
      return (node.isHighlight > 0.5) ? 0.36 : (0.28 + prng() * 0.08)
    }
    if (node.depthTier === 'bg') {
      return 0.055 + prng() * 0.035
    }
    return 0.16 + prng() * 0.06
  }

  edges.forEach(({ i, j, isInterLayer, isFallback }) => {
    const nA = rawNodes[i]
    const nB = rawNodes[j]

    let alphaBaseA = getTierAlpha(nA)
    let alphaBaseB = getTierAlpha(nB)

    if (isFallback) {
      alphaBaseA = Math.min(alphaBaseA, 0.10)
      alphaBaseB = Math.min(alphaBaseB, 0.10)
    } else if (isInterLayer) {
      alphaBaseA = Math.min(alphaBaseA, 0.20)
      alphaBaseB = Math.min(alphaBaseB, 0.20)
      if (nA.depthTier === 'bg') alphaBaseA = Math.min(alphaBaseA, 0.08)
      if (nB.depthTier === 'bg') alphaBaseB = Math.min(alphaBaseB, 0.08)
    }

    const featherA = 1.0 - THREE.MathUtils.smoothstep(Math.abs(nA.v_rel), 0.78, 0.96)
    const featherB = 1.0 - THREE.MathUtils.smoothstep(Math.abs(nB.v_rel), 0.78, 0.96)

    const aA = alphaBaseA * Math.max(0.08, featherA)
    const aB = alphaBaseB * Math.max(0.08, featherB)
    const cA = nA.lineColor || nA.color
    const cB = nB.lineColor || nB.color

    addLineSegment(
      nA.pos, nA.u, nA.weight, nA.layer, aA, nA.relativeCoord, cA,
      nB.pos, nB.u, nB.weight, nB.layer, aB, nB.relativeCoord, cB
    )
  })

  const defaultTetherColor = new THREE.Color('#104fe0')
  const violetTetherColor = new THREE.Color('#5e48ff')

  tetherEdges.forEach(({ node, anchor }) => {
    const tetherFeather = 1.0 - THREE.MathUtils.smoothstep(Math.abs(node.v_rel), 0.74, 0.98)
    const aNode = THREE.MathUtils.clamp((node.lineAlpha || 0.16) * 0.35 * tetherFeather, 0.0, 0.10)
    const aAnchor = 0.0

    const y2 = heroY2(node.u, H, config)
    const z2 = heroZ(2, node.u, H, config)
    const dHero2 = Math.hypot(node.pos.y - y2, node.pos.z - z2)
    const isAdjacentToViolet = dHero2 < 0.22 || Math.abs(node.v_rel) >= 0.70
    const tColor = isAdjacentToViolet ? violetTetherColor : defaultTetherColor
    const nColor = isAdjacentToViolet ? (node.lineColor.clone().lerp(violetTetherColor, 0.80)) : (node.lineColor || node.color)

    addLineSegment(
      node.pos, node.u, node.weight, node.layer, aNode, node.relativeCoord, nColor,
      anchor.pos, anchor.u, anchor.weight, 0.0, aAnchor, anchor.relativeCoord, tColor
    )
  })

  const linesGeo = new THREE.BufferGeometry()
  linesGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
  linesGeo.setAttribute('aBasePos', new THREE.Float32BufferAttribute(lineBasePositions, 3))
  linesGeo.setAttribute('aU', new THREE.Float32BufferAttribute(lineUs, 1))
  linesGeo.setAttribute('aWeight', new THREE.Float32BufferAttribute(lineWeights, 1))
  linesGeo.setAttribute('aLayer', new THREE.Float32BufferAttribute(lineLayers, 1))
  linesGeo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(lineAlphas, 1))
  linesGeo.setAttribute('aRelativeCoord', new THREE.Float32BufferAttribute(lineRelativeCoords, 4))
  linesGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3))

  // 6. Build Points BufferGeometry (Multi-Scale Starlight Field: micro-nodes + ice-white hubs)
  const pointPositions = []
  const pointBasePositions = []
  const pointUs = []
  const pointWeights = []
  const pointLayers = []
  const pointSizes = []
  const pointAlphas = []
  const pointColors = []
  const pointHighlights = []
  const pointRelativeCoords = []

  visibleNodes.forEach((n) => {
    pointPositions.push(n.pos.x, n.pos.y, n.pos.z)
    pointBasePositions.push(n.pos.x, n.pos.y, n.pos.z)
    pointUs.push(n.u)
    pointWeights.push(n.weight)
    pointLayers.push(n.layer)
    pointSizes.push(n.size)
    pointAlphas.push(n.alpha)
    pointColors.push(n.color.r, n.color.g, n.color.b)
    pointHighlights.push(n.isHighlight)
    pointRelativeCoords.push(n.relativeCoord[0], n.relativeCoord[1], n.relativeCoord[2], n.relativeCoord[3])
  })

  const pointsGeo = new THREE.BufferGeometry()
  pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3))
  pointsGeo.setAttribute('aBasePos', new THREE.Float32BufferAttribute(pointBasePositions, 3))
  pointsGeo.setAttribute('aU', new THREE.Float32BufferAttribute(pointUs, 1))
  pointsGeo.setAttribute('aWeight', new THREE.Float32BufferAttribute(pointWeights, 1))
  pointsGeo.setAttribute('aLayer', new THREE.Float32BufferAttribute(pointLayers, 1))
  pointsGeo.setAttribute('size', new THREE.Float32BufferAttribute(pointSizes, 1))
  pointsGeo.setAttribute('alpha', new THREE.Float32BufferAttribute(pointAlphas, 1))
  pointsGeo.setAttribute('color', new THREE.Float32BufferAttribute(pointColors, 3))
  pointsGeo.setAttribute('aIsHighlight', new THREE.Float32BufferAttribute(pointHighlights, 1))
  pointsGeo.setAttribute('aRelativeCoord', new THREE.Float32BufferAttribute(pointRelativeCoords, 4))

  // 7. Restrained Deep Sapphire Chamber Haze (Answer 5)
  // Capped at 350–500 deep sapphire (#041038 to #061b4d) particles per side strictly inside
  // r_norm < 0.65 and w_depth < -0.20 with peak opacity 0.025–0.032, radius scaled to h(u),
  // slight bias behind dense node clusters, smooth Gaussian falloff, and zero throat bleed.
  const hazePositions = []
  const hazeBasePositions = []
  const hazeUs = []
  const hazeWeights = []
  const hazeSizes = []
  const hazeAlphas = []
  const hazeColors = []
  const hazeRelativeCoords = []

  const hazeCountTarget = 420
  let hazeAttempts = 0

  while (hazePositions.length / 3 < hazeCountTarget && hazeAttempts++ < 6000) {
    const u = 0.12 + prng() * (0.98 - 0.12)
    const b = getAlmondPocketBounds(u, H, config)
    if (b.envHeight < 0.09) continue // Zero throat bleed

    const pockets = getAllSubPockets(u, H, config, 0.08)
    if (pockets.length === 0) continue

    const chosenPocket = pockets[Math.floor(prng() * pockets.length)]
    if (chosenPocket.height < 0.08) continue

    // Strictly inside r_norm < 0.65 and w_depth < -0.20
    const w_depth = -0.22 - prng() * 0.48
    const maxV = Math.sqrt(Math.max(0.0, 0.64 * 0.64 - w_depth * w_depth))
    if (maxV <= 0.01) continue

    const v_rel = (prng() - 0.5) * 2.0 * maxV
    const r_norm = Math.hypot(v_rel, w_depth)
    if (r_norm >= 0.65) continue

    const y = chosenPocket.centerY + v_rel * chosenPocket.ry
    const z = chosenPocket.centerZ + w_depth * chosenPocket.rz
    const x = sign * 10.0 * u
    const pos = new THREE.Vector3(x, y, z)

    const dHero = getMinFilamentClearance(y, z, b)
    if (dHero < 0.009) continue

    const boundaryFade = Math.max(0.0, 1.0 - Math.pow(r_norm / 0.65, 2.0))
    const weight = computeConstraintWeight(u)

    // Peak opacity 0.025–0.032
    const baseAlpha = 0.025 + prng() * 0.007
    const alpha = baseAlpha * boundaryFade * weight

    // Radius scaled to h(u)
    const baseSize = Math.max(20.0, Math.min(65.0, chosenPocket.height * 80.0 + prng() * 10.0))

    // Palette: Deep sapphire (#041038 to #061b4d)
    const col = new THREE.Color('#041038').lerp(new THREE.Color('#061b4d'), prng())

    // Proximity to Ribbon 2 violet tinting
    const dHero2 = Math.hypot(y - b.y2, z - b.z2)
    if (dHero2 < 0.16) {
      col.lerp(new THREE.Color('#1a164c'), 0.25)
    }

    hazePositions.push(pos.x, pos.y, pos.z)
    hazeBasePositions.push(pos.x, pos.y, pos.z)
    hazeUs.push(u)
    hazeWeights.push(weight)
    hazeSizes.push(baseSize)
    hazeAlphas.push(alpha)
    hazeColors.push(col.r, col.g, col.b)
    hazeRelativeCoords.push(u, v_rel, w_depth, r_norm)
  }

  const hazeGeo = new THREE.BufferGeometry()
  hazeGeo.setAttribute('position', new THREE.Float32BufferAttribute(hazePositions, 3))
  hazeGeo.setAttribute('aBasePos', new THREE.Float32BufferAttribute(hazeBasePositions, 3))
  hazeGeo.setAttribute('aU', new THREE.Float32BufferAttribute(hazeUs, 1))
  hazeGeo.setAttribute('aWeight', new THREE.Float32BufferAttribute(hazeWeights, 1))
  hazeGeo.setAttribute('size', new THREE.Float32BufferAttribute(hazeSizes, 1))
  hazeGeo.setAttribute('alpha', new THREE.Float32BufferAttribute(hazeAlphas, 1))
  hazeGeo.setAttribute('color', new THREE.Float32BufferAttribute(hazeColors, 3))
  hazeGeo.setAttribute('aRelativeCoord', new THREE.Float32BufferAttribute(hazeRelativeCoords, 4))

  return {
    linesGeo,
    pointsGeo,
    hazeGeo,
  }
}
