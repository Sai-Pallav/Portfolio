# SPEC: Stage 1 — Volumetric 3D Neural Network Field & Topology Repair Blueprint

## 1. System Overview & Scope
Stage 1 implements a standalone, high-performance, reusable `NeuralNetworkField` component for the Contact section's 3D hero visualization. It fills the negative-space almond chambers between the left and right wave ribbons with a volumetric, multi-depth neural network matching the reference visualization (`media_1795344996911_a594b562.png`).

### Strict Boundaries & Invariants
- **Untouched Elements**: Central globe, glass/orbital rings, contact icons, camera settings, and all existing wave controller parameters (angle, amplitude, frequency, geometry, and materials) remain strictly untouched.
- **Companion Elements Preserved**: `WirePaths` (primary wave ribbons and companion silk strands), `BeadedStreams` (outer sweeping arcs), and `NetworkParticles` (pinpoint stardust) remain active and intact.
- **Zero New Dependencies**: Uses Three.js, React Three Fiber, and existing math/shader utilities already present in the repository.
- **GPU Deformation Invariant**: Every node, line vertex, and haze particle stores `aRelativeCoord` (`THREE.Vector4(u, v_rel, w_depth, r_norm)`) on `linesGeo`, `pointsGeo`, and `hazeGeo` for continuous Stage 2 outward 3D helical rotation synchronization.

---

## 2. Root Cause Analysis: Collapse into 1D Dotted Trails & Missing Connective Mesh Edges

Visual inspection of screenshots (`live-contact-inspect.png`, `left-middle-crossing.png`, `left-outer-end.png`) and code diagnostics in `neuralPocketBounds.js` and `NeuralNetworkField.jsx` identified five interrelated root causes:

### 2.1 Scanline Fixed-Fraction Longitudinal Slicing (`neuralPocketBounds.js`)
- The generation loop stepped longitudinally from $u = 0.105$ to $1.00$ in micro-increments $du \approx 0.0020 - 0.0036$ (~350–450 slices).
- Inside each slice and sub-pocket, points were placed at hardcoded vertical fractions ($c=0 \implies \text{frac} \approx 0.28$, $c=1 \implies \text{frac} \approx 0.62$; or $0.18, 0.48, 0.82$).
- At each step, $y = y_{low} + \text{margin} + \text{frac} \cdot \Delta y$. Because $du$ was uniform and tiny, this evaluated along fixed 1D parametric curves running parallel to the wave filaments, creating parallel beaded tracks hugging the wave curves instead of filling the 3D volume.

### 2.2 Stratified Layer Segregation Preventing 2D/3D Triangulation
- Within each slice, nodes were assigned strictly disjoint depth strata ($c=0 \to \text{BG}$, $c=1 \to \text{MID}$, $c=2 \to \text{FG}$).
- Intra-layer edge generation searched for edges only within the same depth tier. Because each slice contained at most **one** node per layer, all nodes of a given layer lay along a single 1D curve.
- A 1D line of points has zero transverse breadth. It is mathematically impossible to form non-degenerate triangles without transverse neighbors; hence, triangular face completion failed completely.

### 2.3 Hyper-Aggressive Length Clamping & Strut Suppression
- `maxEdgeDist` was clamped to $\le 0.258 \cdot h(u)$. In narrow chambers and crossover throats where $h(u) \sim 0.04 - 0.10$, $0.258 \cdot h(u) \approx 0.010 - 0.025$.
- Because the longitudinal span between adjacent slices was $10 \cdot du \approx 0.025 - 0.035$, `dist3D` between adjacent nodes exceeded `maxEdgeDist`, rejecting even immediate longitudinal edges.
- Vertical strut suppression (`dy > 1.6 * dx && dy/dist3D > 0.85`) further discarded vertical connections, leaving nodes completely disconnected or restricted to 1D neighbor pairs.
- Finally, the connected component pruner discarded any edge or node outside the single largest cluster, wiping out fragmented mesh regions.

