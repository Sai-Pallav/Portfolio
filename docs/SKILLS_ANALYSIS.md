# Skills Section — Deep Technical Analysis

> **Portfolio:** Sai Pallav | **Primary file:** `src/components/sections/Skills.jsx`
> **Last Analyzed:** June 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Structure & Inventory](#2-file-structure--inventory)
3. [Data Model — `skills.js`](#3-data-model--skillsjs)
4. [Main Component — `Skills.jsx`](#4-main-component--skillsjsx)
5. [The `ThreeDMarqueeDemo` Bridge Component](#5-the-threedmarqueedemo-bridge-component)
6. [The `ThreeDMarquee` Core Component](#6-the-threedmarquee-core-component)
7. [The `MarqueeColumn` Sub-Component](#7-the-marqueecolomn-sub-component)
8. [The Scroll Animation Engine (rAF Loop)](#8-the-scroll-animation-engine-raf-loop)
9. [Tile Rendering — Icon & Label System](#9-tile-rendering--icon--label-system)
10. [Hover Tooltip System](#10-hover-tooltip-system)
11. [Column Header Labels](#11-column-header-labels)
12. [3D CSS Transform Deep Dive](#12-3d-css-transform-deep-dive)
13. [Column Layout & Data Distribution](#13-column-layout--data-distribution)
14. [Animation System — Entrance](#14-animation-system--entrance)
15. [Theming Integration](#15-theming-integration)
16. [Accessibility (a11y)](#16-accessibility-a11y)
17. [Known Bugs & Issues](#17-known-bugs--issues)
18. [Performance Analysis](#18-performance-analysis)
19. [Improvement Recommendations](#19-improvement-recommendations)
20. [Appendix — Full Component Tree](#20-appendix--full-component-tree)

---

## 1. Architecture Overview

The Skills section is the most visually complex single-view element in the portfolio. Its centerpiece is a **3D isometric scrolling grid** of technology icons — five columns of skill tiles rendered in a `rotateX(55deg) rotateZ(-45deg)` CSS 3D transform, each column independently auto-scrolling in alternating directions using a `requestAnimationFrame` loop.

The architecture is a 4-layer pipeline:

```
Skills.jsx
  └── ThreeDMarqueeDemo         (bridge: transforms skills data → column groups)
      └── ThreeDMarquee         (core: manages hover state, tooltip, layout)
          └── MarqueeColumn ×5  (leaf: owns rAF loop, renders tile items)
              └── Tile items    (motion.div: icon + label + hover effects)
```

**Data flow:**

```
src/data/skills.js
    ↓ (6 named categories)
ThreeDMarqueeDemo.buildSkillGroups()
    ↓ (5 explicit columns: languages, cs_core, frontend, backend, databases+tools)
ThreeDMarquee (receives images[][], computes maxItems via useMemo)
    ↓ (chunks[][]: 2D array of {url, skill} objects)
MarqueeColumn ×5 (each gets one chunk + colIndex + maxItems)
    ↓ (duplicatedArray: 5 copies of padded chunk for infinite scroll)
motion.div tiles (icon via CSS mask, label, hover effects)
```

---

## 2. File Structure & Inventory

| File | Size | Lines | Role |
|---|---|---|---|
| `src/components/sections/Skills.jsx` | 3,080 B | 86 | Main section wrapper |
| `src/components/3d-marquee-demo.jsx` | 1,522 B | 53 | Data-to-column bridge |
| `src/components/ui/3d-marquee.jsx` | 19,812 B | 473 | Core marquee engine |
| `src/data/skills.js` | 3,648 B | 39 | Skill data source |

There is **no sub-components subdirectory** for Skills (`src/components/sections/skills/` is empty). All logic lives in the four files above.

### Import Map

**`Skills.jsx`**
| Import | Source | Purpose |
|---|---|---|
| `motion`, `useInView` | `motion/react` | Section entrance animation |
| `useRef` | `react` | Ref for `useInView` |
| `ThreeDMarqueeDemo` | `../3d-marquee-demo` | Marquee with data attached |

> **Note:** `Skills.jsx` imports from `motion/react` (the package alias), while `3d-marquee.jsx` also imports from `motion/react`. Both resolve to the same Framer Motion library — the alias is a build-time configuration.

**`3d-marquee-demo.jsx`**
| Import | Source | Purpose |
|---|---|---|
| `ThreeDMarquee` | `@/components/ui/3d-marquee` | Core marquee component |
| `skills` | `@/data/skills` | Raw skills data |

**`3d-marquee.jsx`**
| Import | Source | Purpose |
|---|---|---|
| `motion`, `useInView`, `useMotionValue`, `useSpring` | `motion/react` | Animations + spring cursor |
| `useRef`, `useState`, `useEffect`, `useCallback`, `useMemo`, `memo` | `react` | Full hooks toolkit |
| `cn` | `@/lib/utils` | Tailwind className merger |

---

## 3. Data Model — `skills.js`

Located at `src/data/skills.js`. Exports a **named `skills` object** (not an array). The object has 6 category keys:

### Category Keys & Item Counts

| Key | Category Name | Items |
|---|---|---|
| `languages` | Core Programming Languages | 5 |
| `frontend` | Frontend Web | 4 |
| `backend` | Backend Web | 3 |
| `databases` | Databases | 3 |
| `tools` | DevOps & Tools | 3 |
| `cs_core` | CS Fundamentals / Concepts | 6 |

**Total skills: 24**

### Skill Entry Schema

```ts
interface Skill {
  name:    string   // Full display name (shown in tooltip)
  icon:    string   // Devicon icon identifier (used to build CDN URL)
  level:   string   // 'primary' | 'secondary'
  years:   number   // Years of experience (can be decimal: 1.5)
  tag:     string   // Comma-separated category tags (shown in tooltip, prefixed #)
  project: string   // Example project name (shown in tooltip)
  label?:  string   // SHORT label for CS concepts (shown under icon tile)
}
```

The optional `label` field only appears on `cs_core` items. It provides a short abbreviation shown as a text overlay below the icon in the tile. The `label` field is the key trigger for different tile rendering behavior in `MarqueeColumn`.

### Full Dataset

**`languages` (Column 0)**
| Name | Icon | Level | Years | Tag | Project |
|---|---|---|---|---|---|
| C++ | `cplusplus` | primary | 3 | DSA, Systems | Algorithms & Data Structures |
| Python | `python` | primary | 4 | ML, Scripting, Backend | Data Analysis Pipeline |
| JavaScript | `javascript` | primary | 3 | Frontend, Logic | Interactive Dashboards |
| TypeScript | `typescript` | primary | 2 | Frontend, Typed Logic | SaaS Dashboard |
| Rust | `rust` | secondary | 1 | Systems, Memory Safety | CLI File Parser |

**`cs_core` (Column 1)**
| Name | Label | Icon | Level | Years | Tag |
|---|---|---|---|---|---|
| Data Structures & Algorithms | `DSA` | `cplusplus` | primary | 3 | DSA, Problem Solving |
| Operating Systems | `OS` | `linux` | primary | 2 | OS Concepts |
| Database Management Systems | `DBMS` | `postgresql` | primary | 2 | DBMS Concepts |
| Computer Networks | `Networks` | `linux` | secondary | 2 | Networking, TCP/IP |
| Object-Oriented Design | `OOD` | `cplusplus` | primary | 3 | OOP Design Patterns |
| System Design | `System Design` | `cplusplus` | secondary | 1.5 | Scale, Architecture |

**`frontend` (Column 2)**
| Name | Icon | Level | Years |
|---|---|---|---|
| React | `react` | primary | 2 |
| Next.js | `nextjs` | primary | 1.5 |
| Tailwind CSS | `tailwindcss` | primary | 2 |
| Framer Motion | `framer` | secondary | 1.5 |

**`backend` (Column 3)**
| Name | Icon | Level | Years |
|---|---|---|---|
| Node.js | `nodejs` | primary | 2 |
| Express | `express` | primary | 2 |
| FastAPI | `fastapi` | secondary | 1 |

**`databases` + `tools` merged (Column 4)**
| Name | Icon | Level | Years |
|---|---|---|---|
| PostgreSQL | `postgresql` | primary | 2 |
| MongoDB | `mongodb` | primary | 2 |
| Redis | `redis` | secondary | 1 |
| Git | `git` | primary | 4 |
| Docker | `docker` | primary | 2 |
| Linux | `linux` | primary | 3 |

### Icon URL Construction

```js
const getDeviconUrl = (icon) => {
  if (icon === "framer") {
    return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/framermotion/framermotion-original.svg"
  }
  return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${icon}/${icon}-original.svg`
}
```

**Pattern:** `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/{icon}/{icon}-original.svg`

**Exception:** `framer` maps to `framermotion/framermotion-original.svg` because the Devicon repository uses `framermotion` as the directory name, not `framer`.

All icons are SVG files served via jsDelivr CDN (GitHub-backed). The `@latest` tag resolves to the latest published Devicon version — if Devicon renames or removes icons, URLs will break silently.

---

## 4. Main Component — `Skills.jsx`

The section shell is deliberately thin (86 lines). It handles:
1. Scroll-triggered section entrance
2. Section background
3. Header text (badge + heading + subtitle)
4. Marquee container

### Section Attributes

```jsx
<section
  id="skills"
  className="py-24 relative overflow-hidden bg-[var(--bg)]"
>
```

- **No `aria-label` or `aria-labelledby`** — the section has no explicit accessibility label at the section element level. The `<h2>` inside provides implicit labelling but best practice is `aria-labelledby`.
- `overflow-hidden` — clips any marquee overflow beyond section bounds.

### Background Layer

```jsx
<div className="absolute inset-0 bg-[image:var(--bg-hover-skills)] pointer-events-none" />
```

Uses `bg-[image:...]` — a Tailwind arbitrary property that maps to the CSS `background-image` property. The value is `var(--bg-hover-skills)`, which is a radial gradient defined per theme. This creates a subtle colored glow in the upper-right area of the section.

### Animation Variants (Module-Level Constants)

All three variant objects are defined **outside the component function** — they are stable references across renders:

```js
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  }
}

const marqueeVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 48 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.45 }
  }
}
```

### Stagger Sequence

The `containerVariants` stagger of `0.15s` produces this order:
1. Badge pill (`itemVariants`) — t=0
2. `<h2>` heading (`itemVariants`) — t=0.15s
3. Subtitle `<p>` (`itemVariants`) — t=0.30s
4. Marquee wrapper (`marqueeVariants`) — t=0.30s + 0.45s explicit delay = **t=0.75s**

The marquee has its own longer duration (`1.0s` vs `0.7s`) and starts with `scale: 0.94` so it zooms up as it fades in.

### `useInView` Configuration

```js
const isInView = useInView(ref, { once: true, margin: "-80px 0px" })
```

- `once: true` — fires once and stays visible. The marquee columns start scrolling and never reset.
- `margin: "-80px 0px"` — section must be 80px into the viewport before triggering.

### Header Content

| Element | Text | Style |
|---|---|---|
| Badge | "Expertise" | Font mono, `tracking-[0.2em]`, pulsing accent dot |
| `<h2>` | "Tools of the Trade" | `text-4xl md:text-6xl font-extrabold tracking-tighter` |
| "Trade" span | Gradient text | `from-[var(--accent)] via-[var(--accent-hover)] to-white/50` |
| `<p>` subtitle | "A comprehensive ecosystem..." | `text-lg md:text-xl font-light`, max-w-2xl |

The badge has an animated pulse dot: `w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse`.

---

## 5. The `ThreeDMarqueeDemo` Bridge Component

**File:** `src/components/3d-marquee-demo.jsx`

This is a thin adapter that transforms the structured `skills.js` data into the 5-column format expected by `ThreeDMarquee`.

### `buildSkillGroups()` — Column Mapping

```js
const buildSkillGroups = () => [
  // Column 0: languages (5 items)
  skills.languages.map(item => ({ url: getDeviconUrl(item.icon), skill: { ...item } })),
  // Column 1: cs_core (6 items)
  skills.cs_core.map(item => ({ url: getDeviconUrl(item.icon), skill: { ...item } })),
  // Column 2: frontend (4 items)
  skills.frontend.map(item => ({ url: getDeviconUrl(item.icon), skill: { ...item } })),
  // Column 3: backend (3 items)
  skills.backend.map(item => ({ url: getDeviconUrl(item.icon), skill: { ...item } })),
  // Column 4: databases + tools merged (6 items)
  [...skills.databases, ...skills.tools].map(item => ({ url: getDeviconUrl(item.icon), skill: { ...item } })),
]
```

**Column → header label mapping** (hardcoded in `ThreeDMarquee`):
| Column Index | Data Source | Count | Header Label |
|---|---|---|---|
| 0 | `languages` | 5 | "Core" |
| 1 | `cs_core` | 6 | "OOP" |
| 2 | `frontend` | 4 | "Web Dev" |
| 3 | `backend` | 3 | "Data & ML" |
| 4 | `databases + tools` | 6 | "Tools" |

> **Bug:** The header labels in `ThreeDMarquee` (`["Core", "OOP", "Web Dev", "Data & ML", "Tools"]`) **do not match** the actual column contents. Column 1 is `cs_core` (CS fundamentals like DSA, OS, DBMS) but is labelled "OOP". Column 3 is `backend` (Node.js, Express, FastAPI) but is labelled "Data & ML". Column 4 is `databases + tools` (PostgreSQL, MongoDB, Redis, Git, Docker, Linux) but is labelled "Tools" — this one is roughly correct.

### `"use client"` Directive

Both `3d-marquee-demo.jsx` and `3d-marquee.jsx` begin with `"use client"`. This is a Next.js directive marking the file as a client component. Since this portfolio uses **Vite + React** (not Next.js), this directive is **silently ignored**. It has no effect on the Vite build but is unnecessary boilerplate.

### Output Shape

Each column produces an array of objects:
```ts
interface ColumnItem {
  url: string    // CDN SVG URL for the icon
  skill: Skill   // Full skill object from skills.js
}
```

`buildSkillGroups()` is called **at module level** (outside the component function) — it runs once when the module is first imported, producing a stable reference that never changes. This is correct behavior since `skills.js` is static data.

---

## 6. The `ThreeDMarquee` Core Component

**File:** `src/components/ui/3d-marquee.jsx`, exported as named `{ ThreeDMarquee }`.

### Props

```ts
interface ThreeDMarqueeProps {
  images:           ColumnItem[][] | ColumnItem[]   // 2D (pre-grouped) or 1D (auto-distributed)
  className?:       string                          // Extra class for outer div
  directionPattern?: number[]                       // Per-column scroll direction (+1 up, -1 down)
}
```

`directionPattern` is never passed by `ThreeDMarqueeDemo` — the default `[-1, 1, -1, 1, -1]` (alternating up/down) is used.

### State & Motion Values

| Variable | Type | Purpose |
|---|---|---|
| `hoveredSkill` | `useState(null)` | The currently hovered/focused `Skill` object |
| `focusSource` | `useState('mouse')` | `'mouse'` or `'keyboard'` — determines tooltip position |
| `mouseX` | `useMotionValue(0)` | Raw cursor X position |
| `mouseY` | `useMotionValue(0)` | Raw cursor Y position |
| `cursorX` | `useSpring(mouseX, config)` | Spring-smoothed cursor X for tooltip |
| `cursorY` | `useSpring(mouseY, config)` | Spring-smoothed cursor Y for tooltip |

Spring config: `{ type: "spring", mass: 0.8, stiffness: 250, damping: 22 }` — medium inertia, responsive feel.

### `chunks` Computation (`useMemo`)

```js
const { chunks, maxItems, chunkSize } = useMemo(() => {
  // Path A: 2D pre-grouped input (from ThreeDMarqueeDemo)
  if (images.length > 0 && Array.isArray(images[0])) {
    const max = Math.max(...images.map(col => col.length), 4)
    return { chunks: images, maxItems: max, chunkSize: max }
  }
  // Path B: 1D flat array auto-distribution (fallback)
  const columns = 5
  const max = Math.max(Math.ceil(images.length / columns), 4)
  ...
}, [images])
```

Since `buildSkillGroups()` always returns a 2D array, **Path A is always taken**. The key outputs:
- `chunks = images` (the 5-column array directly)
- `maxItems = max(5, 6, 4, 3, 6, 4) = 6` (largest column)
- `chunkSize = maxItems = 6`

`maxItems = 6` is used to pad all shorter columns to 6 items (wrapping with modulo), ensuring equal height across all columns.

### `useInView` in `ThreeDMarquee`

```js
const isInView = useInView(ref, { margin: "-60px 0px" })
```

Notice: **no `once: true`** — this means if the user scrolls the Skills section completely out of view and back, the marquee columns re-trigger their scroll animations. This is intentional: the rAF loops stop when out of view and restart when back in view.

This is **different from `Skills.jsx`'s `useInView`** which uses `once: true` (header entrance plays once only).

### Pointer Move Handler

```js
const handlePointerMove = useCallback((e) => {
  if (!hoveredSkill) return  // Guard: only update if something is hovered
  setFocusSource('mouse')
  mouseX.set(e.clientX)
  mouseY.set(e.clientY)
}, [mouseX, mouseY, hoveredSkill])
```

Updates `mouseX`/`mouseY` directly — these are `MotionValue`s, so **no React re-render** occurs on mouse move. The tooltip position updates via the spring values connected directly to framer-motion.

### Skill Hover Callback

```js
const handleSkillHover = useCallback((skillData, source, e) => {
  if (skillData) {
    if (source === 'mouse' && e) { mouseX.set(e.clientX); mouseY.set(e.clientY) }
    setHoveredSkill(skillData)
    if (source === 'keyboard') setFocusSource('keyboard')
  } else {
    setHoveredSkill(null)
  }
}, [mouseX, mouseY])
```

Passed down to every `MarqueeColumn` via `onSkillHover`. When a tile is hovered/focused, it calls this with the full `skill` object. When unhovered/blurred, it calls with `null`.

---

## 7. The `MarqueeColumn` Sub-Component

**Wrapped in `memo()`** to prevent re-renders when parent `ThreeDMarquee` state changes (e.g., `hoveredSkill` changes). Since `onSkillHover` is `useCallback`-stabilized and `directionPattern`/`isInView`/`maxItems` are stable primitives, memoization is effective.

### Props

| Prop | Type | Purpose |
|---|---|---|
| `subarray` | `ColumnItem[]` | Items for this column |
| `colIndex` | `number` | Column index (0–4), used for direction and stagger |
| `chunkSize` | `number` | Max items per column (`= maxItems = 6`) |
| `isInView` | `boolean` | From parent's `useInView` — gates scroll start |
| `maxItems` | `number` | Used to pad `duplicatedArray` |
| `directionPattern` | `number[]` | `[-1, 1, -1, 1, -1]` by default |
| `onSkillHover` | `function` | Bubble hover events to parent |

### Internal State & Refs

| Variable | Type | Purpose |
|---|---|---|
| `prefersReducedMotion` | `useState` | Initialized from `window.matchMedia` at mount |
| `scrollRef` | `useRef` | Ref to the scrolling `div` — `transform` applied directly |
| `timeoutRef` | `useRef` | Stores the startup `setTimeout` ID for cleanup |
| `scrollPositionRef` | `useRef(null)` | Current Y scroll position — updated in rAF loop |
| `isPausedRef` | `useRef(false)` | `true` when a tile is hovered — pauses the column |

### `duplicatedArray` (`useMemo`)

```js
const duplicatedArray = useMemo(() => {
  // Pad shorter columns to maxItems using modulo wrap
  const padded = Array.from({ length: maxItems }, (_, i) => subarray[i % subarray.length])
  // 5 copies for seamless infinite scroll
  return [
    ...padded.map((item, i) => ({ item, copyIndex: 0, slotIndex: i })),
    ...padded.map((item, i) => ({ item, copyIndex: 1, slotIndex: i })),
    ...padded.map((item, i) => ({ item, copyIndex: 2, slotIndex: i })),
    ...padded.map((item, i) => ({ item, copyIndex: 3, slotIndex: i })),
    ...padded.map((item, i) => ({ item, copyIndex: 4, slotIndex: i })),
  ]
}, [subarray, maxItems])
```

For a column with 6 items, `padded` = 6 items (no padding needed). The 5 copies = 30 total tile elements per column, rendering a seamless infinite scroll.

Shorter columns (e.g., backend with 3 items, padded to 6): items repeat — Node.js, Express, FastAPI, Node.js, Express, FastAPI. This is intentional and visible in the UI as repeating icons.

**Key:** `c${colIndex}-s${slotIndex}-x${copyIndex}` — globally unique and stable across re-renders.

### Reduced Motion Detection

```js
const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }
  return false
})
```

Uses a **lazy initializer** to read the media query at mount time. A separate `useEffect` subscribes to `change` events for real-time updates if the user toggles the OS setting. When `prefersReducedMotion` is true:
- The rAF scroll loop **does not start**
- Tile entrance animations have `duration: 0`
- Tile hover spring animations have `duration: 0`
- Backdrop blur on hover has `duration: 0`

---

## 8. The Scroll Animation Engine (rAF Loop)

Each `MarqueeColumn` runs its own independent `requestAnimationFrame` loop.

### Startup Sequence

```js
const lastCardGlobalIndex = colIndex * chunkSize + subarray.length - 1
const totalDelay = lastCardGlobalIndex * TILE_STAGGER + 700
// Column 0 (5 items): (0*6 + 4) * 40 + 700 = 860ms
// Column 1 (6 items): (1*6 + 5) * 40 + 700 = 1140ms
// Column 2 (4 items): (2*6 + 3) * 40 + 700 = 1020ms
// Column 3 (3 items): (3*6 + 2) * 40 + 700 = 1020ms
// Column 4 (6 items): (4*6 + 5) * 40 + 700 = 1680ms

setTimeout(() => { startScroll() }, totalDelay)
```

Each column starts scrolling after the last tile in that column has had time to complete its entrance animation. Column 4 (rightmost) starts last, ~1.68 seconds after `isInView` fires.

### Initial Position

```js
scrollPositionRef.current = -totalHeight   // = -(maxItems * ITEM_HEIGHT)
                                           // = -(6 * 220) = -1320px
scrollRef.current.style.transform = `translate3d(0, ${-totalHeight}px, 0)`
```

Starting at `-totalHeight` ensures the visible window starts at the second copy of the content (the first copy lives at Y=0 to `-totalHeight`). This allows bidirectional wrapping.

### Per-Frame Update

```js
const animate = (time) => {
  const deltaTime = Math.min(time - lastTime, 50)  // clamp to 50ms max (for tab-refocus)
  lastTime = time
  if (!isPausedRef.current) {
    scrollPositionRef.current += direction * pixelsPerMs * deltaTime
    // Wrap boundary:
    if (scrollPositionRef.current <= -2 * totalHeight) {
      scrollPositionRef.current += totalHeight  // Jump forward one height
    } else if (scrollPositionRef.current >= 0) {
      scrollPositionRef.current -= totalHeight  // Jump back one height
    }
    scrollRef.current.style.transform = `translate3d(0, ${scrollPositionRef.current}px, 0)`
  }
  rafId = requestAnimationFrame(animate)
}
```

**Speed:** `SPEED_PX_PER_S / 1000 * deltaTime`  
= `40px/s / 1000 * ~16.67ms` = `~0.667px/frame` at 60fps  
= **40px per second** continuous scrolling

**Delta clamping:** `Math.min(deltaTime, 50)` prevents huge jumps when the tab regains focus after being backgrounded. Without this, returning to a backgrounded tab would cause a massive skip.

**Direct DOM manipulation:** The loop uses `scrollRef.current.style.transform = ...` directly — bypassing React and Framer Motion entirely. This is the correct approach for high-frequency position updates (60fps), as it avoids re-render overhead.

**Pause mechanism:** `isPausedRef.current = true` is set on `onPointerEnter` and `onFocus` of any tile. The rAF loop still runs but skips position updates while paused. The entire column stops scrolling when any tile in it is hovered.

### Direction Pattern

Default: `[-1, 1, -1, 1, -1]`

| Column | Direction | Movement |
|---|---|---|
| 0 (Core Languages) | -1 | Scrolls upward |
| 1 (CS Core) | +1 | Scrolls downward |
| 2 (Frontend) | -1 | Scrolls upward |
| 3 (Backend) | +1 | Scrolls downward |
| 4 (DB + Tools) | -1 | Scrolls upward |

Alternating directions create a visual "breathing" effect where adjacent columns move in opposite directions.

---

## 9. Tile Rendering — Icon & Label System

### Icon Rendering — CSS Mask Technique

Icons are **not rendered as `<img>` tags**. They use a dual CSS mask approach:

```jsx
{/* Default (muted) icon — visible by default, hides on hover */}
<motion.div
  variants={{ hover: { opacity: 0 } }}
  style={{
    background: "var(--text-muted)",
    maskImage: `url(${image})`,      // SVG URL as mask
    maskSize: "contain",
    maskRepeat: "no-repeat",
    maskPosition: "center",
    // WebKit prefixed versions...
  }}
/>

{/* Hover (colored) icon — hidden by default, shows on hover */}
<motion.div
  variants={{ hover: { opacity: 1 } }}
  style={{
    background: "linear-gradient(to right, var(--accent), var(--accent-hover))",
    maskImage: `url(${image})`,
    // Same mask properties...
    opacity: 0,
  }}
/>
```

**How it works:** A solid `background` is shaped by the SVG's alpha channel via `maskImage`. The SVG acts as a stencil — transparent areas cut through, opaque areas let the background show. The result is the icon shape filled with either `var(--text-muted)` (muted state) or the accent gradient (hover state).

**Benefit:** The icon color is fully controlled by CSS, making it theme-responsive. No colored SVG artifacts.

**Requirement:** The SVG must have a transparent background and use opaque fill for the icon shape. Most Devicon SVGs satisfy this.

### Icon Sizes by Tile Type

```jsx
// Regular skill tile (no label):
className={`z-10 ${skill?.label ? "size-12" : "size-20"}`}
// → size-20 = 80px × 80px

// CS concept tile (has label):
// → size-12 = 48px × 48px
```

CS concept tiles use a smaller icon to make room for the text label below.

### CS Concept Label

Only rendered when `skill?.label` is truthy:
```jsx
{skill?.label && (
  <div
    style={{
      fontSize: "9px",
      fontWeight: 700,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      color: "rgba(255,255,255,0.65)",
      maxWidth: `${SCROLL_CONFIG.TILE_SIZE - 16}px`,  // 144px
    }}
  >
    {skill.label}
  </div>
)}
```

Labels: DSA, OS, DBMS, Networks, OOD, System Design.

### Tile Hover Effects (Framer Motion Variants)

The `motion.div` inner card uses `whileHover="hover"` and `whileTap="active"`:

```js
variants={{
  hover: {
    scale: 1.08,
    boxShadow: "0 24px 48px -12px var(--border-glow)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  active: {
    scale: 1.02,
    z: -20,   // pushed "into" the keyboard (isometric depth illusion)
    boxShadow: "0 12px 24px -12px var(--border-glow)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  }
}}
transition={{ type: "spring", mass: 0.8, stiffness: 250, damping: 22 }}
```

**Backdrop blur on hover (GPU-optimized):**
```jsx
<motion.div
  variants={{ hover: { backdropFilter: "blur(12px)", opacity: 1 } }}
  initial={{ backdropFilter: "blur(0px)", opacity: 0 }}
  transition={{ duration: 0.2 }}
/>
```

Backdrop blur is only applied on hover — not as a constant style on all tiles. This is a critical GPU optimization: applying `backdrop-filter: blur()` to 30 tiles per column × 5 columns = 150 simultaneously blurred elements would be catastrophic for frame rates.

### Accent Border Ring on Hover

```jsx
<motion.div
  variants={{ hover: { opacity: 1 } }}
  className="absolute inset-0 rounded-3xl"
  style={{ border: "1px solid var(--accent)", opacity: 0 }}
/>
```

A thin accent border fades in on hover, creating a selected glow effect.

### Tile Container Attributes

```jsx
<motion.div
  tabIndex={0}
  role="listitem"
  aria-label={skill ? skill.name : `Technology icon ${slotIndex + 1}`}
  className="... focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-4"
  style={{
    width: `${SCROLL_CONFIG.TILE_SIZE}px`,  // 160px
    height: `${SCROLL_CONFIG.TILE_SIZE}px`, // 160px
    contain: "layout style",                // CSS containment for perf
    willChange: prefersReducedMotion ? "auto" : "transform, opacity",
  }}
/>
```

- `tabIndex={0}` — tiles are keyboard-focusable
- `contain: "layout style"` — CSS containment tells the browser this element's layout/style changes don't affect ancestors (performance win for 150 tiles)
- `willChange: "transform, opacity"` — hints browser to promote tiles to GPU layers (disabled when reduced motion is preferred)

---

## 10. Hover Tooltip System

### Architecture

The tooltip is a **fixed-position `motion.div`** at `z-[100]` in `ThreeDMarquee`. It is NOT a standard tooltip — it follows the mouse cursor using spring-interpolated `MotionValue`s, creating a trailing effect.

```jsx
<motion.div
  className="fixed top-0 left-0 z-[100] pointer-events-none select-none"
  style={{
    x: focusSource === 'mouse' ? cursorX : "50vw",
    y: focusSource === 'mouse' ? cursorY : "20vh",
    translateX: "-50%",
    translateY: focusSource === 'mouse' ? "-120%" : "0%"
  }}
  animate={{
    opacity: hoveredSkill ? 1 : 0,
    scale: hoveredSkill ? 1 : 0.9,
    filter: hoveredSkill ? "blur(0px)" : "blur(4px)"
  }}
  transition={{ duration: 0.2 }}
>
```

- **Mouse mode:** Tooltip floats `120%` above the cursor (`translateY: "-120%"`)
- **Keyboard mode:** Tooltip centers at `50vw, 20vh` — top-center of viewport

### Tooltip Position Flow

```
User moves mouse over tile
  → tile.onPointerEnter fires → isPausedRef = true, onSkillHover(skill, 'mouse', event)
  → handleSkillHover sets mouseX/mouseY = event.clientX/Y (instant)
  → setHoveredSkill(skill) → React re-render → tooltip opacity 0→1
  → user moves mouse → handlePointerMove updates mouseX/mouseY
  → cursorX/cursorY springs toward mouseX/mouseY (spring-smoothed lag)
  → tooltip follows cursor with spring feel
```

### Tooltip Content

```jsx
{hoveredSkill && (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between gap-4">
      <span className="font-bold text-[15px] tracking-tight text-white/95">
        {hoveredSkill.name}
      </span>
      <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-white/10 uppercase tracking-widest text-white/50">
        {hoveredSkill.years} {hoveredSkill.years === 1 ? 'yr' : 'yrs'}
      </span>
    </div>
    <div className="text-[11px] text-[var(--accent)] font-medium mt-0.5">
      #{hoveredSkill.tag}
    </div>
    <div className="text-[11px] text-white/50 leading-tight mt-0.5">
      {hoveredSkill.project}
    </div>
  </div>
)}
```

| Field | Value Example | Style |
|---|---|---|
| Skill name | "React" | `font-bold text-[15px] text-white/95` |
| Years badge | "2 yrs" | `text-[9px] rounded-full border text-white/50` |
| Tag | "#Frontend, SPA" | `text-[11px] text-[var(--accent)]` |
| Project | "E-Commerce App" | `text-[11px] text-white/50` |

Tooltip card style:
- Background: `rgba(10, 10, 12, 0.85)` — near-black glassmorphic
- Backdrop blur: `16px`
- Shadow: `inset 0 0 0 1px rgba(255,255,255,0.08)` (subtle border) + `0 20px 40px -10px rgba(0,0,0,0.6)` (depth shadow)
- Border radius: `14px`

### Column Pause on Hover

When any tile in a column is hovered (`onPointerEnter`), `isPausedRef.current = true` — the entire column's rAF loop pauses. This gives the user time to read the tooltip without the icon moving away.

---

## 11. Column Header Labels

**Rendered in a second overlaid grid at `translateZ(30px)`** — a separate layer floated above the tile grid in 3D space.

```jsx
<div style={{ transform: "rotateX(55deg) rotateY(0deg) rotateZ(-45deg) translateZ(30px)" }}>
  {["Core", "OOP", "Web Dev", "Data & ML", "Tools"].map((header, i) => (
    <div key={i} style={{ width: SCROLL_CONFIG.TILE_SIZE }}>
      <div className="absolute" style={{ top: "-280px", opacity: hoveredSkill ? 0 : 1 }}>
        <div className="bg-[rgba(15,15,20,0.8)] backdrop-blur-xl border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] text-white/90 uppercase shadow-[0_16px_32px_rgba(0,0,0,0.8)] whitespace-nowrap">
          {header}
        </div>
      </div>
    </div>
  ))}
</div>
```

- Positioned `top: -280px` above the tile grid — floats above the isometric view
- **Hides when a skill is hovered** (`opacity: hoveredSkill ? 0 : 1`) — non-animated transition (`transition-opacity duration-300` class)
- Uses `backdrop-blur-xl` — GPU cost for 5 simultaneously blurred elements (acceptable)
- Uses the **same 3D transform** as the tile grid — so the labels appear in the same isometric plane

---

## 12. 3D CSS Transform Deep Dive

### The Transform

```css
transform: rotateX(55deg) rotateY(0deg) rotateZ(-45deg)
```

This produces the classic **isometric cabinet projection** view:

| Transform | Angle | Effect |
|---|---|---|
| `rotateX(55deg)` | 55° around X-axis | Tilts grid toward viewer (top recedes, bottom comes forward) |
| `rotateY(0deg)` | 0° | No left-right rotation |
| `rotateZ(-45deg)` | -45° around Z-axis | Rotates the grid 45° counter-clockwise |

The combined effect makes the 5-column vertical scroll grid look like it's lying on a tilted plane, viewed from an elevated angle — the hallmark "3D marquee" aesthetic.

### Scale Classes

```jsx
className="... scale-75 sm:scale-90 lg:scale-100"
```

| Breakpoint | Scale | Use case |
|---|---|---|
| `< sm (640px)` | 75% | Mobile — small viewport |
| `sm–lg (640–1024px)` | 90% | Tablet |
| `lg+ (1024px+)` | 100% | Desktop |

### Clipping & Edge Fade

The outer container has:
```jsx
style={{ maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)" }}
```

This creates a soft vignette — tiles in the center are fully visible, tiles near the edges fade to transparent. This makes the infinite scroll appear to emerge from and dissolve into the section background naturally.

### `transform-3d` Class

```jsx
className="... transform-3d origin-center pointer-events-none"
```

`transform-3d` is a Tailwind utility (likely a custom utility or via `transform-style: preserve-3d`). This enables 3D child transforms. `pointer-events-none` on the grid itself means all interaction events come from the individual tile `motion.div` elements.

### Second Layer (`translateZ(30px)`)

The column header overlay uses an additional `translateZ(30px)` to float 30px above the tile plane in 3D space, preventing z-fighting with tiles beneath.

---

## 13. Column Layout & Data Distribution

### Tile Size & Spacing

| Constant | Value | Used For |
|---|---|---|
| `TILE_SIZE` | `160px` | Tile width and height |
| `TILE_GAP` | `60px` | Gap between tiles in a column |
| `ITEM_HEIGHT` | `220px` | Effective height per scroll slot (`TILE_SIZE + TILE_GAP = 220px`) |

The CSS grid uses `gap: ${TILE_GAP}px` between columns. The column total height for the scroll loop is `maxItems * ITEM_HEIGHT = 6 * 220 = 1320px`.

### Container Height

```jsx
className="h-[500px] max-sm:h-[350px]"
```

The visible window is fixed at 500px (350px on mobile). The actual content is `1320px × 5 copies = 6600px` per column — massively taller than the window, creating the infinite scroll effect.

### Column Item Count per Source

| Column | Source | Raw count | padded to |
|---|---|---|---|
| 0 | `languages` | 5 | 6 |
| 1 | `cs_core` | 6 | 6 |
| 2 | `frontend` | 4 | 6 |
| 3 | `backend` | 3 | 6 |
| 4 | `databases+tools` | 6 | 6 |

Padding repeats items cyclically: Column 2 (frontend, 4 items) → React, Next.js, Tailwind CSS, Framer Motion, React, Next.js (repeating first 2). Column 3 (backend, 3 items) → Node.js, Express, FastAPI, Node.js, Express, FastAPI.

---

## 14. Animation System — Entrance

### Tile Entrance (`isFirstCopy`)

```jsx
initial={isFirstCopy
  ? { opacity: 0, scale: 0.6, filter: "blur(12px)" }  // first copy: animates in
  : { opacity: 1, scale: 1, filter: "blur(0px)" }    // duplicates: always visible
}
animate={isFirstCopy
  ? (isInView ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, ... })
  : { opacity: 1, scale: 1, filter: "blur(0px)" }
}
transition={{
  duration: (isFirstCopy && !prefersReducedMotion) ? 0.8 : 0,
  delay: (isFirstCopy && !prefersReducedMotion) ? tileDelay : 0,
  ease: [0.16, 1, 0.3, 1]
}}
```

**Why only `copyIndex === 0` animates:** Copies 1–4 are already in their final state (`initial: { opacity: 1 }`). If they animated in, they would cause visual flicker when the scroll loop wraps and brings them into view.

### Stagger Delay Calculation

```js
const globalIndex = colIndex * chunkSize + (slotIndex % subarray.length)
const tileDelay = isFirstCopy ? globalIndex * (TILE_STAGGER / 1000) : 0
// = globalIndex * 0.04s
```

Tile entrance delay by global index:
- Column 0, Slot 0: `0 * 0.04 = 0s`
- Column 0, Slot 4: `4 * 0.04 = 0.16s`
- Column 1, Slot 0: `6 * 0.04 = 0.24s`
- Column 4, Slot 5: `29 * 0.04 = 1.16s`

Total entrance animation time: ~1.16s + 0.8s duration = ~2s before all tiles are fully visible.

### Section Header → Marquee Sequence

Full entrance timeline from `isInView` firing in `Skills.jsx`:

| t (s) | Event |
|---|---|
| 0.00 | Badge pill fades in, slides up (0.7s) |
| 0.15 | H2 heading fades in, slides up (0.7s) |
| 0.30 | Subtitle fades in, slides up (0.7s) |
| 0.75 | Marquee container zooms in (scale 0.94→1, y 48→0, 1.0s) |
| 0.75 | First tile starts entrance (blur → clear, 0.8s) |
| ~2.00 | Last tile (col 4, slot 5) entrance complete |
| ~1.68 | Column 4 scroll loop starts |
| ~0.86 | Column 0 scroll loop starts |

---

## 15. Theming Integration

### `--bg-hover-skills` (per theme)

Defined in all 6 themes in `themes.css`. Used as a background gradient overlay in `Skills.jsx`:

```jsx
<div className="absolute inset-0 bg-[image:var(--bg-hover-skills)] pointer-events-none" />
```

| Theme | Value | Color |
|---|---|---|
| Professional (light) | `radial-gradient(ellipse at 70% 40%, rgba(59,130,246,0.08) 0%, transparent 70%)` | Blue |
| Professional (dark) | `radial-gradient(ellipse at 70% 40%, rgba(59,130,246,0.05) 0%, transparent 70%)` | Blue (dimmer) |
| Warm Slate | `radial-gradient(ellipse at 70% 40%, rgba(249,115,22,0.05) 0%, transparent 70%)` | Orange |
| Steel | `radial-gradient(ellipse at 70% 40%, rgba(59,130,246,0.05) 0%, transparent 70%)` | Blue |
| Midnight Violet | `radial-gradient(ellipse at 70% 40%, rgba(196,181,253,0.04) 0%, transparent 70%)` | Purple |
| Steel Flame | `radial-gradient(ellipse at 70% 40%, rgba(255,60,60,0.04) 0%, transparent 70%)` | Red |

Position: `70% horizontal, 40% vertical` — upper-right area.

### `--border-glow` (used in tiles)

Used for tile hover `boxShadow` in `MarqueeColumn`. Defined per theme:

| Theme | `--border-glow` |
|---|---|
| Professional light | `rgba(37, 99, 235, 0.25)` |
| Professional dark | `rgba(37, 99, 235, 0.15)` |
| Warm Slate | `rgba(249, 115, 22, 0.15)` |
| Steel | `rgba(37, 99, 235, 0.15)` |
| Midnight Violet | `rgba(167, 139, 250, 0.15)` |
| Steel Flame | `rgba(255, 60, 60, 0.15)` |

### Other Theme Variables Used

| Variable | Used In | Purpose |
|---|---|---|
| `--accent` | Badge dot, heading gradient, accent ring, muted→colored icon gradient, tooltip tag | Primary accent color |
| `--accent-hover` | Heading gradient end, colored icon gradient end | Secondary accent |
| `--bg` | Section background | Background |
| `--text-heading` | Badge text | Heading text color |
| `--text-secondary` | Subtitle text | Secondary text |
| `--text-muted` | Muted icon fill color | Muted text color (used as icon fill!) |
| `--border-glow` | Tile hover box-shadow | Glow color |

---

## 16. Accessibility (a11y)

### Strengths

- ✅ **`role="list"` on column containers** — `MarqueeColumn` renders `role="list"` on the scroll `div`
- ✅ **`role="listitem"` on tiles** — each tile `motion.div` has `role="listitem"`
- ✅ **`aria-label` on columns** — `aria-label={`Technology icons column ${colIndex + 1}`}` on each column
- ✅ **`aria-label` on tiles** — `aria-label={skill ? skill.name : `Technology icon ${slotIndex + 1}`}`
- ✅ **`tabIndex={0}`** — All tiles are keyboard-focusable
- ✅ **Keyboard hover support** — `onFocus`/`onBlur` on tiles triggers tooltip display
- ✅ **`focus-visible` outline** — `focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-4`
- ✅ **`prefersReducedMotion`** — All animations disabled (duration 0) when set; scroll loop stops
- ✅ **`pointer-events-none` on decorative elements** — background layer, icon masks, accent ring

### Gaps

- ⚠️ **No `aria-label` or `aria-labelledby` on `<section id="skills">`** — Screen readers identify this section only by its `id`, not by a human-readable label. Should add `aria-labelledby="skills-heading"` and `id="skills-heading"` on the `<h2>`.
- ⚠️ **Duplicate `aria-label` on repeated tiles** — In `duplicatedArray`, the same skill appears 5 times (copyIndex 0–4). Copies 1–4 have the same `aria-label` as copy 0 (e.g., "React" appears 5 times in the same `role="list"` column). Screen readers announcing all list items would read "React" five times per column.
- ⚠️ **No `aria-hidden` on duplicate copies** — Copies 1–4 (`copyIndex > 0`) should have `aria-hidden="true"` since they are visual-only duplicates.
- ⚠️ **Keyboard tooltip disappears on scroll** — When a tile is focused and the keyboard scroll moves the tile away, the user loses context. There is no focus trap or scroll-lock for keyboard users.
- ⚠️ **`Enter`/`Space` key handler is incomplete** — `onKeyDown` handler exists but is a no-op with only a comment ("just handling focus is enough").
- ⚠️ **Column headers not accessible** — The 5 column header labels ("Core", "OOP", "Web Dev", etc.) are pure `div` elements with no ARIA attributes, hiding the grid structure from assistive technology.
- ⚠️ **Tooltip not linked to tile** — The floating tooltip is not connected to the hovered element via `aria-describedby`. Screen reader users who navigate by keyboard will trigger the tooltip (via `onFocus`) but no ARIA relationship connects them.

---

## 17. Known Bugs & Issues

### 🔴 Critical — Column Header Labels Mismatch Data

Column headers hardcoded in `ThreeDMarquee`:
```js
["Core", "OOP", "Web Dev", "Data & ML", "Tools"]
```

Actual column contents from `buildSkillGroups()`:
| Index | Header Shown | Actual Content |
|---|---|---|
| 0 | "Core" | `languages` (correct-ish: C++, Python, JS, TS, Rust) |
| 1 | "OOP" | `cs_core` (DSA, OS, DBMS, Networks, OOD, System Design) — "OOP" is severely wrong |
| 2 | "Web Dev" | `frontend` (React, Next.js, Tailwind, Framer) — correct |
| 3 | "Data & ML" | `backend` (Node.js, Express, FastAPI) — wrong, these are backend tools |
| 4 | "Tools" | `databases + tools` (PostgreSQL, MongoDB, Redis, Git, Docker, Linux) — partial |

**Fix:** Update the labels array in `ThreeDMarquee` to match the actual column order: `["Languages", "CS Concepts", "Frontend", "Backend", "Databases & Tools"]`. Or pass them as a prop from `ThreeDMarqueeDemo`.

---

### 🟡 Medium — Duplicate Tiles in Padded Columns

Columns with fewer items than `maxItems` (6) repeat icons cyclically:
- Column 2 (frontend, 4 items): React, Next.js, Tailwind, Framer Motion, **React, Next.js** (repeats)
- Column 3 (backend, 3 items): Node.js, Express, FastAPI, **Node.js, Express, FastAPI** (repeats)

This is visible in the UI as the same icon appearing twice in a column.

**Fix:** Add more skills to shorter categories, or adjust `maxItems` to `Math.max(col.length, 4)` per column instead of using the global maximum.

---

### 🟡 Medium — `"use client"` Directive in Vite Project

Both `3d-marquee-demo.jsx` and `3d-marquee.jsx` begin with `"use client"`. This is a Next.js directive with no effect in Vite. It adds noise and may confuse future contributors.

**Fix:** Remove `"use client"` from both files.

---

### 🟡 Medium — Duplicate Tile ARIA Labels

All 5 copies of each tile (for infinite scroll) render the same `aria-label` in the same `role="list"` container. Screen readers will enumerate them all.

**Fix:** Add `aria-hidden="true"` to tiles where `copyIndex > 0`:
```jsx
aria-hidden={copyIndex > 0 ? "true" : undefined}
role={copyIndex === 0 ? "listitem" : undefined}
```

---

### 🟡 Medium — Hardcoded Tooltip Background Color

```jsx
background: "rgba(10, 10, 12, 0.85)"
```

The tooltip background is hardcoded dark, not using `var(--bg)` or `var(--bg-raised)`. In light themes, this dark tooltip will look appropriate as a floating overlay, but if a very light theme is added, it may be jarring.

---

### 🟢 Minor — `@latest` CDN Tag

```js
`https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/...`
```

Using `@latest` for an external CDN means icon URLs are pinned to whatever `@latest` resolves to at the time of caching. If Devicon reorganizes or renames icons in a future major version, the `@latest` tag will resolve to the new version and icons may break.

**Fix:** Pin to a specific Devicon version tag (e.g., `@v2.16.0`).

---

### 🟢 Minor — `level` Field Unused in Rendering

Each skill has a `level` field (`'primary'` or `'secondary'`) but it is never used in `3d-marquee.jsx` or anywhere else in the Skills section. No visual distinction is made between primary and secondary skills.

**Fix:** Use `level` to visually differentiate (e.g., slightly larger tiles for primary skills, or opacity reduction for secondary).

---

## 18. Performance Analysis

| Concern | Detail | Risk |
|---|---|---|
| **5 rAF loops simultaneously** | Each `MarqueeColumn` runs its own `requestAnimationFrame` at 60fps. Total: ~300 JS frames/second of position updates | Medium — mitigated by direct DOM manipulation (no React renders) |
| **Direct DOM writes in rAF** | `scrollRef.current.style.transform = ...` bypasses React, correct for performance | Low ✅ |
| **150 tile elements rendered** | 5 columns × 30 items per column = 150 `motion.div` elements always in DOM | Medium — heavy DOM for low-end devices |
| **`contain: "layout style"` on tiles** | CSS containment applied to all 150 tiles — correct optimization for reducing layout recalculation scope | Good ✅ |
| **`willChange: "transform, opacity"`** | Applied to all tiles (disabled when reducedMotion). Promotes to GPU layers | Medium — 150 GPU-promoted elements is significant VRAM usage |
| **Backdrop blur on hover only** | `backdrop-filter: blur(12px)` only activates on hover (not always-on). Excellent optimization | Good ✅ |
| **5 backdrop-blurred header labels** | 5 column header `div`s always have `backdrop-blur-xl`. Minor constant cost | Low |
| **Spring tooltip at 60fps** | `cursorX`/`cursorY` springs update every pointer-move frame. Direct MotionValue — no React renders | Low ✅ |
| **`useMemo` for `duplicatedArray`** | Prevents recreation on every parent render. Depends on stable `[subarray, maxItems]` | Good ✅ |
| **`memo(MarqueeColumn)`** | Prevents re-render when `hoveredSkill` changes in parent. Effective given `useCallback`-stable `onSkillHover` | Good ✅ |
| **Module-level `buildSkillGroups()`** | Runs once at import time, never again | Good ✅ |
| **External SVG CDN fetches** | 24 unique icon SVGs fetched from jsDelivr at page load. Browser caches them after first load | Low (after cache) |
| **`deltaTime` clamping at 50ms** | Prevents position jumps on tab restore. Correct implementation | Good ✅ |

---

## 19. Improvement Recommendations

### High Priority

1. **Fix column header labels** — Change `["Core", "OOP", "Web Dev", "Data & ML", "Tools"]` to accurately reflect column contents. Better: make them a prop from `ThreeDMarqueeDemo`.

2. **Fix duplicate tile ARIA** — Add `aria-hidden="true"` to all tiles where `copyIndex > 0` to hide the repeated content from screen readers.

3. **Add `aria-labelledby` to `<section>`** — Add `id="skills-heading"` to the `<h2>` and `aria-labelledby="skills-heading"` to the `<section>` element.

### Medium Priority

4. **Remove `"use client"` directives** — Clean up Next.js remnant from both `3d-marquee-demo.jsx` and `3d-marquee.jsx`.

5. **Fix padded column duplicates** — Either add more items to `backend` and `frontend` categories, or stop padding columns to the same height (allow shorter columns to show fewer items).

6. **Use `level` field visually** — Distinguish `primary` vs `secondary` skills through visual weight (opacity, size, or tile style).

7. **Pass column headers as props** — Move `["Core", "OOP", "Web Dev", "Data & ML", "Tools"]` out of `ThreeDMarquee` into `ThreeDMarqueeDemo` and pass them as a prop, keeping the UI component generic.

8. **Pin Devicon CDN version** — Replace `@latest` with a fixed version tag to prevent future breakage.

### Low Priority

9. **Link tooltip via `aria-describedby`** — Connect the hovered tile to the floating tooltip using `aria-describedby` pointing to the tooltip element's `id`.

10. **`Enter`/`Space` key action** — Implement a meaningful action for `Enter`/`Space` on tiles (e.g., open the project link, expand a details panel, or trigger a focus-locked tooltip).

11. **Memoize `buildSkillGroups()`** — Move to `useMemo` inside `ThreeDMarqueeDemo` in case `skills.js` ever becomes dynamic.

12. **Consider virtualization** — For much larger skill sets (50+), consider only rendering tiles near the visible scroll window rather than all 150 elements.

---

## 20. Appendix — Full Component Tree

```
<section id="skills" bg-[var(--bg)] py-24>
│
├── Background layer (absolute inset-0)
│   └── bg-[image:var(--bg-hover-skills)]  (theme-responsive radial gradient)
│
└── container mx-auto px-4
    └── motion.div (containerVariants, isInView ? "visible" : "hidden")
        │   stagger: 0.15s
        │
        ├── motion.div (itemVariants) — Expertise badge
        │   ├── pulse dot (bg-[var(--accent)] animate-pulse shadow-glow)
        │   └── "Expertise" text (font-mono tracking-[0.2em] uppercase)
        │
        ├── motion.h2 (itemVariants) — "Tools of the Trade"
        │   └── <span> "Trade" (gradient: accent → accent-hover → white/50)
        │
        ├── motion.p (itemVariants) — Subtitle "A comprehensive ecosystem..."
        │
        └── motion.div (marqueeVariants, delay=0.45s) — Marquee container
            └── ThreeDMarqueeDemo
                │   (buildSkillGroups() → 5 column arrays of {url, skill})
                │
                └── ThreeDMarquee (images=5×6 array)
                    │
                    ├── motion.div (fixed z-[100]) — Cursor-following tooltip
                    │   └── Skill card (glassmorphic, min-w-180px)
                    │       ├── name + years badge
                    │       ├── #tag line (accent color)
                    │       └── project line (white/50)
                    │
                    └── div h-[500px] max-sm:h-[350px] (masked with radial vignette)
                        │
                        ├── div (rotateX55 rotateZ-45, grid-cols-5) — Tile grid
                        │   ├── MarqueeColumn [0] col=languages (5→6 items)
                        │   ├── MarqueeColumn [1] col=cs_core (6 items)
                        │   ├── MarqueeColumn [2] col=frontend (4→6 items)
                        │   ├── MarqueeColumn [3] col=backend (3→6 items)
                        │   └── MarqueeColumn [4] col=databases+tools (6 items)
                        │       │   Each column:
                        │       │   ├── Scroll div (role="list", willChange=transform)
                        │       │   │   └── rAF loop (direct style.transform mutation)
                        │       │   └── 30 motion.div tiles (5 copies × 6 padded items)
                        │       │       ├── Glassmorphic card (spring hover, tap active)
                        │       │       │   ├── Static bg (rgba white/0.02)
                        │       │       │   ├── Blur layer (hover-only backdrop-filter)
                        │       │       │   ├── Icon wrapper (size-20 or size-12)
                        │       │       │   │   ├── Muted icon (CSS mask + var(--text-muted) fill)
                        │       │       │   │   └── Accent icon (CSS mask + accent gradient fill)
                        │       │       │   ├── [cs_core only] Label text (9px bold uppercase)
                        │       │       │   └── Accent border ring (opacity 0→1 on hover)
                        │       │       └── Focus: outline-[var(--accent)] outline-offset-4
                        │
                        └── div (rotateX55 rotateZ-45 translateZ30, grid-cols-5) — Column headers
                            ├── "Core"     (top: -280px)
                            ├── "OOP"      (top: -280px) ← WRONG: should be "CS Concepts"
                            ├── "Web Dev"  (top: -280px)
                            ├── "Data & ML"(top: -280px) ← WRONG: should be "Backend"
                            └── "Tools"    (top: -280px)
                            (all hide when hoveredSkill !== null)
```
