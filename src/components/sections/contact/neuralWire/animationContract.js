/**
 * @file animationContract.js
 * Architecture Contract & Deformation Specification for Phase 2 GPU-Based Neural Animation.
 * Version 3.0.0 — Braided Luminous Neural Wave Stream Contract.
 *
 * This contract establishes the mathematical, topological, and attribute guarantees baked into
 * the static BufferGeometries and canonical NeuralWireGraph during the structural redesign,
 * ensuring that Phase 2 can introduce organic, synchronized wave undulation without rebuilding
 * geometry or breaking network connectivity.
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BUFFER ATTRIBUTE & GRAPH SPECIFICATION (Baked into BufferGeometries & Graph)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. Canonical Graph Model:
 *    - Maintained via `NeuralWireGraph`, `GraphNode`, and `GraphEdge`.
 *    - 4 Hero Primary Filaments per side (wireId 0..3).
 *    - Layer A: Curved Hairline Sub-Filaments (wireId 10..29) peeling off and merging back.
 *    - Layer B: Beaded Dot-Stream Curves (wireId 30..35) evenly sampled along sweeping splines.
 *    - Layer C: Whisper-Faint Micro-Constellation Web (strictly local edges).
 *    - Focal Pinch-Point Flares anchored at exact curve crossings and pinch points.
 *
 * 2. Vertex Buffer Attributes:
 *    Every vertex across all geometric layers contains synchronized Float32BufferAttributes:
 *
 *    - `position`   (vec3)  : Base undeformed 3D coordinates [x, y, z] in Three.js space.
 *    - `aBasePos`   (vec3)  : Permanent clone of undeformed base position [x, y, z].
 *    - `aU`         (float) : Normalized curve parameter along stream, u in [0.0, 1.0].
 *                             u = 0.0 is the inner anchor near the central globe.
 *                             u = 1.0 is the outer boundary toward viewport edge.
 *    - `aWireId`    (float) : Integer ID identifying parent strand:
 *                             0..3: Primary Hero Curves (0: Upper Crest, 1: Lower Counter-Crest, 2: Weaver, 3: Depth)
 *                             10..29: Curved Hairline Sub-Filaments
 *                             30..35: Beaded Dot-Stream Splines
 *    - `aWeight`    (float) : Boundary constraint weight in [0.0, 1.0].
 *                             Weight is strictly 0.0 at u = 0.0 (near central globe),
 *                             smoothly easing to 1.0 by u = 0.14.
 *                             This guarantees wire endpoints near the globe NEVER displace,
 *                             preventing any collision or clipping with orbital rings.
 *                             At outer boundaries (u > 0.88), weight gently eases to 0.80
 *                             to maintain spatial stability.
 *
 * 3. Point Attributes (for Beaded Streams, Flares, Stardust, Bokeh):
 *    - `size`       (float) : Calibrated particle/node base size.
 *    - `alpha`      (float) : Opacity weighting factor.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2 VERTEX SHADER DEFORMATION SPECIFICATION (GLSL)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * When Phase 2 introduces animation, all elements will evaluate this EXACT shared deformation:
 *
 * ```glsl
 * uniform float uTime;
 * uniform float uWaveSpeed;
 * uniform float uWaveAmplitude;
 *
 * attribute vec3 aBasePos;
 * attribute float aU;
 * attribute float aWireId;
 * attribute float aWeight;
 *
 * vec3 computeNeuralDisplacement(vec3 basePos, float u, float wireId, float weight, float time) {
 *   if (weight <= 0.001) return basePos;
 *
 *   float phase = wireId * 1.570796;
 *   float freq1 = 2.4;
 *   float freq2 = 1.6;
 *   float speed = uWaveSpeed;
 *
 *   float waveY = sin(u * 6.283185 * freq1 - time * speed + phase) * 0.14
 *               + cos(u * 6.283185 * freq2 - time * speed * 0.68 + phase * 1.35) * 0.08;
 *   float waveZ = cos(u * 6.283185 * freq1 * 0.85 - time * speed * 0.55 + phase * 0.9) * 0.10;
 *
 *   return basePos + vec3(0.0, waveY * weight * uWaveAmplitude, waveZ * weight * uWaveAmplitude);
 * }
 * ```
 */

export const ANIMATION_CONTRACT_VERSION = '3.0.0'
