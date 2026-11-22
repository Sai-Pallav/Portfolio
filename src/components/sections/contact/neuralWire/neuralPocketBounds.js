/**
 * @file neuralPocketBounds.js
 * Mathematical Pocket Geometry & Shared Helper for the 3D Neural Wire Network.
 *
 * Implements the negative-space almond pocket boundary envelope, relaxed pinch-gate safety evaluation,
 * multi-ribbon sub-pocket sampling across all 4 wave streams, relative coordinate system
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
  const Ry = Math.max(0.005, 0.5 * gapHeight - 0.010)
  const Rz = Ry * 0.85
  const isPinch = gapHeight < minGapHeight

  // Extended envelope across all 4 ribbons (Ribbon 0, 1, 2, 3)
  const allY = [y0, y1, y2, y3]
  const allZ = [z0, z1, z2, z3]
  const envMinY = Math.min(...allY)
  const envMaxY = Math.max(...allY)
  const envMinZ = Math.min(...allZ)
  const envMaxZ = Math.max(...allZ)
  const envHeight = Math.max(0.020, envMaxY - envMinY)
  const envCenterY = 0.5 * (envMaxY + envMinY)
  const envCenterZ = 0.5 * (envMaxZ + envMinZ)
  const envRy = Math.max(0.010, 0.5 * envHeight - 0.008)
  const envRz = Math.max(0.010, 0.5 * (envMaxZ - envMinZ) + 0.035)

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
 * Computes the relative coordinate Vector4 (u, v_rel, w_depth, r_norm) for a 3D point
 * relative to the local almond chamber / wave envelope.
 *
 * 1. u in [0, 1]: Longitudinal coordinate along the wave flow.
 * 2. v_rel in [-1, 1]: Normalized vertical position relative to local pocket center and radius.
 * 3. w_depth in [-1, 1]: Normalized Z-depth position relative to local pocket center and depth radius.
 * 4. r_norm in [0, 1]: Normalized radial distance from local centerline.
 *
 * @param {THREE.Vector3 | {x: number, y: number, z: number}} pos
 * @param {number} u
 * @param {number} [H=H_VAL]
 * @param {object} [config={}]
 * @returns {THREE.Vector4}
 */
export function computeRelativeCoord(pos, u, H = H_VAL, config = {}) {
  const bounds = getAlmondPocketBounds(u, H, config)
  const isOutsidePrimary = pos.y > bounds.yUpper || pos.y < bounds.yLower
  const centerY = isOutsidePrimary ? bounds.envCenterY : bounds.gapCenterY
  const centerZ = isOutsidePrimary ? bounds.envCenterZ : bounds.gapCenterZ
  const ry = isOutsidePrimary ? bounds.envRy : Math.max(0.001, bounds.Ry)
  const rz = isOutsidePrimary ? bounds.envRz : Math.max(0.001, bounds.Rz)

  const v_rel = THREE.MathUtils.clamp((pos.y - centerY) / ry, -1.0, 1.0)
  const w_depth = THREE.MathUtils.clamp((pos.z - centerZ) / rz, -1.0, 1.0)
  const r_norm = Math.min(1.0, Math.sqrt(v_rel * v_rel + w_depth * w_depth))

  return new THREE.Vector4(u, v_rel, w_depth, r_norm)
}

/**
 * Computes relative coordinates as a plain 4-element array [u, v_rel, w_depth, r_norm]
 * for high-performance direct buffer insertion.
 *
 * @param {THREE.Vector3 | {x: number, y: number, z: number}} pos
 * @param {number} u
 * @param {number} [H=H_VAL]
 * @param {object} [config={}]
 * @returns {[number, number, number, number]}
 */
export function computeRelativeCoordArray(pos, u, H = H_VAL, config = {}) {
  const bounds = getAlmondPocketBounds(u, H, config)
  const isOutsidePrimary = pos.y > bounds.yUpper || pos.y < bounds.yLower
  const centerY = isOutsidePrimary ? bounds.envCenterY : bounds.gapCenterY
  const centerZ = isOutsidePrimary ? bounds.envCenterZ : bounds.gapCenterZ
  const ry = isOutsidePrimary ? bounds.envRy : Math.max(0.001, bounds.Ry)
  const rz = isOutsidePrimary ? bounds.envRz : Math.max(0.001, bounds.Rz)

  const v_rel = THREE.MathUtils.clamp((pos.y - centerY) / ry, -1.0, 1.0)
  const w_depth = THREE.MathUtils.clamp((pos.z - centerZ) / rz, -1.0, 1.0)
  const r_norm = Math.min(1.0, Math.sqrt(v_rel * v_rel + w_depth * w_depth))

  return [u, v_rel, w_depth, r_norm]
}

/**
 * Generates invisible anchor vertices along the inner margins of the upper and lower waves.
 * Anchors are placed right at the inner glow envelope of the primary wave ribbons so tether
 * lines cleanly root into the wave glow without dark gaps.
 * Anchors have alpha = 0.0 and size = 0.0 so they never render as visible nodes on primary wave filaments.
 *
 * @param {'left' | 'right'} side
 * @param {number} [H=H_VAL]
 * @param {object} [config={}]
 * @param {number} [count=56]
 * @returns {Array<object>}
 */
