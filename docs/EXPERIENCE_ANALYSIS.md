# Experience Section — Deep Technical Analysis

> **Portfolio:** Sai Pallav | **Primary file:** `src/components/sections/Experience.jsx`
> **Last Analyzed:** June 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Structure & Imports](#2-file-structure--imports)
3. [Data Model — `experience.js`](#3-data-model--experiencejs)
4. [Component Inventory](#4-component-inventory)
5. [The `useOrbitAnimation` Hook](#5-the-useorbitanimation-hook)
6. [Responsive Strategy — Desktop vs Mobile](#6-responsive-strategy--desktop-vs-mobile)
7. [Desktop: Orbit System Deep Dive](#7-desktop-orbit-system-deep-dive)
8. [Sub-Component Analysis](#8-sub-component-analysis)
9. [Animation System](#9-animation-system)
10. [SVG & Canvas Techniques](#10-svg--canvas-techniques)
11. [Interaction Model](#11-interaction-model)
12. [State Management](#12-state-management)
13. [Accessibility (a11y)](#13-accessibility-a11y)
14. [Theming Integration](#14-theming-integration)
15. [Known Bugs & Issues](#15-known-bugs--issues)
16. [Performance Analysis](#16-performance-analysis)
17. [Improvement Recommendations](#17-improvement-recommendations)
18. [Appendix — Component Tree](#18-appendix--component-tree)

---

## 1. Architecture Overview

The Experience section is the most complex section in the portfolio. It uses a **two-mode rendering strategy** that switches between an immersive **3D orbit system** (desktop) and a **stacked card list** (mobile). The orbit system is driven by a dedicated custom hook, six domain-specific sub-components, and a real-time `requestAnimationFrame` animation loop.

```
Experience.jsx (380 lines) — Main orchestrator
├── useOrbitAnimation (hook)         → Scroll tracking, orbit rotation, mobile detection
├── CareerCore.jsx                   → Animated central glowing planet
├── OrbitRing.jsx (×3)              → Circular SVG track rings with particles
├── ExperienceNode.jsx (×3)         → Clickable capsule nodes orbiting the core
├── EnergyBeam.jsx (×1, conditional) → SVG laser line from core to active node
├── ExperienceDetails.jsx (×1, conditional) → Glassmorphic slide-in detail panel
└── ExperienceCard.jsx (×3, mobile only)    → Full-width vertical card for mobile
```

**Data flow:**

```
experience.js → Experience.jsx
                    ↓
          useOrbitAnimation hook
                    ↓
    ┌───────────────┬───────────────────┐
    │   Desktop     │     Mobile        │
    │  Orbit System │  Stacked Cards    │
    └───────────────┴───────────────────┘
```

---

## 2. File Structure & Imports

### Main Component
```
src/components/sections/Experience.jsx
```

### Sub-Components Directory
```
src/components/sections/experience/
├── CareerCore.jsx        (7,557 bytes, 216 lines)
├── EnergyBeam.jsx        (6,013 bytes, 191 lines)
├── ExperienceCard.jsx    (5,680 bytes, 118 lines)
├── ExperienceDetails.jsx (10,163 bytes, 266 lines)
├── ExperienceNode.jsx    (5,134 bytes, 148 lines)
└── OrbitRing.jsx         (4,404 bytes, 139 lines)
```

### Hook
```
src/hooks/useOrbitAnimation.js  (3,318 bytes, 116 lines)
```

### Data
```
src/data/experience.js  (2,488 bytes, 58 lines)
```

### `Experience.jsx` Imports

| Import | Source | Purpose |
|---|---|---|
| `motion`, `useInView`, `AnimatePresence` | `framer-motion` | Entrance animation, conditional mounting |
| `useRef`, `useState` | `react` | DOM refs and selection state |
| `experience` | `@/data/experience` | All career entries array |
| `CareerCore` | `./experience/CareerCore` | Animated center planet |
| `OrbitRing` | `./experience/OrbitRing` | SVG orbital track ring |
| `ExperienceNode` | `./experience/ExperienceNode` | Clickable orbit capsule |
| `ExperienceDetails` | `./experience/ExperienceDetails` | Expanded detail panel |
| `ExperienceCard` | `./experience/ExperienceCard` | Mobile-only vertical card |
| `EnergyBeam` | `./experience/EnergyBeam` | SVG laser beam to active node |
| `useOrbitAnimation` | `@/hooks/useOrbitAnimation` | Animation controller hook |

---

## 3. Data Model — `experience.js`

Located at `src/data/experience.js`. Exports a named constant `experience` (also a default export).

### Schema

Each experience entry is an object with the following shape:

```ts
interface ExperienceEntry {
  id:        number           // Unique identifier
  role:      string           // Job title / role name
  company:   string           // Company or organization name
  badge:     string           // Status badge label: 'Current' | 'Active' | 'Leadership'
  duration:  string           // Human-readable date range
  icon:      string           // Emoji icon for the orbit node and detail panel
  bullets:   string[]         // Array of achievement descriptions (3 bullets each)
  tech:      string[]         // Technologies used
  projects:  { name: string, impact: string }[]  // Key project contributions
}
```

### Current Dataset

| # | Role | Company | Badge | Duration | Icon |
|---|---|---|---|---|---|
| 1 | Full-Stack Developer Intern | Fission AI | `Current` | May 2025 – July 2025 | 🚀 |
| 2 | Open Source Developer | Mozilla (Campus Contributions) | `Active` | Jan 2025 – Present | 🌐 |
| 3 | Technical Head | BITS Computer Science Society | `Leadership` | Aug 2024 – Present | 👥 |

### Projects per Entry

| Entry | Project | Impact |
|---|---|---|
| Fission AI | Multi-tenant Portal | +18% signups |
| Fission AI | Redis Caching | -35% latency |
| Mozilla | DOM Optimization | Fixed memory leaks |
| Mozilla | Type Safety Audit | 4 critical fixes |
| BITS CS Society | Hackathon Portal | 800+ requests |
| BITS CS Society | Attendance App | Team of 4 devs |

---

## 4. Component Inventory

### Module-Level Constants in `Experience.jsx`

```js
const containerVariants = { ... }   // Section entrance stagger
const itemVariants = { ... }        // Individual element slide-up
```

These are defined **outside** the component function to prevent re-creation on every render — an optimization best practice.

### Orbit Configuration Constants (inside `Experience()`)

```js
const orbitRadii    = [180, 260, 340]       // px from center, per ring
const orbitDurations = [25, 35, 45]          // seconds per full orbit cycle (for particles)
const nodeAngles    = [0, 120, 240]          // Initial placement degrees (evenly spaced 120° apart)
```

The three nodes are placed at exactly 120° intervals, creating a balanced equilateral triangle arrangement on the orbit rings.

### Animation Variant Families Inside `Experience()`

| Variant Name | Applies To | Behavior |
|---|---|---|
| `orbitSystemVariants` | Orbit container `motion.div` | Staggered children reveal |
| `coreVariants` | `CareerCore` wrapper | Scale 0→1, with child stagger |
| `ringVariants` | Each `OrbitRing` wrapper | Scale 0→1 with custom delay (`0.3 + i * 0.15`) |
| `nodeVariants` | Defined but NOT used | Declared but never applied in JSX (dead code) |

> **Note:** `nodeVariants` (lines 98–133) calculates final orbit positions using `nodeAngles` and `orbitRadii`, but the actual nodes use **inline `initial`/`animate` props** instead. `nodeVariants` is effectively dead code.

---

## 5. The `useOrbitAnimation` Hook

**File:** `src/hooks/useOrbitAnimation.js`

This is the central animation controller that drives the orbit system. It manages three concerns simultaneously:

### 5.1 Mobile Detection

```js
const checkMobile = () => { setIsMobile(window.innerWidth < 768) }
```

- Breakpoint: `768px` (maps to Tailwind's `md:` breakpoint)
- Debounced resize listener (150ms) to prevent excessive re-renders
- Drives the Desktop/Mobile conditional render in `Experience.jsx`

### 5.2 Scroll Tracking

Uses Framer Motion's `useScroll` + `useMotionValueEvent`:
```js
const { scrollYProgress } = useScroll({
  target: sectionRef,
  offset: ["start end", "end start"]
})
```

- `scrollProgress` → normalized 0–1 value as the section traverses the viewport
- `isInView` → `true` when `scrollProgress > 0 && < 1` (section is partially visible)
- The orbit `requestAnimationFrame` loop only runs when `isInView === true`

### 5.3 Orbit Rotation Loop

```js
const animate = (currentTime) => {
  const deltaTime = (currentTime - lastTime) / 1000
  setOrbitAngle(prev => (prev + orbitSpeedRef.current * deltaTime * 60) % 360)
  animationFrameRef.current = requestAnimationFrame(animate)
}
```

- Uses **delta-time normalization** so the speed is consistent regardless of frame rate
- Speed: `0.5 degrees/frame × 60fps = 30°/second` → full rotation every ~12 seconds
- **Slows down to `0.15°/frame`** when a node is selected (for comfortable reading)
- **Stops completely** when section is out of view (performance optimization)
- **Zero speed** when `prefers-reduced-motion: reduce` is detected

### 5.4 Return Values

| Return | Type | Usage |
|---|---|---|
| `scrollProgress` | `number` (0–1) | Available but **never actually used** in `Experience.jsx` |
| `orbitAngle` | `number` (0–359) | Used to calculate node `left`/`top` position every frame |
| `isMobile` | `boolean` | Controls which render path executes |
| `isInView` | `boolean` | Gates orbit rotation + used as orbit animation flag |

> **Note:** `scrollProgress` is returned by the hook but **destructured and then unused** in the parent component. The variable `isNodeSelected` parameter is passed into the hook as `selectedNodeIndex !== -1`, which correctly triggers the speed reduction.

---

## 6. Responsive Strategy — Desktop vs Mobile

```jsx
{isMobile ? (
  // Mobile: Vertical stacked ExperienceCard components
  <motion.div ...>
    {experience.map((exp, i) => (
      <ExperienceCard exp={exp} index={i} total={experience.length} />
    ))}
  </motion.div>
) : (
  // Desktop: Full immersive orbit system
  <motion.div ref={orbitContainerRef} ...>
    <CareerCore />
    {OrbitRings × 3}
    {ExperienceNodes × 3}
    <EnergyBeam />      {/* conditional on active node */}
    <ExperienceDetails /> {/* conditional on active node */}
  </motion.div>
)}
```

### Mobile Layout (`< 768px`)

- Renders `ExperienceCard` for each entry
- Simple vertical stacking with `flex flex-col gap-6`
- Each card uses `whileInView` for individual scroll-triggered entrance
- Viewport: `once: true` — plays once per card as user scrolls down
- No orbit, no interactivity beyond hover states

### Desktop Layout (`≥ 768px`)

- Full `100vh` height orbit container
- Absolute positioning for all elements (nodes, rings, core)
- Live `requestAnimationFrame` loop drives position updates
- Click-to-expand interaction model

---

## 7. Desktop: Orbit System Deep Dive

### Coordinate System

All orbit positions are calculated using the same math throughout the system:

```js
const currentAngle = angle + orbitAngle        // static angle + animated rotation
const radians = (currentAngle * Math.PI) / 180
const x = 50 + (radius / 8) * Math.cos(radians)  // percentage of container width
const y = 50 + (radius / 8) * Math.sin(radians)  // percentage of container height
```

The divisor `/8` is a scaling factor converting pixel radius to a percentage-based coordinate. For `radius = 180`, this yields a max offset of `22.5%` from center — kept intentionally compact to fit within the viewport.

### Position Consistency Contract

All three components that need to agree on node positions must use the **same formula**:

| Component | Uses Formula | Notes |
|---|---|---|
| `Experience.jsx` (node wrapper) | ✅ Yes | Drives `left`/`top` via framer-motion `animate` |
| `ExperienceNode.jsx` | ✅ Yes | Computes internally but does NOT use result (only the wrapper moves the node) |
| `EnergyBeam.jsx` | ✅ Yes | Must match to connect beam tip to node position |

> **Subtle issue:** `ExperienceNode` recalculates `x` and `y` (lines 36–37) but **never uses them** for rendering. The parent `Experience.jsx` wrapper controls the actual position via its own `animate={{ left, top }}`. This is correct behavior but the position variables in `ExperienceNode` are dead code.

### z-Index Layering

| Layer | z-Index | Element |
|---|---|---|
| Background orbs | -10 | Section background divs |
| OrbitRing components | default | SVG tracks (pointer-events: none) |
| Inactive ExperienceNodes | 30 | Standard orbit nodes |
| Active ExperienceNode | 40 | Selected orbit node |
| EnergyBeam SVG | 35 | Between inactive nodes and active node |
| ExperienceDetails panel | 60 | Overlays everything |
| CareerCore | 50 | Above nodes, below details panel |

---

## 8. Sub-Component Analysis

### 8.1 `CareerCore`

**Role:** The animated central planet — the visual anchor of the orbit system.

**Layers (inside-out):**
1. **Outer glow blob** — 256/320px blurred radial gradient (scale + opacity pulse, 3s loop)
2. **Ring 1** — Rotating SVG circle (20s clockwise, dashed stroke `10 5`, gradient)
3. **Ring 2** — Counter-rotating SVG circle (30s counter-clockwise, dashed stroke `8 8`)
4. **Inner core** — Rounded div with radial gradient, pulsing `boxShadow` (3s loop)
5. **Conic energy swirl** — Rotating `conic-gradient` overlay (10s loop, opacity 0.3)
6. **Layer stack icon** — SVG with 3 animated `motion.path` paths drawing in on mount (0s, 0.5s, 1s delays)
7. **8 energy particles** — Evenly spaced around 80px radius, breathing opacity/scale (2s loop, 0.25s stagger)
8. **Active state halo** — Conditional blurred div overlay when `isActive === true`

**Unique ID system:** Uses `useRef` with `Math.random().toString(36).slice(2)` to generate unique IDs for SVG `linearGradient` elements, preventing ID collisions when multiple instances could render.

---

### 8.2 `OrbitRing`

**Role:** The circular track for each orbit level.

**Props:**

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `radius` | `number` | required | Orbit radius in SVG units |
| `duration` | `number` | required | Seconds for one full particle orbit |
| `isActive` | `boolean` | required | Enhances opacity, stroke width, adds dashed highlight ring |
| `direction` | `string` | `'clockwise'` | Direction of active dashed ring animation |

**SVG viewBox:** `0 0 800 800` with center at `(400, 400)`.

**Components inside each ring:**
- **Base circle** — `motion.circle` with `pathLength 0→1` draw animation on mount
- **Active dashed ring** — Conditional second circle with `rotate` animation (±360°, `duration/3` seconds)
- **4 ambient particles** — Plain SVG `<circle>` elements using SMIL `<animateMotion>` to travel along the orbit path. Staggered start via `begin="-${(i/4)*duration}s"` so they're already distributed when the page loads.

**Orbit path formula for particles:**
```js
`M ${center - radius} ${center} a ${radius} ${radius} 0 1 0 ${2*radius} 0 a ${radius} ${radius} 0 1 0 -${2*radius} 0`
```
This is a full SVG arc path (two arcs forming a complete circle), required because SVG `animateMotion` cannot traverse a closed `<circle>` element.

---

### 8.3 `ExperienceNode`

**Role:** The clickable orbit capsule for each experience entry.

**Key behaviors:**
- Rendered as `motion.button` for native keyboard and click accessibility
- Has `onKeyDown` handler for Enter key (`e.key === 'Enter' && onSelect(index)`)
- `aria-expanded` attribute reflects `isActive` state correctly
- Scale: `1.0` → `1.15` when active; `1.2` when hovered-while-active

**Visual layers:**
1. Glassmorphic card (`from-white/10 to-white/5`, `backdrop-blur-xl`)
2. Conditional inset + outer glow box-shadow when active
3. Emoji icon in rounded square with gradient
4. Pulse ring on icon when active (scale/opacity loop, 2s)
5. Holographic scan line — horizontal gradient line sweeping `y: -100% → 200%` on hover/active, looping with 2.5s pause
6. Focus ring overlay (opacity transitions with `group-focus`)

**Position calculation:** `ExperienceNode` computes `x`/`y` from `angle + orbitAngle` and `radius` — but these values are **not used** inside the component itself. The actual positioning is done entirely by the parent `motion.div` wrapper in `Experience.jsx`.

---

### 8.4 `EnergyBeam`

**Role:** An SVG laser line connecting the `CareerCore` center to the currently active node.

**Mounting:** Rendered inside `<AnimatePresence>` — only exists in the DOM when `currentNodeIndex !== -1`.

**Position measurement:** Uses a `ResizeObserver` on `containerRef` to get actual pixel dimensions of the orbit container, then converts the node's percentage-based coordinates back into absolute pixels for the SVG beam path.

```js
const targetX = (targetXPercent / 100) * dimensions.width
const targetY = (targetYPercent / 100) * dimensions.height
```

**Beam path:** Quadratic bezier curve:
```js
`M ${centerX} ${centerY} Q ${midX} ${midY} ${targetX} ${targetY}`
```
The control point (`midX`, `midY`) is at 50% horizontal and 30% vertical interpolation — this makes the beam curve slightly toward the top rather than going straight, giving it an organic feel.

**SVG layers (innermost to outermost visually):**
1. **Core emission point** — Pulsing `r=6` circle at container center
2. **Main beam path** — `pathLength 0→1` draw-in, `beamGradient` stroke (accent → 30% opacity), Gaussian blur filter
3. **Glow layer** — Second path, `strokeWidth=4`, `opacity=0.3`, same blur filter
4. **Energy pulse** — `r=5` circle with `animateMotion` traveling the bezier path (1.5s loop)
5. **Node endpoint glow** — Pulsing `r=4` circle at the node's position

**Global SVG ID collision risk:** `EnergyBeam` uses fixed SVG `id` values (`beamGradient`, `beamGlow`, `pulseGradient`) without UID suffixes. Since only one `EnergyBeam` renders at a time, there is no current collision — but this would break if multiple beams were rendered simultaneously.

---

### 8.5 `ExperienceDetails`

**Role:** The slide-in glassmorphic panel that reveals full experience data when a node is selected.

**Implemented with `forwardRef`** — the ref is passed through to the inner card `div` (currently assigned to `detailsRef` in `Experience.jsx`, though `detailsRef` itself is not used anywhere else in the parent component).

**Position logic:**
```js
position={currentNodeIndex === 0 ? 'right' : 'left'}
```
Node `0` (Fission AI, at angle `0°` → right side of orbit) gets a panel on the `right`. Nodes `1` and `2` (angles `120°` and `240°` → left/lower) get panels on the `left`. This prevents the panel from overlapping the node in typical cases.

**Entrance/Exit animation:**
```js
initial={{ opacity: 0, x: slideDirection, scale: 0.85, filter: 'blur(10px)' }}
animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
exit={{ opacity: 0, x: slideDirection, scale: 0.85, filter: 'blur(10px)' }}
```
The `filter: 'blur()'` transition gives a "coming into focus" effect as the panel slides in.

**Content sections (staggered children):**

| Section | Delay | Content |
|---|---|---|
| Header (icon + badge) | 0.4s | Spin-in emoji, slide-in badge |
| Role heading | 0.45s | `h3` with font-heading |
| Company name | 0.5s | Accent-colored `p` |
| Duration | 0.55s | Secondary-color `p` |
| Divider line | Stagger | Accent gradient hr |
| Key Achievements | 0.3 + i×0.1s | Animated `li` with `▸` accent bullet |
| Technologies | 0.7 + i×0.08s | Spring-animated pill badges |
| Project Impact | 0.6 + i×0.1s | Row cards with name + impact |

**Persistent effects:**
- Animated border glow sweep (CSS mask technique, `opacity: 0.1`)
- Holographic scan line traversing full panel height (`y: 0% → 100%`, 3s loop)
- Bottom accent line scale-in (`scaleX 0→1` at 0.8s delay)

**Close button:** Has `data-custom-cursor-ignore` attribute — suggests the portfolio has a custom cursor system that should not apply its hover effect to this button.

---

### 8.6 `ExperienceCard` (Mobile)

**Role:** Full-width detailed card for mobile viewports. No orbit mechanics.

**Badge color logic (`getBadgeColor`):**

| Badge value | Color scheme |
|---|---|
| `'Current'` | Green (`green-500/emerald-500`) |
| `'Active'` | Blue (`blue-500/cyan-500`) |
| `'Leadership'` | Purple/pink (`purple-500/pink-500`) |
| Default | Accent colors |

**Structure:**
- `<article>` element with `aria-label="{role} at {company}"`
- Animated glowing gradient border on hover (uses `animation: 'gradientShift 3s linear infinite'`)
- Card number indicator (`01 / 03` style) — `aria-hidden="true"`
- `<time dateTime={exp.duration}>` for semantic date markup
- Bullet points with circular gradient checkmark icons
- Technology pills with entrance animation (`scaleIn` keyframe)

**Known issue:** `gradientShift` and `scaleIn` are CSS keyframe animations referenced by name but their definitions must exist in the global CSS (likely in `animations.css`). If those keyframes are missing, the animations silently fail.

---

## 9. Animation System

### Section Entrance

```js
const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
```

Triggers once when section enters viewport from 100px below. Drives `containerVariants` → `itemVariants` stagger cascade.

### Stagger Hierarchy

```
containerVariants (stagger: 0.15s, delay: 0.2s)
├── Section header (itemVariants)
│   ├── h2 heading (itemVariants nested)
│   └── subtitle p (itemVariants nested)
├── Orbit system OR mobile cards (itemVariants)
└── CTA button (itemVariants)
```

The orbit system has its own independent `orbitSystemVariants` with stagger, producing a second cascade:
```
orbitSystemVariants (stagger: 0.15s, delay: 0.2s)
├── coreVariants → CareerCore (scale 0→1 at 0s)
├── ringVariants (custom i) → OrbitRings (at 0.3, 0.45, 0.6s)
└── Node wrappers (spring, delay: 0.8 + i×0.2s)
```

### Background Orbs (Section-level)

Two large gradient blobs enter via `opacity 0→0.25/0.20, scale 0.8→1.0` when `isInView` becomes `true`. They remain static after entrance (no looping).

### Real-time Position Update

Every animation frame:
```js
// In useOrbitAnimation
setOrbitAngle(prev => (prev + speed * deltaTime * 60) % 360)

// In Experience.jsx, applied to each node wrapper:
animate={{ left: `${x}%`, top: `${y}%` }}
transition={{ type: 'tween', duration: 0.1, ease: 'linear' }}
```

Each frame triggers a framer-motion `animate` call with `duration: 0.1` — this creates a slightly trailing interpolation rather than instant snapping, giving the orbits a smooth feel even at 0.1s lag.

### CTA Button

```jsx
<motion.a href="#contact"
  whileHover={{ scale: 1.05, y: -4 }}
  whileTap={{ scale: 0.98 }}
>
  <span>→</span>  {/* Animated x: [0, 5, 0], 1.5s loop */}
</motion.a>
```

Features a shimmer sweep overlay (`via-white/20`, translates from `-full` to `full` on hover).

---

## 10. SVG & Canvas Techniques

| Technique | Used In | Purpose |
|---|---|---|
| `pathLength 0→1` | `OrbitRing`, `EnergyBeam`, `CareerCore` | Draw-in animation for paths and circles |
| `animateMotion` (SMIL) | `OrbitRing` particles | Circular motion along SVG arc path |
| `linearGradient` (SVG) | `CareerCore`, `OrbitRing`, `EnergyBeam` | Gradient fills for strokes |
| `radialGradient` (SVG) | `EnergyBeam` pulse circle | Soft-edge glow for traveling energy ball |
| `feGaussianBlur` + `feMerge` filter | `OrbitRing`, `EnergyBeam` | SVG glow filter (blur below, original above) |
| `conic-gradient` (CSS) | `CareerCore` inner core | Rotating light swirl effect |
| Quadratic bezier `Q` | `EnergyBeam` | Curved beam path from center to node |
| UID-scoped gradient IDs | `CareerCore`, `OrbitRing` | Prevents SVG element ID namespace collisions |
| `feTurbulence` | NOT used in this section | (Used in Contact section) |

---

## 11. Interaction Model

### Desktop Click Flow

```
User clicks ExperienceNode
  → ExperienceNode calls onSelect(index)
  → Experience.jsx: handleNodeSelect(index)
  → Toggle: if already selected → deselect (-1), else select (index)
  → selectedNodeIndex changes
  → EnergyBeam appears (AnimatePresence)
  → ExperienceDetails appears (AnimatePresence, mode="wait")
  → orbitSpeed slows to 0.15°/frame (via useOrbitAnimation)
  → Active node scales to 1.15, opacity 1.0
  → Active OrbitRing highlights (dashed rotating ring appears)
  → CareerCore shows additional halo (isActive=true)

User clicks same node again (or X button)
  → handleNodeSelect(same index) or handleCloseDetails()
  → selectedNodeIndex resets to -1
  → EnergyBeam exits (AnimatePresence)
  → ExperienceDetails exits (AnimatePresence mode="wait")
  → orbitSpeed returns to 0.5°/frame
  → All nodes return to normal state
```

### `AnimatePresence mode="wait"` for Details

When switching between different nodes, `mode="wait"` ensures the previous `ExperienceDetails` panel fully exits (slides out + blurs out) before the new panel enters. This prevents two panels from overlapping during transitions.

### Node Toggle

```js
const handleNodeSelect = (index) => {
  setSelectedNodeIndex(selectedNodeIndex === index ? -1 : index)
}
```

Clicking an already-active node deselects it (returns to default orbit state).

---

## 12. State Management

All state lives in the `Experience()` component:

| State / Ref | Type | Purpose |
|---|---|---|
| `selectedNodeIndex` | `useState(-1)` | Which node is active (-1 = none) |
| `sectionRef` | `useRef` | Passed to `useInView` and `useOrbitAnimation` |
| `orbitContainerRef` | `useRef` | Passed to `EnergyBeam` for `ResizeObserver` |
| `detailsRef` | `useRef` | Passed to `ExperienceDetails` via `forwardRef` (unused) |

State from `useOrbitAnimation`:

| State | Type | Updated Via |
|---|---|---|
| `scrollProgress` | `number` | `useMotionValueEvent` |
| `orbitAngle` | `number` | `requestAnimationFrame` loop |
| `isMobile` | `boolean` | `resize` event listener |
| `isInView` | `boolean` | `useMotionValueEvent` |

### Derived Values (pure, no state)

```js
const currentNodeIndex = selectedNodeIndex   // Alias (currently a 1:1 mapping)
```

The comment says "Use only manually selected node (not scroll-based)" — indicating scroll-based auto-selection was intentionally removed from a previous version.

---

## 13. Accessibility (a11y)

### Strengths

- ✅ **Section `aria-label`**: `<section aria-label="Career Orbit Experience">` 
- ✅ **Node buttons**: `aria-label={`View details for ${exp.role} at ${exp.company}`}`
- ✅ **`aria-expanded`**: Set on `ExperienceNode` button, correctly reflects active state
- ✅ **Keyboard support**: `onKeyDown` handler on nodes for Enter key
- ✅ **Decorative elements**: Background orbs and SVG effects have `aria-hidden="true"`
- ✅ **Close button `aria-label`**: `"Close details panel"`
- ✅ **Close button `type="button"`**: Prevents accidental form submission
- ✅ **Semantic `<article>`**: Used in `ExperienceCard` for mobile cards
- ✅ **`<time>` element**: Used in `ExperienceCard` with `dateTime` attribute
- ✅ **Role lists**: `role="list"` and `role="listitem"` on tech tags in mobile card
- ✅ **`prefers-reduced-motion`**: Orbit speed set to `0` when reduced motion is preferred

### Gaps

- ⚠️ **No focus trap in details panel**: When `ExperienceDetails` opens, focus is not moved into the panel. Users must Tab blindly to find the close button
- ⚠️ **No focus restoration**: When the panel closes, focus is not returned to the triggering node
- ⚠️ **`detailsRef` unused**: The `forwardRef` is wired but `detailsRef` in the parent is never used for focus management
- ⚠️ **No `Escape` key handler**: No global `keydown` listener to close the details panel with Escape
- ⚠️ **Mobile card `<h3>` nesting**: Inside an `<article>`, the `h3` is correct, but there's no `h2` wrapping the mobile layout — the section heading uses `motion.h2` inside its own wrapper, so the heading hierarchy is: `h2 (section) → h3 (cards)` ✅ (this is actually fine)
- ⚠️ **`ExperienceNode` position calculation dead code**: Creates `x`/`y` variables without using them — no a11y impact but adds confusion

---

## 14. Theming Integration

The Experience section exclusively uses CSS custom properties from the theme system:

| CSS Variable Used | Where |
|---|---|
| `--accent` | All glow effects, beam colors, particle fills, badge borders, ring strokes |
| `--accent-hover` | Secondary gradient stops on glows and backgrounds |
| `--accent-dim` | Core inner gradient final stop |
| `--text-heading` | Role titles, heading text in details panel |
| `--bg-surface` (via `surface` Tailwind alias) | Background gradient, ExperienceCard base |
| `--bg-raised` (via `raised` alias) | ExperienceCard gradient |
| `--text-secondary` (via `secondary` alias) | Description text, tech text, bullet text |

The section **does not reference `--bg-hover-experience`** because no such variable is defined in `themes.css` — unlike Contact/Skills/Projects which each have a `--bg-hover-{section}` variable. The experience background uses inline Tailwind gradient utilities instead (`from-surface/50 via-bg to-surface/50`).

---

## 15. Known Bugs & Issues

### 🔴 Critical — `nodeVariants` Dead Code (Lines 98–133)

```js
// Defined but NEVER referenced in JSX
const nodeVariants = {
  hidden: (i) => { scale: 0, opacity: 0, x: '-50%', y: '-50%', left: '50%', top: '50%' },
  visible: (i) => { ... /* calculated position */ }
}
```

`nodeVariants` is defined but never passed to any component or `motion.div` via `variants` prop. The nodes use inline `initial`/`animate` props instead. This is dead code that adds 36 lines of unreachable logic.

**Fix:** Delete `nodeVariants` entirely.

---

### 🟡 Medium — `scrollProgress` Destructured But Unused

```js
const { scrollProgress, orbitAngle, isMobile, isInView: orbitInView } = useOrbitAnimation(...)
```

`scrollProgress` is destructured from the hook return but never referenced anywhere in `Experience.jsx`. This was likely used in a previous auto-selection version.

**Fix:** Remove from destructuring, or remove from the hook's return value if not needed elsewhere.

---

### 🟡 Medium — `detailsRef` Never Used for Focus Management

```js
const detailsRef = useRef(null)
// ...
<ExperienceDetails ref={detailsRef} ... />
```

`detailsRef` is created and passed through `forwardRef` to the inner panel card — but is never accessed anywhere in `Experience.jsx` after assignment. The original intent was likely focus management on panel open.

**Fix:** Either use it (`detailsRef.current?.focus()` when panel opens) or remove both the ref and the `forwardRef` wrapper in `ExperienceDetails`.

---

### 🟡 Medium — `ExperienceNode` Position Variables Are Dead Code

```js
// Lines 36-37 in ExperienceNode.jsx
const x = 50 + (radius / 8) * Math.cos(radians)
const y = 50 + (radius / 8) * Math.sin(radians)
```

These are calculated but never used inside `ExperienceNode`. The parent controls positioning.

---

### 🟡 Medium — Fixed SVG IDs in `EnergyBeam` Risk Collision

`EnergyBeam` uses `id="beamGradient"`, `id="beamGlow"`, `id="pulseGradient"` without unique suffixes. Only one `EnergyBeam` renders at a time so there is no current collision, but future refactors adding multiple beams would cause visual defects.

**Fix:** Add a `uid` pattern (as done in `CareerCore` and `OrbitRing`).

---

### 🟡 Medium — `ExperienceCard` References Undefined Keyframes

```jsx
className="... animate-[gradientShift_3s_linear_infinite]"
className="... animate-[scaleIn_0.6s_ease-out_forwards]"
className="... animate-[wiggle_4s_ease-in-out_infinite]"
```

These Tailwind `animate-[...]` arbitrary values reference keyframe names (`gradientShift`, `scaleIn`, `wiggle`) that must be defined in global CSS. If they're missing from `animations.css` or `index.css`, the animations silently fail. The `gradientShift` on the border glow and `scaleIn` on bullet points need to be verified.

---

### 🟢 Minor — No `Escape` Key to Close Detail Panel

Users cannot press Escape to dismiss the `ExperienceDetails` panel. Standard UX convention for overlapping panels.

---

### 🟢 Minor — Panel Position Is Hardcoded Based Only on Node Index 0

```js
position={currentNodeIndex === 0 ? 'right' : 'left'}
```

Only node `0` (Fission AI at 0°) gets `position='right'`. But since nodes orbit continuously, node 0 doesn't always appear on the right side of the screen. The details panel can overlap the active node visually when it has rotated to an unexpected position.

---

## 16. Performance Analysis

| Concern | Detail | Risk |
|---|---|---|
| **`requestAnimationFrame` loop** | Runs every frame (~60fps) while section is visible. Calls `setOrbitAngle` → React re-render → updates 3 node `animate` props | Medium — 60 state updates/second in `useOrbitAnimation`. Could be replaced with CSS animations or direct DOM transforms |
| **3 node `animate` per frame** | Each frame triggers `animate={{ left, top }}` on 3 `motion.div` elements | Medium — Framer Motion optimizes this via its own batching, but it's still heavier than CSS transforms |
| **`ResizeObserver` in `EnergyBeam`** | Observes `orbitContainerRef` for size changes. Correctly disconnected on unmount | Low — Observer is cheap and properly cleaned up |
| **Background orb entrance** | Two large `600px`/`500px` blurred divs animate once on enter. Stay static after | Low — Static after mount, no ongoing cost |
| **8 energy particles in CareerCore** | 8 `motion.circle` elements with separate `opacity`+`scale` animations | Low — Small number, but multiplied by the 3 rings = 12 orbit particles via SMIL |
| **`AnimatePresence` with `mode="wait"`** | Detail panel uses blur transition (`filter: blur(10px)`) which triggers layer composition | Low-Medium — Blur on exit/enter is GPU-accelerated but can drop frames on lower-end devices |
| **Mobile debounce** | Resize debounce is 150ms — sufficient to prevent excessive re-renders | Good |

---

## 17. Improvement Recommendations

### High Priority

1. **Fix dead code (`nodeVariants`)** — Remove the 36-line `nodeVariants` block entirely. It's never applied to any element.

2. **Implement focus management for `ExperienceDetails`:**
   ```js
   useEffect(() => {
     if (currentNodeIndex !== -1 && detailsRef.current) {
       detailsRef.current.focus()
     }
   }, [currentNodeIndex])
   ```
   And restore focus to the triggering node on close.

3. **Add `Escape` key handler:**
   ```js
   useEffect(() => {
     const handler = (e) => { if (e.key === 'Escape') handleCloseDetails() }
     document.addEventListener('keydown', handler)
     return () => document.removeEventListener('keydown', handler)
   }, [])
   ```

### Medium Priority

4. **Remove `scrollProgress` from hook return** (or use it) — Reduces confusion about the hook's API surface.

5. **Fix `EnergyBeam` SVG IDs** — Add a `uid` pattern to prevent future collisions.

6. **Remove dead `x`/`y` variables from `ExperienceNode`** — Reduces confusion about where positioning is controlled.

7. **Dynamic panel position based on actual node screen position** — Instead of hardcoding `index === 0 → right`, calculate whether the node is left or right of the screen center using `orbitAngle` and place the panel on the opposite side.

8. **Verify keyframe definitions** (`gradientShift`, `scaleIn`, `wiggle`) — Ensure they exist in global CSS.

### Low Priority

9. **Replace `setOrbitAngle` in rAF loop with CSS animation** — The orbit could be driven by a pure CSS `animation: rotate 12s linear infinite` on a wrapper div, eliminating 60 React state updates per second.

10. **Add `--bg-hover-experience` to the theme system** for consistency with other sections.

11. **Add touch support** for orbit node interaction (currently orbit system is desktop-only, mobile gets cards — but tablet breakpoints may see orbit without touch-friendly interaction).

---

## 18. Appendix — Component Tree

```
<section id="experience" aria-label="Career Orbit Experience">
│
├── Background (z=-10, aria-hidden)
│   ├── Base gradient div (from-surface via-bg)
│   ├── Accent orb top-right (600px blur-[120px], once-enter animation)
│   ├── Accent orb bottom-center (500px blur-[100px], once-enter animation)
│   └── Dot grid mesh (radial-gradient bg, opacity 0.03)
│
└── max-w-7xl container
    └── motion.div (containerVariants)
        │
        ├── Section Header (itemVariants)
        │   ├── motion.h2 "Professional / Experience" (gradient text, 5xl–7xl)
        │   └── motion.p subtitle
        │
        ├── [isMobile] Mobile: flex flex-col gap-6
        │   ├── ExperienceCard [0] — Fission AI
        │   ├── ExperienceCard [1] — Mozilla
        │   └── ExperienceCard [2] — BITS CS Society
        │
        └── [!isMobile] Desktop: Orbit Container (h-[100vh])
            ├── motion.div (coreVariants wrapper, z-50)
            │   └── CareerCore (isActive=selectedNodeIndex!==-1)
            │       ├── Outer glow blob (pulse animation)
            │       ├── SVG Ring 1 (rotate +20s)
            │       ├── SVG Ring 2 (rotate -30s)
            │       ├── Inner core (pulse boxShadow, conic swirl)
            │       ├── Layer stack SVG icon (path draw-in ×3)
            │       └── 8 energy particles (breathing opacity)
            │
            ├── OrbitRing [0] (r=180, 25s, clockwise, z-default)
            ├── OrbitRing [1] (r=260, 35s, counter-clockwise, z-default)
            ├── OrbitRing [2] (r=340, 45s, clockwise, z-default)
            │   Each ring contains:
            │   ├── Base circle (pathLength draw-in)
            │   ├── [isActive] Dashed rotating highlight ring
            │   └── 4 SMIL-animated orbit particles
            │
            ├── ExperienceNode [0] (Fission AI, angle=0°, r=180, z=30/40)
            ├── ExperienceNode [1] (Mozilla, angle=120°, r=260, z=30/40)
            ├── ExperienceNode [2] (BITS CSS, angle=240°, r=340, z=30/40)
            │   Each node:
            │   ├── motion.button (aria-expanded, aria-label, onKeyDown)
            │   ├── Glassmorphic card
            │   ├── [isActive] Glow overlay
            │   ├── Icon square with emoji + [isActive] pulse ring
            │   ├── Role/company/duration/badge text
            │   └── [isActive|hovered] Holographic scan line
            │
            ├── AnimatePresence → [active] EnergyBeam (z=35)
            │   └── SVG (full container size)
            │       ├── beamGradient + beamGlow + pulseGradient defs
            │       ├── Main beam path (pathLength draw-in)
            │       ├── Glow layer path
            │       ├── Traveling energy pulse circle (animateMotion)
            │       ├── Node endpoint glow circle
            │       └── Core emission circle
            │
            └── AnimatePresence mode="wait" → [active] ExperienceDetails (z=60)
                └── motion.div (slide + blur entrance)
                    ├── Border glow sweep overlay
                    ├── Holographic scan line (3s loop)
                    ├── Gradient overlay
                    ├── Close button (X icon, rotate on hover)
                    └── Content (staggered children)
                        ├── Header (icon spin-in, badge slide-in, h3, company, duration)
                        ├── Divider
                        ├── Key Achievements (animated li items ×3)
                        ├── Technologies (spring pill badges)
                        └── Project Impact (name + impact rows)
│
└── CTA Section (itemVariants)
    └── motion.a → "#contact" (shimmer sweep, bouncing arrow)
```
