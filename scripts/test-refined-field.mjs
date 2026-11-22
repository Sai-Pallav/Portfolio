import { generateRefinedNeuralField, getAlmondPocketBounds } from '../src/components/sections/contact/neuralWire/neuralPocketBounds.js'

for (const side of ['left', 'right']) {
  console.log(`\n=================== ${side.toUpperCase()} ===================`)
  const field = generateRefinedNeuralField(side)
  const pos = field.linesGeo.getAttribute('position').array
  const alpha = field.linesGeo.getAttribute('aAlpha').array
  const u = field.linesGeo.getAttribute('aU').array
  const relLines = field.linesGeo.getAttribute('aRelativeCoord')
  const numEdges = pos.length / 6

  let maxRatio = 0
  let overCount = 0
  let bgAlphas = [], midAlphas = [], fgAlphas = []

  // Check 3D edge distances and alphas
  let overLimitCount = 0
  let maxEdgeRatio = 0
  for (let e = 0; e < numEdges; e++) {
    const x1 = pos[e*6], y1 = pos[e*6+1], z1 = pos[e*6+2]
    const x2 = pos[e*6+3], y2 = pos[e*6+4], z2 = pos[e*6+5]
    const d3D = Math.hypot(x1 - x2, y1 - y2, z1 - z2)
    const u1 = u[e*2], u2 = u[e*2+1]
    const b1 = getAlmondPocketBounds(u1)
    const b2 = getAlmondPocketBounds(u2)
    const localH = Math.max(b1.envHeight, b2.envHeight)
    const limit = 0.38 * localH + 0.025
    const ratio = d3D / limit
    if (ratio > maxEdgeRatio) maxEdgeRatio = ratio
    if (ratio > 1.0001) overLimitCount++

    const a = 0.5 * (alpha[e*2] + alpha[e*2+1])
    if (a <= 0.12) bgAlphas.push(a)
    else if (a <= 0.26) midAlphas.push(a)
    else fgAlphas.push(a)
  }

  console.log(`Total line segments: ${numEdges}`)
  console.log(`Max 3D dist / (0.38*localH + 0.025): ${maxEdgeRatio.toFixed(4)}`)
  console.log(`Edges exceeding 0.38*localH + 0.025 clamp: ${overLimitCount}`)
  console.log(`BG line alphas (target 0.05-0.09): count = ${bgAlphas.length}, min = ${Math.min(...bgAlphas).toFixed(3)}, max = ${Math.max(...bgAlphas).toFixed(3)}, avg = ${(bgAlphas.reduce((s,x)=>s+x,0)/bgAlphas.length).toFixed(3)}`)
  console.log(`MID line alphas (target 0.16-0.24): count = ${midAlphas.length}, min = ${Math.min(...midAlphas).toFixed(3)}, max = ${Math.max(...midAlphas).toFixed(3)}, avg = ${(midAlphas.reduce((s,x)=>s+x,0)/midAlphas.length).toFixed(3)}`)
  console.log(`FG line alphas (target 0.28-0.38): count = ${fgAlphas.length}, min = ${Math.min(...fgAlphas).toFixed(3)}, max = ${Math.max(...fgAlphas).toFixed(3)}, avg = ${(fgAlphas.reduce((s,x)=>s+x,0)/fgAlphas.length).toFixed(3)}`)

  // Check Points
  const ptPos = field.pointsGeo.getAttribute('position').array
  const ptU = field.pointsGeo.getAttribute('aU').array
  const ptLayer = field.pointsGeo.getAttribute('aLayer').array
  const ptHighlight = field.pointsGeo.getAttribute('aIsHighlight').array
  const relPoints = field.pointsGeo.getAttribute('aRelativeCoord')
  const numPts = ptPos.length / 3

  let fgCount = 0, midCount = 0, bgCount = 0, hubCount = 0
  let minPtU = Infinity, maxPtU = -Infinity
  for (let i = 0; i < numPts; i++) {
    const l = ptLayer[i]
    if (l > 0.5) fgCount++
    else if (l < -0.5) bgCount++
    else midCount++
    if (ptHighlight[i] > 0.5) hubCount++
    if (ptU[i] < minPtU) minPtU = ptU[i]
    if (ptU[i] > maxPtU) maxPtU = ptU[i]
  }

  console.log(`Points: total = ${numPts}, FG = ${fgCount}, MID = ${midCount}, BG = ${bgCount}, Ice-white Hubs = ${hubCount}`)
  console.log(`Points span: u in [${minPtU.toFixed(3)}, ${maxPtU.toFixed(3)}]`)

  // Check Haze
  const hazePos = field.hazeGeo.getAttribute('position').array
  const relHaze = field.hazeGeo.getAttribute('aRelativeCoord')
  const hazeAlpha = field.hazeGeo.getAttribute('alpha').array
  const numHaze = hazePos.length / 3
  let maxHazeRNorm = 0
  let maxHazeWDepth = -Infinity
  let minHazeAlpha = Infinity, maxHazeAlpha = -Infinity
  for (let h = 0; h < numHaze; h++) {
    const rNorm = relHaze.array[h*4 + 3]
    const wDepth = relHaze.array[h*4 + 2]
    const a = hazeAlpha[h]
    if (rNorm > maxHazeRNorm) maxHazeRNorm = rNorm
    if (wDepth > maxHazeWDepth) maxHazeWDepth = wDepth
    if (a < minHazeAlpha) minHazeAlpha = a
    if (a > maxHazeAlpha) maxHazeAlpha = a
  }
  console.log(`Haze particles: ${numHaze} (target 350-500)`)
  console.log(`Haze r_norm max: ${maxHazeRNorm.toFixed(3)} (strictly < 0.65)`)
  console.log(`Haze w_depth max: ${maxHazeWDepth.toFixed(3)} (strictly < -0.20)`)
  console.log(`Haze alpha min/max: ${minHazeAlpha.toFixed(4)} / ${maxHazeAlpha.toFixed(4)} (peak 0.025-0.032)`)

  // Verify aRelativeCoord attribute integrity
  console.log(`aRelativeCoord valid: linesGeo (${relLines?.itemSize === 4}), pointsGeo (${relPoints?.itemSize === 4}), hazeGeo (${relHaze?.itemSize === 4})`)

  // Check graph connectivity: Build adjacency from line segments (excluding margin anchors where anchor layer is 0.0 and alpha is 0)
  // Find connected components among points
  const ptMap = new Map()
  function getPtKey(x, y, z) {
    return `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`
  }
  for (let i = 0; i < numPts; i++) {
    ptMap.set(getPtKey(ptPos[i*3], ptPos[i*3+1], ptPos[i*3+2]), i)
  }

  const adj = Array.from({ length: numPts }, () => [])
  let internalEdges = 0
  for (let e = 0; e < numEdges; e++) {
    const k1 = getPtKey(pos[e*6], pos[e*6+1], pos[e*6+2])
    const k2 = getPtKey(pos[e*6+3], pos[e*6+4], pos[e*6+5])
    const id1 = ptMap.get(k1)
    const id2 = ptMap.get(k2)
    if (id1 !== undefined && id2 !== undefined && id1 !== id2) {
      adj[id1].push(id2)
      adj[id2].push(id1)
      internalEdges++
    }
  }

  // BFS for connected components
  const visited = new Uint8Array(numPts)
  const components = []
  for (let i = 0; i < numPts; i++) {
    if (visited[i]) continue
    const comp = []
    const queue = [i]
    visited[i] = 1
    while (queue.length > 0) {
      const curr = queue.shift()
      comp.push(curr)
      for (const neighbor of adj[curr]) {
        if (!visited[neighbor]) {
          visited[neighbor] = 1
          queue.push(neighbor)
        }
      }
    }
    components.push(comp)
  }
  components.sort((a, b) => b.length - a.length)
  console.log(`Internal graph components: ${components.length}`)
  console.log(`Largest component: ${components[0].length} / ${numPts} nodes (${((components[0].length / numPts) * 100).toFixed(1)}%)`)
  const comp0Us = components[0].map(idx => ptU[idx])
  console.log(`Largest component span: u in [${Math.min(...comp0Us).toFixed(3)}, ${Math.max(...comp0Us).toFixed(3)}]`)
  if (components.length > 1) {
    console.log(`Other components sizes:`, components.slice(1, 10).map(c => c.length))
    // Check gap between comp 0 and comp 1
    let minD = Infinity
    let bestPair = null
    for (const i of components[0]) {
      const x1 = ptPos[i*3], y1 = ptPos[i*3+1], z1 = ptPos[i*3+2]
      const u1 = ptU[i]
      for (const j of components[1]) {
        const x2 = ptPos[j*3], y2 = ptPos[j*3+1], z2 = ptPos[j*3+2]
        const u2 = ptU[j]
        if (Math.abs(u1 - u2) > 0.05) continue
        const d = Math.hypot(x1 - x2, y1 - y2, z1 - z2)
        if (d < minD) {
          minD = d
          const b1 = getAlmondPocketBounds(u1)
          const b2 = getAlmondPocketBounds(u2)
          bestPair = { i, j, u1: u1.toFixed(3), u2: u2.toFixed(3), d: d.toFixed(4), localH: Math.max(b1.envHeight, b2.envHeight).toFixed(4), ratio: (d / Math.max(b1.envHeight, b2.envHeight)).toFixed(4) }
        }
      }
    }
    console.log(`Closest pair between Comp 0 and Comp 1:`, bestPair)
  }
}
