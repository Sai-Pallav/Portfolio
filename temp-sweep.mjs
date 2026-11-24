import { readFileSync, unlinkSync } from 'fs'
import { runInNewContext } from 'vm'
import * as THREE from 'three'
import { FLOW_OMEGA } from './src/components/sections/contact/neuralWire/animationContract.js'

const configSource = readFileSync('src/components/sections/contact/neuralWire/WireframeConfigContext.jsx', 'utf8')
const configMatch = configSource.match(/export const DEFAULT_SIDE_CONFIG = (\{[\s\S]*?\n\})/)
const DEFAULT_SIDE_CONFIG = runInNewContext('(' + configMatch[1] + ')')

const H_VAL = 1.13
const HERO_PHASES = [0, Math.PI, 0.5 * Math.PI, 1.5 * Math.PI]
const HERO_SCALE = 0.46

function wingSweep(u, H, sweepVal = 0.28) {
  return sweepVal * H * Math.pow(u, 2.0)
}

function makeEnv(innerTightness, midRamp, outerCap, satK) {
  return function(u, H) {
    const safeU = Math.max(0.0, u)
    const innerPinch = THREE.MathUtils.smootherstep(safeU, 0.0, innerTightness)
    const ramp = Math.pow(safeU, midRamp)
    const sat = Math.tanh(satK * ramp) / Math.tanh(satK)
    return H * outerCap * innerPinch * sat
  }
}

const auditUStations = [0.15, 0.30, 0.50, 0.70, 0.85, 1.00]
const auditPhases = [0.0, 0.5, 1.0, 2.0, 3.0]

function checkParams(inner, ramp, cap, k) {
  const envFn = makeEnv(inner, ramp, cap, k)
  const loopHeights = auditUStations.map(u => {
    const outerT = THREE.MathUtils.smootherstep(u, 0.48, 1.0)
    const e = envFn(u, H_VAL) * (1.0 + 0.15 * (DEFAULT_SIDE_CONFIG.outerFlexibility ?? 0) * outerT)
    const ampY = e * DEFAULT_SIDE_CONFIG.amplitude * HERO_SCALE
    return 2 * ampY
  })

  let heroMonotone = true
  const phaseDeltas = []
  for (const t of auditPhases) {
    let prev = -1
    for (const u of auditUStations) {
      const ys = []
      for (let i = 0; i < 4; i++) {
        const outerT = THREE.MathUtils.smootherstep(u, 0.48, 1.0)
        const e = envFn(u, H_VAL) * (1.0 + 0.15 * (DEFAULT_SIDE_CONFIG.outerFlexibility ?? 0) * outerT)
        const biasY = wingSweep(u, H_VAL, DEFAULT_SIDE_CONFIG.wingSweep)
          + THREE.MathUtils.smootherstep(u, 0.25, 1.0) * DEFAULT_SIDE_CONFIG.outerYOffset
        const ampY = e * DEFAULT_SIDE_CONFIG.amplitude * HERO_SCALE
        const phase = 2.5 * Math.PI * DEFAULT_SIDE_CONFIG.frequency * u + HERO_PHASES[i]
        ys.push(biasY + ampY * Math.sin(phase - FLOW_OMEGA * t))
      }
      const dY = Math.max(...ys) - Math.min(...ys)
      if (dY <= prev) { heroMonotone = false }
      prev = dY
    }
  }

  return { loopHeights, heroMonotone }
}

for (const inner of [0.16, 0.18, 0.20]) {
  for (const ramp of [1.20, 1.25, 1.28, 1.30, 1.33, 1.35]) {
    for (const cap of [0.75, 0.78, 0.80, 0.82, 0.84, 0.86, 0.88]) {
      for (const k of [0.50, 0.55, 0.60, 0.65, 0.70]) {
        const res = checkParams(inner, ramp, cap, k)
        const [h15, h30, h50, h70, h85, h100] = res.loopHeights
        if (res.heroMonotone &&
            h15 >= 0.09 && h15 <= 0.13 &&
            h30 >= 0.26 && h30 <= 0.34 &&
            h50 >= 0.55 && h50 <= 0.68 &&
            h70 >= 0.85 && h70 <= 0.98 &&
            h85 >= 1.05 && h85 <= 1.20 &&
            h100 >= 1.18 && h100 <= 1.32) {
          console.log(`MATCH: inner=${inner}, ramp=${ramp}, cap=${cap}, k=${k} -> loops: [${res.loopHeights.map(h => h.toFixed(3)).join(', ')}]`)
        }
      }
    }
  }
}
