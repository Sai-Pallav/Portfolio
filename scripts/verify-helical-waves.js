import * as THREE from 'three'
import { getSideWireData } from '../src/components/sections/contact/neuralWire/generateWireGeometry.js'

// JavaScript implementation of the proposed computeNeuralDeformation
function computeNeuralDeformationJS(basePos, u, weight, time, waveSpeed, rotSpeed, waveAmp, twist, sidePhase) {
  if (weight <= 0.0001) {
    return { pos: basePos.clone(), depthCue: 1.0 }
  }

  // Distance from outer emission boundary (s = 0 at outer edge, s = 1 at inner taper)
  const s = 1.0 - u

  // Inward propagating traveling wave and rotational phases
  const wavePhase = (twist * 1.5) * s - time * waveSpeed + sidePhase
  const rotPhase  = twist * s - time * rotSpeed + sidePhase

  // Local transverse and depth coordinates relative to stable formation centerline spine
  const ySpine = 0.3164 * u * u
  const deltaY = basePos.y - ySpine
  const deltaZ = basePos.z

  // 1. Traveling Helical Corkscrew Undulation along local direction of travel
  const sinW = Math.sin(wavePhase)
  const cosW = Math.cos(wavePhase)
  const waveY = (sinW * 0.028 + Math.cos(wavePhase * 2.0) * 0.008) * waveAmp
  const waveZ = (cosW * 0.048) * waveAmp

  // 2. Coherent Cross-Sectional Roll & Layer Depth Exchange
  const cosR = Math.cos(rotPhase)
  const sinR = Math.sin(rotPhase)

  const rollZ = deltaZ * cosR + deltaY * sinR * 0.08
  const rollY = deltaZ * sinR * 0.12

  const fullDeformedPos = new THREE.Vector3(
    basePos.x,
    basePos.y + waveY + rollY,
    rollZ + waveZ
  )

  const finalPos = new THREE.Vector3().lerpVectors(basePos, fullDeformedPos, weight)
  const depthCue = Math.min(1.45, Math.max(0.65, 1.0 + finalPos.z * 0.60))

  return { pos: finalPos, depthCue }
}

const waveSpeed = (Math.PI * 2) / 10.0 // 10s wave cycle
const rotSpeed  = (Math.PI * 2) / 15.0 // 15s rotation cycle
const waveAmp   = 1.0
const twist     = Math.PI * 2          // 1 full turn along formation

console.log('═══════════════════════════════════════════════════════════════')
console.log('VERIFYING CONTINUOUS TRAVELING HELICAL NEURAL WAVES')
console.log('═══════════════════════════════════════════════════════════════')

// Test 1: Inward Wave Propagation Direction
console.log('\n[Test 1: Inward Wave Propagation from Outer Endpoint (u=1.0) to Inner (u=0.0)]')
let wave10s_t0_crest = -1
for (let u = 0; u <= 1.0; u += 0.001) {
  const s = 1.0 - u
  const phase = (twist * 1.5) * s - 0.0 * waveSpeed
  if (Math.abs(phase) < 0.01) {
    wave10s_t0_crest = u
    break
  }
}
console.log(`  At t = 0s: wave phase zero is at u = ${wave10s_t0_crest.toFixed(3)} (outer boundary)`)

// At t = 3.333s (1/3 of wave cycle)
let wave10s_t3_crest = -1
for (let u = 0; u <= 1.0; u += 0.001) {
  const s = 1.0 - u
  const phase = (twist * 1.5) * s - 3.3333 * waveSpeed
  if (Math.abs(phase) < 0.01) {
    wave10s_t3_crest = u
    break
  }
}
console.log(`  At t = 3.33s: wave phase zero has traveled inward to u = ${wave10s_t3_crest.toFixed(3)}`)
if (wave10s_t3_crest >= wave10s_t0_crest) {
  throw new Error('Wave is traveling outward instead of inward!')
}
console.log('  ✓ Wave strictly propagates inward (decreasing u)!')

// Test 2: Synchronized Phase Velocity of Wave and Rotation
const v_wave = waveSpeed / (twist * 1.5)
const v_rot  = rotSpeed / twist
console.log(`\n[Test 2: Coordinated Propagation Speed]`)
console.log(`  v_wave = ${v_wave.toFixed(6)} units/s`)
console.log(`  v_rot  = ${v_rot.toFixed(6)} units/s`)
if (Math.abs(v_wave - v_rot) > 1e-9) {
  throw new Error('Wave and rotation phase velocities are not synchronized!')
}
console.log('  ✓ Phase velocities are perfectly synchronized (identical propagation speed)!')

