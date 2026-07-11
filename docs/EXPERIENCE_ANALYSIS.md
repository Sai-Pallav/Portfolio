# Experience Section — Deep Technical Analysis

> **Portfolio:** Sai Pallav | **Primary file:** `src/components/sections/Experience.jsx`
> **Last Analyzed:** July 10, 2026

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

The Experience section is the most complex section in the portfolio. It uses a **two-mode rendering strategy** that switches between an immersive **CSS-based orbit system** (desktop) and a **stacked card list** (mobile). The orbit system is driven by CSS keyframe animations, Web Animations API synchronization, and six domain-specific sub-components.

```
Experience.jsx (510 lines) — Main orchestrator
├── CareerCore.jsx (228 lines)           → Animated central glowing planet
├── OrbitRing.jsx (155 lines)           → Circular SVG track rings with particles
├── ExperienceNode.jsx (140 lines)       → Clickable capsule nodes orbiting the core
├── EnergyBeam.jsx (256 lines)          → SVG laser line from core to active node
├── ExperienceDetails.jsx (271 lines)   → Glassmorphic slide-in detail panel
└── ExperienceCard.jsx (133 lines)      → Full-width vertical card for mobile
```

**Data flow:**

```
experience.js → Experience.jsx
                    ↓
          CSS Keyframe Animations (orbit-cw, orbit-ccw)
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
src/components/sections/Experience.jsx (510 lines)
```

### Sub-Components Directory
```
src/components/sections/experience/
├── CareerCore.jsx        (7,635 bytes, 228 lines)
├── EnergyBeam.jsx        (7,087 bytes, 256 lines)
├── ExperienceCard.jsx    (5,998 bytes, 133 lines)
├── ExperienceDetails.jsx (10,348 bytes, 271 lines)
├── ExperienceNode.jsx    (4,934 bytes, 140 lines)
└── OrbitRing.jsx         (4,663 bytes, 155 lines)
```

### Data
```
src/data/experience.js (58 lines)
```

### `Experience.jsx` Imports

