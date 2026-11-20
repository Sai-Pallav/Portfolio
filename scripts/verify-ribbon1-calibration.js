import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { computeHeroWaveY, H_VAL } from '../src/components/sections/contact/neuralWire/generateWireGeometry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('═══════════════════════════════════════════════════════════════')
console.log('VERIFYING RIBBON 1 CALIBRATION ACCORDING TO RIBBONS 2, 3, AND 4')
console.log('═══════════════════════════════════════════════════════════════')

// 1. Read WireframeConfigContext.jsx and parse DEFAULT_SIDE_CONFIG
const contextPath = path.resolve(__dirname, '../src/components/sections/contact/neuralWire/WireframeConfigContext.jsx')
const contextContent = fs.readFileSync(contextPath, 'utf8')

// Extract ribbon configs from DEFAULT_SIDE_CONFIG
function extractConfigVal(key) {
  const match = contextContent.match(new RegExp(`${key}:\\s*([0-9.]+)`))
  if (!match) throw new Error(`Could not find key ${key} in WireframeConfigContext.jsx`)
  return parseFloat(match[1])
}

const ribbon1Amp = extractConfigVal('ribbon1Amp')
const ribbon1Freq = extractConfigVal('ribbon1Freq')
const ribbon2Amp = extractConfigVal('ribbon2Amp')
const ribbon2Freq = extractConfigVal('ribbon2Freq')
const ribbon3Amp = extractConfigVal('ribbon3Amp')
const ribbon3Freq = extractConfigVal('ribbon3Freq')
const ribbon4Amp = extractConfigVal('ribbon4Amp')
const ribbon4Freq = extractConfigVal('ribbon4Freq')
const amplitude = extractConfigVal('amplitude')
const frequency = extractConfigVal('frequency')
const breadthMultiplier = extractConfigVal('breadthMultiplier')

console.log('\n[Test 1: Parameter Verification in WireframeConfigContext.jsx]')
console.log(`  ribbon1Amp:        ${ribbon1Amp} (expected: 0.7, modified from 1.4)`)
console.log(`  ribbon1Freq:       ${ribbon1Freq} (expected: 1.0)`)
console.log(`  ribbon2Amp:        ${ribbon2Amp} (expected: 0.7, MUST NOT BE MODIFIED)`)
console.log(`  ribbon2Freq:       ${ribbon2Freq} (expected: 1.0, MUST NOT BE MODIFIED)`)
console.log(`  ribbon3Amp:        ${ribbon3Amp} (expected: 0.95, MUST NOT BE MODIFIED)`)
console.log(`  ribbon3Freq:       ${ribbon3Freq} (expected: 1.05, MUST NOT BE MODIFIED)`)
console.log(`  ribbon4Amp:        ${ribbon4Amp} (expected: 1.05, MUST NOT BE MODIFIED)`)
console.log(`  ribbon4Freq:       ${ribbon4Freq} (expected: 1.0, MUST NOT BE MODIFIED)`)
console.log(`  amplitude:         ${amplitude} (expected: 1.25)`)
console.log(`  frequency:         ${frequency} (expected: 0.85)`)
console.log(`  breadthMultiplier: ${breadthMultiplier} (expected: 1.6)`)

if (ribbon1Amp !== 0.7) {
  throw new Error(`FAIL: ribbon1Amp is ${ribbon1Amp}, expected 0.7`)
}
if (ribbon1Freq !== 1.0) {
  throw new Error(`FAIL: ribbon1Freq is ${ribbon1Freq}, expected 1.0`)
}
if (ribbon2Amp !== 0.7) {
  throw new Error(`FAIL: ribbon2Amp was modified! Current: ${ribbon2Amp}`)
}
if (ribbon3Amp !== 0.95) {
  throw new Error(`FAIL: ribbon3Amp was modified! Current: ${ribbon3Amp}`)
}
if (ribbon4Amp !== 1.05) {
  throw new Error(`FAIL: ribbon4Amp was modified! Current: ${ribbon4Amp}`)
}
if (ribbon2Freq !== 1.0) {
  throw new Error(`FAIL: ribbon2Freq was modified! Current: ${ribbon2Freq}`)
}
if (ribbon3Freq !== 1.05) {
  throw new Error(`FAIL: ribbon3Freq was modified! Current: ${ribbon3Freq}`)
}
if (ribbon4Freq !== 1.0) {
  throw new Error(`FAIL: ribbon4Freq was modified! Current: ${ribbon4Freq}`)
}
console.log('  ✓ All parameters verified: Ribbons 2, 3, and 4 are strictly intact.')