// Test 3: Root Endpoint Stability (u = 0.0 strictly invariant)
console.log('\n[Test 3: Root Endpoint Stability at u = 0.0 near Central Globe]')
const sides = ['left', 'right']
for (const side of sides) {
  const sidePhase = side === 'left' ? 0.0 : 0.42
  const data = getSideWireData(side)
  const corePos = data.primaryCoreGeo.getAttribute('position')
  const coreBase = data.primaryCoreGeo.getAttribute('aBasePos')
  const coreU = data.primaryCoreGeo.getAttribute('aU')
  const coreWeight = data.primaryCoreGeo.getAttribute('aWeight')

  let rootCount = 0
  for (let i = 0; i < corePos.count; i++) {
    const uVal = coreU.getX(i)
    if (uVal <= 0.0001) {
      rootCount++
      const wVal = coreWeight.getX(i)
      const bPos = new THREE.Vector3(coreBase.getX(i), coreBase.getY(i), coreBase.getZ(i))
      for (let t = 0; t <= 60; t += 2.5) {
        const { pos } = computeNeuralDeformationJS(bPos, uVal, wVal, t, waveSpeed, rotSpeed, waveAmp, twist, sidePhase)
        const dist = pos.distanceTo(bPos)
        if (dist > 1e-7) {
          throw new Error(`Root vertex moved! dist=${dist} at t=${t}`)
        }
      }
    }
  }
  console.log(`  ✓ ${side.toUpperCase()}: ${rootCount} root vertices tested across 25 time intervals: Exactly 0 displacement.`)
}

// Test 4: Front and Rear Wire Depth Exchange
console.log('\n[Test 4: Front and Rear Wire Depth Exchange]')
const frontPos = new THREE.Vector3(0, 0.5, 0.25)
const rearPos  = new THREE.Vector3(0, 0.5, -0.25)
const uSample  = 1.0
const wSample  = 1.0

// At t = 0
const pFront_t0 = computeNeuralDeformationJS(frontPos, uSample, wSample, 0, waveSpeed, rotSpeed, waveAmp, twist, 0).pos
const pRear_t0  = computeNeuralDeformationJS(rearPos, uSample, wSample, 0, waveSpeed, rotSpeed, waveAmp, twist, 0).pos

// At half a rotation cycle (t = 7.5s)
const pFront_tHalf = computeNeuralDeformationJS(frontPos, uSample, wSample, 7.5, waveSpeed, rotSpeed, waveAmp, twist, 0).pos
const pRear_tHalf  = computeNeuralDeformationJS(rearPos, uSample, wSample, 7.5, waveSpeed, rotSpeed, waveAmp, twist, 0).pos

console.log(`  At t = 0.0s: Front wire Z = ${pFront_t0.z.toFixed(3)}, Rear wire Z = ${pRear_t0.z.toFixed(3)}`)
console.log(`  At t = 7.5s: Front wire Z = ${pFront_tHalf.z.toFixed(3)}, Rear wire Z = ${pRear_tHalf.z.toFixed(3)}`)

if (pFront_t0.z <= 0 || pRear_t0.z >= 0) throw new Error('Initial front/rear setup unexpected')
if (pFront_tHalf.z >= 0 || pRear_tHalf.z <= 0) throw new Error('Front and rear did not exchange depth positions!')
console.log('  ✓ Front-facing and rear-facing positions naturally exchanged across rotation!')

// Test 5: Centerline and Screen Silhouette Preservation
console.log('\n[Test 5: Wave Centerline & Screen Silhouette Preservation]')
for (const side of sides) {
  const sidePhase = side === 'left' ? 0.0 : 0.42
  const data = getSideWireData(side)
  const corePos = data.primaryCoreGeo.getAttribute('position')
  const coreBase = data.primaryCoreGeo.getAttribute('aBasePos')
  const coreU = data.primaryCoreGeo.getAttribute('aU')
  const coreWeight = data.primaryCoreGeo.getAttribute('aWeight')

  let maxTransverseDrift = 0
  let maxDepth = 0

  for (let i = 0; i < corePos.count; i++) {
    const uVal = coreU.getX(i)
    const wVal = coreWeight.getX(i)
    const bPos = new THREE.Vector3(coreBase.getX(i), coreBase.getY(i), coreBase.getZ(i))

    for (let t = 0; t <= 30; t += 1.0) {
      const { pos } = computeNeuralDeformationJS(bPos, uVal, wVal, t, waveSpeed, rotSpeed, waveAmp, twist, sidePhase)
      const dY = Math.abs(pos.y - bPos.y)
      if (dY > maxTransverseDrift) maxTransverseDrift = dY
      if (Math.abs(pos.z) > maxDepth) maxDepth = Math.abs(pos.z)
    }
  }

  console.log(`  ✓ ${side.toUpperCase()}: Max transverse displacement dy = ${maxTransverseDrift.toFixed(4)} (~${((maxTransverseDrift / 1.13) * 100).toFixed(1)}% of height)`)
  console.log(`  ✓ ${side.toUpperCase()}: Max depth range |z| = ${maxDepth.toFixed(4)}`)
  if (maxTransverseDrift > 0.08) {
    throw new Error(`Transverse displacement too large (${maxTransverseDrift}) - risks distorting silhouette!`)
  }
}