### 2.4 Severe Shader Opacity & Size Imbalance
- In `NeuralLineShader`, line alpha was scaled by `aAlpha * feather * uOpacity`, where `aAlpha` was pre-calibrated to $0.055 - 0.15$ for BG/MID. With additive blending on 1px lines against a dark background, lines below $\alpha \approx 0.20$ vanish completely.
- In `NeuralPointShader`, points had sizes up to $32\text{px}$, $\alpha = 0.90 - 1.0$, twinkling dynamics, and radial expansions.
- This contrast imbalance rendered points glaringly bright while connective lines disappeared entirely.

### 2.5 Truncated Inner Tip & Crossing Throat Gating
- `minSubGap = 0.030` and safe margin clearances discarded nodes at $u < 0.15$, causing the network to appear abruptly as a blunt caterpillar clump rather than a tapered apex.

---

## 3. Finalized Mathematical Architecture & 5 Locked Blueprint Answers

Based on the ground-truth visual target (`media_1795344996911_a594b562.png`), the 5 finalized blueprint answers are locked as follows:

### 3.1 Answer 1: True 3D Poisson-Disk Volumetric Sampling Across Sub-Pockets
Candidate nodes are generated across continuous 3D world-space inside every open sub-pocket between sorted active wave ribbons ($h(u) \ge \text{minSubGap}$):
- **Longitudinal Range**: $u \in [0.06, 1.00]$, sampling full volume flush to $u = 1.00$.
- **Sub-Pocket Slicing & Clearance**: At each longitudinal position, active ribbons (Ribbon 0, 1, 2, 3) are evaluated and sorted by $y$. Only open sub-pockets with height $h(u) \ge \text{minSubGap}$ (where $\text{minSubGap} = 0.028$) are sampled. Slices narrower than $\text{minSubGap}$ are strictly rejected, preventing 1D collapsing trails.
- **Low-Frequency Clustering Noise**: A 3D Perlin/simplex or low-frequency sinusoidal noise field perturbs candidate sampling density, creating organic galactic clustering rather than a uniform grid.
- **Multi-Scale Poisson Clearance ($r_{min}$)**:
  - Foreground (FG) hubs: Wider clearance $r_{min}^{FG} \approx 0.045 - 0.070 \cdot h(u) + 0.025$ to enforce sparse, brilliant anchor distribution.
  - Midground (MID) / Background (BG) micro-nodes: Tighter clearance $r_{min}^{MID/BG} \approx 0.022 - 0.035 \cdot h(u) + 0.012$ to allow dense, delicate polygonal mesh formation.
- **Wave Ribbon Margin Clearance**: Distance to all 4 hero ribbon filaments must exceed $\text{marginClearance} \approx 0.0050 - 0.0080$.

### 3.2 Answer 2: Proximity-Constrained 3D Delaunay/k-NN Graph Topology
Edges are built using a proximity-constrained 3D Delaunay / $k$-NN strategy:
- **Maximum Edge Length Clamping**:
  $$\text{length}(e) \le 0.38 \cdot h(u) + 0.025$$
  Allows organic triangular face completion across all pocket depths while preventing unnatural chamber-spanning diagonals.
- **Midpoint Ribbon-Crossing Rejection**: Any candidate edge whose midpoint or sampled points intersect/penetrate ribbon filaments or cross between ribbon envelopes is strictly rejected.
- **Tall Vertical-Strut Gating**:
  $$\text{Reject if } \Delta y > 1.8 \cdot \Delta x \quad \text{on long spans } (\text{dist3D} > 0.18 \cdot h(u))$$
  Suppresses unnatural ladder-rung vertical bars while preserving natural diagonal network trusses.
- **Dual-Tier Inter-Layer Links**: FG hubs and junction stars are explicitly linked to the nearest 1–2 MID/BG nodes, weaving the bright foreground constellation directly into the deeper structural mesh.
- **Degree Guarantee & Whisper-Thin Fallback**: Every visible node achieves degree $\ge 2$ (local nearest-neighbor fallback within valid bounds). Fallback edges use whisper-thin alpha so zero nodes float disconnected in space.

