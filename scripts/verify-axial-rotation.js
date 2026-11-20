import * as THREE from 'three'
import { getSideWireData } from '../src/components/sections/contact/neuralWire/generateWireGeometry.js'
import { NEURAL_DEFORMATION_GLSL, ANIMATION_CONTRACT_VERSION } from '../src/components/sections/contact/neuralWire/animationContract.js'

console.log('═══════════════════════════════════════════════════════════════')
console.log(`DEEP VERIFICATION: CONTINUOUS TRAVELING HELICAL NEURAL WAVES (v${ANIMATION_CONTRACT_VERSION})`)
console.log('═══════════════════════════════════════════════════════════════')
console.log(`GLSL Shader length: ${NEURAL_DEFORMATION_GLSL.length} characters`)

// JavaScript implementation of the exact GLSL computeNeuralDeformation function
function computeNeuralDeformationJS(basePos, u, weight, time, waveSpeed, rotSpeed, waveAmp, twist, sidePhase) {
  if (weight <= 0.0001) {
    return { pos: basePos.clone(), depthCue: 1.0 }
  }

  // Distance from outer emission boundary (s = 0.0 at outer edge, s = 1.0 at inner taper)
  const s = 1.0 - u

  // Inward propagating traveling wave and rotational phases
  const wavePhase = (twist * 1.5) * s - time * waveSpeed + sidePhase
  const rotPhase = twist * s - time * rotSpeed + sidePhase

  // 1. Traveling Helical Wave Undulation (corkscrew along local travel direction)
  const waveY = (Math.sin(wavePhase) * 0.024 + Math.cos(wavePhase * 2.0) * 0.008) * waveAmp
  const waveZ = (Math.cos(wavePhase) * 0.032) * waveAmp

  // 2. Coherent Cross-Sectional Roll & Layer Depth Exchange
  const cosR = Math.cos(rotPhase)
  const sinR = Math.sin(rotPhase)

  const rollZ = basePos.z * cosR
  const rollY = basePos.z * sinR * 0.085

  const deformedPos = new THREE.Vector3(
    basePos.x,
    basePos.y + (rollY + waveY) * weight,
    (rollZ + waveZ) * weight
  )

  const finalPos = new THREE.Vector3().lerpVectors(basePos, deformedPos, weight)
  const depthCue = Math.min(1.30, Math.max(0.70, 1.0 + finalPos.z * 0.45))
  return { pos: finalPos, depthCue }
}

const waveSpeed = (2 * Math.PI) / 10.0 // 10s wave propagation period
const rotSpeed = (2 * Math.PI) / 15.0 // 15s rotational period
const waveAmp = 1.0
const twist = 2 * Math.PI          // 1 full turn along formation

// 1. Verify Left and Right Networks
const sides = ['left', 'right']

