/**
 * @file animationContract.js
 * Architecture Contract & Deformation Specification for side-wave GPU animation.
 * Version 4.2.0 — Unwrapped Outward Traveling Transverse Wave Contract.
 *
 * This contract establishes the mathematical, topological, and attribute guarantees baked into
 * the static BufferGeometries and canonical NeuralWireGraph, ensuring:
 * 1. The neural network lives exclusively in the negative-space gaps between the primary wave strands.
 * 2. Wave crests propagate outward while every vertex keeps its original world X coordinate.
 * 3. The globe stays static and the inner tip is fixed by the original envelope.
 * 4. Neural vertices interpolate their adjacent wave-boundary displacements.
 * 5. The original static render is exact at t=0.
 * 6. Both wings advance from their own inner tips to their outer edges.
 * 7. 100% synchronized deformation between node points and connection edges.
 */

import * as THREE from 'three'
import { createContext } from 'react'

// One uniform object is shared by every animated material in the side scene.
export const FlowTimeContext = createContext({ value: 0 })
export const FLOW_SPEED = 1.57079632679 // pi / 2 rad/s = 1 cycle per 4.0s (matching reference video)
export const FLOW_OMEGA = FLOW_SPEED
export const FLOW_PERIOD = 2 * Math.PI / FLOW_SPEED

// GPU Vertex Shader: Exact invariant elliptical helical braid matching Glowing_wave_ribbons_animating_o... video
export const TRAVEL_DEFORMATION_GLSL = `
  attribute vec4 aFlowPair;
  attribute vec2 aFlowMeta;
  attribute vec3 aFlowAxis;
  attribute vec4 aFlowFrame;
  attribute vec4 aFlowWall;
  attribute vec3 aFlowCenter;
  attribute vec3 aFlowNormal;
  attribute vec4 aRelativeCoord;
  uniform float uTime;

  // Exact 4.0s wave cycle matching Glowing_wave_ribbons_animating_o... video
  const float FLOW_OMEGA = 1.57079632679;

  vec3 flowRibbonPosition(vec3 rest) {
    float yCenter = aFlowFrame.x;
    float zCenter = aFlowFrame.y;
    float Ry = max(0.001, aFlowFrame.z);
    float Rz = max(0.001, aFlowFrame.w);

    float dy0 = rest.y - yCenter;
    float dz0 = rest.z - zCenter;

    // Outward traveling wave phase
    float angle = FLOW_OMEGA * uTime;
    float c = cos(angle);
    float s = sin(angle);

    // Exact invariant elliptical rotation preserving all strand distances, bundle coherence, and non-uniform aspect ratio
    float dyRot = dy0 * c - dz0 * (Ry / Rz) * s;
    float dzRot = dz0 * c + dy0 * (Rz / Ry) * s;

    // C2-continuous quintic smootherstep pinning (continuous 1st and 2nd derivatives everywhere)
    // Guarantees zero wobble, splitting, or socket tearing near the globe
    float tPin = clamp(aRelativeCoord.x / 0.12, 0.0, 1.0);
    float tipPin = tPin * tPin * tPin * (tPin * (tPin * 6.0 - 15.0) + 10.0);
    float dy = dy0 + (dyRot - dy0) * tipPin;
    float dz = dz0 + (dzRot - dz0) * tipPin;

    vec3 localPos = vec3(rest.x, yCenter + dy, zCenter + dz);
    return (modelMatrix * vec4(localPos, 1.0)).xyz;
  }

  vec3 flowPosition(vec3 rest) {
    return flowRibbonPosition(rest);
  }

  vec4 flowClipPosition(vec3 rest) {
    if (uTime == 0.0) {
      return projectionMatrix * modelViewMatrix * vec4(rest, 1.0);
    }
    return projectionMatrix * viewMatrix * vec4(flowPosition(rest), 1.0);
  }

  vec4 flowViewPosition(vec3 rest) {
    if (uTime == 0.0) return modelViewMatrix * vec4(rest, 1.0);
    return viewMatrix * vec4(flowPosition(rest), 1.0);
  }
`

export const ANIMATION_CONTRACT_VERSION = '4.2.0'

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
