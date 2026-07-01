# 3D Globe — Contact Section Animation

**Archived:** 2026-06-29
**File:** `Contact3DObject.jsx`
**Location:** `src/archive/Contact3DGlobe/`

---

## What This Is

A premium Three.js / React Three Fiber 3D globe animation for the portfolio contact section.

### Features
- Layered globe: wireframe cage + twinkling points + Fresnel atmospheric edge glow
- 4 social icons orbiting diagonally on tilted paths (GitHub, LinkedIn, Instagram, LeetCode)
- Cursor proximity slowdown: icons and globe decelerate as cursor approaches
- Depth illusion: icons fade/dim as they pass behind the globe
- Micro-bobbing animation per icon, pauses on hover
- Camera drift (layered frequency, handheld stabiliser feel)
- Sparse floating background particles
- Hover coordination: hovering any icon slows ALL orbits simultaneously
- Composited glow on hover (zero CSS filter repaint cost)
- Mobile hidden: shows only at md+ breakpoints
- WebGL context loss recovery: graceful 2D fallback
- Screen reader / keyboard accessible fallback nav

---

## Dependencies

```
@react-three/fiber  ^8.x
@react-three/drei   ^9.x
three               ^0.x
framer-motion       ^11.x
```

---

## How to Restore

1. Copy `Contact3DObject.jsx` back to `src/components/sections/`
2. Import in `Contact.jsx`:

```jsx
import Contact3DObject from './Contact3DObject'

// Inside Contact section JSX (outside main grid, inside <section>):
<Contact3DObject />
```

3. Ensure `personal.socials` in `src/data/personal.js` has:
   `github`, `linkedin`, `instagram`, `leetcode`

---

## Configuration (top of file)

| Key | Default | Purpose |
|---|---|---|
| `SCENE_CONFIG.orbit.radius` | `2.8` | Distance of icons from globe center |
| `SCENE_CONFIG.proximity.maxDistance` | `220` | Pixel radius where slowdown begins |
| `SCENE_CONFIG.proximity.minFactor` | `0.05` | Minimum speed multiplier at cursor center |
| `ORBIT_CONFIGS[n].speed` | varied | Angular speed per icon |
| `ORBIT_CONFIGS[n].tiltZ` | PI/4 | Diagonal tilt of orbit plane |
| `LERP.*` | varied | Easing rates (blends/sec, framerate-independent) |

---

## Architecture Notes

- `globalTheme` enables imperative color updates — **zero React re-renders** on theme switch
- `lerpFI` uses `1 - Math.exp(-factor * delta)` — mathematically correct exponential decay
- Per-component `timeAccum` wraps with `% 100000` — prevents float precision loss on long idle
- `getBoundingClientRect` cached in ref — updated only on `resize`/`scroll`, not `mousemove`
- Hover stored as `useRef` not `useState` — zero React reconciliation on pointer events
- DOM style dirty-checked before write — eliminates ~720 redundant style assignments/sec
- CSS `drop-shadow` replaced with composited opacity layer — zero repaint on hover
- Depth bounds: `minZ = -(camZ + radius)`, `maxZ = -(camZ - radius)` (geometrically correct)