### 3.3 Answer 3: Continuous Boundary & Throat Tapering Math
- **Inner Tip Feathering ($u \in [0.06, 0.20]$)**:
  $$\text{tipTaper} = \text{smoothstep}(0.06, 0.20, u)$$
  - Density scales continuously with $\text{tipTaper}$.
  - Node scale $\times (0.25 + 0.75 \cdot \text{tipTaper})$.
  - Node & edge alpha $\times \text{tipTaper}$.
  - Fades smoothly to zero at $u \le 0.06$, guaranteeing NO isolated, floating apex node.
- **Crossing Throats Dynamic Feathering**:
  $$\text{throatFactor} = \text{smoothstep}(\text{minSubGap}, 0.09, h(u))$$
  Smoothly feathers candidate density and alpha inside narrow crossing throats to prevent clutter and visual choking.
- **Outer Wave Ends ($u \in [0.85, 1.00]$)**:
  Poisson sampling extends flush to $u = 1.00$. Boundary nodes past $|v_{rel}| = 0.78$ apply soft margin alpha feathering:
  $$\text{marginFeather} = 1.0 - \text{smoothstep}(0.78, 0.96, |v_{rel}|)$$
  Margin tethers connect smoothly to invisible ribbon margin anchors with alpha fading to 0 at the anchor.

### 3.4 Answer 4: 3-Tier Z-Depth Optical Hierarchy & Purely Circular Starlight Shading
Depth stratification is partitioned across $w_{depth} \in [-1, 1]$ with narrow smoothstep blends around $w_{depth} = -0.25$ and $+0.25$:
- **Foreground (FG, $w_{depth} > 0.25$)**:
  - **12–15% Ice-White Pinpoint Hubs**: Sized 14–22px quad. Shaded with a sharp 15–20% pure white core ($\exp(-\text{dist}^2 \cdot 55.0)$) wrapped in a tight exponential cyan-blue radial halo ($\exp(-\text{dist} \cdot 5.2)$). Strictly ZERO 4-point star spikes, cross-flares, or blurry bokeh circles.
  - **Cyan FG Stars**: Sized 6–10px, electric-cyan (`#28d8ff` to `#38e0ff`), alpha $\approx 0.85 - 0.95$.
  - **FG Edges**: Electric cyan / ice-white tint, alpha $\approx 0.28 - 0.38$.
- **Midground (MID, $-0.25 \le w_{depth} \le 0.25$)**:
  - Cobalt and royal-blue nodes (`#1460ff` to `#1c84ff`), sized 4–7px, alpha $\approx 0.60 - 0.75$.
  - Crisp structural polygonal webbing (`#0e4cd8`), alpha $\approx 0.16 - 0.24$.
- **Background (BG, $w_{depth} < -0.25$)**:
  - Dim sapphire micro-dots (`#061a55` to `#08226c`), sized 1.5–3px, alpha $\approx 0.18 - 0.30$.
  - Faint deep-navy sub-web (`#06184c`), alpha $\approx 0.05 - 0.09$.
- **Rim Tinting**: Subtle electric-indigo/violet tinting (`#5e48ff`) on nodes and edges adjacent to Ribbon 2 (purple wave filament).

### 3.5 Answer 5: Restrained Deep Sapphire Chamber Haze
- **Particle Count**: Capped at 350–500 particles per side.
- **Geometric Restriction**: Strictly confined to $r_{norm} < 0.65$ and $w_{depth} < -0.20$ (rear elliptical interior).
- **Palette**: Deep sapphire (`#041038` to `#061b4d`).
- **Shading**: Peak opacity clamped to $0.025 - 0.032$. Radial size scaled proportional to local pocket height $h(u)$. Smooth Gaussian falloff $\exp(-3.5 \cdot \text{dist}^2)$.
- **Cluster Bias & Throat Bleed**: Slight spatial bias placing haze behind dense node clusters. Zero bleed into crossing throats or narrow margins ($h(u) < \text{minSubGap}$).

---

## 4. Stage 2 Relative Coordinate Preservation
Every generated vertex in `linesGeo`, `pointsGeo`, and `hazeGeo` retains the 4-component relative coordinate attribute:
```js
aRelativeCoord: [u, v_rel, w_depth, r_norm]
```
Ensures 100% backward compatibility for future Stage 2 continuous outward 3D helical rotation synchronization.