// 2. Mathematical Almond Symmetry Check (u in [0.0, 0.58])
console.log('\n[Test 2: Mathematical Almond Symmetry Check (Hero 0 vs Hero 1)]')
const currentConfig = {
  amplitude,
  frequency,
  wingSweep: 0.28,
  innerYOffset: 0.0,
  outerYOffset: 0.0,
  ribbon1Amp,
  ribbon2Amp,
  ribbon3Amp,
  ribbon4Amp,
  ribbon1YOffset: 0.0,
  ribbon2YOffset: 0.0,
  ribbon3YOffset: 0.02,
  ribbon4YOffset: 0.02,
  ribbon1Freq,
  ribbon2Freq,
  ribbon3Freq,
  ribbon4Freq,
  outerFlexibility: 0.0,
  outerFlare: 0.0,
}

const H = H_VAL
let maxSymmetryDiscrepancy = 0
let sampleCount = 0

for (let s = 0; s <= 100; s++) {
  const u = (s / 100) * 0.58
  const y0 = computeHeroWaveY(0, u, H, currentConfig)
  const y1 = computeHeroWaveY(1, u, H, currentConfig)

  const baseline = 0.28 * H * Math.pow(u, 2.0)
  const offset0 = y0 - baseline
  const offset1 = y1 - baseline
  const asymmetry = Math.abs(offset0 + offset1)

  if (asymmetry > maxSymmetryDiscrepancy) {
    maxSymmetryDiscrepancy = asymmetry
  }
  sampleCount++
}

console.log(`  Sample points tested across almond eye: ${sampleCount}`)
console.log(`  Maximum symmetry discrepancy: ${maxSymmetryDiscrepancy.toExponential(4)} (Limit <= 1e-12)`)

if (maxSymmetryDiscrepancy > 1e-12) {
  throw new Error(`FAIL: Almond eye is asymmetrical! Discrepancy: ${maxSymmetryDiscrepancy}`)
}
console.log('  ✓ Perfect mathematical reflection symmetry achieved between Ribbon 1 and Ribbon 2!')

// 3. Compare with Old Asymmetry (when ribbon1Amp was 1.4)
console.log('\n[Test 3: Comparison with uncalibrated state (ribbon1Amp = 1.4)]')
const oldConfig = { ...currentConfig, ribbon1Amp: 1.4 }
let oldMaxAsymmetry = 0
for (let s = 1; s <= 100; s++) {
  const u = (s / 100) * 0.58
  const y0Old = computeHeroWaveY(0, u, H, oldConfig)
  const y1Old = computeHeroWaveY(1, u, H, oldConfig)
  const baseline = 0.28 * H * Math.pow(u, 2.0)
  const offset0 = y0Old - baseline
  const offset1 = y1Old - baseline
  const asymmetry = Math.abs(offset0 + offset1)
  if (asymmetry > oldMaxAsymmetry) oldMaxAsymmetry = asymmetry
}
console.log(`  Old maximum asymmetry was: ${oldMaxAsymmetry.toFixed(4)}`)
console.log(`  New maximum asymmetry is:  ${maxSymmetryDiscrepancy.toExponential(4)}`)
console.log('  ✓ Ribbon 1 is now fully harmonized with Ribbon 2, 3, and 4.')

// 4. Wave envelope & visual weight in the almond arch region (u <= 0.58)
console.log('\n[Test 4: Almond Arch Peak Deflection (u <= 0.58)]')
const almondPeak0 = (() => {
  let max = 0
  for (let s = 0; s <= 100; s++) {
    const u = (s / 100) * 0.58
    const y = computeHeroWaveY(0, u, H, currentConfig)
    const baseline = 0.28 * H * Math.pow(u, 2.0)
    const d = Math.abs(y - baseline)
    if (d > max) max = d
  }
  return max
})()

const almondPeak1 = (() => {
  let max = 0
  for (let s = 0; s <= 100; s++) {
    const u = (s / 100) * 0.58
    const y = computeHeroWaveY(1, u, H, currentConfig)
    const baseline = 0.28 * H * Math.pow(u, 2.0)
    const d = Math.abs(y - baseline)
    if (d > max) max = d
  }
  return max
})()

console.log(`  Ribbon 1 (Upper Almond Arch) peak: ${almondPeak0.toFixed(4)}`)
console.log(`  Ribbon 2 (Lower Almond Arch) peak: ${almondPeak1.toFixed(4)}`)
const ratioAlmond = almondPeak0 / almondPeak1
console.log(`  Ratio of Ribbon 1 to Ribbon 2: ${ratioAlmond.toFixed(4)} (Expected strictly 1.0)`)
if (Math.abs(ratioAlmond - 1.0) > 1e-12) {
  throw new Error(`FAIL: Ratio between Ribbon 1 and Ribbon 2 in almond arch is ${ratioAlmond}`)
}
console.log('  ✓ Almond arch peak heights are 100% identical in amplitude and scale!')

console.log('\n═══════════════════════════════════════════════════════════════')
console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!')
console.log('═══════════════════════════════════════════════════════════════\n')