for (const side of sides) {
  console.log(`\n─── Testing ${side.toUpperCase()} Network ───`)
  const sidePhase = side === 'left' ? 0.0 : 0.42
  const data = getSideWireData(side)

  const requiredGeos = [
    { name: 'primaryCoreGeo', geo: data.primaryCoreGeo },
    { name: 'primaryHaloGeo', geo: data.primaryHaloGeo },
    { name: 'secondaryGeo', geo: data.secondaryGeo },
    { name: 'depthGeo', geo: data.depthGeo },
    { name: 'subFilamentsGeo', geo: data.subFilamentsGeo },
    { name: 'constellationGeo', geo: data.constellationGeo },
    { name: 'focalFlaresGeo', geo: data.focalFlaresGeo },
    { name: 'intersectionNodesGeo', geo: data.intersectionNodesGeo },
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

  // B. Test Root Endpoint Stability (u = 0 near Central Globe)
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

        // Test across 25 different moments in time
        for (let t = 0; t <= 60; t += 2.5) {
          const { pos: deformed } = computeNeuralDeformationJS(bPos, uVal, wVal, t, waveSpeed, rotSpeed, waveAmp, twist, sidePhase)
          const dist = deformed.distanceTo(bPos)
          if (dist > 1e-6) {
            throw new Error(`Root endpoint moved at t=${t}! dist=${dist}`)
          }
        }
      }
    }
  }
  console.log(`  ✓ ${rootVerticesTested} root vertices at u=0 tested across 25 time intervals: Zero displacement (strictly fixed).`)

  // C. Test 30-Second Seamless Loop (Periodicity of Full 3D Vertex Positions)
  console.log('\n  [Test: 30-Second Seamless Periodic Cycle]')
  const T = 30.0 // 30-second common harmonic period (3 wave cycles, 2 rotation cycles)
  const corePos = data.primaryCoreGeo.getAttribute('position')
  const coreBase = data.primaryCoreGeo.getAttribute('aBasePos')
  const coreU = data.primaryCoreGeo.getAttribute('aU')
  const coreWeight = data.primaryCoreGeo.getAttribute('aWeight')

  let maxPeriodicDiff = 0
  for (let i = 0; i < corePos.count; i++) {
    const uVal = coreU.getX(i)
    const wVal = coreWeight.getX(i)
    const bPos = new THREE.Vector3(coreBase.getX(i), coreBase.getY(i), coreBase.getZ(i))

    for (let t = 0; t < 30; t += 2.5) {
      const p1 = computeNeuralDeformationJS(bPos, uVal, wVal, t, waveSpeed, rotSpeed, waveAmp, twist, sidePhase).pos
      const p2 = computeNeuralDeformationJS(bPos, uVal, wVal, t + T, waveSpeed, rotSpeed, waveAmp, twist, sidePhase).pos
      const diff = p1.distanceTo(p2)
      if (diff > maxPeriodicDiff) maxPeriodicDiff = diff
    }
  }
  console.log(`  ✓ Max position discrepancy between t and t+30.0s: ${maxPeriodicDiff.toExponential(3)} (strictly seamless).`)
  if (maxPeriodicDiff > 1e-6) {
    throw new Error(`Position did not loop seamlessly over period T! diff=${maxPeriodicDiff}`)
  }

  // D. Test Forward Depth Illusion & Centerline Preservation across ALL vertices
  console.log('\n  [Test: Forward Depth Illusion & Centerline Preservation]')
  let minZ = Infinity
  let maxZ = -Infinity
  let maxTransverseDrift = 0

  for (let i = 0; i < corePos.count; i++) {
    const uVal = coreU.getX(i)
    const wVal = coreWeight.getX(i)
    const base = new THREE.Vector3(coreBase.getX(i), coreBase.getY(i), coreBase.getZ(i))

    for (let step = 0; step < 20; step++) {
      const t = (step / 20) * T
      const { pos } = computeNeuralDeformationJS(base, uVal, wVal, t, waveSpeed, rotSpeed, waveAmp, twist, sidePhase)
      const dY = Math.abs(pos.y - base.y)
      if (dY > maxTransverseDrift) maxTransverseDrift = dY
      if (pos.z < minZ) minZ = pos.z
      if (pos.z > maxZ) maxZ = pos.z
    }
  }
  console.log(`  ✓ Max transverse displacement dy: ${maxTransverseDrift.toFixed(4)} (~${((maxTransverseDrift / 1.13) * 100).toFixed(1)}% of height - silhouette strictly preserved).`)
  console.log(`  ✓ Volumetric depth range: Z in [${minZ.toFixed(3)}, ${maxZ.toFixed(3)}] (natural 3D helical roll).`)
  if (maxTransverseDrift > 0.08) {
    throw new Error(`Silhouette distorted: dy=${maxTransverseDrift}`)
  }
  if (minZ > -0.2 || maxZ < 0.2) {
    throw new Error(`Depth illusion insufficient! minZ=${minZ}, maxZ=${maxZ}`)
  }

  // E. Test Node & Constellation Edge Connectivity
  console.log('\n  [Test: Node & Edge Endpoint Synchronization]')
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
  console.log(`  ✓ Matched node-edge endpoints tested: ${matchedEndpoints}`)
  console.log(`  ✓ Max node-edge discrepancy during continuous rotation: ${maxConnectionDiscrepancy.toExponential(3)} (strictly 0).`)
  if (maxConnectionDiscrepancy > 1e-5) {
    throw new Error('Node and connection edge detached during rotation!')
  }
}

console.log('\n═══════════════════════════════════════════════════════════════')
console.log('ALL DEEP VERIFICATION TESTS PASSED SUCCESSFULLY!')
console.log('═══════════════════════════════════════════════════════════════\n')
