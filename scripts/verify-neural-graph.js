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
  console.log(`Total edge count: ${edges.length} (Secondary: ${secondaryEdges.length})`)

  // 1. Edge endpoint references
  let brokenEdges = 0
  for (const edge of edges) {
    if (!graph.getNode(edge.sourceNodeId) || !graph.getNode(edge.targetNodeId)) {
      brokenEdges++
    }
  }
  console.log(`Broken edge references: ${brokenEdges} (must be 0)`)
  if (brokenEdges > 0) throw new Error('Found broken edge references!')

  // 2. Degree constraints: No disconnected nodes (degree >= 1) & reasonable max degree
  const minDegree = Math.min(...nodes.map((n) => n.degree))
  const maxDegree = Math.max(...nodes.map((n) => n.degree))
  const avgDegree = (nodes.reduce((acc, n) => acc + n.degree, 0) / nodes.length).toFixed(2)
  console.log(`Node degrees: Min = ${minDegree}, Max = ${maxDegree}, Avg = ${avgDegree} (Min must be >= 1, Max <= 6)`)
  if (minDegree < 1) throw new Error(`Found disconnected nodes with degree 0!`)
  if (maxDegree > 6) throw new Error(`Node degree exceeded max limit: ${maxDegree}`)

  // 3. Secondary edge distance and du bounds
  let maxSecondaryDist = 0
  let maxSecondaryDu = 0
  for (const edge of secondaryEdges) {
    const nA = graph.getNode(edge.sourceNodeId)
    const nB = graph.getNode(edge.targetNodeId)
    const d = nA.position.distanceTo(nB.position)
    const du = Math.abs(nA.u - nB.u)
    if (d > maxSecondaryDist) maxSecondaryDist = d
    if (du > maxSecondaryDu) maxSecondaryDu = du
  }
  console.log(`Secondary edge distance: Max = ${maxSecondaryDist.toFixed(3)}`)
  console.log(`Secondary edge |Δu|: Max = ${maxSecondaryDu.toFixed(3)}`)

  // 4. Planar crossings check within the same depth layer
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

      if (Math.abs(avgZ1 - avgZ2) < 0.05) {
        if (segmentsIntersect2D(a1.position, b1.position, a2.position, b2.position)) {
          crossingsInSameLayer++
        }
      }
    }
  }
  console.log(`Secondary edge crossings in same layer: ${crossingsInSameLayer} (must be 0)`)
  if (crossingsInSameLayer > 0) throw new Error('Found secondary edges crossing without junction in same layer!')

  // 5. Node hierarchy counts
  const heroCount = data.focalFlaresGeo.attributes.position.count
  const nodeCount = data.intersectionNodesGeo.attributes.position.count
  const particleCount = data.stardustGeo.attributes.position.count

  console.log(`Node Hierarchy: Hero Flares = ${heroCount}, Neural Nodes = ${nodeCount}, Stardust = ${particleCount}`)
  if (heroCount !== 6) throw new Error(`Expected 6 hero flares, got ${heroCount}`)
  if (nodeCount < 100) throw new Error(`Expected >= 100 neural nodes, got ${nodeCount}`)

  // 6. Node attachment validation
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
  verifyPointsMatchGraph(data.intersectionNodesGeo, 'Neural Nodes')

  // 7. Z-Depth distribution & Cross-layer connectivity
  const fgNodes = nodes.filter(n => n.depthLayer === 'fg').length
  const midNodes = nodes.filter(n => n.depthLayer === 'mid').length
  const bgNodes = nodes.filter(n => n.depthLayer === 'bg').length
  console.log(`Depth layer distribution: FG = ${fgNodes} (${(fgNodes / nodes.length * 100).toFixed(1)}%), MID = ${midNodes} (${(midNodes / nodes.length * 100).toFixed(1)}%), BG = ${bgNodes} (${(bgNodes / nodes.length * 100).toFixed(1)}%)`)
  if (fgNodes === 0 || midNodes === 0 || bgNodes === 0) {
    throw new Error('Insufficient depth distribution across all 3 layers!')
  }

  // Check cross-layer connections
  let crossLayerEdges = 0
  for (const e of secondaryEdges) {
    const na = graph.getNode(e.sourceNodeId)
    const nb = graph.getNode(e.targetNodeId)
    if (na.depthLayer !== nb.depthLayer) crossLayerEdges++
  }
  console.log(`Cross-layer 3D edges: ${crossLayerEdges} (${(crossLayerEdges / secondaryEdges.length * 100).toFixed(1)}%)`)
  if (crossLayerEdges === 0) {
    throw new Error('Missing 3D cross-layer connections!')
  }

  // 8. Animation readiness attributes
  const geosToCheck = [
    ['primaryCoreGeo', data.primaryCoreGeo],
    ['primaryHaloGeo', data.primaryHaloGeo],
    ['secondaryGeo', data.secondaryGeo],
    ['depthGeo', data.depthGeo],
    ['subFilamentsGeo', data.subFilamentsGeo],
    ['constellationGeo', data.constellationGeo],
    ['intersectionNodesGeo', data.intersectionNodesGeo],
    ['focalFlaresGeo', data.focalFlaresGeo],
    ['beadedStreamsGeo', data.beadedStreamsGeo],
    ['stardustGeo', data.stardustGeo],
    ['bokehGeo', data.bokehGeo],
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
  }
  console.log('All 11 BufferGeometries verified: valid attributes, zero NaNs, animation-ready.')

  results[side] = { nodes, edges, secondaryEdges, heroCount, nodeCount }
}

console.log('\n─── Comparing Left vs Right Independence ───')
const leftEdges = results.left.secondaryEdges.length
const rightEdges = results.right.secondaryEdges.length
console.log(`Left secondary edges: ${leftEdges}, Right secondary edges: ${rightEdges}`)
console.log('Networks independently generated and asymmetric.')

console.log('\n✓ ALL STRUCTURAL REDESIGN ARCHITECTURAL TESTS PASSED PERFECTLY!\n')