// Test 6: Node and Edge Endpoint Synchronization
console.log('\n[Test 6: Node and Edge Endpoint Synchronization]')
for (const side of sides) {
  const sidePhase = side === 'left' ? 0.0 : 0.42
  const data = getSideWireData(side)
  const nodesGeo = data.intersectionNodesGeo
  const constGeo = data.constellationGeo

  const nodePosAttr = nodesGeo.getAttribute('aBasePos')
  const nodeUAttr = nodesGeo.getAttribute('aU')
  const nodeWeightAttr = nodesGeo.getAttribute('aWeight')

  const constPosAttr = constGeo.getAttribute('aBasePos')
  const constUAttr = constGeo.getAttribute('aU')
  const constWeightAttr = constGeo.getAttribute('aWeight')

  let matchedEndpoints = 0
  let maxConnectionDiscrepancy = 0

  for (let n = 0; n < nodePosAttr.count; n++) {
    const nBase = new THREE.Vector3(nodePosAttr.getX(n), nodePosAttr.getY(n), nodePosAttr.getZ(n))
    const nU = nodeUAttr.getX(n)
    const nW = nodeWeightAttr.getX(n)

    for (let c = 0; c < constPosAttr.count; c++) {
      const cBase = new THREE.Vector3(constPosAttr.getX(c), constPosAttr.getY(c), constPosAttr.getZ(c))
      if (nBase.distanceTo(cBase) < 1e-4) {
        matchedEndpoints++
        const cU = constUAttr.getX(c)
        const cW = constWeightAttr.getX(c)

        for (let t = 0; t < 30; t += 2) {
          const nodeDeformed = computeNeuralDeformationJS(nBase, nU, nW, t, waveSpeed, rotSpeed, waveAmp, twist, sidePhase)
          const edgeDeformed = computeNeuralDeformationJS(cBase, cU, cW, t, waveSpeed, rotSpeed, waveAmp, twist, sidePhase)
          const diff = nodeDeformed.pos.distanceTo(edgeDeformed.pos)
          if (diff > maxConnectionDiscrepancy) maxConnectionDiscrepancy = diff
        }
      }
    }
  }
  console.log(`  ✓ ${side.toUpperCase()}: ${matchedEndpoints} matched node-edge endpoints tested: Max discrepancy = ${maxConnectionDiscrepancy.toExponential(3)} (strictly 0)`)
  if (maxConnectionDiscrepancy > 1e-6) {
    throw new Error('Node and edge endpoints detached during animation!')
  }
}

// Test 7: 30-Second Seamless Loop
console.log('\n[Test 7: 30-Second Seamless Loop Periodicity]')
const dataLeft = getSideWireData('left')
const corePos = dataLeft.primaryCoreGeo.getAttribute('position')
const coreBase = dataLeft.primaryCoreGeo.getAttribute('aBasePos')
const coreU = dataLeft.primaryCoreGeo.getAttribute('aU')
const coreWeight = dataLeft.primaryCoreGeo.getAttribute('aWeight')

let maxPeriodicDiff = 0
for (let i = 0; i < corePos.count; i++) {
  const uVal = coreU.getX(i)
  const wVal = coreWeight.getX(i)
  const bPos = new THREE.Vector3(coreBase.getX(i), coreBase.getY(i), coreBase.getZ(i))

  for (let t = 0; t < 30; t += 3) {
    const p1 = computeNeuralDeformationJS(bPos, uVal, wVal, t, waveSpeed, rotSpeed, waveAmp, twist, 0).pos
    const p2 = computeNeuralDeformationJS(bPos, uVal, wVal, t + 30.0, waveSpeed, rotSpeed, waveAmp, twist, 0).pos
    const diff = p1.distanceTo(p2)
    if (diff > maxPeriodicDiff) maxPeriodicDiff = diff
  }
}
console.log(`  ✓ Discrepancy between t and t+30.0s: ${maxPeriodicDiff.toExponential(3)} (strictly seamless loop)`)
if (maxPeriodicDiff > 1e-6) {
  throw new Error('Animation is not periodic over 30 seconds!')
}

console.log('\n═══════════════════════════════════════════════════════════════')
console.log('ALL HELICAL WAVE VERIFICATION TESTS PASSED SUCCESSFULLY!')
console.log('═══════════════════════════════════════════════════════════════\n')
