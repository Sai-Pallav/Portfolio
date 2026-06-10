# Projects Section — Deep Technical Analysis

> **Portfolio:** Sai Pallav | **Primary file:** `src/components/sections/Projects.jsx`
> **Last Analyzed:** June 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Structure & Inventory](#2-file-structure--inventory)
3. [Data Model — `projects.js`](#3-data-model--projectsjs)
4. [Main Component — `Projects.jsx`](#4-main-component--projectsjsx)
5. [The `useProjectTimelineAnimation` Hook](#5-the-useprojecttimelineanimation-hook)
6. [The `timelineAnimation.js` Constants Module](#6-the-timelineanimationjs-constants-module)
7. [Responsive Strategy — Desktop vs Mobile](#7-responsive-strategy--desktop-vs-mobile)
8. [Desktop: Alternating Timeline Deep Dive](#8-desktop-alternating-timeline-deep-dive)
9. [Sub-Component Analysis](#9-sub-component-analysis)
10. [Animation System](#10-animation-system)
11. [Error Boundary](#11-error-boundary)
12. [Section Header & Stats Row](#12-section-header--stats-row)
13. [GitHub CTA Section](#13-github-cta-section)
14. [Theming Integration](#14-theming-integration)
15. [Accessibility (a11y)](#15-accessibility-a11y)
16. [Known Bugs & Issues](#16-known-bugs--issues)
17. [Performance Analysis](#17-performance-analysis)
18. [Improvement Recommendations](#18-improvement-recommendations)
19. [Appendix — Full Component Tree](#19-appendix--full-component-tree)

---

## 1. Architecture Overview

The Projects section implements a **cinematic branching timeline** that draws itself as the user scrolls into view. It follows a strict **two-mode strategy**: an alternating left/right timeline for desktop and a left-spine stacked layout for mobile. The entire animation sequence — the vertical line drawing, branch connectors revealing, and cards sliding in — is orchestrated by a single custom hook that subscribes to a Framer Motion `MotionValue`.

```
Projects.jsx (exported as ProjectsWithErrorBoundary)
├── ProjectsErrorBoundary          → Class-based React error boundary
└── Projects()                     → Main section component
    ├── useProjectTimelineAnimation → Animation sequencer hook
    ├── ProjectBackground           → Static decorative background layers
    ├── Section Header + Stats      → Inline JSX (not a sub-component)
    ├── [isMobile] Mobile Layout
    │   ├── Spine line (motion.div)
    │   └── MobileTimelineCard ×N  → Per-project left-spine card
    ├── [!isMobile] Desktop Layout
    │   ├── Track line (faint guide)
    │   ├── Energy beam line        → Main accent-colored spine
    │   ├── Horizontal dividers     → Between consecutive items
    │   └── TimelineItem ×N        → Per-project alternating item
    │       ├── TimelineNode        → Glowing orb at branch junction
    │       ├── BranchConnector    → SVG horizontal line
    │       └── TimelineProjectCard → Full project card
    └── GitHub CTA Section          → Inline JSX with SocialIcon
```

**Data flow:**

```
projects.js → Projects.jsx
                  ↓
   useProjectTimelineAnimation(projectCount, isInView, prefersReducedMotion, isMobile)
                  ↓
        lineProgress (MotionValue 0→1)
        branchRevealed[] (boolean[])
        cardRevealed[]   (boolean[])
                  ↓
    Passed as props into each TimelineItem / MobileTimelineCard
```

---

## 2. File Structure & Inventory

### Main Component
```
src/components/sections/Projects.jsx     (11,239 bytes, 301 lines)
```

### Sub-Components Directory
```
src/components/sections/projects/
├── BranchConnector.jsx          (832 bytes,   39 lines)
├── MobileTimelineCard.jsx       (6,259 bytes, 190 lines)
├── ProjectBackground.jsx        (1,805 bytes, 55 lines)
├── ProjectsErrorBoundary.jsx    (1,653 bytes, 46 lines)
├── TimelineHeader.jsx           (2,974 bytes, 77 lines)  ← UNUSED
├── TimelineItem.jsx             (2,954 bytes, 107 lines)
├── TimelineNode.jsx             (956 bytes,  37 lines)
├── TimelineProjectCard.jsx      (5,052 bytes, 149 lines)
├── timelineAnimation.js         (1,307 bytes, 37 lines)
└── useProjectTimelineAnimation.js (3,542 bytes, 127 lines)
```

### Data
```
src/data/projects.js   (2,831 bytes, 67 lines)
```

### `Projects.jsx` Imports

| Import | Source | Purpose |
|---|---|---|
| `useRef`, `useEffect`, `useState` | `react` | DOM refs, mobile detection, state |
| `motion`, `useInView`, `useReducedMotion` | `framer-motion` | Section entrance, motion preference detection |
| `projects` | `@/data/projects` | Project data array |
| `personal` | `@/data/personal.jsx` | GitHub URL for CTA link |
| `SocialIcon` | `@/components/ui/SocialIcon` | GitHub icon in CTA |
| `MobileTimelineCard` | `./projects/MobileTimelineCard` | Mobile per-project card |
| `TimelineItem` | `./projects/TimelineItem` | Desktop per-project item |
| `ProjectBackground` | `./projects/ProjectBackground` | Background decorative layers |
| `ProjectsErrorBoundary` | `./projects/ProjectsErrorBoundary` | Error boundary wrapper |
| `TIMELINE_ANIM`, `getTimelineHeight` | `./projects/timelineAnimation` | Constants and layout math |
| `useProjectTimelineAnimation` | `./projects/useProjectTimelineAnimation` | Animation orchestrator |

---

## 3. Data Model — `projects.js`

Located at `src/data/projects.js`. Exports a named `projects` constant (no default export).

### Schema

```ts
interface Project {
  id:          number      // Unique identifier
  title:       string      // Project display name
  description: string      // Long-form description paragraph
  tags:        string[]    // Technology labels (rendered as pills)
  category:    string      // 'fullstack' | 'ml' | 'systems' | 'devops'
  image:       string      // Path to project image (relative to /public)
  github:      string      // GitHub repository URL
  live:        string      // Live deployment URL (Vercel, crates.io, etc.)
  featured:    boolean     // Shows "Featured" badge overlay
  highlights:  string[]   // 3 short metric/feature bullets
}
```

### Current Dataset (4 Projects)

| # | Title | Category | Featured | Image Path |
|---|---|---|---|---|
| 1 | Language-Agnostic Chatbot | `fullstack` | ✅ | `/images/projects/chatbot.webp` |
| 2 | BITS Campus Connect | `fullstack` | ✅ | `/images/projects/campus-connect.webp` |
| 3 | Dijkstra Route Pathfinder | `systems` | ❌ | `/images/projects/pathfinder.webp` |
| 4 | DevClock CLI | `systems` | ❌ | `/images/projects/devclock.webp` |

### Project Details

**Project 1 — Language-Agnostic Chatbot**
- Tags: React, Node.js, WebSockets, Ollama, Tailwind
- Highlights: Supports 15+ coding languages · Zero-latency stream updates · Contextual parsing engine
- GitHub: `github.com/Sai-Pallav/Language-Agnostic-Chatbot`
- Live: `agnostic-chatbot.vercel.app`

**Project 2 — BITS Campus Connect**
- Tags: React, Node.js, PostgreSQL, Redis, Socket.IO
- Highlights: 300+ active campus users · 40% faster with Redis caching · Secure BITS login integration
- GitHub: `github.com/Sai-Pallav/campus-connect`
- Live: `bits-connect.vercel.app`

**Project 3 — Dijkstra Route Pathfinder**
- Tags: TypeScript, React, Google Maps API, Algorithms
- Highlights: 23% route latency reduction · Dynamic obstacles recalculation · Custom Heap structures
- GitHub: `github.com/Sai-Pallav/route-optimizer`
- Live: `route-pathfinder.vercel.app`

**Project 4 — DevClock CLI**
- Tags: Rust, Git API, CLI, ASCII Art
- Highlights: Published on crates.io · 500+ downloads · Under 15ms latency execution
- GitHub: `github.com/Sai-Pallav/devclock`
- Live: `crates.io/crates/devclock`

### Computed Stats (from `Projects.jsx` header)

| Stat | Formula | Current Value |
|---|---|---|
| Total Projects | `projects.length` | `4` |
| Featured | `projects.filter(p => p.featured).length` | `2` |
| Technologies | `new Set(projects.flatMap(p => p.tags)).size + '+'` | Computed at render time |

The unique technology count uses `flatMap` to collect all tags and `Set` for deduplication — this is computed fresh on every render rather than memoized.

---

## 4. Main Component — `Projects.jsx`

### Export Pattern

```jsx
// The exported component is a wrapper, NOT the actual Projects component
export default function ProjectsWithErrorBoundary() {
  return (
    <ProjectsErrorBoundary>
      <Projects />
    </ProjectsErrorBoundary>
  );
}
```

The internal `Projects` function is not exported — only `ProjectsWithErrorBoundary` is. This means any import of `Projects` in `App.jsx` is actually getting the error-bounded version automatically.

### State & Refs

| Variable | Type | Purpose |
|---|---|---|
| `sectionRef` | `useRef` | Passed to `useInView` for scroll detection |
| `isMobile` | `useState(false)` | Drives desktop/mobile render branch |
| `isInView` | `useInView` result | Triggers timeline animation |
| `prefersReducedMotion` | `useReducedMotion()` | Skips all animations when true |
| `lineProgress` | From hook | `MotionValue` (0–1) for CSS `scaleY` |
| `branchRevealed` | From hook | `boolean[]` — per-project branch state |
| `cardRevealed` | From hook | `boolean[]` — per-project card state |

### Mobile Detection

```js
const check = () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => { setIsMobile(window.innerWidth < 768) }, 150)
}
check()
window.addEventListener('resize', check)
```

- Breakpoint: `768px` (Tailwind `md:`)
- Debounce: 150ms timeout — identical pattern to the Experience section hook

### Layout Math

```js
const timelineHeight = getTimelineHeight(projects.length)
// = HEADER_SPACING + (projects.length × ITEM_GAP)
// = 150 + (4 × 900)
// = 3,750px
```

The desktop container is a **fixed-height div** (`3,750px` tall for 4 projects). All project items are absolutely positioned using `topOffset = HEADER_SPACING + index * ITEM_GAP` computed per item.

---

## 5. The `useProjectTimelineAnimation` Hook

**File:** `src/components/sections/projects/useProjectTimelineAnimation.js`

This hook orchestrates the entire animation sequence. It ties together a Framer Motion `MotionValue`, a `setTimeout`-based card reveal cascade, and `prefersReducedMotion` awareness.

### Hook Signature

```ts
function useProjectTimelineAnimation(
  projectCount: number,
  isInView: boolean,
  prefersReducedMotion: boolean,
  isMobile: boolean
): {
  lineProgress: MotionValue<number>,
  branchRevealed: boolean[],
  cardRevealed: boolean[]
}
```

### State Inside the Hook

| State / Ref | Type | Purpose |
|---|---|---|
| `lineProgress` | `useMotionValue(0)` | CSS `scaleY` for the timeline spine. Direct MotionValue, no React state |
| `branchRevealed` | `useState(false[])` | Per-project boolean — controls branch + orb reveal |
| `cardRevealed` | `useState(false[])` | Per-project boolean — controls card slide-in reveal |
| `branchRevealedRef` | `useRef(false[])` | Sync ref for `branchRevealed` to safely read inside the `MotionValue` subscriber |
| `cardTimersRef` | `useRef([])` | Accumulates `setTimeout` IDs for cleanup |

### Animation Sequence — Full Flow

```
isInView becomes true
  → Effect 1: Vertical line draw begins
    animate(lineProgress, 0 → 1, {
      delay: 0.8s,
      duration: 6.5s,
      ease: [0.25, 0.1, 0.25, 1]
    })

  → Effect 2: MotionValue subscriber fires on every lineProgress change
    checkProgress(currentProgress) is called:
      for each project i:
        if lineProgress >= junctionProgress[i]:
          → setBranchRevealed[i] = true  (branch + orb appear)
          → setTimeout(BRANCH_DRAW_DURATION + CARD_GAP ms later):
              → setCardRevealed[i] = true  (card slides in)
```

### Junction Progress Calculation

Desktop:
```js
const junctionY = HEADER_SPACING + index * ITEM_GAP + CARD_CENTER_Y
// = 150 + index * 900 + 230
return junctionY / getTimelineHeight(totalProjects)
// = junctionY / 3750
```

Junction positions for 4 projects (as fractions of total height):
| Project | junctionY | junctionProgress |
|---|---|---|
| 0 | 150 + 0×900 + 230 = 380 | 380/3750 ≈ **0.101** |
| 1 | 150 + 1×900 + 230 = 1280 | 1280/3750 ≈ **0.341** |
| 2 | 150 + 2×900 + 230 = 2180 | 2180/3750 ≈ **0.581** |
| 3 | 150 + 3×900 + 230 = 3080 | 3080/3750 ≈ **0.821** |

Mobile uses an estimated layout formula:
```js
const CARD_EST = 380, GAP = 64, PAD = 32
const totalHeight = PAD*2 + N*CARD_EST + (N-1)*GAP
junctionY = PAD + index*(CARD_EST + GAP) + CARD_EST/2
```

### Reduced Motion Path

```js
if (prefersReducedMotion) {
  lineProgress.set(1)       // Instant full line
  if (isInView) revealAll() // All branches + cards immediate
  return
}
```

### Cleanup Safety

- `lineProgress.on("change", ...)` returns an `unsubscribe` function — called on effect cleanup
- `cardTimersRef.current.forEach(clearTimeout)` — all pending card timeouts cleared on re-run
- `animate()` control returned from Framer Motion exposes `.stop()` — called on unmount

---

## 6. The `timelineAnimation.js` Constants Module

**File:** `src/components/sections/projects/timelineAnimation.js`

A pure constants + utility module — no React, no side effects. All timing and layout values are centralized here, making them easy to tune.

### `TIMELINE_ANIM` Constants

| Constant | Value | Used For |
|---|---|---|
| `LINE_DRAW_DELAY` | `0.8s` | Delay before spine starts drawing |
| `LINE_DRAW_DURATION` | `6.5s` | Time for full spine to draw |
| `BRANCH_DRAW_DURATION` | `1.1s` | Branch connector scaleX animation |
| `CARD_REVEAL_DURATION` | `0.85s` | Card opacity + translate animation |
| `CARD_GAP` | `0.12s` | Delay between branch reveal and card reveal |
| `HEADER_SPACING` | `150px` | Top padding before first project |
| `ITEM_GAP` | `900px` | Vertical distance between projects |
| `CARD_CENTER_Y` | `230px` | Y offset from item top to card center (junction point) |
| `LINE_DRAW_EASE` | `[0.25, 0.1, 0.25, 1]` | Ease for spine draw (near-linear) |
| `BRANCH_EASE` | `[0.22, 1, 0.36, 1]` | Ease for branch connector (overshoot-like) |
| `CARD_EASE` | `[0.16, 1, 0.3, 1]` | Ease for card reveal (Apple-style) |
| `ORB_EASE` | `[0.34, 1.56, 0.64, 1]` | Ease for orb pop-in (springy overshoot) |

### Exported Functions

```js
getTimelineHeight(totalProjects)
// → 150 + totalProjects * 900

getDesktopJunctionProgress(index, totalProjects)
// → (150 + index*900 + 230) / getTimelineHeight(totalProjects)

getMobileJunctionProgress(index, totalProjects)
// → estimated based on CARD_EST=380, GAP=64, PAD=32
```

---

## 7. Responsive Strategy — Desktop vs Mobile

```jsx
{isMobile ? (
  // Mobile: single column, left spine, stacked MobileTimelineCard
) : (
  // Desktop: fixed height div, absolute positioned TimelineItem alternating L/R
)}
```

### Mobile (`< 768px`)

- Spine: `absolute left-[10px]` vertical bar, width `2px`, drawn via `scaleY: lineProgress`
- Cards: `space-y-16 py-8` vertical stack with `pl-10` padding for spine clearance
- Branch: 28px horizontal SVG line (simplified from desktop's 80px)
- Orb: Same `TimelineNode` component, positioned at `left: 10px`
- No "Featured" star badge (shows simpler pill badge)
- Tags: sliced to first 4 (`project.tags.slice(0, 4)`) to save space
- Action links: "Code" + "Live" buttons inline

### Desktop (`≥ 768px`)

- Container: fixed height `3,750px` div (for 4 projects)
- Spine: centered vertical line (1px faint guide + 2px accent energy beam)
- Items: absolutely positioned at `top: HEADER_SPACING + index * ITEM_GAP`
- Left/Right: `isLeft = index % 2 === 0` — even indices go left, odd go right
- Card width: `calc(50% - BRANCH_WIDTH - 90px)` = roughly 40% of page width
- Branch: 80px wide `BranchConnector` SVG with endpoint circle

---

## 8. Desktop: Alternating Timeline Deep Dive

### Spine Layers (both drawn with `scaleY: lineProgress`)

| Layer | Width | Style | Purpose |
|---|---|---|---|
| Track guide | `1px` | `rgba(255,255,255,0.06)` | Faint full-height guide visible on load |
| Energy beam | `2px` | `var(--accent)→var(--accent-hover)→var(--accent)` gradient | Main animated spine, opacity 0.9 |

Both are `origin-top` so `scaleY` grows downward from the top. The track guide is always there but faint, while the energy beam draws in over 6.5 seconds.

### Horizontal Dividers

Rendered between consecutive projects (not after the last one):
```js
projects.map((project, index) => index < projects.length - 1 ? <div key={...} style={{ top: `${HEADER_SPACING + index * ITEM_GAP + CARD_CENTER_Y + ITEM_GAP / 2}px` }} /> : null)
```

Position formula: midpoint between project `i` and project `i+1`:
- For project 0→1: `150 + 0×900 + 230 + 450 = 830px`
- For project 1→2: `150 + 1×900 + 230 + 450 = 1730px`
- For project 2→3: `150 + 2×900 + 230 + 450 = 2630px`

These are thin `1px` lines across the full width at opacity `0.35`, acting as visual separators in the timeline.

### Item Positioning

```js
const isLeft = index % 2 === 0
const topOffset = HEADER_SPACING + index * ITEM_GAP
// index 0: top=150, left side
// index 1: top=1050, right side
// index 2: top=1950, left side
// index 3: top=2850, right side
```

### Card Placement Calculation

Inside `TimelineItem`, the card container sits either to the right or left of center with the branch jutting out toward the spine:

```js
// Card container width:
width: `calc(50% - ${BRANCH_WIDTH + 90}px)` // ≈ 50% - 170px

// Card container position:
isLeft → { right: `calc(50% + ${BRANCH_WIDTH}px)` }  // Left-side card
isRight → { left: `calc(50% + ${BRANCH_WIDTH}px)` }  // Right-side card

// Orb position on left card:
left: `calc(100% + ${BRANCH_WIDTH}px)` // = right edge + 80px = at center spine
// Orb position on right card:
left: `-${BRANCH_WIDTH}px`             // = left edge - 80px = at center spine
```

---

## 9. Sub-Component Analysis

### 9.1 `ProjectBackground`

A static decorative layer — **no animations**, no framer-motion, no state.

**Two layers:**
1. **Particle layer (`z=-20`):** 2 static dots rendered via `[...Array(2)].map()`. Positions computed from index modulo arithmetic (`left: 5 + (i%10)*10%`, `top: 10 + (i%8)*12%`). Colors: `rgba(0,255,255,0.8)` for every 4th (cyan), `rgba(37,99,235,0.7)` for others (accent blue). Size: 2px. These are fixed dots — the "particle energy system" label in comments is aspirational naming; they don't animate.

2. **Grid layer (`z=-10`):** 100×100px crosshatch grid using `linear-gradient` in both axes at `rgba(37,99,235,0.4)`. Masked with `radial-gradient(ellipse at center, black 30%, transparent 70%)` to fade at edges. Total opacity `0.03` — barely visible.

> **Note:** The grid uses hardcoded `rgba(37,99,235,...)` — the Professional theme accent — rather than `var(--accent)`. This means the grid is **always blue regardless of the active theme**.

---

### 9.2 `TimelineNode`

A 20×20px glowing orb — pure CSS, no framer-motion, no state.

**Layers:**
1. **Outer glow:** `absolute -inset-1 rounded-full`, `background: var(--accent)`, `filter: blur(8px)`, `opacity: 0.6`
2. **Main orb:** `w-5 h-5 rounded-full`, gradient `var(--accent) → var(--accent-hover)`, white border at 30% opacity, double box-shadow using `var(--accent-dim)`
3. **Inner core:** `absolute inset-1.5 rounded-full`, `radial-gradient(#fff → var(--accent))`, inner glow box-shadow

The orb's **entrance animation** (scale 0→1, ORB_EASE spring) is handled by the parent `motion.div` wrapper in `TimelineItem`/`MobileTimelineCard`, not inside `TimelineNode` itself.

---

### 9.3 `BranchConnector`

An SVG horizontal connector between the spine and the card. Desktop only.

```
SVG: 80 × 4 px, viewBox="0 0 80 4", preserveAspectRatio="none"
├── line (x1=80→0 or 0→80, y1=2, y2=2, stroke=accent, strokeWidth=2, opacity=0.7)
└── circle (cx at card edge, cy=2, r=3, fill=accent, opacity=0.8) — endpoint glow dot
```

The line direction flips based on `isLeft`:
- `isLeft=true`: line draws from right (spine side, x=80) to left (card side, x=0)
- `isLeft=false`: line draws from left (spine side, x=0) to right (card side, x=80)

The endpoint `circle` always sits at the card-facing edge (not the spine side), creating a glow dot at the card connection point.

The `scaleX 0→1` **branch animation** runs on the parent `motion.div` in `TimelineItem`, with `transformOrigin: isLeft ? 'right center' : 'left center'`. This makes the branch draw from the spine outward toward the card, matching the spine-to-card visual direction.

---

### 9.4 `TimelineItem` (Desktop)

The orchestrating wrapper for one desktop timeline entry. Accepts `branchRevealed` and `cardRevealed` booleans and applies them to the three sub-elements.

**Three animation-gated elements:**

| Element | Trigger | Animation |
|---|---|---|
| `TimelineNode` (orb) | `branchRevealed` | `scale 0→1, opacity 0→1`, ORB_EASE (0.5s) |
| `BranchConnector` (branch) | `branchRevealed` | `scaleX 0→1, opacity 0→1`, BRANCH_EASE (1.1s) |
| `TimelineProjectCard` (card) | `cardRevealed` | `opacity 0→1, x ±28→0, scale 0.96→1`, CARD_EASE (0.85s) |

The card slides in from the correct direction: `x: isLeft ? 28 : -28` — left cards slide from the right side (toward center), right cards slide from the left side (toward center).

All `initial={false}` — elements start at their unrevealed state without a mount animation, then transition when the boolean flips.

---

### 9.5 `TimelineProjectCard` (Desktop)

The main visual card shown to the right or left of the timeline spine.

**CATEGORY_LABELS map:**
```js
const CATEGORY_LABELS = {
  fullstack: { label: 'Full Stack', icon: '⚡' },
  ml:        { label: 'Machine Learning', icon: '🧠' },
  systems:   { label: 'Systems', icon: '⚙️' },
  devops:    { label: 'DevOps', icon: '🔧' },
}
```

**Card visual layers (top to bottom):**

1. **Connection port** — `w-2 h-6 rounded-full` absolute div at `var(--accent)` on the branch-facing edge (right edge for left cards, left edge for right cards). Opacity 0.6.

2. **Category badge** — Positioned at top-right (left cards) or top-left (right cards). Dark semi-transparent pill with emoji icon + font-mono label.

3. **Image section** (`h-52 md:h-58`)
   - `<img>` with `loading="lazy"` and `onError` handler that hides the broken image
   - Gradient overlay: `from-black/70 via-black/10 to-transparent` (bottom fade)
   - Background fallback: `var(--accent-dim)` gradient if image fails
   - **Featured badge** (conditional): accent-colored pill with star SVG icon, top-left corner
   - **Project number** overlay: `PROJECT 01` style font-mono text, bottom-left

4. **Card body** (`p-5 md:p-6`)
   - `<h3>` title — `text-[var(--text-primary)]`, 21-24px bold
   - `<p>` description — `text-[var(--text-muted)]`, 14px, relaxed line height
   - Highlights — `▸` accent bullet + description text (text-secondary, 12px)
   - Tech tags — accent-colored pill badges with `var(--accent-dim)` background

> **Note:** `TimelineProjectCard` has **no GitHub or live links**. The mobile card (`MobileTimelineCard`) shows "Code" and "Live" buttons, but the desktop card does not. This is a feature gap.

---

### 9.6 `MobileTimelineCard`

The mobile variant for each project. Uses the same `branchRevealed`/`cardRevealed` props but renders a simplified layout.

**Key differences from desktop card:**
- Tags sliced to first 4: `project.tags.slice(0, 4)`
- Includes **"Code" and "Live" action links** (desktop card lacks these entirely)
- Image height: `h-40` (vs `h-52 md:h-58` desktop)
- Smaller padding: `p-4` (vs `p-5 md:p-6`)
- Branch is simplified: 28px horizontal SVG line (vs 80px desktop `BranchConnector`)
- No category badge
- `PROJECT XX` number indicator present
- Link accessibility: `aria-label="View source code for ..."` and `aria-label="View live demo of ..."`

---

### 9.7 `ProjectsErrorBoundary`

A class component using React's error boundary API.

**Lifecycle methods:**
- `getDerivedStateFromError(error)` → Sets `{ hasError: true, error }`
- `componentDidCatch(error, errorInfo)` → Logs to `console.error`

**Fallback UI:**
- Centered yellow warning triangle SVG (`var(--warning)` color)
- "Failed to load projects" heading
- "Try refreshing the page" message

**Why a class component?** Error boundaries in React must be class components — there is no hook-based equivalent for catching render-phase errors.

---

### 9.8 `TimelineHeader` *(UNUSED)*

`TimelineHeader.jsx` exists in the `projects/` directory and contains a full animated header component with badge, gradient `h2`, subtitle, and decorative line. However, it is **never imported or used** in `Projects.jsx`. The section header is implemented as inline JSX directly inside `Projects.jsx` instead.

This file is dead code.

---

## 10. Animation System

### Spine Draw

The most important animation: a vertical line growing from the top of the section downward over 6.5 seconds.

```js
animate(lineProgress, 1, {
  delay: 0.8,
  duration: 6.5,
  ease: [0.25, 0.1, 0.25, 1]  // Near-linear with slight deceleration
})
```

Applied via CSS `scaleY`:
```jsx
<motion.div style={{ scaleY: lineProgress, transformOrigin: 'top' }} />
```

This is a `MotionValue` — **not React state**. Updates don't trigger re-renders in the parent component.

### Branch Reveal Trigger

The hook subscribes to `lineProgress.on("change", checkProgress)`. Every frame (60fps during animation), `checkProgress` compares the current `lineProgress` value against each project's `junctionProgress`. When the line "reaches" a project, the branch is revealed.

```js
if (progress >= getJunction(i) && !branchRevealedRef.current[i]) {
  branchRevealedRef.current[i] = true
  setBranchRevealed(...)
  setTimeout(() => setCardRevealed(...), (BRANCH_DRAW_DURATION + CARD_GAP) * 1000)
  // = (1.1 + 0.12) * 1000 = 1220ms after branch
}
```

### Timing Sequence (Project 0 example)

| t (s) | Event |
|---|---|
| 0.0 | `isInView` fires |
| 0.8 | Line begins drawing |
| ~1.46 | Line reaches project 0 junction (10.1% of 6.5s + 0.8s delay) |
| ~1.46 | Branch + orb reveal (0.5s ORB_EASE) |
| ~2.58 | Card reveals (1.1s + 0.12s = 1.22s after branch) |

### Reduced Motion Behavior

```
prefersReducedMotion=true →
  lineProgress.set(1) immediately
  revealAll() → all branches + cards visible instantly
```

No animations play at all — all elements jump to their final revealed state.

### Section Entrance

```js
const isInView = useInView(sectionRef, { once: true, margin: '-80px' })
```

The trigger margin (`-80px`) is slightly more aggressive than other sections (Contact uses `-100px`), meaning the animation starts slightly earlier as the section enters the viewport.

---

## 11. Error Boundary

The `ProjectsErrorBoundary` wraps the entire section. If any runtime error occurs during render (e.g., invalid data in `projects.js`, broken component import, or framer-motion crash), the fallback UI renders instead of a white-screen crash.

**Boundary scope:** Catches errors in `Projects` and all its children: `ProjectBackground`, `TimelineItem`, `TimelineProjectCard`, `MobileTimelineCard`, the hook, etc.

**Limitation:** Does not catch:
- Async errors (fetch failures, async event handlers)
- Errors in the error boundary itself

---

## 12. Section Header & Stats Row

The section header is **inline JSX inside `Projects.jsx`**, not extracted to a component (despite `TimelineHeader.jsx` existing for this purpose).

### Header Elements

1. **"Featured Work" badge** — `font-mono`, `tracking-[0.3em]`, `uppercase`, rounded pill with `var(--border)` border and `var(--accent)` text. Flanked by two 32px horizontal accent lines (decorative dividers).

2. **`<h2>` heading** — `id="projects-heading"`, referenced by `aria-labelledby` on the `<section>`. Text: `"Projects Timeline"` with underline on "Timeline" (2px accent line, absolute positioned).

3. **Description `<p>`** — `text-[var(--text-muted)]`, max-w-xl centered.

4. **Stats row** — Three inline stats: `Projects`, `Featured`, `Technologies`. The "Technologies" count uses `new Set(projects.flatMap(p => p.tags)).size + '+'` with `+` appended as a string suffix.

### Stats Computation Risk

```js
new Set(projects.flatMap(p => p.tags)).size + '+'
```

This runs on every render without `useMemo`. For 4 projects with ~4-5 tags each, the performance cost is negligible. However, if `projects.js` ever grows significantly, this should be memoized.

---

## 13. GitHub CTA Section

A standalone block at the bottom of the section after all timeline items.

**Structure:**
- Glassmorphic card: `border` + `linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))`
- GitHub SVG icon (from `SocialIcon`, `w-14 h-14`, accent color)
- `<h3>` "More on GitHub"
- Descriptive `<p>`
- `<a>` CTA button linking to `personal.socials.github`:
  - Background: `var(--accent)`, color: `var(--accent-contrast)`
  - GitHub icon + "Visit GitHub Profile" text + arrow SVG
  - Full focus ring: `focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2`
  - `data-custom-cursor-ignore` attribute (custom cursor system skip)
  - `aria-label="Visit GitHub profile to see more projects"`

---

## 14. Theming Integration

The Projects section uses CSS custom properties from `themes.css`:

| CSS Variable | Used In | Purpose |
|---|---|---|
| `--accent` | Spine, branches, orbs, badges, tags, CTA | Primary accent color throughout |
| `--accent-hover` | Spine gradient midpoint, orb gradient | Secondary accent tone |
| `--accent-dim` | Tag backgrounds, image fallback | Muted accent for backgrounds |
| `--accent-contrast` | Featured badge text, CTA button text | Text on accent background |
| `--text-primary` | Card titles, CTA heading | Primary text color |
| `--text-muted` | Description text, stats labels | Muted text |
| `--text-secondary` | Category badge text | Secondary text |
| `--border` | CTA card border, mobile link borders | Border color |
| `--bg` | Section edge fade-out gradient | Background color for gradient match |
| `--bg-raised` | Error boundary icon background | Raised surface color |
| `--warning` | Error boundary warning icon | Warning color (yellow) |

### Hardcoded Color Bug

`ProjectBackground.jsx` hardcodes `rgba(37, 99, 235, ...)` (Professional theme's blue accent) in the grid and particles:

```js
// Particles:
background: i % 4 === 0 ? "rgba(0, 255, 255, 0.8)" : "rgba(37, 99, 235, 0.7)"
// Grid lines:
background: `linear-gradient(rgba(37, 99, 235, 0.4) 1px, transparent 1px), ...`
```

These are completely independent of the theme system. If the user switches to "Warm Slate" (orange), "Midnight Violet" (purple), or "Steel Flame" (red) themes, the background grid and particles remain blue.

### `--bg-hover-projects` — Defined But Unused

`themes.css` defines `--bg-hover-projects` for all 6 themes, but `Projects.jsx` and none of its sub-components reference this variable. The section background is handled by `ProjectBackground.jsx` with hardcoded values instead.

---

## 15. Accessibility (a11y)

### Strengths

- ✅ `<section aria-labelledby="projects-heading">` — section correctly labelled
- ✅ `<h2 id="projects-heading">` — matches `aria-labelledby`
- ✅ Project images have `alt="Screenshot of {project.title}"` on all `<img>` tags
- ✅ `loading="lazy"` on all images — deferred loading for off-screen images
- ✅ Mobile card links have `aria-label="View source code for..."` and `aria-label="View live demo of..."`
- ✅ GitHub CTA link has `aria-label="Visit GitHub profile to see more projects"`
- ✅ GitHub CTA link has full keyboard focus ring (`focus:ring-2 focus:ring-[var(--accent)]`)
- ✅ Error boundary SVG warning icon has `aria-hidden="true"`
- ✅ `prefersReducedMotion` respected: all animations skip to final state instantly
- ✅ Mobile code/live links have `focus:ring-2` focus styles

### Gaps

- ⚠️ **Desktop cards have no links** — `TimelineProjectCard` renders no GitHub or Live URLs. Keyboard users on desktop cannot reach project links. This is a significant gap.
- ⚠️ **Timeline decorative elements have no `aria-hidden`** — The spine lines, branch connectors (SVG), dividers, and `TimelineNode` orbs are decorative but lack `aria-hidden="true"`. They may appear in the accessibility tree as unlabeled SVG elements.
- ⚠️ **Stats are not labeled** — The three stats (4 Projects, 2 Featured, X Technologies) are plain `div` elements with no semantic markup or `aria-label`.
- ⚠️ **Background particles have no `aria-hidden`** — `ProjectBackground` renders static dots without `aria-hidden`.
- ⚠️ **Section heading hierarchy** — The section `h2` heading ("Projects Timeline") is followed by `h3` in cards — correct hierarchy. But in desktop view, cards have no heading element since `TimelineProjectCard` uses `h3` directly without a parent heading context beyond the section `h2`.

---

## 16. Known Bugs & Issues

### 🔴 Critical — Desktop Cards Have No Project Links

`TimelineProjectCard.jsx` renders no `<a>` tags for `project.github` or `project.live`. Desktop visitors cannot navigate to any project's source code or live demo from the timeline. The mobile card (`MobileTimelineCard`) does include these links.

**Fix:** Add GitHub and Live link buttons to the `TimelineProjectCard` card body, mirroring the mobile card's implementation.

---

### 🟡 Medium — `TimelineHeader.jsx` Is Dead Code

The file `src/components/sections/projects/TimelineHeader.jsx` (77 lines, 2,974 bytes) is never imported anywhere. It contains a complete animated header component that duplicates the inline header already in `Projects.jsx`.

**Fix:** Delete `TimelineHeader.jsx` to reduce dead code, or refactor the inline header in `Projects.jsx` to use it.

---

### 🟡 Medium — `ProjectBackground` Hardcodes Blue Accent Colors

The grid lines and particles in `ProjectBackground.jsx` use hardcoded `rgba(37, 99, 235, ...)` — the Professional theme's blue — and `rgba(0, 255, 255, 0.8)` (cyan), regardless of the active theme.

**Fix:** Replace hardcoded values with `var(--accent)` and `var(--accent-dim)`.

---

### 🟡 Medium — `--bg-hover-projects` CSS Variable Unused

Defined across all 6 themes in `themes.css` but never referenced by any Projects component.

**Fix (Option A):** Use it as a background gradient layer in `ProjectBackground.jsx` or `Projects.jsx`.
**Fix (Option B):** Remove from all theme definitions.

---

### 🟡 Medium — Stats `new Set(...)` Not Memoized

```js
{ value: new Set(projects.flatMap(p => p.tags)).size + '+', label: 'Technologies' }
```

This computation runs on every render. Not critical for 4 projects but unclean.

**Fix:** Wrap in `useMemo` with `[projects]` dependency.

---

### 🟡 Medium — `branchRevealedRef` / `branchRevealed` Dual State Pattern

The hook maintains both `branchRevealedRef` (for sync reads inside the `MotionValue` subscriber) and `branchRevealed` (React state for re-render). They must always be updated together. If they drift (e.g., a bug in `resetAll`/`revealAll`), the UI will show inconsistent states.

**Fix:** This is a known React concurrency pattern workaround — document it with a clear comment, or refactor to use `useReducer` for cleaner dual-ref management.

---

### 🟢 Minor — Desktop Timeline Height is Fixed for Any Project Count

`getTimelineHeight(4)` = 3,750px. If more projects are added, the height scales correctly (`+900px/project`). However, the `ITEM_GAP` of 900px may be overly spacious for many projects and cause excessive page height. No dynamic scaling for the gap.

---

### 🟢 Minor — `BranchConnector` Constants Duplicated

`BRANCH_WIDTH = 80` is defined separately in both `BranchConnector.jsx` and `TimelineItem.jsx`. If one changes and the other doesn't, the branch and card positioning will misalign.

**Fix:** Export `BRANCH_WIDTH` from `timelineAnimation.js` and import it in both files.

---

## 17. Performance Analysis

| Concern | Detail | Risk |
|---|---|---|
| **`lineProgress` as `MotionValue`** | Uses framer-motion's direct value — CSS is updated without React re-renders. ✅ Efficient | Low |
| **`lineProgress.on("change")` at 60fps** | Subscriber fires every animation frame for 6.5s. `checkProgress` iterates over `projectCount` per frame. For 4 projects: negligible | Low |
| **`setOrbitAngle` / `setBranchRevealed`** | These are React state updates, triggering re-renders. Max 4 updates total (one per project junction). ✅ Minimal | Low |
| **`cardTimersRef` setTimeout accumulation** | Timers stored in ref array and cleared on cleanup. No leak risk. ✅ | Low |
| **`new Set(projects.flatMap(...))` per render** | Runs without memoization. For 4 projects (~20 tags total), cost is trivial | Low |
| **`ProjectBackground` particles** | 2 static dots — pure CSS, zero ongoing cost | Low |
| **Lazy image loading** | `loading="lazy"` on all `<img>` tags — deferred until near-visible | Good ✅ |
| **`onError` handler on images** | Hides broken images gracefully without crashing | Good ✅ |
| **Fixed-height desktop container** | `height: 3750px` — the section takes a lot of vertical space (scroll depth). Normal for a timeline layout. | Acceptable |
| **`isMobile` debounce** | 150ms window — consistent with other sections | Good ✅ |

---

## 18. Improvement Recommendations

### High Priority

1. **Add GitHub and Live links to `TimelineProjectCard`** — Desktop users currently cannot access any project URLs. Mirror the mobile card's "Code" + "Live" buttons.

2. **Fix `ProjectBackground` hardcoded colors** — Replace `rgba(37, 99, 235, ...)` with `var(--accent)` for theme consistency.

### Medium Priority

3. **Delete `TimelineHeader.jsx`** — Remove dead code that creates confusion.

4. **Use `--bg-hover-projects` or delete it** — Decide whether the CSS variable should drive a background gradient or be removed from all theme definitions.

5. **Add `aria-hidden="true"` to decorative elements** — Timeline node orbs, branch connector SVGs, spine lines, and background particles should all be explicitly hidden from assistive technologies.

6. **Add `aria-label` or `role="group"` to stats** — Make the three stats block accessible with descriptive labels.

7. **Export `BRANCH_WIDTH` from `timelineAnimation.js`** — Prevent the dual definition from drifting.

### Low Priority

8. **Memoize `new Set(projects.flatMap(...))` computation** with `useMemo([projects])`.

9. **Add featured/non-featured category filter tabs** above the timeline for large project counts.

10. **Consider `TimelineProjectCard` hover state** — The card's `<h3>` has `group-hover:text-[var(--accent)]` but the parent `div` has no `group` class, so the hover color never fires.

---

## 19. Appendix — Full Component Tree

```
<ProjectsWithErrorBoundary>
└── <ProjectsErrorBoundary>
    └── <Projects>
        │
        ├── <ProjectBackground>           (static, no animation)
        │   ├── 2 static particles        (layer z=-20)
        │   └── 100px grid overlay        (layer z=-10, opacity 0.03)
        │
        ├── Section Header (inline JSX)
        │   ├── "Featured Work" badge     (accent line · pill · accent line)
        │   ├── <h2 id="projects-heading"> "Projects Timeline"
        │   │   └── underline span on "Timeline"
        │   ├── Description <p>
        │   └── Stats row (3 divs)
        │       ├── {projects.length} "Projects"
        │       ├── {featured count} "Featured"
        │       └── {unique tags}+ "Technologies"
        │
        ├── Edge fade-in overlay           (top, z=50, gradient from --bg)
        ├── Edge fade-out overlay          (bottom, z=50, gradient from --bg)
        │
        ├── [isMobile] Mobile Timeline
        │   ├── Spine line (motion.div, scaleY=lineProgress, left-10px)
        │   └── {projects.map} MobileTimelineCard ×4
        │       ├── TimelineNode (orb, branchRevealed-gated)
        │       ├── Branch SVG line 28px (branchRevealed-gated, scaleX 0→1)
        │       └── Card (motion.div, cardRevealed-gated, x-slide)
        │           ├── Connection port bar
        │           ├── Image (h-40, lazy, onError hide)
        │           │   ├── Gradient overlay
        │           │   └── [featured] Featured badge
        │           └── Body (p-4)
        │               ├── "PROJECT 0X" label
        │               ├── <h3> title
        │               ├── <p> description
        │               ├── tags (first 4, .slice(0,4))
        │               └── Links: [Code] [Live]
        │
        └── [!isMobile] Desktop Timeline  (h=3750px, relative)
            ├── Track guide (1px, full height, scaleY=lineProgress)
            ├── Energy beam (2px, full height, scaleY=lineProgress)
            ├── Horizontal dividers ×3    (between consecutive projects)
            └── {projects.map} TimelineItem ×4
                ├── position: absolute, top=(150 + i×900)px
                ├── TimelineNode (orb, branchRevealed-gated, scale 0→1)
                ├── BranchConnector SVG 80px (branchRevealed-gated, scaleX 0→1)
                │   ├── line (accent color, opacity 0.7)
                │   └── circle endpoint (accent color, opacity 0.8)
                └── TimelineProjectCard (cardRevealed-gated, x-slide ±28px)
                    ├── Connection port bar (branch-facing edge)
                    ├── Category badge (emoji + label, top corner)
                    ├── Image (h-52, lazy, onError hide)
                    │   ├── Gradient overlay (from-black/70)
                    │   ├── [featured] Featured star badge
                    │   └── "PROJECT 0X" label overlay
                    └── Body (p-5 md:p-6)
                        ├── <h3> title
                        ├── <p> description
                        ├── Highlights (▸ bullets ×3)
                        └── Tech tags (all tags, no slice)
                        ⚠️  [NO GitHub/Live links]
        │
        └── GitHub CTA (inline JSX)
            └── Glassmorphic card (rounded-2xl, semi-transparent border)
                ├── GitHub SocialIcon (w-14 h-14, accent)
                ├── <h3> "More on GitHub"
                ├── <p> description
                └── <a> "Visit GitHub Profile" button
                    ├── GitHub SocialIcon (w-4 h-4, aria-hidden)
                    ├── "Visit GitHub Profile" text
                    └── Arrow SVG (aria-hidden)
</Projects>
```