| Import | Source | Purpose |
|---|---|---|
| `motion`, `AnimatePresence` | `framer-motion` | Entrance animation, conditional mounting |
| `useRef`, `useState`, `useEffect`, `useCallback`, `useMemo`, `memo` | `react` | DOM refs, state, effects, memoization |
| `experience` | `@/data/experience` | All career entries array |
| `CareerCore` | `./experience/CareerCore` | Animated center planet |
| `OrbitRing` | `./experience/OrbitRing` | SVG orbital track ring |
| `ExperienceNode` | `./experience/ExperienceNode` | Clickable orbit capsule |
| `ExperienceDetails` | `./experience/ExperienceDetails` | Expanded detail panel |
| `ExperienceCard` | `./experience/ExperienceCard` | Mobile-only vertical card |
| `EnergyBeam` | `./experience/EnergyBeam` | SVG laser beam to active node |

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
const ORBIT_RADII = [280, 350, 430]       // px from center, per ring
const ORBIT_DURATIONS = [35, 35, 35]      // seconds per full orbit cycle
const NODE_ANGLES = [0, 120, 240]         // Initial placement degrees (evenly spaced 120° apart)
```

These are defined **outside** the component function to prevent re-creation on every render — an optimization best practice.

### State in `Experience()`

| State | Type | Purpose |
|---|---|---|
| `selectedNodeIndex` | `useState(-1)` | Which node is active (-1 = none) |
| `isMobile` | `useState(false)` | Mobile viewport detection |
| `detailsPosition` | `useState('left')` | Dynamic panel position based on node location |
| `beamCoords` | `useState(null)` | Energy beam coordinates for SVG rendering |

### Refs in `Experience()`

| Ref | Purpose |
|---|---|
| `sectionRef` | Section container reference |
| `orbitContainerRef` | Orbit container for beam coordinate calculation |
| `detailsRef` | Details panel for focus management |
| `nodeRefs` | Array of node button refs for focus restoration |

### Animation Variant Families Inside `Experience()`

| Variant Name | Applies To | Behavior |
|---|---|---|
| `orbitSystemVariants` | Orbit container `motion.div` | Staggered children reveal |
| `coreVariants` | `CareerCore` wrapper | Scale 0→1, with child stagger |
| `ringVariants` | Each `OrbitRing` wrapper | Scale 0→1 with custom delay (`0.3 + i * 0.15`) |

---

## 5. CSS Keyframe Animation System

The orbit system now uses **CSS keyframe animations** instead of JavaScript-driven `requestAnimationFrame`. This provides better performance by leveraging the browser's compositor thread.

### 5.1 CSS Keyframes Defined in `Experience.jsx`

```css
@keyframes orbit-cw {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes orbit-ccw {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}
```

These are injected via a `<style>` tag within the component (lines 352-375).

### 5.2 Animation Classes

- `.orbit-rotating-parent` — Applies `orbit-cw` with `35s linear infinite` to the parent container
- `.orbit-node-counter` — Applies `orbit-ccw` with `35s linear infinite` to counter-rotate nodes

The counter-rotation ensures nodes maintain their upright orientation while orbiting.

### 5.3 Web Animations API Synchronization

A `useEffect` (lines 93-141) uses the Web Animations API to pause/play animations when a node is selected:

```js
const anims = container.getAnimations({ subtree: true })
const parentAnim = anims.find(a => a.animationName === 'orbit-cw')
const nodeAnims = anims.filter(a => a.animationName === 'orbit-ccw')

if (currentNodeIndex !== -1) {
  parentAnim.pause()
  nodeAnims.forEach(nAnim => {
    nAnim.pause()
    nAnim.currentTime = parentAnim.currentTime
  })
} else {
  parentAnim.play()
  nodeAnims.forEach(nAnim => {
    nAnim.play()
    if (parentAnim.startTime !== null) {
      nAnim.startTime = parentAnim.startTime
    } else {
      nAnim.currentTime = parentAnim.currentTime
    }
  })
}
```

This ensures perfect synchronization between parent and child animations when pausing/resuming.

### 5.4 Visibility Change Handler

The component listens for `visibilitychange` events to re-synchronize animations when the tab becomes visible, as browsers may throttle background animations differently.

### 5.5 Mobile Detection

```js
const checkMobile = () => setIsMobile(window.innerWidth < 768)
```

- Breakpoint: `768px` (maps to Tailwind's `md:` breakpoint)
- Simple resize listener (no debouncing)
- Drives the Desktop/Mobile conditional render

---

## 6. Responsive Strategy — Desktop vs Mobile

```jsx
{isMobile ? (
  // Mobile: Vertical stacked ExperienceCard components
  <motion.div variants={itemVariants} className="flex flex-col gap-6 px-4">
    {experience.map((exp, i) => (
      <motion.div
        key={exp.id}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: i * 0.1 }}
        viewport={{ once: true }}
      >
        <ExperienceCard exp={exp} index={i} total={experience.length} />
      </motion.div>
    ))}
  </motion.div>
) : (
  // Desktop: Full immersive orbit system
  <motion.div 
    initial="hidden"
    animate="visible"
    variants={orbitSystemVariants}
    className="relative w-full h-[85vh] lg:h-[100vh] flex items-center justify-center overflow-visible"
  >
    <div ref={orbitContainerRef} className="relative w-full max-w-[min(75vh,720px)] aspect-square flex items-center justify-center">
      <CareerCore isActive={currentNodeIndex !== -1} />
      {OrbitRings × 3}
      <div className="orbit-rotating-parent">
        {ExperienceNodes × 3}
      </div>
      {selectedNodeIndex !== -1 && beamCoords && <EnergyBeam />}
    </div>
    <AnimatePresence mode="wait">
      {currentNodeIndex !== -1 && <ExperienceDetails />}
    </AnimatePresence>
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

- Full `h-[85vh] lg:h-[100vh]` height orbit container
- Aspect-square container with `max-w-[min(75vh,720px)]` for perfect circular orbits
- CSS keyframe animations drive orbit rotation
- Click-to-expand interaction model
- Dynamic details panel positioning based on node location in viewport

---

## 7. Desktop: Orbit System Deep Dive

### Coordinate System

The orbit system uses **CSS transforms** for positioning instead of JavaScript-calculated coordinates:

```jsx
<div
  className={`orbit-wrapper-${i}`}
  style={{
    position: 'absolute',
    inset: 0,
    transform: `rotate(${staticAngle}deg)`,  // Static angle: 0°, 120°, 240°
    transformOrigin: 'center',
    zIndex: currentNodeIndex === i ? 40 : 30,
    pointerEvents: 'none'
  }}
>
  <div
    className={`orbit-node-${i}`}
    style={{
      position: 'absolute',
      top: '50%',
      left: '93.75%',  // 350px radius on 800px box (350/800 = 0.4375, but uses 93.75% for outer edge)
      transform: `translate(-50%, -50%) rotate(${-staticAngle}deg)`,  // Counter-rotate to keep upright
      transformOrigin: 'center',
      pointerEvents: currentNodeIndex !== -1 && currentNodeIndex !== i ? 'none' : 'auto'
    }}
  >
    <div className="orbit-node-counter">
      <ExperienceNode />
    </div>
  </div>
</div>
```

The `.orbit-rotating-parent` container rotates clockwise (`orbit-cw`), while the `.orbit-node-counter` div counter-rotates counterclockwise (`orbit-ccw`) to keep nodes upright.

### Orbit Radii

| Ring Index | Radius (px) | Duration (s) |
|---|---|---|
| 0 (inner) | 280 | 35 |
| 1 (middle) | 350 | 35 |
| 2 (outer) | 430 | 35 |

All rings use the same 35-second duration for synchronized rotation.

### Node Placement

Nodes are placed at static angles: `[0°, 120°, 240°]` — evenly spaced 120° apart creating an equilateral triangle arrangement.

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

### 8.1 `CareerCore` (228 lines)

**Role:** The animated central planet — the visual anchor of the orbit system.

**Layers (inside-out):**
1. **Outer glow blob** — 256/320px (w-64 h-64 md:w-80 md:h-80) blurred radial gradient (scale + opacity pulse, 3s loop)
2. **Ring 1** — Rotating SVG circle (20s clockwise, dashed stroke `10 5`, gradient)
3. **Ring 2** — Counter-rotating SVG circle (30s counter-clockwise, dashed stroke `8 8`)
4. **Inner core** — Rounded div with radial gradient, pulsing `boxShadow` (3s loop)
5. **Conic energy swirl** — Rotating `conic-gradient` overlay (10s loop, opacity 0.3)
6. **Layer stack icon** — SVG with 3 animated `motion.path` paths drawing in on mount (0s, 0.5s, 1s delays)
7. **8 energy particles** — Pre-calculated coordinates at 80px radius, breathing opacity/scale (2s loop, 0.25s stagger)
8. **Active state halo** — Conditional blurred div overlay when `isActive === true`

**Pre-calculated particles:** Uses static `CORE_PARTICLES` array with trigonometry calculated at module level to prevent runtime overhead:
```js
const CORE_PARTICLES = Array.from({ length: 8 }).map((_, i) => {
  const angleRad = (i * 45 * Math.PI) / 180
  return {
    cx: 112 + Math.cos(angleRad) * 80,
    cy: 112 + Math.sin(angleRad) * 80,
  }
})
```

**Unique ID system:** Uses `useId()` with colon replacement to generate unique IDs for SVG `linearGradient` elements, preventing ID collisions when multiple instances could render.

---

### 8.2 `OrbitRing` (155 lines)

**Role:** The circular track for each orbit level.

**Props:**

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `radius` | `number` | required | Orbit radius in SVG units |
| `duration` | `number` | required | Seconds for one full particle orbit |
| `isActive` | `boolean` | required | Enhances opacity, stroke width, adds dashed highlight ring |
| `hasActiveSelection` | `boolean` | `false` | Pauses SMIL animations when any node is selected |

**SVG viewBox:** `0 0 800 800` with center at `(400, 400)`.

**Components inside each ring:**
- **Base circle** — `motion.circle` with `pathLength 0→1` draw animation on mount
- **Active dashed ring** — Conditional second circle with `strokeDasharray="20 10"` and glow filter
- **4 ambient particles** — `motion.circle` elements using SMIL `<animateMotion>` to travel along the orbit path. Staggered start via `begin="-${(i/4)*duration}s"` so they're already distributed when the page loads

**SMIL Animation Pause Control:**
```js
useEffect(() => {
  if (svgRef.current) {
    if (hasActiveSelection) {
      svgRef.current.pauseAnimations()
    } else {
      svgRef.current.unpauseAnimations()
    }
  }
}, [hasActiveSelection])
```

**Orbit path formula for particles:**
```js
`M ${center - radius} ${center} a ${radius} ${radius} 0 1 0 ${2*radius} 0 a ${radius} ${radius} 0 1 0 -${2*radius} 0`
```
This is a full SVG arc path (two arcs forming a complete circle), required because SVG `animateMotion` cannot traverse a closed `<circle>` element.

**Unique ID system:** Uses `useId()` with colon replacement for gradient and filter IDs.

---

### 8.3 `ExperienceNode` (140 lines)

**Role:** The clickable orbit capsule for each experience entry.

**Props:**

| Prop | Type | Purpose |
|---|---|---|
| `exp` | `Object` | Experience data object |
| `index` | `number` | Node index in the array |
| `isActive` | `boolean` | Whether this node is currently selected |
| `isDimmed` | `boolean` | Whether this node should be dimmed (when another is active) |
| `onSelect` | `function` | Callback when node is clicked |
| `nodeRef` | `React.Ref` | Ref for focus management |

**Key behaviors:**
- Rendered as `motion.button` for native keyboard and click accessibility
- Hover state for conditional scan line and scale interactions
- `aria-label` and `aria-expanded` attributes for accessibility
- Disabled when `isDimmed` is true
- Scale: `0.85` when dimmed, `1.15` when active, `1.0` normal, `1.1` on hover

**Visual layers:**
1. Glassmorphic card (`from-white/10 to-white/5`, `backdrop-blur-xl`)
2. Conditional inset + outer glow box-shadow when active
3. Emoji icon in rounded square with gradient
4. Pulse ring on icon when active (scale/opacity loop, 2s)
5. Holographic scan line — horizontal gradient line sweeping `y: -100% → 200%` on hover/active, looping with 2.5s pause
6. Focus ring overlay (opacity transitions with `group-focus-visible`)

---

### 8.4 `EnergyBeam` (256 lines)

**Role:** An SVG laser line connecting the `CareerCore` center to the currently active node.

**Props:**

| Prop | Type | Purpose |
|---|---|---|
| `startX` | `number` | Center X coordinate |
| `startY` | `number` | Center Y coordinate |
| `endX` | `number` | Target node X coordinate |
| `endY` | `number` | Target node Y coordinate |
| `width` | `number` | SVG container width |
| `height` | `number` | SVG container height |

**Mounting:** Rendered conditionally when `selectedNodeIndex !== -1 && beamCoords` exists.

**Beam path:** Straight line (not quadratic bezier):
```js
const beamPath = `M ${centerX} ${centerY} L ${targetX} ${targetY}`
```

**SVG layers (innermost to outermost visually):**
1. **Outer glow layer** — `strokeWidth=7`, `strokeOpacity=0.15`, Gaussian blur filter
2. **Mid glow layer** — `strokeWidth=3.5`, gradient stroke (accent → 30% opacity), Gaussian blur filter
3. **Inner hot core** — `strokeWidth=1.2`, white stroke, `strokeOpacity=0.95`
4. **Energy pulse 1** — White circle (`r=3`) with `animateMotion` traveling the path (1.8s loop)
5. **Energy pulse 2** — Accent circle (`r=2.5`) with `animateMotion` staggered by 0.9s
6. **Node endpoint reticle** — Rotating dashed circle (`r=9`, 8s rotation)
7. **Node endpoint bracket** — Diamond rect with pulse opacity (2.5s loop)
8. **Node endpoint dot** — Pulsing white circle (`r=3`, 2s loop)
9. **Core emission ring** — Pulsing outer ring (`r=12`, 2.2s loop)
10. **Core emission dot** — Pulsing center dot (`r=5`, 2s loop)

**Unique ID system:** Uses `useId()` with colon replacement for gradient and filter IDs.

---

### 8.5 `ExperienceDetails` (271 lines)

**Role:** The slide-in glassmorphic panel that reveals full experience data when a node is selected.

**Implemented with `forwardRef`** — the ref is passed through to the inner card `div` and used for focus management in the parent component.

**Props:**

| Prop | Type | Purpose |
|---|---|---|
| `exp` | `Object` | Experience data object |
| `position` | `'left' \| 'right'` | Panel position relative to center |
| `onClose` | `function` | Callback when close button is clicked |
| `ref` | `React.Ref` | Ref for focus management |

**Position logic:** Dynamically calculated in parent based on node's viewport position:
```js
const nodeCenterX = rect.left + rect.width / 2
setDetailsPosition(nodeCenterX >= centerX ? 'left' : 'right')
```

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
| Header (icon + badge) | 0.35-0.5s | Spin-in emoji, slide-in badge |
| Role heading | 0.45s | `h3` with font-heading |
| Company name | 0.5s | Accent-colored `p` |
| Duration | 0.55s | Secondary-color `p` |
| Divider line | Stagger | Accent gradient hr |
| Key Achievements | 0.3 + i×0.1s | Animated `li` with `▸` accent bullet |
| Technologies | 0.7 + i×0.08s | Spring-animated pill badges |
| Project Impact | 0.6s | Row cards with name + impact |

**Persistent effects:**
- Animated border glow sweep (CSS mask technique, `opacity: 0.1`)
- Holographic scan line traversing full panel height (`y: 0% → 100% → 0%`, 3s loop)
- Bottom accent line scale-in (`scaleX 0→1` at 0.8s delay)

**Close button:** Has `data-custom-cursor-ignore` attribute — suggests the portfolio has a custom cursor system that should not apply its hover effect to this button.

---

### 8.6 `ExperienceCard` (133 lines)

**Role:** Full-width detailed card for mobile viewports. No orbit mechanics.

**Props:**

| Prop | Type | Purpose |
|---|---|---|
| `exp` | `Object` | Experience data object |
| `index` | `number` | Card index in the array |
| `total` | `number` | Total number of cards |

**Badge color logic (`getBadgeColor`):**

| Badge value | Color scheme |
|---|---|
| `'Current'` | Green (`green-500/emerald-500`) |
| `'Active'` | Blue (`blue-500/cyan-500`) |
| `'Leadership'` | Purple/pink (`purple-500/pink-500`) |
| Default | Accent colors |

**Structure:**
- `<article>` element with `aria-label="{role} at {company}"`
- Animated gradient background on hover (`from-accent/5 via-transparent to-accent-hover/5`)
- Animated glowing border on hover (uses inline style with `gradientShift` keyframe)
- Card number indicator (`01 / 03` style) — `aria-hidden="true"`
- `<time dateTime={exp.duration}>` for semantic date markup
- Bullet points with circular gradient checkmark icons
- Technology pills with entrance animation (`scaleIn` keyframe)
- Calendar icon with `wiggle` animation

**Known issue:** `gradientShift`, `scaleIn`, and `wiggle` are CSS keyframe animations referenced by name but their definitions must exist in the global CSS. If those keyframes are missing, the animations silently fail.

---

## 9. Animation System

### Section Entrance

```js
const isInView = true  // Hardcoded to always trigger entrance
```

The section uses `isInView = true` to trigger entrance animations immediately when the component mounts. Drives `containerVariants` → `itemVariants` stagger cascade.

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
```

### Background Orbs (Section-level)

Two large gradient blobs enter via `opacity 0→0.25/0.20, scale 0.8→1.0` when `isInView` becomes `true`. They remain static after entrance (no looping).

### Mesh Pattern

Animated mesh pattern with radial gradient dots enters with `opacity 0→0.03` when `isInView` becomes `true`.

### Orbit Animation (CSS Keyframes)

The orbit system uses CSS keyframe animations instead of JavaScript:
- Parent container: `orbit-cw` (35s linear infinite)
- Node counter-rotation: `orbit-ccw` (35s linear infinite)

Animations are paused/resumed via Web Animations API when a node is selected.

### CTA Button

```jsx
<motion.a
  href="mailto:sai.pallav@bits-pilani.ac.in"
  whileHover={{ scale: 1.05, y: -4 }}
  whileTap={{ scale: 0.98 }}
>
  <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
    →
  </motion.span>
</motion.a>
```

Features a shimmer sweep overlay (`via-white/20`, translates from `-full` to `full` on hover).

---

## 10. SVG & Canvas Techniques

| Technique | Used In | Purpose |
|---|---|---|
| `pathLength 0→1` | `OrbitRing`, `EnergyBeam`, `CareerCore` | Draw-in animation for paths and circles |
| `animateMotion` (SMIL) | `OrbitRing` particles, `EnergyBeam` pulses | Circular motion along SVG arc path |
| `linearGradient` (SVG) | `CareerCore`, `OrbitRing`, `EnergyBeam` | Gradient fills for strokes |
| `radialGradient` (SVG) | `EnergyBeam` pulse circle | Soft-edge glow for traveling energy ball |
| `feGaussianBlur` + `feMerge` filter | `OrbitRing`, `EnergyBeam` | SVG glow filter (blur below, original above) |
| `conic-gradient` (CSS) | `CareerCore` inner core | Rotating light swirl effect |
| Straight line `L` | `EnergyBeam` | Direct beam path from center to node |
| UID-scoped gradient IDs | `CareerCore`, `OrbitRing`, `EnergyBeam` | Prevents SVG element ID namespace collisions |
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
  → Web Animations API pauses orbit animations (syncAndControlAnimations)
  → EnergyBeam appears (conditional rendering with beamCoords)
  → ExperienceDetails appears (AnimatePresence, mode="wait")
  → Focus moves to details panel (detailsRef.current?.focus())
  → Active node scales to 1.15, opacity 1.0
  → Active OrbitRing highlights (dashed rotating ring appears)
  → CareerCore shows additional halo (isActive=true)
  → Details panel position calculated based on node viewport location

User clicks same node again (or X button)
  → handleNodeSelect(same index) or handleCloseDetails()
  → selectedNodeIndex resets to -1
  → Focus restored to triggering node (nodeRefs.current[prevIndex].focus())
  → EnergyBeam exits (conditional rendering)
  → ExperienceDetails exits (AnimatePresence mode="wait")
  → Web Animations API resumes orbit animations
  → All nodes return to normal state
```

### `AnimatePresence mode="wait"` for Details

When switching between different nodes, `mode="wait"` ensures the previous `ExperienceDetails` panel fully exits (slides out + blurs out) before the new panel enters. This prevents two panels from overlapping during transitions.

### Node Toggle

```js
const handleNodeSelect = useCallback((index) => {
  setSelectedNodeIndex(prev => prev === index ? -1 : index)
}, [])
```

Clicking an already-active node deselects it (returns to default orbit state).

### Dynamic Details Panel Position

The panel position is calculated dynamically based on the selected node's location in the viewport:

```js
useEffect(() => {
  if (currentNodeIndex === -1) return
  const nodeEl = nodeRefs.current[currentNodeIndex]
  if (nodeEl) {
    const rect = nodeEl.getBoundingClientRect()
    const centerX = window.innerWidth / 2
    const nodeCenterX = rect.left + rect.width / 2
    setDetailsPosition(nodeCenterX >= centerX ? 'left' : 'right')
  }
}, [currentNodeIndex])
```

This ensures the panel appears on the side of the screen opposite to the node, preventing overlap.

---

## 12. State Management

All state lives in the `Experience()` component:

| State / Ref | Type | Purpose |
|---|---|---|
| `selectedNodeIndex` | `useState(-1)` | Which node is active (-1 = none) |
| `isMobile` | `useState(false)` | Mobile viewport detection |
| `detailsPosition` | `useState('left')` | Dynamic panel position based on node location |
| `beamCoords` | `useState(null)` | Energy beam coordinates for SVG rendering |
| `sectionRef` | `useRef` | Section container reference |
| `orbitContainerRef` | `useRef` | Orbit container for beam coordinate calculation |
| `detailsRef` | `useRef` | Details panel for focus management |
| `nodeRefs` | `useRef([])` | Array of node button refs for focus restoration |

### Derived Values (pure, no state)

```js
const currentNodeIndex = selectedNodeIndex   // Alias (currently a 1:1 mapping)
```

The comment says "Use only manually selected node (not scroll-based)" — indicating scroll-based auto-selection was intentionally removed from a previous version.

### Memoized Callbacks

```js
const nodeRefCallbacks = useMemo(() => {
  return Array.from({ length: experience.length }).map((_, i) => (el) => {
    nodeRefs.current[i] = el
  })
}, [])
```

This creates stable ref callback handlers to prevent memoized child re-renders.

---

## 13. Accessibility (a11y)

### Strengths

- ✅ **Section `aria-label`**: `<section aria-label="Career Orbit Experience">`
- ✅ **Node buttons**: `aria-label={`View details for ${exp.role} at ${exp.company}`}`
- ✅ **`aria-expanded`**: Set on `ExperienceNode` button, correctly reflects active state
- ✅ **Disabled state**: Nodes are disabled when `isDimmed` is true
- ✅ **Decorative elements**: Background orbs and SVG effects have `aria-hidden="true"`
- ✅ **Close button `aria-label`**: `"Close details panel"`
- ✅ **Close button `type="button"`**: Prevents accidental form submission
- ✅ **Semantic `<article>`**: Used in `ExperienceCard` for mobile cards
- ✅ **`<time>` element**: Used in `ExperienceCard` with `dateTime` attribute
- ✅ **Role lists**: `role="list"` and `role="listitem"` on tech tags in mobile card
- ✅ **Focus management**: Focus moves to details panel when it opens (`detailsRef.current?.focus()`)
- ✅ **Focus restoration**: Focus restored to triggering node when panel closes (`nodeRefs.current[prevIndex].focus()`)
- ✅ **Escape key handler**: Global `keydown` listener closes details panel with Escape key
- ✅ **Focus visible ring**: `group-focus-visible` styles for keyboard navigation
- ✅ **Details panel `tabIndex={-1}`**: Panel is focusable but not in tab order

### Gaps

- ⚠️ **No focus trap in details panel**: When `ExperienceDetails` opens, focus moves to the panel but is not trapped. Users can Tab out of the panel
- ⚠️ **Mobile card `<h3>` nesting**: Inside an `<article>`, the `h3` is correct, but there's no `h2` wrapping the mobile layout — the section heading uses `motion.h2` inside its own wrapper, so the heading hierarchy is: `h2 (section) → h3 (cards)` ✅ (this is actually fine)

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

###  Medium — `ExperienceCard` References Undefined Keyframes

```jsx
className="... animate-[gradientShift_3s_linear_infinite]"
className="... animate-[scaleIn_0.6s_ease-out_forwards]"
className="... animate-[wiggle_4s_ease-in-out_infinite]"
```

These Tailwind `animate-[...]` arbitrary values reference keyframe names (`gradientShift`, `scaleIn`, `wiggle`) that must be defined in global CSS. If they're missing from `animations.css` or `index.css`, the animations silently fail. The `gradientShift` on the border glow and `scaleIn` on bullet points need to be verified.

**Fix:** Verify these keyframes exist in global CSS or remove the animation references.

---

### 🟢 Minor — No Focus Trap in Details Panel

When `ExperienceDetails` opens, focus moves to the panel but is not trapped. Users can Tab out of the panel, which may be confusing for keyboard-only users.

**Fix:** Implement a focus trap using a library like `focus-trap-react` or custom logic.

---

## 16. Performance Analysis

| Concern | Detail | Risk |
|---|---|---|
| **CSS keyframe animations** | Orbit rotation uses CSS keyframes (`orbit-cw`, `orbit-ccw`) running on compositor thread | Low — Very efficient, no JavaScript overhead |
| **Web Animations API synchronization** | Uses `getAnimations()` to pause/play CSS animations when node selected | Low — Minimal overhead, only runs on selection change |
| **SMIL animations in OrbitRing** | 4 particles per ring use `<animateMotion>` along SVG paths | Low — Browser-optimized, paused via `pauseAnimations()` when node selected |
| **`ResizeObserver` in EnergyBeam** | Observes `orbitContainerRef` for size changes. Correctly disconnected on unmount | Low — Observer is cheap and properly cleaned up |
| **Background orb entrance** | Two large `600px`/`500px` blurred divs animate once on enter. Stay static after | Low — Static after mount, no ongoing cost |
| **8 energy particles in CareerCore** | 8 `motion.circle` elements with separate `opacity`+`scale` animations | Low — Small number, pre-calculated coordinates |
| **`AnimatePresence` with `mode="wait"`** | Detail panel uses blur transition (`filter: blur(10px)`) which triggers layer composition | Low-Medium — Blur on exit/enter is GPU-accelerated but can drop frames on lower-end devices |
| **Mobile resize listener** | No debouncing on resize listener | Low-Medium — Could cause excessive re-renders on rapid resizing |
| **Pre-calculated particle coordinates** | `CORE_PARTICLES` calculated at module level to prevent runtime trigonometry | Good — Optimization to avoid repeated calculations |

---

## 17. Improvement Recommendations

### High Priority

1. **Verify keyframe definitions** (`gradientShift`, `scaleIn`, `wiggle`) — Ensure they exist in global CSS or remove the animation references from `ExperienceCard`.

2. **Implement focus trap in details panel** — Add a focus trap using a library like `focus-trap-react` or custom logic to prevent keyboard users from tabbing out of the panel.

### Medium Priority

3. **Add debouncing to mobile resize listener** — Prevent excessive re-renders on rapid window resizing.

4. **Add `--bg-hover-experience` to the theme system** for consistency with other sections.

### Low Priority

5. **Add touch support** for orbit node interaction — Currently orbit system is desktop-only, mobile gets cards, but tablet breakpoints may see orbit without touch-friendly interaction.

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
        └── [!isMobile] Desktop: Orbit Container (h-[85vh] lg:h-[100vh])
            ├── orbit-rotating-parent (CSS animation: orbit-cw 35s linear infinite)
            │   ├── motion.div (coreVariants wrapper, z-50)
            │   │   └── CareerCore (isActive=selectedNodeIndex!==-1)
            │   │       ├── Outer glow blob (pulse animation)
            │   │       ├── SVG Ring 1 (rotate +20s)
            │   │       ├── SVG Ring 2 (rotate -30s)
            │   │       ├── Inner core (pulse boxShadow, conic swirl)
            │   │       ├── Layer stack SVG icon (path draw-in ×3)
            │   │       └── 8 energy particles (breathing opacity, pre-calculated)
            │   │
            │   ├── OrbitRing [0] (r=280, 35s, z-default)
            │   ├── OrbitRing [1] (r=350, 35s, z-default)
            │   ├── OrbitRing [2] (r=430, 35s, z-default)
            │   │   Each ring contains:
            │   │   ├── Base circle (pathLength draw-in)
            │   │   ├── [isActive] Dashed rotating highlight ring
            │   │   └── 4 SMIL-animated orbit particles (paused on selection)
            │   │
            │   └── orbit-wrapper-[i] (static rotation: 0°, 120°, 240°)
            │       └── orbit-node-[i] (counter-rotation: orbit-ccw 35s)
            │           └── ExperienceNode [i] (z=30/40)
            │               Each node:
            │               ├── motion.button (aria-expanded, aria-label, disabled when dimmed)
            │               ├── Glassmorphic card
            │               ├── [isActive] Glow overlay
            │               ├── Icon square with emoji + [isActive] pulse ring
            │               ├── Role/company/duration/badge text
            │               └── [isActive|hovered] Holographic scan line
            │
            ├── [selectedNodeIndex !== -1 && beamCoords] EnergyBeam (z=35)
            │   └── SVG (full container size)
            │       ├── beamGradient + beamGlow + pulseGradient defs (with unique IDs)
            │       ├── Outer glow layer (strokeWidth=7)
            │       ├── Mid glow layer (strokeWidth=3.5, gradient)
            │       ├── Inner hot core (strokeWidth=1.2)
            │       ├── Energy pulse 1 (animateMotion, 1.8s)
            │       ├── Energy pulse 2 (animateMotion, staggered 0.9s)
            │       ├── Node endpoint reticle (rotating dashed circle)
            │       ├── Node endpoint bracket (diamond rect)
            │       ├── Node endpoint dot (pulsing)
            │       ├── Core emission ring (pulsing)
            │       └── Core emission dot (pulsing)
            │
            └── AnimatePresence mode="wait" → [selectedNodeIndex !== -1] ExperienceDetails (z=60)
                └── motion.div (slide + blur entrance, tabIndex={-1})
                    ├── Border glow sweep overlay
                    ├── Holographic scan line (3s loop)
                    ├── Gradient overlay
                    ├── Close button (X icon, rotate on hover, data-custom-cursor-ignore)
                    └── Content (staggered children)
                        ├── Header (icon spin-in, badge slide-in, h3, company, duration)
                        ├── Divider
                        ├── Key Achievements (animated li items)
                        ├── Technologies (spring pill badges)
                        └── Project Impact (name + impact rows)
│
└── CTA Section (itemVariants)
    └── motion.a → "mailto:sai.pallav@bits-pilani.ac.in" (shimmer sweep, bouncing arrow)
```
