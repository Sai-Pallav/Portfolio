/**
 * @file animationContract.js
 * Architecture Contract & Deformation Specification for Phase 3 GPU-Based Neural Network Animation.
 * Version 4.0.0 — Outward Traveling 3D Corkscrew Neural Graph Contract.
 *
 * This contract establishes the mathematical, topological, and attribute guarantees baked into
 * the static BufferGeometries and canonical NeuralWireGraph, ensuring:
 * 1. The neural network lives exclusively in the negative-space gaps between the primary wave strands.
 * 2. Primary wave strands (Hero 0..3) and central globe are strictly protected and un-rotated.
 * 3. Subtle 3D corkscrew rotation propagates strictly OUTWARD: inner tip (u=0) -> outer edge (u=1).
 * 4. Progressive development: minimal rotation near the central globe (u < 0.10), developing outward.
 * 5. Coherent 3D volumetric depth exchange (Z-depth oscillation) with restrained vertical travel (Y).
 * 6. Left and right networks animate simultaneously with organic subtle asymmetry (seeds, timing, phases).
 * 7. 100% synchronized deformation between node points and connection edges.
 */

import * as THREE from 'three'

export const ANIMATION_CONTRACT_VERSION = '4.0.0'

export const SIDE_ANIMATION_CONFIG = {
  left: {
    waveSpeed: 0.55,       // rad/s (approx 11.4s period)
    waveFreq: 11.62,       // k (approx 1.85 cycles along formation)
    rotIntensity: 1.0,     // amplitude multiplier
    sidePhase: 0.0,        // starting phase
    seed: 104729,          // deterministic PRNG seed for topology
  },
  right: {
    waveSpeed: 0.48,       // slightly slower, organic difference
    waveFreq: 12.25,       // slightly higher cycle density
    rotIntensity: 1.0,
    sidePhase: 0.65,       // phase offset for organic asymmetry
    seed: 1299709,         // distinct PRNG seed
  },
}

/**
 * GLSL Vertex Shader Deformation Function.
 * Evaluates the exact outward propagation corkscrew roll.
 */
export const NEURAL_DEFORMATION_GLSL = `
uniform float uTime;
uniform float uWaveSpeed;
uniform float uWaveFreq;
uniform float uRotIntensity;
uniform float uSidePhase;

vec3 computeNeuralDeformation(vec3 basePos, float u, float weight, float layer) {
  if (weight <= 0.0001) return basePos;

  // Outward traveling wave phase:
  // u = 0.0 (inner tip near globe) -> u = 1.0 (outer viewport edge)
  // Continuous travelling phase: angle = k * u - omega * time + sidePhase
  float angle = uWaveFreq * u - uWaveSpeed * uTime + uSidePhase;

  // Progressive rotational intensity envelope:
  // Strictly 0 near globe (u < 0.08), smoothly developing outward
  float innerEnv = smoothstep(0.06, 0.32, u);
  float outerRamp = mix(0.40, 1.0, smoothstep(0.32, 0.95, u));
  float amp = innerEnv * outerRamp * weight * uRotIntensity;

  // Formation center parabolic sweep
  float yCenter = 0.3164 * u * u;
  float deltaY = basePos.y - yCenter;
  float deltaZ = basePos.z;

  // 3D Corkscrew deformation:
  // 1. Helical wave displacement along local propagation
  float sinA = sin(angle);
  float cosA = cos(angle);
  float waveY = sinA * (0.020 * 1.13) * amp;
  float waveZ = cosA * (0.120 * 1.13) * amp;

  // 2. Coherent cross-sectional roll & layer depth exchange
  float rollY = (-deltaZ * sinA * 0.075 + deltaY * (cosA - 1.0) * 0.030) * amp;
  float rollZ = (deltaZ * (cosA - 1.0) + deltaY * sinA * 0.120) * amp;

  return vec3(
    basePos.x,
    basePos.y + waveY + rollY,
    basePos.z + waveZ + rollZ
  );
}
`

/**
 * Pure JavaScript equivalent of computeNeuralDeformation for testing and verification.
 */
export function computeNeuralDeformationJS(
  basePos,
  u,
  weight,
  layer = 0.0,
  time = 0.0,
  waveSpeed = 0.55,
  waveFreq = 11.62,
  rotIntensity = 1.0,
  sidePhase = 0.0
) {
  if (weight <= 0.0001) {
    return { pos: basePos.clone(), depthCue: 1.0 }
  }

  // Outward traveling wave phase: angle = k * u - omega * time + sidePhase
  const angle = waveFreq * u - waveSpeed * time + sidePhase

  // Progressive envelope: strictly 0 near globe
  const innerEnv = THREE.MathUtils.smoothstep(u, 0.06, 0.32)
  const outerRamp = THREE.MathUtils.lerp(0.40, 1.0, THREE.MathUtils.smoothstep(u, 0.32, 0.95))
  const amp = innerEnv * outerRamp * weight * rotIntensity

  const yCenter = 0.3164 * u * u
  const deltaY = basePos.y - yCenter
  const deltaZ = basePos.z

  // 3D Corkscrew deformation
  const sinA = Math.sin(angle)
  const cosA = Math.cos(angle)
  const waveY = sinA * (0.020 * 1.13) * amp
  const waveZ = cosA * (0.120 * 1.13) * amp

  const rollY = (-deltaZ * sinA * 0.075 + deltaY * (cosA - 1.0) * 0.030) * amp
  const rollZ = (deltaZ * (cosA - 1.0) + deltaY * sinA * 0.120) * amp

  const deformedPos = new THREE.Vector3(
    basePos.x,
    basePos.y + waveY + rollY,
    basePos.z + waveZ + rollZ
  )

  const depthCue = Math.min(1.40, Math.max(0.65, 1.0 + (deformedPos.z + layer * 0.02) * 0.50))
  return { pos: deformedPos, depthCue }
}