export function generateMarginAnchors(side, H = H_VAL, config = {}, count = 56) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const anchors = []

  for (let k = 0; k < count; k++) {
    const u = 0.07 + (k / (count - 1)) * (0.95 - 0.07)
    const bounds = getAlmondPocketBounds(u, H, config)
    if (bounds.envHeight < 0.024) continue

    const x = sign * 10.0 * u
    const yUp = bounds.envMaxY - 0.004
    const yLow = bounds.envMinY + 0.004

    const upPos = new THREE.Vector3(x, yUp, bounds.envCenterZ + bounds.envRz * 0.3)
    const lowPos = new THREE.Vector3(x, yLow, bounds.envCenterZ - bounds.envRz * 0.3)

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
 * Checks if a candidate line segment intersects any wave ribbon filament core.
 */
function doesSegmentIntersectRibbons(pA, uA, pB, uB, H, config, isTether = false) {
  const samples = 6
  for (let s = 1; s < samples; s++) {
    const frac = s / samples
    const ut = uA + frac * (uB - uA)
    const yt = pA.y + frac * (pB.y - pA.y)
    const zt = pA.z + frac * (pB.z - pA.z)

    const bounds = getAlmondPocketBounds(ut, H, config)
    const marginTol = isTether ? 0.006 : 0.018
    if (yt > bounds.envMaxY + marginTol || yt < bounds.envMinY - marginTol) {
      return true
    }

    // Clearance check to all 4 hero ribbon filament cores
    const filamentTol = isTether ? 0.007 : 0.006
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
 * Fills the full negative-space almond cavities AND all secondary sub-pockets across the 4 wave ribbons,
 * converts rigid wireframe struts into whisper-thin gossamer connective tissue (max edge <= 0.26 * h(u)),
 * doubles interior synaptic density with a rich multi-scale starlight field (abundant tiny twinkling blue/cyan
 * micro-nodes + sparse radiant ice-white foreground hubs wrapped in tight exponential micro-halos),
 * equalizes velvety deep-sapphire-to-electric-blue volumetric nebula glow across ALL chambers,
 * eliminates jagged spiky triangles along wave rims via micro-cells and boundary alpha feathering,
 * and sharpens 3-layer Z-depth parallax.
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

  // 1. Invisible Anchor Points along inner ribbon margins (alpha = 0, size = 0)
  const anchors = generateMarginAnchors(side, H, config, 56)

  // 2. Uniform 2D/3D Node Sampling across primary almond AND secondary sub-pockets
  const nodes = []
  let nodeId = 0

  function createNode(u, y, z, v_rel, w_depth, isThroat = false) {
    const b = getAlmondPocketBounds(u, H, config)
    const x = sign * 10.0 * u
    const pos = new THREE.Vector3(x, y, z)

    // Outer envelope bounds check
    const marginClearance = isThroat ? 0.003 : 0.005
    if (y > b.envMaxY - marginClearance || y < b.envMinY + marginClearance) return null

    // Distance to all 4 ribbon filaments (strictly without touching primary filaments)
    const minFilamentDist = getMinFilamentClearance(y, z, b)
    const heroClearance = isThroat ? 0.008 : 0.011
    if (minFilamentDist < heroClearance) return null

    const r_norm = Math.min(1.0, Math.sqrt(v_rel * v_rel + w_depth * w_depth))

    // Proximity to Ribbon 2 (violet accent wave) for subtle electric-indigo/violet rim tinting (#5e48ff) (Gap 5)
    const dHero2 = Math.hypot(y - b.y2, z - b.z2)
    const violetProx = Math.max(0.0, 1.0 - dHero2 / Math.max(0.05, 0.35 * b.envHeight))
    const marginProx = Math.max(0.0, (Math.abs(v_rel) - 0.65) / 0.35)
    const isAdjacentToViolet = (dHero2 < 0.20) || ((v_rel > 0 && b.y2 > b.envCenterY) || (v_rel < 0 && b.y2 < b.envCenterY))
    const rimTintFactor = isAdjacentToViolet ? Math.max(violetProx * 0.95, marginProx * 0.85) : (violetProx * 0.65)

    // 3-layer Z-depth parallax assignment strictly matching physical depth coordinate (Gap 6):
    // BG (w_depth < -0.25): dense ultra-faint dark-blue micro-webbing & tiny dim micro-dots
    // MID (-0.25 <= w_depth <= 0.25): crisp royal/electric-blue MID webbing & cyan junctions
    // FG (w_depth > 0.25): sparse crisp cyan/ice-white starlight hubs strictly confined inside wave bounds
    let layer, depthTier, color, lineColor, alpha, size, isHighlight, lineAlpha

    const isThroatOrNeck = isThroat || u < 0.24 || (u >= 0.46 && u <= 0.73) || b.envHeight < 0.28
    const canBeHub = !isThroatOrNeck && Math.abs(v_rel) < 0.65

    if (w_depth > 0.25) {
      layer = 1.0
      depthTier = 'fg'
      const randVal = prng()
      if (canBeHub && randVal < 0.07) {
        // Sparse radiant ice-white foreground hubs (#ffffff) (Gap 2)
        color = new THREE.Color('#ffffff')
        lineColor = new THREE.Color('#1e68ff') // Whisper-thin gossamer line color (Gap 1)
        // Dropping line opacity: FG target 0.28–0.40 (Gap 1)
        lineAlpha = 0.34 + prng() * 0.05
        alpha = 1.0
        size = 4.0 + prng() * 0.6
        isHighlight = 1.0
      } else if (randVal < 0.48) {
        // Vibrant electric-cyan micro-nodes (Gap 2)
        color = new THREE.Color('#38d8ff')
        lineColor = new THREE.Color('#165fe0')
        lineAlpha = 0.30 + prng() * 0.05
        alpha = 0.90 + prng() * 0.08
        size = 1.8 + prng() * 0.35
        isHighlight = 0.0
      } else {
        // Electric-cyan / cobalt junctions (Gap 2)
        color = new THREE.Color('#22c2ff')
        lineColor = new THREE.Color('#1454d6')
        lineAlpha = 0.31 + prng() * 0.05
        alpha = 0.92 + prng() * 0.06
        size = 2.2 + prng() * 0.35
        isHighlight = 0.0
      }
    } else if (w_depth >= -0.25) {
      layer = 0.0
      depthTier = 'mid'
      const randVal = prng()
      if (randVal < 0.45) {
        // Fine twinkling micro-nodes in MID (Gap 2)
        color = new THREE.Color('#1c84ff')
        lineColor = new THREE.Color('#0e42cc')
        // Dropping line opacity: MID target 0.14–0.24 (Gap 1)
        lineAlpha = 0.17 + prng() * 0.05
        alpha = 0.78 + prng() * 0.08
        size = 1.4 + prng() * 0.3
        isHighlight = 0.0
      } else {
        // Crisp royal-blue / electric-blue MID junctions (Gap 2)
        color = new THREE.Color('#1460ff').lerp(new THREE.Color('#28c8ff'), prng() * 0.35)
        lineColor = new THREE.Color('#0e3ebd').lerp(new THREE.Color('#1250d4'), prng() * 0.40)
        lineAlpha = 0.19 + prng() * 0.04
        alpha = 0.84 + prng() * 0.08
        size = 1.8 + prng() * 0.3
        isHighlight = 0.0
      }
    } else {
      // Background (BG): w_depth < -0.25 (Gap 6)
      // Dense ultra-faint dark-blue micro-webbing & tiny dim micro-dots
      layer = -1.0
      depthTier = 'bg'
      color = new THREE.Color('#061a55').lerp(new THREE.Color('#08226c'), prng() * 0.5)
      lineColor = new THREE.Color('#06184c')
      // Dropping line opacity: BG target 0.05–0.10 (Gap 1)
      lineAlpha = 0.065 + prng() * 0.03
      alpha = 0.35 + prng() * 0.08
      size = 1.0 + prng() * 0.25
      isHighlight = 0.0
    }

    // Boundary alpha feather near wave margins |v_rel| > 0.72 (smoothstep to 0 at margins) (Gap 5)
    if (Math.abs(v_rel) > 0.72) {
      const boundaryFeather = 1.0 - THREE.MathUtils.smoothstep(Math.abs(v_rel), 0.72, 1.0)
      alpha *= Math.max(0.08, boundaryFeather)
      lineAlpha *= Math.max(0.08, boundaryFeather)
    }

    // Throat attenuation for fine sparkling micro-clusters (Gap 3)
    if (isThroat || isThroatOrNeck) {
      const throatFactor = THREE.MathUtils.smoothstep(b.envHeight, 0.022, 0.075)
      alpha *= (0.60 + 0.40 * throatFactor)
      lineAlpha *= (0.50 + 0.50 * throatFactor)
      size = Math.max(0.85, size * 0.85)
    }

    // Subtle electric-indigo/violet rim tinting (#5e48ff) adjacent to purple wave strands (Gap 5)
    if (rimTintFactor > 0.06) {
      const violetTint = new THREE.Color('#5e48ff').lerp(new THREE.Color('#7858ff'), prng() * 0.35)
      color.lerp(violetTint, rimTintFactor * 0.80)
      lineColor.lerp(violetTint, rimTintFactor * 0.75)
    }

    // Theme modulation
    if (themeConfig && themeConfig.primaryWire) {
      color.lerp(new THREE.Color(themeConfig.primaryWire), 0.08)
      lineColor.lerp(new THREE.Color(themeConfig.primaryWire), 0.08)
    }

    const weight = computeConstraintWeight(u)
    const localHeight = Math.max(b.gapHeight, b.envHeight)

    return {
      id: `node_${nodeId++}`,
      pos,
      u,
      hu: localHeight,
      weight,
      isAnchor: false,
      connectedCount: 0,
      layer,
      depthTier,
      color,
      lineColor,
      lineAlpha,
      alpha,
      size,
      isHighlight,
      v_rel,
      w_depth,
      r_norm,
      relativeCoord: [u, v_rel, w_depth, r_norm],
    }
  }

  // Helper to sample a valid point in negative space across all 4 wave ribbons at longitudinal coordinate u
  function samplePointInPocket(u, preferSecondary = false) {
    const b = getAlmondPocketBounds(u, H, config)
    if (b.envHeight < 0.024) return null

    // Collect and sort all 4 ribbon Y values
    const ribbons = [
      { y: b.y0, z: b.z0 },
      { y: b.y1, z: b.z1 },
      { y: b.y2, z: b.z2 },
      { y: b.y3, z: b.z3 },
    ].sort((a, b) => a.y - b.y)

    // Identify open sub-pocket spans between adjacent ribbons
    const spans = []
    for (let k = 0; k < ribbons.length - 1; k++) {
      const rA = ribbons[k]
      const rB = ribbons[k + 1]
      const spanHeight = rB.y - rA.y
      if (spanHeight >= 0.022) {
        spans.push({
          yLow: rA.y,
          yHigh: rB.y,
          height: spanHeight,
          zCenter: 0.5 * (rA.z + rB.z),
          isPrimary: (rA.y >= Math.min(b.y0, b.y1) - 0.005) && (rB.y <= Math.max(b.y0, b.y1) + 0.005),
        })
      }
    }

    if (spans.length === 0) {
      spans.push({
        yLow: b.envMinY,
        yHigh: b.envMaxY,
        height: b.envHeight,
        zCenter: b.envCenterZ,
        isPrimary: true,
      })
    }

    let chosenSpan = spans[0]
    if (spans.length > 1) {
      if (preferSecondary) {
        const secondarySpans = spans.filter(s => !s.isPrimary)
        if (secondarySpans.length > 0) {
          chosenSpan = secondarySpans[Math.floor(prng() * secondarySpans.length)]
        } else {
          chosenSpan = spans[Math.floor(prng() * spans.length)]
        }
      } else {
        const totalH = spans.reduce((sum, s) => sum + s.height, 0)
        let r = prng() * totalH
        for (const s of spans) {
          r -= s.height
          if (r <= 0) {
            chosenSpan = s
            break
          }
        }
      }
    }

    // Sample within chosen span
    const yMargin = Math.max(0.004, chosenSpan.height * 0.08)
    const y = chosenSpan.yLow + yMargin + prng() * Math.max(0.002, chosenSpan.height - 2.0 * yMargin)

    // Compute relative vertical coordinate v_rel
    const isOutsidePrimary = y > b.yUpper || y < b.yLower
    const centerY = isOutsidePrimary ? b.envCenterY : b.gapCenterY
    const ry = isOutsidePrimary ? b.envRy : Math.max(0.005, b.Ry)
    const v_rel = THREE.MathUtils.clamp((y - centerY) / ry, -0.95, 0.95)

    // Depth tier sampling biased to dense BG (45%), MID (35%), sparse FG (20%) (Gap 6)
    const tierRand = prng()
    let w_depth
    if (tierRand < 0.45) {
      w_depth = -0.85 + 0.58 * prng()
    } else if (tierRand < 0.80) {
      w_depth = -0.24 + 0.48 * prng()
    } else {
      w_depth = 0.26 + 0.54 * prng()
    }
    const rz = isOutsidePrimary ? b.envRz : Math.max(0.005, b.Rz)
    const centerZ = chosenSpan.zCenter
    const z = centerZ + w_depth * Math.max(0.015, rz * 0.85)

    return { y, z, v_rel, w_depth, spanHeight: chosenSpan.height }
  }

  // Zone 1: Inner neck micro-clusters and continuous conduit threading (u in [0.108, 0.240]) (Gap 3)
  // Balanced node count: 50-80 nodes total, organic y sampling across span, jittered u
  let z1U = 0.108
  let z1Slice = 0

  while (z1U <= 0.240) {
    const b = getAlmondPocketBounds(z1U, H, config)
    const du = (z1U < 0.130)
      ? 0.0010
      : Math.max(0.0018, Math.min(0.0045, 0.18 * b.gapHeight / 10.0))

    if (b.envHeight >= 0.024) {
      const ribbons = [
        { y: b.y0, z: b.z0 },
        { y: b.y1, z: b.z1 },
        { y: b.y2, z: b.z2 },
        { y: b.y3, z: b.z3 },
      ].sort((a, b) => a.y - b.y)

      const spans = []
      for (let k = 0; k < ribbons.length - 1; k++) {
        const spanH = ribbons[k + 1].y - ribbons[k].y
        if (spanH >= 0.010) {
          spans.push({
            yLow: ribbons[k].y,
            yHigh: ribbons[k + 1].y,
            height: spanH,
            zCenter: 0.5 * (ribbons[k].z + ribbons[k + 1].z),
          })
        }
      }
      if (spans.length === 0) {
        spans.push({
          yLow: b.envMinY,
          yHigh: b.envMaxY,
          height: b.envHeight,
          zCenter: b.envCenterZ,
        })
      }

      const numStreams = (b.envHeight > 0.20 && spans.length > 1) ? 2 : 1
      for (let sIdx = 0; sIdx < numStreams; sIdx++) {
        const uJitter = (z1Slice === 0 && sIdx === 0) ? 0.0 : (prng() - 0.5) * du * 0.20
        const u = THREE.MathUtils.clamp(z1U + uJitter, 0.108, 0.240)

        let y, z, w_depth, v_rel
        if (sIdx === 0) {
          // Stream 0: Primary conduit meandering organically across almond gap
          const yMargin = Math.max(0.003, b.gapHeight * 0.12)
          const availableH = Math.max(0.001, b.gapHeight - 2.0 * yMargin)
          const meander = 0.5 + 0.30 * Math.sin(z1Slice * 0.35 + 0.8) + (prng() - 0.5) * 0.10
          const frac = THREE.MathUtils.clamp(meander, 0.08, 0.92)
          y = b.yLower + yMargin + frac * availableH
          w_depth = -0.18 + (prng() - 0.5) * 0.14
          const rz = Math.max(0.005, b.Rz)
          z = b.gapCenterZ + w_depth * Math.max(0.015, rz * 0.80)
          v_rel = THREE.MathUtils.clamp((y - b.gapCenterY) / Math.max(0.005, b.Ry), -0.92, 0.92)
        } else {
          // Stream 1: Secondary sub-pocket threading across outer ribbon span
          const sortedByHeight = [...spans].sort((a, b) => b.height - a.height)
          const secondarySpan = sortedByHeight.length > 1 ? sortedByHeight[1] : sortedByHeight[0]
          const yMargin = Math.max(0.003, secondarySpan.height * 0.12)
          const availableH = Math.max(0.001, secondarySpan.height - 2.0 * yMargin)
          const meander = 0.5 - 0.30 * Math.sin(z1Slice * 0.35 + 0.8) + (prng() - 0.5) * 0.10
          const frac = THREE.MathUtils.clamp(meander, 0.08, 0.92)
          y = secondarySpan.yLow + yMargin + frac * availableH
          w_depth = -0.30 + (prng() - 0.5) * 0.14
          const rz = Math.max(0.005, b.envRz)
          z = b.envCenterZ + w_depth * Math.max(0.015, rz * 0.80)
          v_rel = THREE.MathUtils.clamp((y - b.envCenterY) / Math.max(0.005, b.envRy), -0.92, 0.92)
        }

        const n = createNode(u, y, z, v_rel, w_depth, true)
        if (n) {
          n.sliceIdx = z1Slice
          n.streamIdx = sIdx
          n.isZone1 = true
          nodes.push(n)
        }
      }
    }

    z1U += du
    z1Slice++
  }

  // Zone 2: Chamber 1 & secondary sub-pockets (u in [0.21, 0.52]) - Doubled density (Gap 2 & Gap 3)
  const c1Start = nodes.length
  const c1Target = 460
  for (let att = 0; att < 35000 && (nodes.length - c1Start) < c1Target; att++) {
    const u = 0.21 + prng() * 0.31
    const b = getAlmondPocketBounds(u, H, config)
    if (b.envHeight < 0.024) continue

    // Scale candidate probability with local envelope height h(u)
    if (prng() > (b.envHeight / 0.65) * 0.75 + 0.25) continue

    const preferSecondary = (att % 3 === 0)
    const pt = samplePointInPocket(u, preferSecondary)
    if (!pt) continue

    const x = sign * 10.0 * u
    const isRim = Math.abs(pt.v_rel) > 0.72
    // Smaller micro-cells near margins |v_rel| > 0.72 (Gap 5)
    let minDist = isRim
      ? (0.022 + 0.010 * (1.0 - Math.min(1.0, b.envHeight / 0.65)))
      : (0.030 + 0.014 * (1.0 - Math.min(1.0, b.envHeight / 0.65)))
    if (b.envHeight < 0.28) {
      minDist = Math.min(minDist, 0.18 * b.envHeight)
    }

    let tooClose = false
    for (let i = c1Start; i < nodes.length; i++) {
      const n = nodes[i]
      if (Math.abs(x - n.pos.x) > minDist * 1.5) continue
      if (Math.hypot(x - n.pos.x, pt.y - n.pos.y) < minDist) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue

    const n = createNode(u, pt.y, pt.z, pt.v_rel, pt.w_depth)
    if (n) nodes.push(n)
  }

  // Zone 3: Crossing throat micro-clusters & continuous multi-conduit threading (u in [0.420, 0.720]) (Gap 3)
  // Balanced node count: 60-120 nodes total, organic y sampling across all spans, jittered u
  let z3U = 0.420
  let z3Slice = 0

  while (z3U <= 0.720) {
    const b = getAlmondPocketBounds(z3U, H, config)
    const du = Math.max(0.0040, Math.min(0.0075, 0.18 * b.envHeight / 10.0))

    if (b.envHeight >= 0.024) {
      // Identify open sub-pocket spans across all 4 ribbons
      const ribbons = [
        { y: b.y0, z: b.z0 },
        { y: b.y1, z: b.z1 },
        { y: b.y2, z: b.z2 },
        { y: b.y3, z: b.z3 },
      ].sort((a, b) => a.y - b.y)

      const spans = []
      for (let k = 0; k < ribbons.length - 1; k++) {
        const spanH = ribbons[k + 1].y - ribbons[k].y
        if (spanH >= 0.012) {
          spans.push({
            yLow: ribbons[k].y,
            yHigh: ribbons[k + 1].y,
            height: spanH,
            zCenter: 0.5 * (ribbons[k].z + ribbons[k + 1].z),
          })
        }
      }
      if (spans.length === 0) {
        spans.push({
          yLow: b.envMinY,
          yHigh: b.envMaxY,
          height: b.envHeight,
          zCenter: b.envCenterZ,
        })
      }

      const numStreams = (b.envHeight > 0.18 && spans.length > 1) ? 2 : 1
      for (let sIdx = 0; sIdx < numStreams; sIdx++) {
        const uJitter = (prng() - 0.5) * du * 0.20
        const u = THREE.MathUtils.clamp(z3U + uJitter, 0.420, 0.720)

        let y, z, w_depth, v_rel
        if (sIdx === 0) {
          // Stream 0: Primary conduit gliding in 3D negative space between Ribbon 0 and Ribbon 1
          const midY = 0.5 * (b.y0 + b.y1)
          const midZ = 0.5 * (b.z0 + b.z1)
          const sep3D = Math.hypot(b.y0 - b.y1, b.z0 - b.z1)
          const safeRad = Math.min(0.040, sep3D * 0.22)

          // Organic meander across 3D corridor
          const meanderY = Math.sin(z3Slice * 0.32 + 1.5) * 0.60 + (prng() - 0.5) * 0.15
          const meanderZ = Math.cos(z3Slice * 0.28 + 0.5) * 0.60 + (prng() - 0.5) * 0.15
          y = midY + meanderY * safeRad
          z = midZ + meanderZ * safeRad
          w_depth = -0.18 + (prng() - 0.5) * 0.14

          const isOutsidePrimary = y > b.yUpper || y < b.yLower
          const centerY = isOutsidePrimary ? b.envCenterY : b.gapCenterY
          const ry = isOutsidePrimary ? b.envRy : Math.max(0.005, b.Ry)
          v_rel = THREE.MathUtils.clamp((y - centerY) / ry, -0.92, 0.92)
        } else {
          // Stream 1: Secondary sub-pocket threading across outer ribbons
          const secondarySpans = spans.filter(s => s !== spans[0])
          const chosenSpan = secondarySpans.length > 0
            ? secondarySpans[Math.floor(prng() * secondarySpans.length)]
            : spans[spans.length - 1]
          const yMargin = Math.max(0.004, chosenSpan.height * 0.12)
          const availableH = Math.max(0.002, chosenSpan.height - 2.0 * yMargin)
          const meander = 0.5 - 0.30 * Math.sin(z3Slice * 0.32 + 1.5) + (prng() - 0.5) * 0.12
          const frac = THREE.MathUtils.clamp(meander, 0.10, 0.90)
          y = chosenSpan.yLow + yMargin + frac * availableH
          w_depth = -0.30 + (prng() - 0.5) * 0.14
          const rz = Math.max(0.005, b.envRz)
          z = b.envCenterZ + w_depth * Math.max(0.015, rz * 0.80)

          const isOutsidePrimary = y > b.yUpper || y < b.yLower
          const centerY = isOutsidePrimary ? b.envCenterY : b.gapCenterY
          const ry = isOutsidePrimary ? b.envRy : Math.max(0.005, b.Ry)
          v_rel = THREE.MathUtils.clamp((y - centerY) / ry, -0.92, 0.92)
        }

        // isThroat = true ensures fine dim/micro twinkling nodes (zero giant hubs)
        const n = createNode(u, y, z, v_rel, w_depth, true)
        if (n) {
          n.sliceIdx = z3Slice
          n.streamIdx = sIdx
          n.isZone3 = true
          nodes.push(n)
        }
      }
    }

    z3U += du
    z3Slice++
  }

  // Zone 4: Chamber 2, wide outer cavities & sub-pockets (u in [0.68, 0.95]) - Doubled density (Gap 2 & Gap 3)
  const c2Start = nodes.length
  const c2Target = 560
  for (let att = 0; att < 45000 && (nodes.length - c2Start) < c2Target; att++) {
    const u = 0.68 + prng() * 0.27
    const b = getAlmondPocketBounds(u, H, config)
    if (b.envHeight < 0.024) continue

    // Scale candidate probability with local envelope height h(u)
    if (prng() > (b.envHeight / 0.75) * 0.78 + 0.22) continue

    const preferSecondary = (att % 2 === 0)
    const pt = samplePointInPocket(u, preferSecondary)
    if (!pt) continue

    const x = sign * 10.0 * u
    const isRim = Math.abs(pt.v_rel) > 0.72
    // Smaller micro-cells near margins |v_rel| > 0.72 (Gap 5)
    let minDist = isRim
      ? (0.020 + 0.012 * (1.0 - Math.min(1.0, b.envHeight / 0.75)))
      : (0.030 + 0.014 * (1.0 - Math.min(1.0, b.envHeight / 0.75)))
    if (b.envHeight < 0.28) {
      minDist = Math.min(minDist, 0.18 * b.envHeight)
    }

    let tooClose = false
    for (let i = c2Start; i < nodes.length; i++) {
      const n = nodes[i]
      if (Math.abs(x - n.pos.x) > minDist * 1.5) continue
      if (Math.hypot(x - n.pos.x, pt.y - n.pos.y) < minDist) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue

    const n = createNode(u, pt.y, pt.z, pt.v_rel, pt.w_depth)
    if (n) nodes.push(n)
  }

  // 3. Crisp 3-Layer Edge Construction
  // Shortens max edge length to <= 0.26 * h(u) to convert rigid struts into whisper-thin gossamer connective tissue (Gap 1)
  const edges = []
  const edgeSet = new Set()
  const adjacency = new Map()
  nodes.forEach((_, idx) => adjacency.set(idx, []))

  function addEdge(i, j, dist, isInterLayer = false) {
    const key = Math.min(i, j) + '-' + Math.max(i, j)
    if (edgeSet.has(key)) return false
    edgeSet.add(key)
    edges.push({ i, j, dist, isInterLayer })
    nodes[i].connectedCount++
    nodes[j].connectedCount++
    adjacency.get(i).push(j)
    adjacency.get(j).push(i)
    return true
  }

  // 3a. Intra-layer Delaunay/k-NN connections
  // Max edge length strictly <= 0.26 * h(u) in 3D Euclidean space (Gap 1), with smaller micro-cells near |v_rel| > 0.72 (Gap 5)
  const depthLayers = ['fg', 'mid', 'bg']
  for (const lyr of depthLayers) {
    const layerIndices = []
    nodes.forEach((n, idx) => {
      if (n.depthTier === lyr) layerIndices.push(idx)
    })

    const targetK = lyr === 'mid' ? 4 : (lyr === 'fg' ? 4 : 3)

    for (let a = 0; a < layerIndices.length; a++) {
      const i = layerIndices[a]
      const nA = nodes[i]
      const candidates = []

      for (let b = 0; b < layerIndices.length; b++) {
        if (a === b) continue
        const j = layerIndices[b]
        const nB = nodes[j]

        if (Math.abs(nA.u - nB.u) > 0.080) continue

        const dist3D = nA.pos.distanceTo(nB.pos)
        const localH = Math.max(nA.hu, nB.hu)

        // Shortening max edge length strictly <= 0.26 * h(u) (Gap 1)
        let maxEdgeDist = 0.26 * localH

        // Smaller micro-cells near |v_rel| > 0.72 to eliminate jagged spiky triangles along rims (Gap 5)
        if (Math.abs(nA.v_rel) > 0.72 || Math.abs(nB.v_rel) > 0.72) {
          maxEdgeDist = Math.min(maxEdgeDist, 0.15 * localH)
        }

        if (dist3D < 0.008 || dist3D > maxEdgeDist) continue

        // Avoid tall vertical struts: reject candidate if steep vertical strut spanning > 14% of chamber height
        const dx = Math.abs(nA.pos.x - nB.pos.x)
        const dy = Math.abs(nA.pos.y - nB.pos.y)
        if (dist3D > 0.14 * Math.min(nA.hu, nB.hu) && dy > 1.4 * dx && (dy / dist3D) > 0.80) continue

        if (doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) continue

        candidates.push({ j, dist3D })
      }

      candidates.sort((c1, c2) => c1.dist3D - c2.dist3D)

      for (const cand of candidates) {
        if (nA.connectedCount >= targetK) break
        const nB = nodes[cand.j]
        if (nB.connectedCount >= targetK + 2) continue

        const key = Math.min(i, cand.j) + '-' + Math.max(i, cand.j)
        if (edgeSet.has(key)) continue

        // Planar crossing check within layer
        let crosses = false
        for (const e of edges) {
          if (e.i === i || e.j === i || e.i === cand.j || e.j === cand.j) continue
          const eA = nodes[e.i]
          const eB = nodes[e.j]
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

    // 3b. Triangular face completion within layer (delicate gossamer webbing)
    for (let a = 0; a < layerIndices.length; a++) {
      const i = layerIndices[a]
      const neighbors = (adjacency.get(i) || []).filter(nb => nodes[nb].depthTier === lyr)
      if (neighbors.length < 2) continue

      for (let p1 = 0; p1 < neighbors.length; p1++) {
        for (let p2 = p1 + 1; p2 < neighbors.length; p2++) {
          const j = neighbors[p1]
          const k = neighbors[p2]
          const nJ = nodes[j]
          const nK = nodes[k]
          if (nJ.connectedCount >= targetK + 1 || nK.connectedCount >= targetK + 1) continue

          const dist3D = nJ.pos.distanceTo(nK.pos)
          const localH = Math.max(nJ.hu, nK.hu)

          // Shortening max edge length strictly <= 0.26 * h(u) (Gap 1)
          let maxEdgeDist = 0.26 * localH
          if (Math.abs(nJ.v_rel) > 0.72 || Math.abs(nK.v_rel) > 0.72) {
            maxEdgeDist = Math.min(maxEdgeDist, 0.15 * localH)
          }

          if (dist3D > maxEdgeDist || dist3D < 0.008) continue
          if (Math.abs(nJ.u - nK.u) > 0.080) continue

          // Avoid tall vertical struts
          const dx = Math.abs(nJ.pos.x - nK.pos.x)
          const dy = Math.abs(nJ.pos.y - nK.pos.y)
          if (dist3D > 0.14 * Math.min(nJ.hu, nK.hu) && dy > 1.4 * dx && (dy / dist3D) > 0.80) continue

          if (doesSegmentIntersectRibbons(nJ.pos, nJ.u, nK.pos, nK.u, H, config)) continue

          let crosses = false
          for (const e of edges) {
            if (e.i === j || e.j === j || e.i === k || e.j === k) continue
            const eA = nodes[e.i]
            const eB = nodes[e.j]
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

  // 3c. Inter-layer truss connections (controlled depth tie: FG -> MID, MID -> BG)
  for (let i = 0; i < nodes.length; i++) {
    const nA = nodes[i]
    if (nA.depthTier !== 'fg') continue
    const bestMid = []

    for (let j = 0; j < nodes.length; j++) {
      const nB = nodes[j]
      if (nB.depthTier !== 'mid') continue
      if (Math.abs(nA.u - nB.u) > 0.060) continue
      const dist3D = nA.pos.distanceTo(nB.pos)
      const maxEdgeDist = 0.26 * Math.max(nA.hu, nB.hu)
      if (dist3D > maxEdgeDist || dist3D < 0.008) continue
      if (doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) continue
      bestMid.push({ j, dist3D })
    }
    bestMid.sort((a, b) => a.dist3D - b.dist3D)
    for (let m = 0; m < Math.min(1, bestMid.length); m++) {
      addEdge(i, bestMid[m].j, bestMid[m].dist3D, true)
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    const nA = nodes[i]
    if (nA.depthTier !== 'bg') continue
    const bestMid = []

    for (let j = 0; j < nodes.length; j++) {
      const nB = nodes[j]
      if (nB.depthTier !== 'mid') continue
      if (Math.abs(nA.u - nB.u) > 0.060) continue
      const dist3D = nA.pos.distanceTo(nB.pos)
      const maxEdgeDist = 0.26 * Math.max(nA.hu, nB.hu)
      if (dist3D > maxEdgeDist || dist3D < 0.008) continue
      if (doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) continue
      bestMid.push({ j, dist3D })
    }
    bestMid.sort((a, b) => a.dist3D - b.dist3D)
    for (let m = 0; m < Math.min(1, bestMid.length); m++) {
      addEdge(i, bestMid[m].j, bestMid[m].dist3D, true)
    }
  }

  // 4. Connectivity Guarantee: Zero floating disconnected nodes (degree >= 2) & Crossover Throat Bridging
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < nodes.length; i++) {
      const nA = nodes[i]
      while (nA.connectedCount < 2) {
        let bestJ = -1
        let bestDist = Infinity
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue
          const nB = nodes[j]
          const key = Math.min(i, j) + '-' + Math.max(i, j)
          if (edgeSet.has(key)) continue
          if (Math.abs(nA.u - nB.u) > 0.075) continue
          const dist3D = nA.pos.distanceTo(nB.pos)
          const localH = Math.max(nA.hu, nB.hu)
          const maxEdgeDist = 0.26 * localH
          if (dist3D < bestDist && dist3D <= maxEdgeDist && !doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) {
            bestDist = dist3D
            bestJ = j
          }
        }
        if (bestJ !== -1) {
          addEdge(i, bestJ, bestDist)
        } else {
          break
        }
      }
    }
  }

  // Continuous Conduit Bridging: smoothly connect nodes along conduit slices (Gap 3)
  for (let i = 0; i < nodes.length; i++) {
    const nA = nodes[i]
    if (nA.sliceIdx === undefined) continue
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue
      const nB = nodes[j]
      if (nB.sliceIdx === undefined) continue
      if ((nA.isZone1 && !nB.isZone1) || (nA.isZone3 && !nB.isZone3)) continue

      const sliceDiff = Math.abs(nA.sliceIdx - nB.sliceIdx)
      if (sliceDiff <= 2) {
        const dist3D = nA.pos.distanceTo(nB.pos)
        const localH = Math.max(nA.hu, nB.hu)
        if (dist3D <= 0.26 * localH && !doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) {
          addEdge(i, j, dist3D)
        }
      }
    }
  }

  // Conduit Transition Bridging: Bridge conduit ends seamlessly into open chamber networks
  // 1. Zone 1 -> Zone 2 (u in [0.17, 0.26])
  for (let i = 0; i < nodes.length; i++) {
    const nA = nodes[i]
    if (!nA.isZone1 || nA.u < 0.17) continue
    const candidates = []
    for (let j = 0; j < nodes.length; j++) {
      const nB = nodes[j]
      if (nB.isZone1 || nB.isZone3) continue
      if (Math.abs(nA.u - nB.u) > 0.055) continue
      const dist3D = nA.pos.distanceTo(nB.pos)
      const localH = Math.max(nA.hu, nB.hu)
      if (dist3D <= 0.26 * localH && !doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) {
        candidates.push({ j, dist3D })
      }
    }
    candidates.sort((c1, c2) => c1.dist3D - c2.dist3D)
    for (let c = 0; c < Math.min(3, candidates.length); c++) {
      addEdge(i, candidates[c].j, candidates[c].dist3D)
    }
  }

  // 2. Zone 2 -> Zone 3 (u in [0.42, 0.52])
  for (let i = 0; i < nodes.length; i++) {
    const nA = nodes[i]
    if (!nA.isZone3 || nA.u > 0.52) continue
    const candidates = []
    for (let j = 0; j < nodes.length; j++) {
      const nB = nodes[j]
      if (nB.isZone1 || nB.isZone3) continue
      if (Math.abs(nA.u - nB.u) > 0.055) continue
      const dist3D = nA.pos.distanceTo(nB.pos)
      const localH = Math.max(nA.hu, nB.hu)
      if (dist3D <= 0.26 * localH && !doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) {
        candidates.push({ j, dist3D })
      }
    }
    candidates.sort((c1, c2) => c1.dist3D - c2.dist3D)
    for (let c = 0; c < Math.min(3, candidates.length); c++) {
      addEdge(i, candidates[c].j, candidates[c].dist3D)
    }
  }

  // 3. Zone 3 -> Zone 4 (u in [0.64, 0.74])
  for (let i = 0; i < nodes.length; i++) {
    const nA = nodes[i]
    if (!nA.isZone3 || nA.u < 0.64) continue
    const candidates = []
    for (let j = 0; j < nodes.length; j++) {
      const nB = nodes[j]
      if (nB.isZone1 || nB.isZone3) continue
      if (Math.abs(nA.u - nB.u) > 0.055) continue
      const dist3D = nA.pos.distanceTo(nB.pos)
      const localH = Math.max(nA.hu, nB.hu)
      if (dist3D <= 0.26 * localH && !doesSegmentIntersectRibbons(nA.pos, nA.u, nB.pos, nB.u, H, config)) {
        candidates.push({ j, dist3D })
      }
    }
    candidates.sort((c1, c2) => c1.dist3D - c2.dist3D)
    for (let c = 0; c < Math.min(3, candidates.length); c++) {
      addEdge(i, candidates[c].j, candidates[c].dist3D)
    }
  }

  // Pairwise Component Unification Pass: merge any isolated components into a single spanning graph
  function getComponents() {
    const visited = new Uint8Array(nodes.length)
    const comps = []
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].connectedCount === 0 || visited[i]) continue
      const comp = []
      const queue = [i]
      visited[i] = 1
      while (queue.length > 0) {
        const curr = queue.shift()
        comp.push(curr)
        const nbrs = adjacency.get(curr) || []
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

  while (true) {
    const comps = getComponents()
    if (comps.length <= 1) break

    let bestI = -1, bestJ = -1, bestD = Infinity

    for (let c1 = 0; c1 < comps.length; c1++) {
      for (let c2 = c1 + 1; c2 < comps.length; c2++) {
        const compA = comps[c1]
        const compB = comps[c2]

        for (let oi = 0; oi < compA.length; oi++) {
          const i = compA[oi]
          const nA = nodes[i]
          for (let mi = 0; mi < compB.length; mi++) {
            const j = compB[mi]
            const nB = nodes[j]
            if (Math.abs(nA.u - nB.u) > 0.080) continue
            const dist3D = nA.pos.distanceTo(nB.pos)
            const localH = Math.max(nA.hu, nB.hu)

            if (dist3D <= 0.26 * localH && dist3D < bestD) {
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
      addEdge(bestI, bestJ, bestD)
    } else {
      break
    }
  }

  // Ensure 100% single connected component: retain only the spanning main network
  const finalComps = getComponents()
  if (finalComps.length > 0) {
    const mainSet = new Set(finalComps[0])
    const unifiedEdges = []
    for (const e of edges) {
      if (mainSet.has(e.i) && mainSet.has(e.j)) {
        unifiedEdges.push(e)
      } else {
        nodes[e.i].connectedCount = Math.max(0, nodes[e.i].connectedCount - 1)
        nodes[e.j].connectedCount = Math.max(0, nodes[e.j].connectedCount - 1)
      }
    }
    edges.length = 0
    edges.push(...unifiedEdges)
  }

  const visibleNodes = nodes.filter((n) => n.connectedCount > 0)

  // 5. Wave Margin Tethering:
  // Outer boundary nodes (|v_rel| >= 0.65) tether cleanly to nearest invisible margin anchors
  const tetherEdges = []
  for (const node of visibleNodes) {
    if (Math.abs(node.v_rel) >= 0.65) {
      let bestAnchor = null
      let bestDist = Infinity

      for (const anc of anchors) {
        if (Math.abs(node.u - anc.u) > 0.075) continue

        const isUpperAnchor = anc.id.includes('upper')
        if (node.v_rel > 0 && !isUpperAnchor) continue
        if (node.v_rel < 0 && isUpperAnchor) continue

        const dist = node.pos.distanceTo(anc.pos)
        const localH = Math.min(node.hu, anc.hu)
        if (dist <= 0.26 * localH && dist < bestDist) {
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

  // 6. Build Lines BufferGeometry (Internal Constellation Edges + Wave Margin Tethers)
  // Dropping line opacity by ~45% (BG 0.05–0.10, MID 0.14–0.24, FG 0.28–0.40) so starlight nodes clearly lead hierarchy (Gap 1)
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

  // Internal edges with strictly calibrated 3-layer opacities: BG 0.05–0.10, MID 0.14–0.24, FG 0.28–0.40 (Gap 1)
  function getTierAlpha(node) {
    if (node.depthTier === 'fg') {
      return (node.isHighlight > 0.5) ? 0.36 : (0.30 + prng() * 0.08)
    }
    if (node.depthTier === 'bg') {
      return 0.055 + prng() * 0.035
    }
    return 0.15 + prng() * 0.07
  }

  edges.forEach(({ i, j, isInterLayer }) => {
    const nA = nodes[i]
    const nB = nodes[j]

    let alphaBaseA = getTierAlpha(nA)
    let alphaBaseB = getTierAlpha(nB)

    // Throat attenuation for faint sub-webbing (Gap 3)
    if (nA.isThroat || nB.isThroat) {
      alphaBaseA *= 0.70
      alphaBaseB *= 0.70
    }

    if (isInterLayer) {
      // Gentle depth tie modulation for inter-layer truss
      alphaBaseA = Math.min(alphaBaseA, 0.20)
      alphaBaseB = Math.min(alphaBaseB, 0.20)
      if (nA.depthTier === 'bg') alphaBaseA = Math.min(alphaBaseA, 0.08)
      if (nB.depthTier === 'bg') alphaBaseB = Math.min(alphaBaseB, 0.08)
    }

    // Boundary feathering smoothly to 0 at margins (Gap 5)
    const featherA = 1.0 - THREE.MathUtils.smoothstep(Math.abs(nA.v_rel), 0.72, 1.0)
    const featherB = 1.0 - THREE.MathUtils.smoothstep(Math.abs(nB.v_rel), 0.72, 1.0)

    const aA = alphaBaseA * featherA * THREE.MathUtils.smoothstep(nA.hu, 0.020, 0.09)
    const aB = alphaBaseB * featherB * THREE.MathUtils.smoothstep(nB.hu, 0.020, 0.09)
    const cA = nA.lineColor || nA.color
    const cB = nB.lineColor || nB.color

    addLineSegment(
      nA.pos, nA.u, nA.weight, nA.layer, aA, nA.relativeCoord, cA,
      nB.pos, nB.u, nB.weight, nB.layer, aB, nB.relativeCoord, cB
    )
  })

  // Margin tether edges: smoothstep fade to 0 at anchors, subtle electric-indigo tint (#5e48ff) (Gap 5)
  const defaultTetherColor = new THREE.Color('#104fe0')
  const violetTetherColor = new THREE.Color('#5e48ff')

  tetherEdges.forEach(({ node, anchor }) => {
    const tetherFeather = 1.0 - THREE.MathUtils.smoothstep(Math.abs(node.v_rel), 0.68, 1.0)
    const aNode = THREE.MathUtils.clamp((node.lineAlpha || 0.16) * 0.40 * tetherFeather, 0.0, 0.12)
    const aAnchor = 0.0 // feathers cleanly to zero at margin anchor

    // Proximity to violet strand (heroY2)
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

  // 7. Build Points BufferGeometry (Multi-Scale Starlight Field: micro-nodes + ice-white hubs)
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

  // 8. Equalized Volumetric Nebula Glow across ALL chambers (#061a66 to #0e52e8) (Gap 4)
  // Scaling particle count and soft falloff proportionally to chamber height h(u)
  // Wide far-left and far-right cavities glow evenly, while capping additive buildup in mid-inner chambers
  const hazePositions = []
  const hazeBasePositions = []
  const hazeUs = []
  const hazeWeights = []
  const hazeSizes = []
  const hazeAlphas = []
  const hazeColors = []
  const hazeRelativeCoords = []

  const sapphireDark = new THREE.Color('#061a66')
  const electricBlue = new THREE.Color('#0e52e8')
  const cobaltMid = new THREE.Color('#0a3cd0')

  // Stratified volumetric haze distribution across all chambers:
  // - Inner Chamber (u in [0.10, 0.52]): ~900 particles with capped additive buildup
  // - Crossing Throat (u in [0.49, 0.67]): ~450 particles connecting the glow
  // - Outer Chamber (u in [0.65, 0.94]): ~1,800 broad velvety particles
  const hazeZones = [
    { uMin: 0.10, uMax: 0.52, count: 900, isInner: true },
    { uMin: 0.49, uMax: 0.67, count: 450, isThroat: true },
    { uMin: 0.65, uMax: 0.94, count: 1800, isOuter: true },
  ]

  for (const zone of hazeZones) {
    for (let p = 0; p < zone.count; p++) {
      const u = zone.uMin + prng() * (zone.uMax - zone.uMin)
      const b = getAlmondPocketBounds(u, H, config)
      if (b.envHeight < 0.024) continue

      // Height acceptance filter
      if (prng() > (b.envHeight / 0.70) * 0.75 + 0.25) continue

      // Elliptical core sampling inside local envelope
      const rCore = Math.sqrt(prng()) * 0.85
      const theta = prng() * Math.PI * 2.0
      const v_rel = rCore * Math.sin(theta)
      // Recessed depth: background & mid layers [-0.85, 0.20]
      const w_depth = -0.20 - prng() * 0.65
      const r_norm = Math.sqrt(v_rel * v_rel + w_depth * w_depth)
      if (r_norm >= 0.88) continue

      const y = b.envCenterY + v_rel * b.envRy
      const z = b.envCenterZ + w_depth * b.envRz
      const x = sign * 10.0 * u
      const pos = new THREE.Vector3(x, y, z)

      // Clearance check to ensure no ribbon core collision
      const dHero = getMinFilamentClearance(y, z, b)
      if (dHero < 0.009) continue

      // Soft boundary falloff and tapers
      const boundaryFade = Math.max(0.0, Math.pow(1.0 - Math.pow(r_norm / 0.88, 2.0), 1.5))
      const globeTaper = THREE.MathUtils.smoothstep(u, 0.08, 0.18)
      const outerTaper = 1.0 - THREE.MathUtils.smoothstep(u, 0.92, 0.96)
      const pinchTaper = THREE.MathUtils.smoothstep(b.envHeight, 0.022, 0.08)
      const weight = computeConstraintWeight(u)

      // Equalize volumetric luminance:
      // In mid-inner chambers: cap additive buildup (alpha ~0.009-0.016) to prevent bright clumping (Gap 4)
      // In wide outer cavities: higher individual particle alpha (~0.038-0.062) and larger soft radius to match luminance evenly (Gap 4)
      let baseAlpha
      let baseSize
      if (zone.isInner) {
        baseAlpha = 0.009 + prng() * 0.007
        baseSize = Math.max(30.0, Math.min(80.0, b.envHeight * 105.0 + prng() * 15.0))
      } else if (zone.isOuter) {
        baseAlpha = 0.038 + prng() * 0.024
        baseSize = Math.max(55.0, Math.min(145.0, b.envHeight * 165.0 + prng() * 25.0))
      } else {
        baseAlpha = 0.016 + prng() * 0.012
        baseSize = Math.max(25.0, Math.min(70.0, b.envHeight * 110.0 + prng() * 12.0))
      }

      const alpha = baseAlpha * boundaryFade * globeTaper * outerTaper * pinchTaper * weight

      // Color: velvety deep sapphire (#061a66) to electric blue (#0e52e8)
      const colRatio = prng()
      let col
      if (colRatio < 0.50) {
        col = sapphireDark.clone().lerp(cobaltMid, prng())
      } else {
        col = cobaltMid.clone().lerp(electricBlue, prng())
      }

      // Subtle violet tint if adjacent to Ribbon 2
      const dHero2 = Math.hypot(y - b.y2, z - b.z2)
      if (dHero2 < 0.18) {
        col.lerp(new THREE.Color('#4e36e2'), 0.35)
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
  }

  // Soft hub micro-glows for foreground ice-white hubs (tight exponential micro-glow, never oversized blurry bokeh)
  const focalHubs = visibleNodes.filter(n => n.depthTier === 'fg' && n.isHighlight > 0.5)
  focalHubs.forEach(hub => {
    const numGlows = 2 + Math.floor(prng() * 2)
    for (let g = 0; g < numGlows; g++) {
      const uOffset = (prng() - 0.5) * 0.008
      const u = Math.max(0.12, Math.min(0.94, hub.u + uOffset))
      const b = getAlmondPocketBounds(u, H, config)
      if (b.envHeight < 0.028) continue

      const v_rel = Math.max(-0.75, Math.min(0.75, hub.v_rel + (prng() - 0.5) * 0.06))
      const w_depth = Math.max(-0.15, Math.min(0.75, hub.w_depth + (prng() - 0.5) * 0.08))
      const r_norm = Math.sqrt(v_rel * v_rel + w_depth * w_depth)
      if (r_norm >= 0.84) continue

      const y = b.envCenterY + v_rel * b.envRy
      const z = b.envCenterZ + w_depth * b.envRz
      const x = sign * 10.0 * u
      const pos = new THREE.Vector3(x, y, z)

      const boundaryFade = Math.max(0.0, 1.0 - Math.pow(r_norm / 0.84, 2.0))
      const weight = computeConstraintWeight(u)
      const alpha = (0.026 + prng() * 0.018) * boundaryFade * weight
      const size = 16.0 + prng() * 12.0 // Tight micro-glow (16-28px)
      const col = cobaltMid.clone().lerp(electricBlue, 0.4 + prng() * 0.5)

      hazePositions.push(pos.x, pos.y, pos.z)
      hazeBasePositions.push(pos.x, pos.y, pos.z)
      hazeUs.push(u)
      hazeWeights.push(weight)
      hazeSizes.push(size)
      hazeAlphas.push(alpha)
      hazeColors.push(col.r, col.g, col.b)
      hazeRelativeCoords.push(u, v_rel, w_depth, r_norm)
    }
  })

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
