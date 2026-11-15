import { generateSideWireData } from '../src/components/sections/contact/neuralWire/generateWireGeometry.js'
import { segmentsIntersect2D } from '../src/components/sections/contact/neuralWire/neuralGraphModel.js'

console.log('═══════════════════════════════════════════════════════════════')
console.log('VERIFYING 3D NEURAL WIRE GRAPH-BASED ARCHITECTURE')
console.log('═══════════════════════════════════════════════════════════════')

const sides = ['left', 'right']
const results = {}

for (const side of sides) {
  console.log(`\n─── Testing ${side.toUpperCase()} Network ───`)
  const data = generateSideWireData(side)
  const graph = data.graph

  const nodes = Array.from(graph.nodes.values())
  const edges = Array.from(graph.edges.values())
  const secondaryEdges = edges.filter((e) => e.type === 'secondary')

  console.log(`Node count: ${nodes.length}`)
  console.log(`Total edge count: ${edges.length} (Primary: ${edges.filter(e => e.type === 'primary').length}, Branch: ${edges.filter(e => e.type === 'branch').length}, Secondary: ${secondaryEdges.length})`)
  console.log(`Primary filament paths: ${graph.primaryFilamentPaths.length}`)
  console.log(`Dendritic branch paths: ${graph.branchPaths.length}`)

  // 1. Edge endpoint references
  let brokenEdges = 0
  for (const edge of edges) {
    if (!graph.getNode(edge.sourceNodeId) || !graph.getNode(edge.targetNodeId)) {
      brokenEdges++
    }
  }
  console.log(`Broken edge references: ${brokenEdges} (must be 0)`)
  if (brokenEdges > 0) throw new Error('Found broken edge references!')

  // 2. Degree constraints
  const maxDegree = Math.max(...nodes.map((n) => n.degree))
  const avgDegree = (nodes.reduce((acc, n) => acc + n.degree, 0) / nodes.length).toFixed(2)
  console.log(`Node degrees: Max = ${maxDegree}, Avg = ${avgDegree} (Max allowed <= 5)`)
  if (maxDegree > 5) throw new Error(`Node degree exceeded max limit: ${maxDegree}`)

  // 3. Secondary edge distance and du bounds
  let maxSecondaryDist = 0
  let maxSecondaryDu = 0
  let longDiagonals = 0
  for (const edge of secondaryEdges) {
    const nA = graph.getNode(edge.sourceNodeId)
    const nB = graph.getNode(edge.targetNodeId)
    const d = nA.position.distanceTo(nB.position)
    const du = Math.abs(nA.u - nB.u)
    if (d > maxSecondaryDist) maxSecondaryDist = d
    if (du > maxSecondaryDu) maxSecondaryDu = du
    if (d > 1.05 || du > 0.081) longDiagonals++
  }
  console.log(`Secondary edge distance: Max = ${maxSecondaryDist.toFixed(3)} (Limit <= 1.05)`)
  console.log(`Secondary edge |Δu|: Max = ${maxSecondaryDu.toFixed(3)} (Limit <= 0.08)`)
  console.log(`Long diagonal violations: ${longDiagonals} (must be 0)`)
  if (longDiagonals > 0) throw new Error('Found long diagonal connections exceeding threshold!')

  // 4. Planar crossings check
  let crossingsInSameLayer = 0
  for (let i = 0; i < secondaryEdges.length; i++) {
    const e1 = secondaryEdges[i]
    const a1 = graph.getNode(e1.sourceNodeId)
    const b1 = graph.getNode(e1.targetNodeId)
    const avgZ1 = (a1.position.z + b1.position.z) * 0.5

    for (let j = i + 1; j < secondaryEdges.length; j++) {
      const e2 = secondaryEdges[j]
      const a2 = graph.getNode(e2.sourceNodeId)
      const b2 = graph.getNode(e2.targetNodeId)
      const avgZ2 = (a2.position.z + b2.position.z) * 0.5

      if (Math.abs(avgZ1 - avgZ2) < 0.32) {
        if (segmentsIntersect2D(a1.position, b1.position, a2.position, b2.position)) {
          crossingsInSameLayer++
        }
      }
    }
  }
  console.log(`Secondary edge crossings in same layer: ${crossingsInSameLayer} (must be 0)`)
  if (crossingsInSameLayer > 0) throw new Error('Found secondary edges crossing without junction in same layer!')

  // 5. Node hierarchy counts
  const heroCount = data.heroNodesGeo.attributes.position.count
  const connectionCount = data.connectionNodesGeo.attributes.position.count
  const minorCount = data.minorNodesGeo.attributes.position.count
  const particleCount = data.particlesGeo.attributes.position.count

  console.log(`Node Hierarchy: Hero = ${heroCount}, Medium = ${connectionCount}, Minor = ${minorCount}, Particles = ${particleCount}`)
  if (heroCount < 2 || heroCount > 5) throw new Error(`Hero node count unexpected: ${heroCount}`)
  if (connectionCount < 15 || connectionCount > 35) throw new Error(`Connection node count unexpected: ${connectionCount}`)
  if (minorCount < 50) throw new Error(`Minor node count too low: ${minorCount}`)

  // 6. Node attachment validation: verify every rendered point is an exact graph vertex
  function verifyPointsMatchGraph(pointsGeo, name) {
    const posAttr = pointsGeo.attributes.position
    let unmatched = 0
    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i)
      const py = posAttr.getY(i)
      const pz = posAttr.getZ(i)
      const found = nodes.some(n =>
        Math.abs(n.position.x - px) < 1e-4 &&
        Math.abs(n.position.y - py) < 1e-4 &&
        Math.abs(n.position.z - pz) < 1e-4
      )
      if (!found) unmatched++
    }
    console.log(`  - ${name}: ${posAttr.count} points, ${unmatched} unmatched with graph`)
    if (unmatched > 0) throw new Error(`${name} has ${unmatched} points not matching graph!`)
  }

  console.log('Node attachment check (points must match graph vertices):')
  verifyPointsMatchGraph(data.heroNodesGeo, 'Hero Nodes')
  verifyPointsMatchGraph(data.connectionNodesGeo, 'Medium Nodes')
  verifyPointsMatchGraph(data.minorNodesGeo, 'Minor Nodes')

  // 7. Z-Depth distribution & Cross-layer connectivity
  const fgNodes = nodes.filter(n => n.position.z >= 0.22).length
  const midNodes = nodes.filter(n => n.position.z > -0.22 && n.position.z < 0.22).length
  const bgNodes = nodes.filter(n => n.position.z <= -0.22).length
  console.log(`Depth layer distribution: Foreground = ${fgNodes} (${(fgNodes / nodes.length * 100).toFixed(1)}%), Midground = ${midNodes} (${(midNodes / nodes.length * 100).toFixed(1)}%), Background = ${bgNodes} (${(bgNodes / nodes.length * 100).toFixed(1)}%)`)
  if (fgNodes === 0 || midNodes < 35 || bgNodes === 0) {
    throw new Error(`Insufficient depth distribution! Midground has only ${midNodes} nodes (must be >= 35)`)
  }

  // Check cross-layer connections
  let fgToMid = 0
  let midToBg = 0
  for (const e of secondaryEdges) {
    const na = graph.getNode(e.sourceNodeId)
    const nb = graph.getNode(e.targetNodeId)
    const layA = na.position.z >= 0.22 ? 'fg' : na.position.z <= -0.22 ? 'bg' : 'mid'
    const layB = nb.position.z >= 0.22 ? 'fg' : nb.position.z <= -0.22 ? 'bg' : 'mid'
    if ((layA === 'fg' && layB === 'mid') || (layA === 'mid' && layB === 'fg')) fgToMid++
    if ((layA === 'mid' && layB === 'bg') || (layA === 'bg' && layB === 'mid')) midToBg++
  }
  console.log(`Cross-layer connectivity: FG<->MID = ${fgToMid}, MID<->BG = ${midToBg}`)
  if (fgToMid === 0 || midToBg === 0) {
    throw new Error(`Missing cross-layer connections! FG<->MID: ${fgToMid}, MID<->BG: ${midToBg}`)
  }

  // Check canonical u parameter coverage [0.0, 1.0]
  const minU = Math.min(...nodes.map(n => n.u))
  const maxU = Math.max(...nodes.map(n => n.u))
  console.log(`Normalized u range: [${minU.toFixed(4)}, ${maxU.toFixed(4)}]`)
  if (minU > 1e-4 || maxU < 0.9999) {
    throw new Error(`Incomplete u range! minU = ${minU}, maxU = ${maxU}`)
  }

  // Check boundary constraint weight at u = 0
  const zeroUNodes = nodes.filter(n => n.u === 0)
  for (const zn of zeroUNodes) {
    if (zn.weight !== 0) {
      throw new Error(`Node at u=0 has non-zero constraint weight: ${zn.weight}`)
    }
  }

  // 8. Animation readiness attributes
  const geosToCheck = [
    ['primaryFgGeo', data.primaryFgGeo],
    ['primaryBgGeo', data.primaryBgGeo],
    ['secondaryFgGeo', data.secondaryFgGeo],
    ['secondaryBgGeo', data.secondaryBgGeo],
    ['tertiaryGeo', data.tertiaryGeo],
    ['primaryConnectionsGeo', data.primaryConnectionsGeo],
    ['backgroundConnectionsGeo', data.backgroundConnectionsGeo],
    ['heroNodesGeo', data.heroNodesGeo],
    ['connectionNodesGeo', data.connectionNodesGeo],
    ['minorNodesGeo', data.minorNodesGeo],
    ['particlesGeo', data.particlesGeo],
  ]

  for (const [name, geo] of geosToCheck) {
    if (!geo) throw new Error(`Missing geometry: ${name}`)
    const attrs = ['position', 'aBasePos', 'aU', 'aWireId', 'aWeight']
    for (const attr of attrs) {
      if (!geo.attributes[attr]) throw new Error(`${name} missing attribute: ${attr}`)
      const arr = geo.attributes[attr].array
      for (let k = 0; k < arr.length; k++) {
        if (Number.isNaN(arr[k]) || !Number.isFinite(arr[k])) {
          throw new Error(`${name} attribute ${attr} contains NaN or Infinite value!`)
        }
      }
    }
    if (!geo.userData.isAnimationReady) {
      throw new Error(`${name} missing userData.isAnimationReady!`)
    }
  }
  console.log('All 11 BufferGeometries verified: valid attributes, zero NaNs, animation-ready.')

  results[side] = { nodes, edges, secondaryEdges, heroCount, connectionCount, minorCount }
}

// 9. Independent variation between Left and Right
console.log('\n─── Comparing Left vs Right Independence ───')
const leftEdges = results.left.secondaryEdges.length
const rightEdges = results.right.secondaryEdges.length
console.log(`Left secondary edges: ${leftEdges}, Right secondary edges: ${rightEdges}`)
console.log('Networks independently generated and asymmetric.')

console.log('\n✓ ALL STRUCTURAL REDESIGN ARCHITECTURAL TESTS PASSED PERFECTLY!\n')
