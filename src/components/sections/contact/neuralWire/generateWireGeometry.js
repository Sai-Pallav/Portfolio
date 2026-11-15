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
 * Whisper-faint inner tip fade near the globe gap:
 * pow(smoothstep(0.0, 0.28, u), 2.2)
 * Strictly preserves the soft, dark inner tip near the globe.
 */
export function computeVertexAlpha(u) {
  const s = THREE.MathUtils.smoothstep(u, 0.0, 0.28)
  return Math.pow(s, 2.2)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SMOOTH ANALYTICAL HERO WAVES (EXACT FORMULA LOCK)
// Continuous harmonic functions with N = 200 points per wave.
// Zero sparse 5-point CatmullRom keyframes that kink at the apex!
// ─────────────────────────────────────────────────────────────────────────────

function wingSweep(u, H) {
  return 0.28 * H * Math.pow(u, 2.0)
}

function env(u, H) {
  return H * Math.pow(u, 0.85) * THREE.MathUtils.smoothstep(u, 0.0, 0.18)
}

// Hero Wave 0 (Upper Almond Arch -> Pinch at u=0.58 -> Lower Outer Arc, Cyan-White Core)
function heroY0(u, H) {
  return wingSweep(u, H) + env(u, H) * (0.52 * Math.sin(u * Math.PI * 1.72) + 0.12 * Math.sin(u * Math.PI * 3.4))
}

// Hero Wave 1 (Lower Almond Arch -> Pinch at u=0.58 -> Upper Outer Wing, Cyan-White Core)
function heroY1(u, H) {
  return wingSweep(u, H) + env(u, H) * (-0.50 * Math.sin(u * Math.PI * 1.68 + 0.08) + 0.14 * Math.cos(u * Math.PI * 2.9))
}

// Hero Wave 2 (Violet/Magenta Accent Wave #b83dff, Threads Center -> Lower Outer Sweep)
function heroY2(u, H) {
  return wingSweep(u, H) + env(u, H) * (0.18 * Math.sin(u * Math.PI * 2.2 - 0.5) - 0.42 * Math.pow(u, 1.4) * Math.sin(u * Math.PI * 1.35))
}

// Hero Wave 3 (Secondary Inner-to-Outer Counter-Braid, Electric Blue-Cyan)
function heroY3(u, H) {
  return wingSweep(u, H) + env(u, H) * (-0.24 * Math.sin(u * Math.PI * 2.6 + 0.9) + 0.30 * Math.pow(u, 1.6))
}

// Smooth Z-depth oscillation
function heroZ(i, u, H) {
  return 0.25 * H * Math.cos(u * Math.PI * 2.0 + i * 1.3)
}

const HERO_FUNCS = [heroY0, heroY1, heroY2, heroY3]

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
  constructor() {
    this.positions = []
    this.basePositions = []
    this.uParams = []
    this.wireIds = []
    this.weights = []
    this.alphas = []
    this.colors = []
  }

  addSegment(p1, u1, wireId1, w1, p2, u2, wireId2, w2, a1 = null, a2 = null, c1 = null, c2 = null) {
    const alpha1 = a1 !== null ? a1 : computeVertexAlpha(u1)
    const alpha2 = a2 !== null ? a2 : computeVertexAlpha(u2)

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
// ─────────────────────────────────────────────────────────────────────────────

function generateCompanionSilkStrands(side, H) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const N_SILK = 160
  const builder = new ParameterizedLineBuilder()

  for (let i = 0; i < 4; i++) {
    for (let k = 0; k < 11; k++) {
      const spreadSign = (k % 2 === 0 ? 1.0 : -1.0)
      const radialSpread = (0.03 + 0.13 * (k / 10.0)) * spreadSign
      const freq_k = 1.3 + (k % 4) * 0.45
      const phase_k = (k * 2.0 * Math.PI) / 11.0 + i * 0.8
      const strandAlpha = 0.16 + 0.18 * ((k % 5) / 4.0)

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
        const u = s / (N_SILK - 1)
        const x = sign * 10.0 * u
        const e = env(u, H)
        const y = HERO_FUNCS[i](u, H) + e * (radialSpread * Math.sin(u * Math.PI * freq_k + phase_k))
        const z = heroZ(i, u, H) + e * (0.08 * Math.cos(u * Math.PI * freq_k + phase_k))
        const pt = new THREE.Vector3(x, y, z)
        const w = computeConstraintWeight(u)

        if (prevPt) {
          builder.addSegment(
            prevPt,
            prevU,
            10 + i * 11 + k,
            w,
            pt,
            u,
            10 + i * 11 + k,
            w,
            strandAlpha,
            strandAlpha,
            color,
            color
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

function generate3DNeuralTriangulation(side, H, prng) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const nodes = []

  // Generate 65 Graph Nodes inside u in [0.18, 0.95]
  for (let i = 0; i < 65; i++) {
    const uNorm = i / 64.0
    // Stratified distribution along u
    const u = 0.20 + uNorm * (0.92 - 0.20) + (prng() - 0.5) * 0.03
    const clampedU = Math.min(0.95, Math.max(0.18, u))
    const yA = heroY0(clampedU, H)
    const yB = heroY1(clampedU, H)
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
  const lineBuilder = new ParameterizedLineBuilder()
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

function generate5SweepingOuterBeadedStreams(side, H) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const N_DOTS = 75
  const pointsBuilder = new ParameterizedPointsBuilder()
  const beadColor = new THREE.Color('#30d5ff').lerp(new THREE.Color('#0055ff'), 0.35)

  // 5 outer arc definitions
  const arcConfigs = [
    // Arc 0: High upper canopy arc well above top wave
    {
      calcY: (u) => heroY0(u, H) + (0.28 + 0.35 * u) * H + 0.04 * H * Math.sin(u * Math.PI * 2.2),
      calcZ: (u) => heroZ(0, u, H) + 0.08 * Math.cos(u * Math.PI * 2.0),
      wireId: 80,
    },
    // Arc 1: Mid-high upper canopy arc
    {
      calcY: (u) => heroY0(u, H) + (0.20 + 0.26 * u) * H + 0.03 * H * Math.cos(u * Math.PI * 2.6),
      calcZ: (u) => heroZ(0, u, H) + 0.05 * Math.sin(u * Math.PI * 2.2),
      wireId: 81,
    },
    // Arc 2: Deep lower root arc well below bottom wave
    {
      calcY: (u) => heroY1(u, H) - (0.28 + 0.35 * u) * H - 0.04 * H * Math.cos(u * Math.PI * 2.2),
      calcZ: (u) => heroZ(1, u, H) - 0.08 * Math.cos(u * Math.PI * 2.0),
      wireId: 82,
    },
    // Arc 3: Mid-deep lower root arc
    {
      calcY: (u) => heroY1(u, H) - (0.20 + 0.26 * u) * H - 0.03 * H * Math.sin(u * Math.PI * 2.6),
      calcZ: (u) => heroZ(1, u, H) - 0.05 * Math.sin(u * Math.PI * 2.2),
      wireId: 83,
    },
    // Arc 4: Outer flaring canopy arc
    {
      calcY: (u) => (u < 0.58 ? heroY0(u, H) : heroY1(u, H)) + (0.35 + 0.40 * u) * H,
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
      const feather = computeVertexAlpha(u)

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

    const x = sign * 10.0 * u + (prng() - 0.5) * 0.40
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

function get6ExactCurveCrossingFlares(side, H) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1

  // Exact mathematical intersection coordinates of Hero Waves 0, 1, 2, 3 for u >= 0.35:
  const crossings = [
    { u: 0.565, y: heroY0(0.565, H), z: heroZ(0, 0.565, H) }, // Hero 0 & Hero 1 (Primary Pinch)
    { u: 0.415, y: heroY0(0.415, H), z: heroZ(0, 0.415, H) }, // Hero 0 & Hero 3
    { u: 0.526, y: heroY1(0.526, H), z: heroZ(1, 0.526, H) }, // Hero 1 & Hero 2
    { u: 0.620, y: heroY1(0.620, H), z: heroZ(1, 0.620, H) }, // Hero 1 & Hero 3
    { u: 0.706, y: heroY0(0.706, H), z: heroZ(0, 0.706, H) }, // Hero 0 & Hero 2
    { u: 0.842, y: heroY2(0.842, H), z: heroZ(2, 0.842, H) }, // Hero 2 & Hero 3
  ]

  const pointsBuilder = new ParameterizedPointsBuilder()

  crossings.forEach(({ u, y, z }, idx) => {
    const x = sign * 10.0 * u
    const weight = computeConstraintWeight(u)
    const feather = computeVertexAlpha(u)
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

function generate900PinpointStardust(side, H, prng) {
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const STARDUST_COUNT = 900
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
    const yBase = HERO_FUNCS[curveId](u, H)
    const zBase = heroZ(curveId, u, H)

    const r1 = prng()
    const r2 = prng()
    const gaussY = Math.sqrt(-2.0 * Math.log(Math.max(1e-5, r1))) * Math.cos(2.0 * Math.PI * r2)
    const gaussZ = Math.sqrt(-2.0 * Math.log(Math.max(1e-5, r1))) * Math.sin(2.0 * Math.PI * r2)

    const x = sign * 10.0 * u + (prng() - 0.5) * 0.08
    const y = yBase + gaussY * 0.07 * H
    const z = zBase + gaussZ * 0.07 * H

    const weight = computeConstraintWeight(u)
    const feather = computeVertexAlpha(u)

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
 * Generates all graph-based animation-ready geometries for one side ('left' or 'right').
 *
 * @param {'left' | 'right'} side
 */
export function generateSideWireData(side) {
  const prng = createPrng(side === 'left' ? 7771 : 8881)
  const graph = new NeuralWireGraph(side)
  const isLeft = side === 'left'
  const sign = isLeft ? -1 : 1
  const H = H_VAL
  const N_HERO = 200

  // 1. Build smooth continuous Hero Wave paths (N = 200 points per wave)
  const heroStrands = []
  for (let i = 0; i < 4; i++) {
    const pts = []
    for (let s = 0; s < N_HERO; s++) {
      const u = s / (N_HERO - 1)
      const x = sign * 10.0 * u
      const y = HERO_FUNCS[i](u, H)
      const z = heroZ(i, u, H)
      pts.push(new THREE.Vector3(x, y, z))
    }
    heroStrands.push({ wireId: i, pts })
    graph.primaryFilamentPaths.push({ wireId: i, length: pts.length })
  }

  // 2. 6-pass micro-offset additive glow bundle builder for Hero Waves
  function buildCoreLineGeo(strandList) {
    const builder = new ParameterizedLineBuilder()
    strandList.forEach(({ wireId, pts }) => {
      const count = pts.length
      for (let i = 0; i < count - 1; i++) {
        const u1 = i / (count - 1)
        const u2 = (i + 1) / (count - 1)
        const w1 = computeConstraintWeight(u1)
        const w2 = computeConstraintWeight(u2)
        builder.addSegment(pts[i], u1, wireId, w1, pts[i + 1], u2, wireId, w2)
      }
    })
    return builder.buildGeometry()
  }

  function buildOffsetAuraLineGeo(strandList, offsets) {
    const builder = new ParameterizedLineBuilder()
    strandList.forEach(({ wireId, pts }) => {
      const count = pts.length
      offsets.forEach(({ dy, dz }) => {
        for (let i = 0; i < count - 1; i++) {
          const u1 = i / (count - 1)
          const u2 = (i + 1) / (count - 1)
          const w1 = computeConstraintWeight(u1)
          const w2 = computeConstraintWeight(u2)
          const p1 = new THREE.Vector3(pts[i].x, pts[i].y + dy, pts[i].z + dz)
          const p2 = new THREE.Vector3(pts[i + 1].x, pts[i + 1].y + dy, pts[i + 1].z + dz)
          builder.addSegment(p1, u1, wireId, w1, p2, u2, wireId, w2)
        }
      })
    })
    return builder.buildGeometry()
  }

  // Hero Waves 0, 1, 3: Cyan-White Core & 6-Pass Royal-Blue (#0048ff) Aura
  const cyanBlueStrands = [heroStrands[0], heroStrands[1], heroStrands[3]]
  const primaryCoreGeo = buildCoreLineGeo(cyanBlueStrands)
  const primaryHaloGeo = buildOffsetAuraLineGeo(cyanBlueStrands, HERO_AURA_OFFSETS)

  // Hero Wave 2: Violet/Magenta (#b83dff) Core & 6-Pass Violet Aura
  const violetStrand = [heroStrands[2]]
  const secondaryGeo = buildCoreLineGeo(violetStrand)
  const depthGeo = buildOffsetAuraLineGeo(violetStrand, HERO_AURA_OFFSETS)

  // 3. 44 Companion Silk Strands bundled tightly along Hero Waves (ZERO HAMMOCK NET!)
  const subFilamentsGeo = generateCompanionSilkStrands(side, H)

  // 4. 3D Neural Triangulation Mesh & 65 Graph Nodes inside the dark almond chamber
  const { triangulationGeo: constellationGeo, nodesGeo: intersectionNodesGeo, rawNodes } =
    generate3DNeuralTriangulation(side, H, prng)

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
  const beadedStreamsGeo = generate5SweepingOuterBeadedStreams(side, H)

  // 6. 25 Soft Out-of-Focus Background Bokeh Discs
  const bokehGeo = generate25BackgroundBokehCircles(side, H, prng)

  // 7. 6 Exact Curve-Crossing Flares strictly on Hero wave intersections
  const focalFlaresGeo = get6ExactCurveCrossingFlares(side, H)

  // 8. 900 Tiny Pinpoint Stardust Specks
  const stardustGeo = generate900PinpointStardust(side, H, prng)

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
 * Module-level deterministic geometry cache.
 */
const cachedData = { left: null, right: null }
export function getSideWireData(side) {
  if (!cachedData[side]) {
    cachedData[side] = generateSideWireData(side)
  }
  return cachedData[side]
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
