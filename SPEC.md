# SPEC: Stage 1 — Volumetric 3D Neural Network Field

## 1. System Overview & Scope
Stage 1 implements a standalone, high-performance, reusable `NeuralNetworkField` component for the Contact section's 3D hero visualization. It fills the negative-space almond chambers between the left and right wave ribbons with a volumetric, multi-depth neural network matching the reference image.

### Strict Boundaries & Invariants
- **Untouched Elements**: Central globe, glass/orbital rings, contact icons, camera settings, and all existing wave controller parameters (angle, amplitude, frequency, geometry, and materials) remain strictly untouched.
- **Companion Elements Preserved**: `WirePaths` (primary wave ribbons and companion silk strands), `BeadedStreams` (outer sweeping arcs), and `NetworkParticles` (pinpoint stardust) remain active and intact.
- **Zero New Dependencies**: Uses Three.js, React Three Fiber, and existing math/shader utilities already present in the repository.

---

## 2. Mathematical Pocket Geometry & Shared Helper (`neuralPocketBounds.js`)

### 2.1 Pocket Envelope Definition
The negative-space almond pocket at normalized coordinate $u \in [0, 1]$ is defined between Ribbon 0 (Upper Arch) and Ribbon 1 (Lower Arch), with safety clearances evaluated against Ribbon 2 (Violet) and Ribbon 3 (Counter-Braid).

```js
// At any longitudinal coordinate u:
yUpper(u) = max(heroY0(u), heroY1(u))
yLower(u) = min(heroY0(u), heroY1(u))
gapHeight h(u) = yUpper(u) - yLower(u)
gapCenterY(u) = 0.5 * (yUpper(u) + yLower(u))
gapCenterZ(u) = 0.5 * (heroZ(0, u) + heroZ(1, u))
```

### 2.2 Clearance & Pinch Gates
- **Safe Margin**: $\text{safeMargin} = 0.052 \cdot H$ (~$0.059$ units).
- **Pinch Gate**: Minimum gap threshold $\text{minGapHeight} = 2.4 \cdot \text{safeMargin}$. Sampled longitudinal slices where $h(u) < \text{minGapHeight}$ are excluded to prevent clustering/collision at wave crossing pinch points.
- **Elliptical Half-Radii**:
  $$R_y(u) = \max(0.01, 0.5 \cdot h(u) - 1.35 \cdot \text{safeMargin})$$
  $$R_z(u) = R_y(u) \cdot 0.85$$

### 2.3 Sampled Inner Margin Anchors
Invisible anchor vertices are generated along the inner margins of the upper and lower waves ($y_{upper} - \text{safeMargin}$ and $y_{lower} + \text{safeMargin}$) with `alpha = 0.0` and `size = 0.0`. They act strictly as line termination points for tethering edges without placing visible nodes on the primary wave filaments.

---

## 3. Relative Coordinate System (Stage 2 Helical Sync Architecture)

To ensure future Stage 2 outward 3D helical rotation stays synchronized with the wave pocket without clipping or drifting:
Every node and edge vertex stores a relative coordinate attribute `aRelativeCoord` (Vector4) in both the JavaScript graph model and GPU BufferAttributes:
1. **$u$** $\in [0, 1]$: Longitudinal coordinate along the wave flow.
2. **$v_{rel}$** $\in [-1, 1]$: Normalized vertical position relative to local pocket center and radius:
   $$v_{rel} = \frac{y - gapCenterY(u)}{R_y(u)}$$
3. **$w_{depth}$** $\in [-1, 1]$: Normalized Z-depth position relative to local pocket center and depth radius:
   $$w_{depth} = \frac{z - gapCenterZ(u)}{R_z(u)}$$
4. **$r_{norm}$** $\in [0, 1]$: Normalized radial distance from local centerline:
   $$r_{norm} = \sqrt{v_{rel}^2 + w_{depth}^2}$$

---

## 4. Three Z-Depth Layers & Volumetric Architecture

Nodes and edges are partitioned across three calibrated Z-depth strata based on normalized depth $w_{depth}$:

| Layer | Depth Range ($w_{depth}$) | Visual Characteristics | Opacity | Palette & Coloration |
|---|---|---|---|---|
| **Foreground (FG)** | $w_{depth} > 0.25$ | Crisp thin edges, prominent glowing junction nodes, and radiant ice-white pinpoint hubs | $0.85 - 0.95$ | Crisp cyan (`#00f0ff` to `#38d8ff`) + Ice-white hubs (`#ffffff`) |
| **Midground (MID)** | $-0.25 \le w_{depth} \le 0.25$ | Irregular triangular and polygonal structural cells and junction nodes | $0.50 - 0.65$ | Electric royal-blue (`#0077ff` to `#00a8ff`) |
| **Background (BG)** | $w_{depth} < -0.25$ | Soft, translucent structural sub-mesh + pocket-confined volumetric blue haze | $0.15 - 0.25$ (mesh) / $0.04 - 0.12$ (haze) | Deep navy/sapphire (`#0a1e4a` to `#0038b8`) |

### 4.1 Pocket-Confined Volumetric Blue Haze
- Generated strictly within the elliptical core ($r_{norm} < 0.75$, $w_{depth} < -0.15$) as a soft Gaussian micro-cloud.
- Smoothly fades at pocket boundaries ($1 - r_{norm}^2$) and tapers near the globe ($u < 0.14$) and pinch points ($h(u) < \text{minGapHeight}$).
- Rendered with additive blending, deep-blue coloration, and zero depth writing to create volumetric atmospheric presence without bleeding outside the wave contours.

---

## 5. Graph Topology, Connectivity & Tethering

### 5.1 Node Distribution
- **Stratified Longitudinal Sampling**: $S = 24$ bands from $u = 0.08$ to $u = 0.96$.
- **Poisson-like Minimum Distance**: Enforces minimum spatial clearance between adjacent nodes to prevent clustering and unnatural grid artifacts.
- **Tapering**: Node density ramps smoothly from fewer near the globe ($\approx 3$ nodes/band) to richer outward ($\approx 9-10$ nodes/band), smoothly extinguishing at $u \le 0.06$.

### 5.2 Edge Generation (Irregular Triangular & Polygonal Cells)
- **Cell Structure**: Proximity-constrained Delaunay / k-NN triangulation with $k \in [3, 5]$ connections per non-anchor node.
- **Length Clamping**: Edge lengths are strictly bounded:
  $$0.08 \cdot h(u) \le \text{length}(e) \le 0.85 \cdot h(u)$$
  This guarantees that long, unnatural diagonal struts spanning across the chamber are strictly forbidden.
- **Same-Layer Cross-Intersection Prevention**: 2D projected line crossings within the same depth stratum are rejected.
- **Zero Floating Nodes**: Connectivity enforcement guarantees every non-anchor node has degree $\ge 1$.

### 5.3 Wave Margin Tethering
- Outer boundary nodes ($r_{norm} > 0.65$) establish clean tethering edges to the nearest invisible inner margin anchors.
- Tethering edge alpha smoothly fades toward the margin ($a \to 0.40$), cleanly rooting the network to the wave structure while leaving the primary filaments untouched and floating.

---

## 6. Asymmetry, Seeds & Theming

### 6.1 Distinct PRNG Seeds
- **Left Side**: Seed `314159`
- **Right Side**: Seed `271828`
- Yields balanced total node/edge counts (~130-155 nodes, ~220-280 edges) with unique, organic, non-mirrored cell topologies.

### 6.2 Universal Theme Modulation
- Base palette adheres to the reference image: Ice-white (`#ffffff`), Crisp Cyan (`#00f0ff`), Electric Blue (`#0077ff`), Deep Sapphire (`#0a1e4a`).
- Soft 12% chromatic blend with the active portfolio theme accent ensures visual harmony during theme switches without compromising contrast.

---

## 7. Component Interface (`NeuralNetworkField.jsx`)

```jsx
<NeuralNetworkField
  linesGeo={wireData.neuralLinesGeo}
  pointsGeo={wireData.neuralPointsGeo}
  hazeGeo={wireData.neuralHazeGeo}
  themeConfig={themeConfig}
  nodeScale={layout.nodeScale}
  innerFade={ribbon.innerFade}
  side={ribbon.side}
/>
```
- Replaces legacy `NetworkConnections` and `NetworkNodes` in `SideWireNetwork.jsx`.
- Memoizes all custom ShaderMaterials with additive blending, stereoscopic depth attenuation, and automatic resource disposal.
