# Skills Section - Complete Documentation

**Last Updated:** 2026-06-08  
**Status:** ⚠️ ISSUE PERSISTS - Infinite scroll not working properly for bottom-to-top columns

---

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Component Structure](#component-structure)
4. [Implementation Details](#implementation-details)
5. [Animation System](#animation-system)
6. [Configuration](#configuration)
7. [Current Issues](#current-issues)

---

## Overview

The Skills section showcases technical skills using a 3D marquee grid that displays technology icons with smooth infinite scrolling animations. The section features:

- **3D perspective grid** with 5 columns of scrolling icons
- **Alternating scroll directions** (columns 0,2,4 scroll up; columns 1,3 scroll down)
- **Staggered entrance animations** for visual appeal
- **Hover effects** with gradient overlays
- **Animated border frame** with pulsing glow
- **Accessibility support** respecting `prefers-reduced-motion`

---

## Architecture

### File Structure
```
src/
├── components/
│   ├── Skills.jsx                      # Main section wrapper
│   ├── 3d-marquee-demo.jsx             # Data provider (icon URLs)
│   └── ui/
│       └── 3d-marquee.jsx              # Core 3D marquee component
└── sections/
    └── skills/
        ├── keyboardData.js             # Legacy skill data (unused)
        ├── KeyboardScene.jsx           # (unused)
        ├── HUDOverlay.jsx              # (unused)
        ├── HolographicPanel.jsx        # (unused)
        └── SkillPanel.jsx              # (unused)
```

### Key Technologies
- **React 19** for component logic
- **Framer Motion** for entrance animations and hover effects
- **CSS Flexbox** with gap property for layout
- **RequestAnimationFrame** for smooth 60fps scrolling
- **CSS 3D Transforms** for perspective grid effect

---

## Component Structure

### 1. Skills.jsx (Main Section)
**Location:** `src/components/Skills.jsx`

**Purpose:** Section wrapper with header and subtitle

**Features:**
- Scroll-triggered entrance animations
- Staggered child animations (badge → heading → subtitle → marquee)
- Background radial glow effect

**Code Structure:**
```jsx
<section id="skills" className="py-24">
  <motion.div variants={containerVariants}>
    <motion.div variants={itemVariants}>  {/* Badge */}
    <motion.h2 variants={itemVariants}>   {/* Heading */}
    <motion.p variants={itemVariants}>    {/* Subtitle */}
    <motion.div variants={marqueeVariants}> {/* Marquee */}
      <ThreeDMarqueeDemo />
    </motion.div>
  </motion.div>
</section>
```

**Animation Timing:**
- Badge: 0ms delay, 700ms duration
- Heading: 150ms delay, 700ms duration
- Subtitle: 300ms delay, 700ms duration
- Marquee: 450ms delay, 1000ms duration

---

### 2. ThreeDMarqueeDemo (Data Provider)
**Location:** `src/components/3d-marquee-demo.jsx`

**Purpose:** Provides icon URLs and wraps the 3D marquee component

**Icon Sources:** 20 technology icons from jsDelivr CDN (devicons)

**Technologies Displayed:**
- Languages: Python, C++, JavaScript, TypeScript, Rust
- Frontend: React, Next.js, Tailwind, Three.js
- Backend: Node.js, Express, FastAPI
- Databases: PostgreSQL, MongoDB
- Tools: Git, Docker, Linux, Redis, Figma, AWS

---

### 3. ThreeDMarquee (Core Component)
**Location:** `src/components/ui/3d-marquee.jsx`

**Purpose:** Renders the 3D grid with infinite scrolling columns

**Component Hierarchy:**
```
ThreeDMarquee (parent container)
└── Grid container (3D transformed)
    ├── AnimatedBorderFrame (pulsing glow)
    └── MarqueeColumn × 5 (one per column)
        ├── GridLineVertical (decorative line)
        └── motion.div × N (tiles with icons)
```

---

## Implementation Details

### Column Distribution
**Logic:** 20 icons split across 5 columns

```javascript
const columns = 5;
const chunkSize = Math.ceil(images.length / columns); // = 4
const chunks = Array.from({ length: columns }, (_, colIndex) => {
  const start = colIndex * chunkSize;
  return images.slice(start, start + chunkSize);
});
```

**Result:**
- Column 0: Icons 0-3 (4 items)
- Column 1: Icons 4-7 (4 items)
- Column 2: Icons 8-11 (4 items)
- Column 3: Icons 12-15 (4 items)
- Column 4: Icons 16-19 (4 items)

### Content Triplication
**Strategy:** Triple-buffer for seamless infinite scrolling

```javascript
const paddedArray = Array.from({ length: maxItems }, (_, i) => 
  subarray[i % subarray.length]
);
const duplicatedArray = [...paddedArray, ...paddedArray, ...paddedArray];
```

**Layout:**
```
[Set 1] Items 0-3 (positions 0-632px)
[Set 2] Items 0-3 (positions 632-1264px) ← Start here
[Set 3] Items 0-3 (positions 1264-1896px)
```

### Height Calculation
**Critical:** Must match actual rendered height

```javascript
// With CSS flexbox gap, N items have (N-1) gaps
const totalHeight = (maxItems * TILE_SIZE) + ((maxItems - 1) * TILE_GAP);
// = (4 × 140px) + (3 × 24px) = 632px
```

**Why this matters:** CSS flexbox `gap` adds space **between** items only, not after each item.

---

## Animation System

### 1. Entrance Animations (Per-Tile)
**Trigger:** When section enters viewport

**Animation:**
```javascript
initial: { opacity: 0, scale: 0.6, filter: "blur(12px)" }
animate: { opacity: 1, scale: 1, filter: "blur(0px)" }
```

**Stagger Logic:**
```javascript
const globalIndex = colIndex * chunkSize + (originalIndex % subarray.length);
const tileDelay = globalIndex * (TILE_STAGGER / 1000); // 90ms per tile
```

**Timeline:**
- Tile 0: 0ms delay
- Tile 1: 90ms delay
- Tile 2: 180ms delay
- ...
- Tile 19: 1710ms delay

**Duration:** 550ms per tile  
**Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (Apple spring curve)

---

### 2. Infinite Scroll Animation
**Implementation:** Custom requestAnimationFrame loop

**State Management:**
```javascript
const scrollPositionRef = useRef(null); // Current Y position
const scrolling = useState(false);      // Whether scrolling is active
```

**Scroll Speed Calculation:**
```javascript
const scrollSpeed = totalHeight / (SCROLL_DURATION * 60);
// = 632px / (20s × 60fps) = 0.527 px/frame
```

**Direction Pattern:**
```javascript
[-1, 1, -1, 1, -1]
//  ↑  ↓  ↑  ↓  ↑
// up down up down up
```

**Animation Loop:**
```javascript
const animate = () => {
  scrollPositionRef.current += direction * scrollSpeed;
  
  // Wrap-around logic
  if (scrollPositionRef.current <= -2 * totalHeight) {
    scrollPositionRef.current += totalHeight;
  } else if (scrollPositionRef.current >= 0) {
    scrollPositionRef.current -= totalHeight;
  }
  
  scrollRef.current.style.transform = `translate3d(0, ${scrollPositionRef.current}px, 0)`;
  rafId = requestAnimationFrame(animate);
};
```

**Starting Position:** `-632px` (middle of triple buffer)

**Wrap Boundaries:**
- Upward scrolling (direction -1): wraps at `-1264px` (= -2 × 632)
- Downward scrolling (direction +1): wraps at `0px`

---

### 3. Hover Animations
**Card Hover:**
```javascript
scale: 1 → 1.08
boxShadow: default → glow
borderColor: default → accent
backgroundColor: surface → raised
```

**Icon Hover:**
```javascript
scale: 1 → 1.1
filter: no glow → drop-shadow with glow
color: muted → gradient (accent → accent-hover)
```

**Duration:** 350ms  
**Easing:** easeOut

---

### 4. Border Frame Animation
**Effect:** Pulsing glow around entire grid

**Implementation:** Separate requestAnimationFrame loop

```javascript
const tick = () => {
  t += 0.025;
  const glow = Math.abs(Math.sin(t));
  const outerBlur = 12 + glow * 28;    // 12-40px
  const outerSpread = glow * 6;        // 0-6px
  const innerBlur = 8 + glow * 12;     // 8-20px
  
  boxShadow = [
    `inset 0 0 0 1.5px var(--accent)`,
    `inset 0 0 ${innerBlur}px 2px var(--border-glow)`,
    `0 0 ${outerBlur}px ${outerSpread}px var(--border-glow)`
  ].join(", ");
};
```

**Period:** ~251 frames (~4.2 seconds per cycle)

---

## Configuration

### SCROLL_CONFIG Constants
```javascript
{
  TILE_SIZE: 140,              // px - icon tile size
  TILE_GAP: 24,                // px - gap between tiles
  ITEM_HEIGHT: 164,            // px - DEPRECATED (use TILE_SIZE + calculation)
  SCROLL_DURATION: 20,         // seconds - time to scroll one set
  TILE_STAGGER: 90,            // ms - delay between tile entrance
  SCROLL_DELAY_BUFFER: 700,    // ms - delay before scrolling starts
  ENTRANCE_DURATION: 0.55,     // seconds - tile entrance animation
  HOVER_DURATION: 0.35,        // seconds - card hover animation
  ICON_HOVER_DURATION: 0.4,    // seconds - icon hover animation
}
```

### Theme Variables Used
```css
--bg                 /* Section background */
--bg-surface         /* Tile default background */
--bg-raised          /* Tile hover background */
--bg-hover-skills    /* Section radial glow */
--border             /* Tile default border */
--border-glow        /* Tile hover border + glow */
--accent             /* Badge, border, gradient start */
--accent-hover       /* Gradient end, hover icon */
--accent-dim         /* Badge background */
--text-primary       /* Heading text */
--text-secondary     /* Subtitle text */
--text-muted         /* Default icon color */
```

### 3D Transform Configuration
**Parent Container:**
```css
transform: rotateX(55deg) rotateY(0deg) rotateZ(-45deg);
```

**Viewport:**
```css
height: 600px;              /* Desktop */
height: 400px;              /* Mobile (max-sm) */
mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);
```

---

## Current Issues

### ❌ PROBLEM: Infinite Scroll Not Working for Bottom-to-Top Columns

**Affected Columns:** 0, 2, 4 (direction = -1, scrolling upward)

**Symptom:**
- Icons scroll upward but **do not reappear from the bottom**
- After some time (~20 seconds), all icons in the column have disappeared
- Column becomes empty with no content visible
- Wrap-around is not functioning correctly

**Working Columns:** 1, 3 (direction = +1, scrolling downward) - these work fine

---

### Attempted Fixes (All Failed)

#### Attempt 1: Two-Set Buffer
**What we tried:**
```javascript
const duplicatedArray = [...paddedArray, ...paddedArray];
```
**Result:** Still had visible jumps at wrap boundaries

---

#### Attempt 2: Triple-Set Buffer with Middle Start
**What we tried:**
```javascript
const duplicatedArray = [...paddedArray, ...paddedArray, ...paddedArray];
scrollPositionRef.current = -totalHeight; // Start at middle
```
**Result:** Content tripled correctly, but upward scrolling still fails

---

#### Attempt 3: Fixed Initialization Logic
**What we tried:**
```javascript
if (scrollPositionRef.current === null) {
  scrollPositionRef.current = -totalHeight;
  scrollRef.current.style.transform = `translate3d(0, ${-totalHeight}px, 0)`;
}
```
**Result:** Proper initialization, but wrap-around still broken

---

#### Attempt 4: Used translate3d Instead of translateY
**What we tried:**
```javascript
scrollRef.current.style.transform = `translate3d(0, ${position}px, 0)`;
```
**Reason:** Better compatibility with 3D transform context
**Result:** No improvement in wrap behavior

---

#### Attempt 5: Fixed totalHeight Calculation
**What we tried:**
```javascript
// Changed from:
const totalHeight = maxItems * ITEM_HEIGHT; // 656px

// To:
const totalHeight = (maxItems * TILE_SIZE) + ((maxItems - 1) * TILE_GAP); // 632px
```
**Reason:** CSS flexbox gap only adds space between items, not after each item
**Result:** Math is now correct (632px instead of 656px), but wrap still doesn't work

---

#### Attempt 6: Removed Inline Transform
**What we tried:** Removed `transform: initialTransform` from inline styles
**Reason:** Avoid conflict with programmatic transform updates
**Result:** No change in behavior

---

### Current Implementation Status

**Code Location:** `src/components/ui/3d-marquee.jsx`

**Current Wrap Logic:**
```javascript
if (scrollPositionRef.current <= -2 * totalHeight) {
  // At -1264px, should wrap to -632px
  scrollPositionRef.current += totalHeight;
} else if (scrollPositionRef.current >= 0) {
  // At 0px, should wrap to -632px
  scrollPositionRef.current -= totalHeight;
}
```

**Expected Behavior:**
- Column 0 starts at `-632px`
- Scrolls upward (position becomes more negative): `-632, -633, -634...`
- Reaches `-1264px` (end of Set 2 / start of Set 3)
- Should wrap to `-632px` (back to middle of buffer)
- Icons should reappear seamlessly from bottom

**Actual Behavior:**
- Column 0 starts at `-632px`
- Scrolls upward correctly until around `-1264px`
- Icons disappear and **do not reappear**
- Wrap condition may not be triggering OR wrap happens but content is wrong
- Column becomes empty

---

### Debugging Information

**Test Instructions:**
1. Open: http://localhost:5174/
2. Scroll to Skills section
3. Wait for tiles to animate in
4. Observe column 0 (leftmost) for 30+ seconds
5. Notice icons scrolling up and disappearing without returning

**Console Logs Added (Currently Removed):**
- Initialization: `[Col N] Init position: -632px`
- Frame updates: `[Col N] Frame 300: pos=-820px`
- Wrap events: `[Col N ↑] Wrap at bottom: -1264 → -632`

**Key Observations:**
- Downward scrolling (columns 1, 3) works perfectly
- Upward scrolling (columns 0, 2, 4) breaks after one cycle
- Content IS tripled correctly in DOM
- Transform updates ARE being applied
- Wrap condition SHOULD be met at -1264px

---

### Possible Root Causes (Unconfirmed)

1. **Transform Context Issue**
   - Parent has 3D transforms (rotateX, rotateY, rotateZ)
   - Child translate3d might not be composing correctly
   - 3D rendering context could be causing clipping

2. **Viewport Clipping**
   - Radial gradient mask might be hiding wrapped content
   - Content outside viewport might not be rendering
   - CSS contain property might be affecting visibility

3. **React Rendering Issue**
   - Framer Motion animations on children might conflict
   - Virtual DOM might not be updating properly
   - Keys on duplicated items might cause issues

4. **Math/Timing Issue**
   - Wrap condition triggers but at wrong moment
   - RequestAnimationFrame timing might be off
   - Position calculation accumulating errors over time

5. **CSS Flexbox Gap Bug**
   - Gap calculation correct (632px) but rendering different
   - Browser-specific gap implementation issue
   - Transform not accounting for gap properly

---

### What We Know FOR SURE

✅ Content is tripled correctly (verified in DOM)
✅ Initial position is set to -632px (verified)
✅ Transform updates are being applied (verified)
✅ Downward scrolling works (columns 1, 3)
✅ Height calculation is mathematically correct (632px)
✅ Wrap boundaries are correct (-1264px and 0px)

❌ Upward scrolling does not wrap properly (columns 0, 2, 4)
❌ Icons disappear after reaching boundary
❌ Icons do not reappear from opposite side

---

### Next Steps for Investigation

1. **Add Temporary Visual Indicators**
   - Label each set (Set 1, Set 2, Set 3) with colored backgrounds
   - Add frame counter overlay
   - Display current position on screen

2. **Test Without 3D Transform**
   - Temporarily remove parent 3D transforms
   - Check if scrolling works in 2D context
   - Rule out 3D rendering issues

3. **Test With Simpler Content**
   - Replace icons with plain colored divs
   - Remove Framer Motion animations
   - Isolate the scroll logic

4. **Browser DevTools Inspection**
   - Check computed styles during scroll
   - Monitor transform values in real-time
   - Check for any CSS warnings or errors

5. **Alternative Approaches**
   - Try CSS animations instead of JS
   - Use different scroll technique (overflow + auto-scroll)
   - Rebuild with Framer Motion's built-in scroll

---

### Files to Review

**Primary:**
- `src/components/ui/3d-marquee.jsx` (lines 95-180)
- Focus on MarqueeColumn component and animate() function

**Secondary:**
- `src/components/Skills.jsx` (section wrapper)
- `src/components/3d-marquee-demo.jsx` (data provider)

**Test Files:**
- `test-scroll.html` (standalone test)
- `test-wrap-logic.html` (wrap logic verification)

---

## Dev Server

**URL:** http://localhost:5174/  
**Location:** Skills section (scroll down)  
**Port:** 5174 (5173 was in use)

---

## Conclusion

The Skills section is **90% functional** with beautiful entrance animations, hover effects, and working downward scrolling. However, the **upward infinite scroll is broken**, causing a poor user experience for half of the columns.

**Priority:** HIGH - This is a critical visual bug that affects the core functionality of the Skills showcase.

**Status:** UNSOLVED - Multiple fix attempts have failed. Root cause remains unknown.

**Last Modified:** 2026-06-08
