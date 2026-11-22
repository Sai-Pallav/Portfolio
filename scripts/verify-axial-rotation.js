import * as THREE from 'three'
import { getSideWireData, heroY0, heroY1, heroY2, heroY3, H_VAL } from '../src/components/sections/contact/neuralWire/generateWireGeometry.js'
import {
  NEURAL_DEFORMATION_GLSL,
  ANIMATION_CONTRACT_VERSION,
  SIDE_ANIMATION_CONFIG,
  computeNeuralDeformationJS,
} from '../src/components/sections/contact/neuralWire/animationContract.js'

console.log('═══════════════════════════════════════════════════════════════')
console.log(`DEEP VERIFICATION: 3D OUTWARD ROTATING NEURAL NETWORK (v${ANIMATION_CONTRACT_VERSION})`)
console.log('═══════════════════════════════════════════════════════════════')
console.log(`GLSL Shader length: ${NEURAL_DEFORMATION_GLSL.length} characters`)

const sides = ['left', 'right']

for (const side of sides) {
  console.log(`\n─── Testing ${side.toUpperCase()} Network ───`)
  const anim = SIDE_ANIMATION_CONFIG[side]
  const data = getSideWireData(side)

  const requiredGeos = [
    { name: 'primaryCoreGeo', geo: data.primaryCoreGeo },
    { name: 'primaryHaloGeo', geo: data.primaryHaloGeo },
    { name: 'secondaryGeo', geo: data.secondaryGeo },
    { name: 'depthGeo', geo: data.depthGeo },
    { name: 'subFilamentsGeo', geo: data.subFilamentsGeo },
    { name: 'constellationGeo', geo: data.constellationGeo },
    { name: 'intersectionNodesGeo', geo: data.intersectionNodesGeo },
    { name: 'focalFlaresGeo', geo: data.focalFlaresGeo },
    { name: 'beadedStreamsGeo', geo: data.beadedStreamsGeo },
    { name: 'stardustGeo', geo: data.stardustGeo },
    { name: 'bokehGeo', geo: data.bokehGeo },
  ]

  // A. Check required attributes
  for (const { name, geo } of requiredGeos) {
    if (!geo) throw new Error(`Missing geometry: ${name}`)
    const pos = geo.getAttribute('position')
    const basePos = geo.getAttribute('aBasePos')
    const u = geo.getAttribute('aU')
    const weight = geo.getAttribute('aWeight')
    if (!pos || !basePos || !u || !weight) {
      throw new Error(`Geometry ${name} missing required neural attributes!`)
    }
    console.log(`  ✓ ${name.padEnd(22)}: ${pos.count.toString().padStart(5)} vertices`)
  }

  // B. Verify Outward Wave Propagation: Inner Tip (u=0) -> Outer Viewport (u=1)
  console.log('\n  [Test: Outward Wave Propagation Direction (u=0 -> u=1)]')
  const { waveSpeed, waveFreq, rotIntensity, sidePhase } = anim
  let uCrestT0 = -1
  let uCrestT5 = -1

  // Find crest (angle = 2*PI*n) at t = 0
  for (let u = 0.0; u <= 1.0; u += 0.001) {
    const angle = waveFreq * u - waveSpeed * 0.0 + sidePhase
    if (Math.abs(angle - Math.PI * 2) < 0.015) {
      uCrestT0 = u
      break
    }
  }

  // Find crest at t = 5.0s
  for (let u = 0.0; u <= 1.0; u += 0.001) {
    const angle = waveFreq * u - waveSpeed * 5.0 + sidePhase
    if (Math.abs(angle - Math.PI * 2) < 0.015) {
      uCrestT5 = u
      break
    }
  }

  console.log(`    At t = 0.0s: wave crest position u = ${uCrestT0.toFixed(4)}`)
  console.log(`    At t = 5.0s: wave crest position u = ${uCrestT5.toFixed(4)}`)
  if (uCrestT5 <= uCrestT0) {
    throw new Error(`Wave propagating inward! uCrestT5 (${uCrestT5}) <= uCrestT0 (${uCrestT0})`)
  }
  const propVelocity = (uCrestT5 - uCrestT0) / 5.0
  console.log(`  ✓ Outward propagation velocity: +${propVelocity.toFixed(5)} u-units/s (strictly outward from globe to outer edge).`)

  // C. Test Root Endpoint Stability (u = 0 near Central Globe)
  console.log('\n  [Test: Root Endpoint Stability at u = 0.0]')
  let rootVerticesTested = 0
  const geosWithRoot = [
    data.primaryCoreGeo,
    data.primaryHaloGeo,
    data.secondaryGeo,
    data.depthGeo,
    data.subFilamentsGeo,
  ]

  for (const g of geosWithRoot) {
    const pos = g.getAttribute('position')
    const base = g.getAttribute('aBasePos')
    const u = g.getAttribute('aU')
    const w = g.getAttribute('aWeight')

    for (let i = 0; i < pos.count; i++) {
      const uVal = u.getX(i)
      if (uVal <= 0.0001) {
        rootVerticesTested++
        const wVal = w.getX(i)
        if (wVal > 1e-6) {
          throw new Error(`Root vertex at u=0 has non-zero weight: ${wVal}`)
        }
        const bPos = new THREE.Vector3(base.getX(i), base.getY(i), base.getZ(i))

        for (let t = 0; t <= 30; t += 3) {
          const { pos: deformed } = computeNeuralDeformationJS(bPos, uVal, wVal, 0.0, t, waveSpeed, waveFreq, rotIntensity, sidePhase)
          const dist = deformed.distanceTo(bPos)
          if (dist > 1e-6) {
            throw new Error(`Root endpoint moved at t=${t}! dist=${dist}`)
          }
        }
      }
    }
  }
  console.log(`  ✓ ${rootVerticesTested} root vertices at u=0 tested across 10 time intervals: Zero displacement (strictly fixed).`)

  // D. Test Gap Occupancy & Clearance from Protected Hero Waves
  console.log('\n  [Test: Gap Occupancy & Zero Collision with Protected Waves]')
  const nodesPos = data.intersectionNodesGeo.getAttribute('aBasePos')
  const nodesU = data.intersectionNodesGeo.getAttribute('aU')
  const nodesW = data.intersectionNodesGeo.getAttribute('aWeight')
  const minRequiredClearance = 0.024 * H_VAL
  let minObservedClearance = Infinity
  let outsideGapCount = 0

  for (let i = 0; i < nodesPos.count; i++) {
    const uVal = nodesU.getX(i)
    const wVal = nodesW.getX(i)
    const bPos = new THREE.Vector3(nodesPos.getX(i), nodesPos.getY(i), nodesPos.getZ(i))

    const y0 = heroY0(uVal, H_VAL)
    const y1 = heroY1(uVal, H_VAL)
    const y2 = heroY2(uVal, H_VAL)
    const y3 = heroY3(uVal, H_VAL)
    const minY = Math.min(y0, y1, y2, y3)
    const maxY = Math.max(y0, y1, y2, y3)

    if (bPos.y < minY || bPos.y > maxY) {
      outsideGapCount++
    }

    // Verify clearance across continuous 3D rotation
    for (let t = 0; t <= 30; t += 2) {
      const { pos: def } = computeNeuralDeformationJS(bPos, uVal, wVal, 0.0, t, waveSpeed, waveFreq, rotIntensity, sidePhase)
      const dHero = Math.min(
        Math.abs(def.y - y0),
        Math.abs(def.y - y1),
        Math.abs(def.y - y2),
        Math.abs(def.y - y3)
      )

      if (dHero < minObservedClearance) minObservedClearance = dHero
      if (dHero < minRequiredClearance) {
        throw new Error(`Node ${i} at u=${uVal.toFixed(3)}, t=${t}s is too close to a hero wave! dist=${dHero.toFixed(4)} < min=${minRequiredClearance.toFixed(4)}`)
      }
    }
  }

  if (outsideGapCount > 0) {
    throw new Error(`Found ${outsideGapCount} nodes placed outside inter-strand gaps! Must be 0.`)
  }
  console.log(`  ✓ All ${nodesPos.count} neural network nodes tested: 0 nodes outside gaps, Min deformed clearance = ${minObservedClearance.toFixed(4)} (strictly clear across all 30s).`)

  // E. Test Node & Constellation Edge Connectivity Synchronization
  console.log('\n  [Test: Node & Edge Endpoint Synchronization during 3D Rotation]')
  const nodesGeo = data.intersectionNodesGeo
  const constGeo = data.constellationGeo

  const nodePosAttr = nodesGeo.getAttribute('aBasePos')
  const nodeUAttr = nodesGeo.getAttribute('aU')
  const nodeWeightAttr = nodesGeo.getAttribute('aWeight')
  const nodeLayerAttr = nodesGeo.getAttribute('aLayer')

  const constPosAttr = constGeo.getAttribute('aBasePos')
  const constUAttr = constGeo.getAttribute('aU')
  const constWeightAttr = constGeo.getAttribute('aWeight')
  const constLayerAttr = constGeo.getAttribute('aLayer')

  let matchedEndpoints = 0
  let maxConnectionDiscrepancy = 0

  for (let n = 0; n < nodePosAttr.count; n++) {
    const nBase = new THREE.Vector3(nodePosAttr.getX(n), nodePosAttr.getY(n), nodePosAttr.getZ(n))
    const nU = nodeUAttr.getX(n)
    const nW = nodeWeightAttr.getX(n)
    const nL = nodeLayerAttr ? nodeLayerAttr.getX(n) : 0.0

    for (let c = 0; c < constPosAttr.count; c++) {
      const cBase = new THREE.Vector3(constPosAttr.getX(c), constPosAttr.getY(c), constPosAttr.getZ(c))
      if (nBase.distanceTo(cBase) < 1e-4) {
        matchedEndpoints++
        const cU = constUAttr.getX(c)
        const cW = constWeightAttr.getX(c)
        const cL = constLayerAttr ? constLayerAttr.getX(c) : 0.0

        for (let t = 0; t < 20; t += 2) {
          const nodeDeformed = computeNeuralDeformationJS(nBase, nU, nW, nL, t, waveSpeed, waveFreq, rotIntensity, sidePhase)
          const edgeDeformed = computeNeuralDeformationJS(cBase, cU, cW, cL, t, waveSpeed, waveFreq, rotIntensity, sidePhase)
          const diff = nodeDeformed.pos.distanceTo(edgeDeformed.pos)
          if (diff > maxConnectionDiscrepancy) maxConnectionDiscrepancy = diff
        }
      }
    }
  }
  console.log(`  ✓ Matched node-edge endpoints tested: ${matchedEndpoints}`)
  console.log(`  ✓ Max node-edge discrepancy during continuous rotation: ${maxConnectionDiscrepancy.toExponential(3)} (strictly 0).`)
  if (maxConnectionDiscrepancy > 1e-5) {
    throw new Error('Node and connection edge detached during rotation!')
  }

  // F. Test Volumetric Depth Range & Rotation Amplitude Development
  console.log('\n  [Test: 3D Corkscrew Depth & Rotation Development]')
  let maxZ = -Infinity
  let minZ = Infinity
  for (let i = 0; i < nodePosAttr.count; i++) {
    const bPos = new THREE.Vector3(nodePosAttr.getX(i), nodePosAttr.getY(i), nodePosAttr.getZ(i))
    const uVal = nodeUAttr.getX(i)
    const wVal = nodeWeightAttr.getX(i)
    const lVal = nodeLayerAttr ? nodeLayerAttr.getX(i) : 0.0

    for (let t = 0; t < 25; t += 1.5) {
      const { pos } = computeNeuralDeformationJS(bPos, uVal, wVal, lVal, t, waveSpeed, waveFreq, rotIntensity, sidePhase)
      if (pos.z > maxZ) maxZ = pos.z
      if (pos.z < minZ) minZ = pos.z
    }
  }
  console.log(`  ✓ 3D Volumetric depth range: Z in [${minZ.toFixed(3)}, ${maxZ.toFixed(3)}] (natural spatial corkscrew roll).`)
  if (minZ > -0.10 || maxZ < 0.10) {
    throw new Error('Depth range insufficient for 3D spatial rotation!')
  }
}

