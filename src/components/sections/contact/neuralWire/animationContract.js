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
export const FLOW_SPEED = 0.22
export const FLOW_OMEGA = FLOW_SPEED
export const FLOW_PERIOD = 2 * Math.PI / FLOW_SPEED

// aFlowPair stores lower/upper traveling profiles as (amplitude, phase) pairs.
// aFlowFrame stores the static local pocket frame as (centerY, centerZ,
// radiusY, radiusZ). aFlowMeta.x is the lower/upper interpolation coordinate
// and aFlowMeta.y is the static wall gap for neural geometry.
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

  const float FLOW_ROLL_LIMIT = 0.58;
  const float FLOW_EPSILON = 0.0001;

  // The phase clock is never wrapped or reversed. For a positive spatial
  // phase slope k, theta = k*u - omega*uTime gives du/dt = omega/k > 0.
  // Subtracting the t=0 sample preserves exact baseline parity while the
  // crest/trough pattern continues to travel outward over every cycle.
  vec2 flowTravelDelta(vec2 harmonic) {
    float theta0 = harmonic.y;
    float theta = theta0 - ${FLOW_OMEGA.toFixed(2)} * uTime;
    vec2 sample0 = vec2(sin(theta0), 0.82 * cos(theta0));
    vec2 sampleT = vec2(sin(theta), 0.82 * cos(theta));
    return harmonic.x * (sampleT - sample0);
  }

  float flowTravelRoll(vec2 harmonic) {
    vec2 delta = flowTravelDelta(harmonic);
    return clamp(0.72 * delta.x + 0.18 * delta.y, -FLOW_ROLL_LIMIT, FLOW_ROLL_LIMIT);
  }

  vec3 flowTangent() {
    return normalize((modelMatrix * vec4(aFlowAxis, 0.0)).xyz);
  }

  vec3 flowN0() {
    return normalize((modelMatrix * vec4(aFlowNormal, 0.0)).xyz);
  }

  vec3 flowB0() {
    vec3 tangent = flowTangent();
    vec3 n0 = flowN0();
    return normalize(cross(tangent, n0)) * sign(aFlowAxis.x);
  }

  float flowScaleY() {
    return length((modelMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  }

  float flowScaleZ() {
    return length((modelMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
  }

  vec3 rotateAroundFlowTangent(vec3 vector, vec3 tangent, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vector * c + cross(tangent, vector) * s + tangent * dot(tangent, vector) * (1.0 - c);
  }

  float flowSafeRoll(float requested, vec3 n0, vec3 b0, float halfGap) {
    float safeOpen = max(0.035, 0.52 * halfGap * abs(n0.y));
    float minNy = clamp(safeOpen / max(halfGap, FLOW_EPSILON), 0.42, 0.92);
    float maxRoll = min(FLOW_ROLL_LIMIT, acos(minNy));
    float bounded = clamp(requested, -maxRoll, maxRoll);
    vec3 candidate = rotateAroundFlowTangent(n0, flowTangent(), bounded);
    return abs(candidate.y) * halfGap >= safeOpen ? bounded : 0.0;
  }

  vec3 flowRibbonPosition(vec3 rest, vec3 tangent, vec3 n0, vec3 b0) {
    vec3 worldCenter = (modelMatrix * vec4(aFlowCenter, 1.0)).xyz;
    float scaleY = flowScaleY();
    float scaleZ = flowScaleZ();
    float localOffsetY = (rest.y - aFlowFrame.x) * scaleY;
    float localOffsetZ = (rest.z - aFlowFrame.y) * scaleZ;
    float eta = clamp(aFlowMeta.x, 0.0, 1.0);
    float roll = mix(flowTravelRoll(aFlowPair.xy), flowTravelRoll(aFlowPair.zw), eta);
    float halfGap = max(aFlowFrame.z * scaleY, FLOW_EPSILON);
    roll = flowSafeRoll(roll, n0, b0, halfGap);
    vec3 n = normalize(rotateAroundFlowTangent(n0, tangent, roll));
    vec3 b = normalize(cross(tangent, n));
    vec2 delta = mix(flowTravelDelta(aFlowPair.xy), flowTravelDelta(aFlowPair.zw), eta);
    vec3 centerShift = delta.x * scaleY * n0 + delta.y * scaleZ * b0;
    return worldCenter + centerShift + localOffsetY * n + localOffsetZ * b;
  }

  vec3 flowWallRestPosition(float restX, vec2 localOffset, vec3 n0, vec3 b0) {
    vec3 worldCenter = (modelMatrix * vec4(aFlowCenter, 1.0)).xyz;
    return worldCenter + localOffset.x * flowScaleY() * n0 + localOffset.y * flowScaleZ() * b0;
  }

  vec3 flowWallPosition(float restX, vec2 localOffset, vec2 harmonic, vec3 tangent, vec3 n0, vec3 b0) {
    vec3 worldCenter = (modelMatrix * vec4(aFlowCenter, 1.0)).xyz;
    float scaleY = flowScaleY();
    float scaleZ = flowScaleZ();
    float halfGap = max(aFlowFrame.z * scaleY, FLOW_EPSILON);
    float roll = flowSafeRoll(flowTravelRoll(harmonic), n0, b0, halfGap);
    vec3 n = normalize(rotateAroundFlowTangent(n0, tangent, roll));
    vec3 b = normalize(cross(tangent, n));
    vec2 delta = flowTravelDelta(harmonic);
    vec3 centerShift = delta.x * scaleY * n0 + delta.y * scaleZ * b0;
    return worldCenter + centerShift + localOffset.x * scaleY * n + localOffset.y * scaleZ * b;
  }

  vec3 flowNeuralPosition(vec3 rest, vec3 tangent, vec3 n0, vec3 b0) {
    float scaleY = flowScaleY();
    float scaleZ = flowScaleZ();
    vec3 lower0 = flowWallRestPosition(rest.x, aFlowWall.xy, n0, b0);
    vec3 upper0 = flowWallRestPosition(rest.x, aFlowWall.zw, n0, b0);
    vec3 lowerT = flowWallPosition(rest.x, aFlowWall.xy, aFlowPair.xy, tangent, n0, b0);
    vec3 upperT = flowWallPosition(rest.x, aFlowWall.zw, aFlowPair.zw, tangent, n0, b0);

    vec3 staticCenter = 0.5 * (lower0 + upper0);
    vec3 movingCenter = 0.5 * (lowerT + upperT);
    vec3 staticNormal = normalize(upper0 - lower0);
    vec3 movingNormal = normalize(upperT - lowerT);
    vec3 staticDepth = normalize(cross(tangent, staticNormal));
    vec3 movingDepth = normalize(cross(tangent, movingNormal));
    if (dot(staticDepth, b0) < 0.0) staticDepth = -staticDepth;
    if (dot(movingDepth, b0) < 0.0) movingDepth = -movingDepth;

    float staticHalfGap = max(0.5 * length(upper0 - lower0), FLOW_EPSILON);
    float movingHalfGap = max(0.5 * length(upperT - lowerT), FLOW_EPSILON);
    float wallScale = movingHalfGap / staticHalfGap;
    float vMagnitude = clamp(abs(aRelativeCoord.y), 0.0, 1.0);
    float radial = clamp(aRelativeCoord.w, 0.0, 1.0);
    float safeScale = mix(0.86, 0.72, max(vMagnitude, radial));
    vec3 restWorld = (modelMatrix * vec4(rest, 1.0)).xyz;
    float normalCoord = dot(restWorld - staticCenter, staticNormal);
    float depthCoord = dot(restWorld - staticCenter, staticDepth);
    float safeNormal = min(abs(normalCoord * wallScale), movingHalfGap * safeScale);
    float safeDepth = min(abs(depthCoord * wallScale), aFlowFrame.w * scaleZ * safeScale);
    float normalSign = abs(normalCoord) > FLOW_EPSILON ? sign(normalCoord) : (aRelativeCoord.y < 0.0 ? -1.0 : 1.0);
    float depthSign = abs(depthCoord) > FLOW_EPSILON ? sign(depthCoord) : (aRelativeCoord.z < 0.0 ? -1.0 : 1.0);
    return movingCenter + normalSign * safeNormal * movingNormal + depthSign * safeDepth * movingDepth;
  }

  float flowPocketVisibility() {
    float radial = clamp(aRelativeCoord.w, 0.0, 1.0);
    return 1.0 - smoothstep(0.82, 1.0, radial);
  }

  vec3 flowPosition(vec3 rest) {
    vec3 tangent = flowTangent();
    vec3 n0 = flowN0();
    vec3 b0 = flowB0();
    return aFlowMeta.y > 0.0
      ? flowNeuralPosition(rest, tangent, n0, b0)
      : flowRibbonPosition(rest, tangent, n0, b0);
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