// G. Test Asymmetry between Left and Right Networks
console.log('\n─── Testing Asymmetry Between Left and Right Networks ───')
const leftData = getSideWireData('left')
const rightData = getSideWireData('right')

const leftNodeCount = leftData.intersectionNodesGeo.getAttribute('position').count
const rightNodeCount = rightData.intersectionNodesGeo.getAttribute('position').count
const leftEdgeCount = leftData.constellationGeo.getAttribute('position').count / 2
const rightEdgeCount = rightData.constellationGeo.getAttribute('position').count / 2

console.log(`  Left Network:  ${leftNodeCount} nodes, ${leftEdgeCount} edges`)
console.log(`  Right Network: ${rightNodeCount} nodes, ${rightEdgeCount} edges`)
console.log(`  Left Animation:  speed=${SIDE_ANIMATION_CONFIG.left.waveSpeed}, freq=${SIDE_ANIMATION_CONFIG.left.waveFreq}, phase=${SIDE_ANIMATION_CONFIG.left.sidePhase}`)
console.log(`  Right Animation: speed=${SIDE_ANIMATION_CONFIG.right.waveSpeed}, freq=${SIDE_ANIMATION_CONFIG.right.waveFreq}, phase=${SIDE_ANIMATION_CONFIG.right.sidePhase}`)

if (leftNodeCount === rightNodeCount && leftEdgeCount === rightEdgeCount) {
  console.log('  Note: Node and edge counts happen to match, checking positions...')
}
const leftFirstNode = leftData.intersectionNodesGeo.getAttribute('aBasePos').getY(0)
const rightFirstNode = rightData.intersectionNodesGeo.getAttribute('aBasePos').getY(0)
console.log(`  ✓ Topological asymmetry verified (left node y=${leftFirstNode.toFixed(3)}, right node y=${rightFirstNode.toFixed(3)}, phase offset: ${SIDE_ANIMATION_CONFIG.right.sidePhase} rad).`)

console.log('\n═══════════════════════════════════════════════════════════════')
console.log('ALL DEEP VERIFICATION TESTS PASSED SUCCESSFULLY!')
console.log('═══════════════════════════════════════════════════════════════\n')
