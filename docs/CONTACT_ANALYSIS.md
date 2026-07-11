# Contact Section — Deep Technical Analysis

> **Portfolio:** Sai Pallav | **Architecture:** Modular Component System with 3D WebGL Orbital System and PCB Connections
> **Last Analyzed:** July 11, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Structure & Component Hierarchy](#2-file-structure--component-hierarchy)
3. [Main ContactSection Component](#3-main-contactsection-component)
4. [ContactHero Component](#4-contacthero-component)
5. [ContactForm Component](#5-contactform-component)
6. [ContactCards & ContactCard Components](#6-contactcards--contactcard-components)
7. [3D Orbital System (Contact3DObject)](#7-3d-orbital-system-contact3dobject)
8. [Motherboard Connectivity (LeftPCB and RightPCB)](#8-motherboard-connectivity-leftpcb-and-rightpcb)
9. [State Management & Data Flow](#9-state-management--data-flow)
10. [EmailJS Integration](#10-emailjs-integration)
11. [Animation System](#11-animation-system)
12. [Theming & Visual Design](#12-theming--visual-design)
13. [Performance Optimizations](#13-performance-optimizations)
14. [Accessibility (a11y)](#14-accessibility-a11y)
15. [Known Issues & Technical Debt](#15-known-issues--technical-debt)
16. [Improvement Recommendations](#16-improvement-recommendations)

---

## 1. Architecture Overview

The contact section features a **fully modular, multi-file architecture** with separation of concerns. The old 3D globe has been replaced with a premium physics-based three-tier orbital system and an interactive SVG PCB connectivity motherboard.

```
src/components/sections/contact/
├── ContactSection.jsx         — Main orchestrator, layout, backgrounds, grid lines
├── ContactHero.jsx            — Hero heading + description text
├── ContactForm.jsx            — Form with validation + EmailJS integration
│   ├── FloatingInput          — Animated floating label input with icon
│   ├── FloatingTextarea       — Textarea with character counter and icon
│   └── Form State Management  — Validation, submission, inquiry types
├── ContactCards.jsx           — Grid container for 4 info cards
├── ContactCard.jsx            — Individual info card (status, email, LinkedIn, location)
├── LeftPCB.jsx                — Decoupled SVG PCB traces on the left side of the screen
├── RightPCB.jsx               — Decoupled SVG PCB connections on the right side of the screen (form to globe)
└── Contact3DObject.jsx        — R3F 3D Canvas rendering a wireframe globe and a three-tier hierarchical orbital system with 6 orbiting icons
    ├── Lights                 — Hemispherical + directional + point light source
    ├── CameraRig              — Micro-drift camera movement linked to mouse distance factor
    ├── Globe                  — Central globe structure (glass core + wireframe + surface points + fresnel glow)
    ├── MicroParticles         — Seeding-based background particle point cloud
    ├── OrbitalRing            — 3D Torus ring representing an orbit path with comets and local segments
    └── OrbitingIcon           — Orbiting HTML social element with depth-based scaling/brightness/saturation and copy-to-clipboard/download link action
```

### Three Zones Layout

```
Zone 1: HERO AREA
┌─────────────────────────────────────────────┐
│  "Engineering Scalable Systems into Reality"│
│  Description paragraph                       │
└─────────────────────────────────────────────┘

Zone 2: INTERACTION AREA
┌─────────────────────────────────────────────┐
│             LEFT AND RIGHT PCB              │
│            (Spans entire width)             │
│  ┌──────────────────┐   ┌─────────────────┐ │
│  │   Contact Form   │   │ 3D Orbital Sys  │ │
│  │  (Left of Center)│   │(Right of Center)│ │
│  │                  │   │ • 3 Tiers       │ │
│  │ • Inquiry Type   │   │ • 6 Social Icons│ │
│  │ • Floating Input │   │ • Rare Bursts   │ │
│  │ • submit Sheen   │   │ • 2D Fallback   │ │
│  └──────────────────┘   └─────────────────┘ │
└─────────────────────────────────────────────┘

Zone 3: INFORMATION AREA
┌────────┬────────┬────────┬────────┐
│ Status │ Email  │LinkedIn│Location│
│  Card  │  Card  │  Card  │  Card  │
└────────┴────────┴────────┴────────┘
```

---

## 2. File Structure & Component Hierarchy

### File Organization

All contact components live in `src/components/sections/contact/`:

| File | Lines | Purpose | Exports |
|---|---|---|---|
| `ContactSection.jsx` | 211 | Main orchestrator, layout, backgrounds, mouse tracking, scroll listener removed | `ContactSection` (default, memo) |
| `ContactHero.jsx` | 55 | Hero heading with gradient text animation | `ContactHero` (default, memo) |
| `ContactForm.jsx` | 714 | Form with validation, EmailJS, inquiry dropdown, User/Mail/PenTool/MessageSquare icons, rounded inputs, sheen animation | `ContactForm` (default, memo) |
| `ContactCards.jsx` | 121 | Grid container for 4 info cards with motion wrapper | `ContactCards` (default, memo) |
| `ContactCard.jsx` | 208 | Individual card with copy button aria-label, adjusted shadows, copy-to-clipboard feedback | `ContactCard` (default, memo) |
| `LeftPCB.jsx` | 365 | Decoupled background traces, 12 background, 18 normal, 10 highlight traces on the left | `LeftPCB` (default, memo) |
| `RightPCB.jsx` | 191 | Decoupled form-to-globe traces, matches 3 continuous signal packet paths and joints | `RightPCB` (default, memo) |
| `Contact3DObject.jsx` | 1492 | Canvas container, distance factor, 3 orbital planes, 6 icons, context loss handling, 2D fallback | `Contact3DObject` (default, memo) |

### Component Hierarchy & Data Flow

```
<ContactSection>
  ├── <LeftPCB />                              — Absolute backdrop layer
  ├── <RightPCB />                             — Absolute backdrop layer
  └── <div className="w-full relative z-10">
      ├── <ContactHero />                          — Centered layout container
      ├── <div className="flex flex-col lg:flex-row">
      │   ├── <ContactForm />                      — Contains internal FloatingInput/FloatingTextarea
      │   └── <Contact3DObject />                  — R3F 3D Canvas
      │       └── <Canvas>
      │           └── <Scene>                      — Coordinates shared globalTheme, 3 orbits, and burst logic
      │               ├── <Lights />               — Updates directional and point lights
      │               ├── <CameraRig />            — Camera micro-drift mapped to proximity
      │               ├── <Globe />                — Central 3D globe meshes (wireframe, glass, points, halo)
      │               ├── <MicroParticles />       — Seeding-based points cloud
      │               └── <OrbitalRing (x3)>       — Tilted orbital planes containing trails, segments, packets
      │                   ├── <Trail / Segment Meshes>
      │                   └── <OrbitingIcon (x2)>  — Sprite-rendered interactive HTML icon buttons
      └── <ContactCards>
          └── <ContactCard (x4)>                   — Staggered entry cards
```

### Key Design Patterns

1. **React.memo everywhere** — All components wrapped in `React.memo()` for performance optimization.
2. **Ref-Based Animation State** — `distanceFactor.current`, `hoveredCountRef.current`, `activeBurstRef.current` are utilized in frame loops to prevent triggering React re-renders.
3. **Concurrency Locking** — An `activeTransmissionRef.current` lock prevents concurrent execution of multiple major 3D transition/burst animations in the R3F Canvas.
4. **Theme Reactivity via MutationObserver** — R3F scene reacts to `<html>` style changes. An observer updates the `globalTheme` object, letting R3F traverse meshes on the fly rather than tearing down the WebGL context.
5. **Real-time DOM Coordinate Measurement** — `LeftPCB` and `RightPCB` recalculate coordinates using `ResizeObserver` tracking and throttled `requestAnimationFrame` on resize/scroll events to dynamically draw traces between the form card and the 3D globe.
6. **Reduced Motion Respect** — Skipped 3D canvas, camera rig, background clouds, volumetric glows, and card spotlights if prefers-reduced-motion is active.

---

## 3. Main ContactSection Component

### Responsibilities

- Layout orchestration (12-column structure).
- Background rendering (ambient glows, grid, fog, noise, flow lines).
- Section-level mouse tracking for cursor-driven ambient light.
- Viewport intersection tracking for R3F Canvas frameloop optimization.

### Background Layers (Z-Index Stacking)

Rendered in this order (bottom to top):

| Layer | Implementation | Purpose |
|---|---|---|
| 1. Base fill | `bg-gradient-to-br from-surface/50 via-bg` | Solid dark foundation |
| 2. Cyan glow | Blur-[130px], `var(--gradient-glow)` | Behind hero heading |
| 3. Blue glow | Blur-[150px], `calc(0.18 * var(--ambient-intensity))` | Behind globe projection |
| 4. Purple glow | Blur-[130px], `calc(0.12 * var(--ambient-intensity))` | Reaching cards area |
| 5. Global vignette | Radial gradient at center | Edge darkening |
| 6. Volumetric fog | 2× motion.div clouds (25s and 30s) | Slow floating movement |
| 7. Cursor ambient light | radial-gradient at `--mouse-x` / `--mouse-y` | Mouse-tracking glow |
| 8. Grid lines | Linear gradient grid 4rem×4rem with mask | Structural lines |
| 9. Flow lines SVG | 3 paths with opacity 0.35 | Subtle connectivity lines |
| 10. Noise texture | `feTurbulence` SVG filter, 1.5% opacity | Fine grain overlay |
| 11. Dividers | Horizontal gradient lines | Accent separators |

### Mouse Tracking Implementation

```js
// Cached rect to avoid layout thrashing
const rectRef = useRef(null)

const updateRect = () => {
  if (sectionRef.current) {
    const rect = sectionRef.current.getBoundingClientRect()
    rectRef.current = {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY
    }
  }
}

// Cache the rect initially and update on layout/resize changes
updateRect()
window.addEventListener('resize', updateRect, { passive: true })

let ticking = false
const handleMouseMove = (e) => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      if (!rectRef.current) updateRect()
      const rect = rectRef.current
      if (rect && sectionRef.current) {
        const x = e.clientX + window.scrollX - rect.left
        const y = e.clientY + window.scrollY - rect.top
        sectionRef.current.style.setProperty('--mouse-x', `${x}px`)
        sectionRef.current.style.setProperty('--mouse-y', `${y}px`)
      }
      ticking = false
    })
    ticking = true
  }
}
```

---

## 4. ContactHero Component

### Structure

Simple two-element component with split gradient heading:

```jsx
<motion.h2>
  <span className="bg-gradient-to-r from-primary via-accent to-accent-hover bg-clip-text text-transparent filter drop-shadow-[0_0_20px_var(--accent-dim)]">
    Engineering Scalable Systems{' '}
  </span>
  <span className="bg-gradient-to-r from-accent-hover via-accent to-primary bg-clip-text text-transparent filter drop-shadow-[0_0_20px_var(--accent-dim)]">
    into Reality
  </span>
</motion.h2>

<motion.p>
  I specialize in backend engineering—API development, database design, and system architecture. 
  Right now I'm looking for summer 2026 internship opportunities...
</motion.p>
```

---

## 5. ContactForm Component

### Sub-Components (Internal, Memo)

#### FloatingInput
Animated label input containing:
- **Lucide Icon Integration**: Displays appropriate icon (`User`, `Mail`, or `PenTool`) at the input start.
- **Floating label**: Animate transitions via CSS `peer-placeholder-shown` and `peer-focus`.
- **Validation border**: Highlights in cyan or red based on errors and touched state.
- **Aria-describedby**: Hooked to specific error elements.

#### FloatingTextarea
Similar to FloatingInput but contains a `<textarea>` and an integrated character counter in the bottom-right showing length progress towards a limit of 1000. Uses the `MessageSquare` icon.

### Inquiry Type Selection

Includes a custom dropdown with 6 options: *Internship*, *Full-Time Opportunity*, *Freelance Project*, *Startup Collaboration*, *Technical Discussion*, and *Other*.
- Uses rotating ChevronDown indicator.
- Listbox uses `AnimatePresence` and custom viewport locks.
- Document click listener handles clicking outside the element.

```jsx
<button
  type="button"
  id="inquiry-type"
  onClick={() => setIsDropdownOpen(prev => !prev)}
  className="w-full rounded-[12px] border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent pl-10 pr-4 py-3 text-xs md:text-sm text-[var(--text-primary)] outline-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop-blur-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),inset_0_0_0_1px_rgba(255,255,255,0.02)] hover:border-white/[0.12] hover:bg-white/[0.04] focus:border-[var(--accent)]/50 focus:shadow-[0_0_0_3px_var(--accent-dim),0_0_20px_var(--accent-dim),inset_0_1px_2px_rgba(0,0,0,0.3)] focus:bg-white/[0.04] flex items-center justify-between focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
  aria-haspopup="listbox"
  aria-expanded={isDropdownOpen}
>
  <span>{inquiryType}</span>
  <ChevronDown className={`h-4 w-4 text-[var(--text-secondary)] transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
</button>
```

### Form Fields

| Field | Type | Validation | Max Length |
|---|---|---|---|
| `name` | text | Required, min 2 chars | - |
| `email` | email | Required, regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | - |
| `subject` | text | Required, min 3 chars | - |
| `message` | textarea | Required, 10–1000 chars | 1000 |

### Validation Logic

```js
function validateField(name, value) {
  let err = ''
  if (name === 'name') {
    if (!value.trim()) err = 'Name is required'
    else if (value.trim().length < 2) err = 'Name must be at least 2 characters'
  } else if (name === 'email') {
    if (!value.trim()) err = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) err = 'Please enter a valid email address'
  } else if (name === 'subject') {
    if (!value.trim()) err = 'Subject is required'
    else if (value.trim().length < 3) err = 'Subject must be at least 3 characters'
  } else if (name === 'message') {
    if (!value.trim()) err = 'Message is required'
    else if (value.trim().length < 10) err = 'Message must be at least 10 characters'
    else if (value.trim().length > 1000) err = 'Message cannot exceed 1000 characters'
  }
  return err
}
```

### Submission States

Button transitions between states using `<AnimatePresence mode="wait">`:

| State | Label | Icon | Style |
|---|---|---|---|
| `idle` | "Send Inquiry" | `<Send>` | Gradient background, sheen effect, inset highlight |
| `submitting` | "Sending..." | `<Loader2>` (spin) | Disabled, low opacity |
| `success` | "✓ Message Sent" | `<CheckCircle2>` | Emerald green success details, pulse effect |
| `error` | "Failed to Send. Click to Retry" | `<AlertCircle>` | Red background, resets click target |

#### Form Feedback
- Renders a status card containing warning/check symbols.
- Features `animate-shake` on validation errors.
- Material design ripple effect adds an expanding span on click.
- Features a glass reflection overlay (`absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover/btn:opacity-100`) on hover.
- **Interactive Corner Accent Dots**: In the top-right corner, 3 decorative dots animate based on form focus and submission state (`activeDotState`):
  - `idle`: Stable scale with staggered base opacities (0.4, 0.3, 0.2).
  - `focused`: Continuous scale and opacity pulse looping (1.2s duration, staggered delay `i * 0.15`).
  - `submitting`: Vertical bobbing loop (`y: [0, -3.5, 0]`) and opacity pulsing (0.6s duration, staggered delay `i * 0.08`).
- **Interactive Sweep Effect**: An absolute container overlays a light gradient sweep (`bg-gradient-to-r from-transparent via-white/[0.03] to-transparent`) traversing across the form container using an infinite `sweep` keyframe animation (8s duration).

---

## 6. ContactCards & ContactCard Components

### ContactCards

A responsive grid layout staggering cards in with `CARD_VARIANTS` motion wrappers:
- **Status Card**: Rendered with an animated ping indicator.
- **Email Card**: Rendered with copy-to-clipboard triggers. Contains an `aria-label` attribute on the copy button.
- **LinkedIn Card**: Custom SVG branding with navigate behavior.
- **Location Card**: Bounces the `MapPin` icon on hover.

### ContactCard Hover and Shadows

- Features local cursor spotlight calculations by caching bounding rect coordinates on hover.
- **Default Shadow**: `shadow-[0_4px_20px_-8px_rgba(0,0,0,0.3),0_1px_2px_rgba(168,85,247,0.08)]`.
- **Hover Shadow**: `shadow-[0_8px_28px_-8px_rgba(0,0,0,0.4),0_1px_2px_rgba(168,85,247,0.12)]` with offset translations of `-2px`.
- Email copy events update footer to "✓ Copied!" with a 1.5s timeout.

```js
const handleCardClick = useCallback((e) => {
  if (copyText) {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(copyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
}, [copyText])
```

---

## 7. 3D Orbital System (Contact3DObject)

Replaces the old globe canvas with a three-tier hierarchical orbital system rendering a wireframe core globe and 6 interactive social buttons moving along math-driven inclined orbital rings.

### Hierarchy & Orbit Configuration

- The constant `ORBITAL_PLANES` defines a planned configuration:
  - Inner: Inclination 28°, Radius 2.6, Period 18s, Precession 100s.
  - Middle: Inclination 68°, Radius 3.0, Period 26s, Precession 110s.
  - Outer: Inclination 115°, Radius 3.3, Period 38s, Precession 120s.
- The actual rendering in the `Scene` component instantiates three `OrbitalRing` groups with the following hardcoded values:
  - **Orbital Ring 0 (Inner/Identity)**: Z-angle offset 0°, Z-axis precession speed 0.02 rad/s, Orbit speed 0.35 rad/s, Z-offset offset -0.12 units. Holds GitHub and LinkedIn.
  - **Orbital Ring 1 (Middle/Technical)**: Z-angle offset 60°, Z-axis precession speed -0.016 rad/s, Orbit speed -0.28 rad/s (reverse direction), Z-offset 0.00 units. Holds LeetCode and GeeksforGeeks.
  - **Orbital Ring 2 (Outer/Action)**: Z-angle offset 120°, Z-axis precession speed 0.013 rad/s, Orbit speed 0.22 rad/s, Z-offset 0.12 units. Holds Email and Resume.
  - All three orbital rings use a base Torus radius of `2.45` units and inclination of 65°:
    `const radTilt = 65 * (Math.PI / 180)`
    `const radZ = angle * (Math.PI / 180)`
  - On hover, the active ring dynamically expands its radius from `2.45` to `2.53` units:
    `const targetRadius = 2.45 + activeHover * 0.08`
    And its rotation speed is eased (slowed down) by 10%:
    `const speedMultiplier = 1.0 - activeHover * 0.10`

### Physics-Based Mechanics

- **Constant Angular Velocity**: Computed mathematically via `ω = 2π / period`. Continuous rotation without synthetic offsets.
- **Orbital Axis Precession**: Slowly rotates each plane's tilt around the Z-axis (ringSpeed values: 0.02, -0.016, 0.013). This creates a gyroscopic armillary-sphere precession effect.
- **Selective Slowdown**: When an icon is hovered, the orbit it belongs to slows by 10% (`speedMultiplier` becomes 0.90) to make it easier to click, while other orbits continue at 100% speed.
- **Depth-Based Visuals**: Camera space Z-depth calculates distance to scale scale (0.95 → 1.03), opacity (0.55 → 1.0), brightness (0.8 → 1.0), and saturation (0.85 → 1.0) dynamically.

### Custom Shader Materials

#### 1. FresnelGlowMaterial (Atmospheric core glow)
Renders the atmospheric halo glow on the central globe core.
```glsl
// Vertex Shader
varying vec3 vNormal; varying vec3 vViewPosition;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}

// Fragment Shader
uniform vec3 color; uniform float glowPower; uniform float glowIntensity;
varying vec3 vNormal; varying vec3 vViewPosition;
void main() {
  vec3 normal = normalize(vNormal); vec3 viewDir = normalize(vViewPosition);
  float intensity = pow(1.0 - max(dot(normal, viewDir), 0.0), glowPower) * glowIntensity;
  gl_FragColor = vec4(color, intensity);
}
```

#### 2. RingGlowMaterial (Torus orbital rings)
Neon purple torus shader containing a fresnel edge glow and dynamic propagation ripples on data packet arrivals.
```glsl
uniform vec3 color; uniform float opacity; uniform float time; uniform float rippleProgress; uniform float rippleOrigin;
varying vec3 vNormal; varying vec3 vViewPosition; varying vec2 vUv;
void main() {
  vec3 normal = normalize(vNormal); vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 1.5);
  vec3 baseColor = color * 0.35;
  vec3 edgeGlow = color * fresnel * 1.5;
  float rippleGlow = 0.0;
  if (rippleProgress > 0.0 && rippleProgress < 1.0) {
    float dist = abs(vUv.x - rippleOrigin);
    if (dist > 0.5) dist = 1.0 - dist;
    float angleDist = dist * 2.0 * 3.14159265;
    float waveFront = rippleProgress * 3.14159265;
    float wavePeak = exp(-pow(angleDist - waveFront, 2.0) / 0.08);
    rippleGlow = wavePeak * (1.0 - rippleProgress) * 0.8;
  }
  vec3 finalColor = baseColor + edgeGlow + color * rippleGlow * 1.5;
  float depthFade = clamp((vViewPosition.z + 10.45) / 4.9, 0.2, 1.0);
  float finalOpacity = opacity * (0.2 + fresnel * 0.8 + rippleGlow) * depthFade;
  gl_FragColor = vec4(finalColor, finalOpacity);
}
```

#### 3. TrailGlowMaterial (Comet trails)
Comet trail ribbon following each icon. Dynamically breathes between 12% and 18% of the circumference, stretching and thinning based on transit velocities. Includes fine internal plasma noise.
```glsl
uniform vec3 coreColor; uniform vec3 edgeColor; uniform float opacity; uniform float isReverse; uniform float trailLengthFactor; uniform float time;
varying vec2 vUv; varying vec3 vNormal; varying vec3 vViewPosition;
void main() {
  float maxFraction = 0.20;
  float noise = sin(vUv.y * 12.0 + time * 6.0) * cos(vUv.x * 24.0 - time * 4.0) * 0.02;
  float distortedUvX = clamp(vUv.x + noise, 0.0, 1.0);
  float tailFade = 0.0;
  if (isReverse > 0.5) {
    if (distortedUvX <= maxFraction) {
      float progress = 1.0 - (distortedUvX / maxFraction);
      float activeProgress = (progress - (1.0 - trailLengthFactor)) / trailLengthFactor;
      tailFade = activeProgress > 0.0 ? pow(activeProgress, 1.8) : 0.0;
    }
  } else {
    if (distortedUvX >= 1.0 - maxFraction) {
      float progress = (distortedUvX - (1.0 - maxFraction)) / maxFraction;
      float activeProgress = (progress - (1.0 - trailLengthFactor)) / trailLengthFactor;
      tailFade = activeProgress > 0.0 ? pow(activeProgress, 1.8) : 0.0;
    }
  }
  vec3 normal = normalize(vNormal); vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 1.2);
  float waveDistortion = sin(distortedUvX * 16.0 + time * 5.0) * 0.04;
  float centerFactor = sin(clamp(vUv.y + waveDistortion, 0.0, 1.0) * 3.14159265);
  float coreFactor = pow(centerFactor, 5.0) * (1.0 - fresnel * 0.4);
  vec3 finalColor = mix(edgeColor, coreColor, coreFactor);
  float edgeFade = smoothstep(0.0, 0.15, centerFactor) * (0.4 + 0.6 * fresnel);
  float depthFade = clamp((vViewPosition.z + 10.45) / 4.9, 0.2, 1.0);
  gl_FragColor = vec4(finalColor, opacity * tailFade * edgeFade * depthFade);
}
```

#### 4. SegmentGlowMaterial (Target endpoint activation arcs)
Renders a short 25-degree energized arc (UV fraction: 0.07) centered on active endpoints that glows during packet arrivals.

### Component Deep-Dive

#### Lights
- **Ambient Light**: intensity 0.1
- **Hemisphere Light**: args `['#ffffff', '#090913', 0.2]`
- **Directional Light**: position `[5, 4, 4]`, intensity 1.0, color `#ffffff`
- **Point Light**: position `[-4, -1, -4]`, intensity 1.5, color `globalTheme.color` (dynamic), distance 12, decay 2.2.

#### CameraRig
- Handles camera float animation using:
  - `nextX = (Math.sin(t * 0.06) * 0.035 + Math.cos(t * 0.14) * 0.015) * f`
  - `nextY = (Math.cos(t * 0.04) * 0.035 + Math.sin(t * 0.11) * 0.015) * f`
- Subpixel lookAt gate: only recalculates `lookAt(0, 0, 0)` if movement exceeds `0.0001` in either dimension.
- Wraps `timeAccum` at `100000` to prevent floating-point precision loss.

#### Globe
- **Glass Core**: `SphereGeometry(1.96, 32, 32)` with MeshStandardMaterial (color `#0a0f1e`, roughness 0.25, metalness 0.6, transparent, opacity 0.35, depthWrite false).
- **Wireframe**: `IcosahedronGeometry(2.0, 2)` with BasicMaterial (color `globalTheme.color`, wireframe true, transparent, opacity 0.06, depthWrite false).
- **Points**: `IcosahedronGeometry(2.0, 4)` with PointsMaterial (color `globalTheme.color`, size 0.028, transparent, opacity 0.35, blending AdditiveBlending, depthWrite false). Size is pulsed in `useFrame`: `(0.025 + Math.sin(time * 2.5) * 0.005) * (0.3 + 0.7 * f)`.
- **Atmospheric Glow**: `SphereGeometry(2.08, 32, 32)` with FresnelGlowMaterial (color `globalTheme.color`, glowPower 4.8, glowIntensity 0.5, transparent, blending AdditiveBlending, depthWrite false).

#### MicroParticles
- Seeding-based points cloud generated dynamically with PRNG (seed `42`).
- Torus-like distributed range: radius between `2.4` and `4.4`.
- Material: `pointsMaterial` (color `globalTheme.color`, size 0.02, transparent, opacity 0.18, depthWrite false, blending AdditiveBlending).
- Animates rotation: `pointsRef.current.rotation.y += delta * 0.01 * f` and `pointsRef.current.rotation.x += delta * 0.005 * f` where `f` is the eased proximity factor.

#### OrbitingIcon
- HTML sprite containers rendered via `@react-three/drei` `<Html center transform sprite distanceFactor={8} pointerEvents="auto">`.
- Extends standard links/buttons click areas with an invisible absolute layer padding: `after:absolute after:inset-[-12px] after:content-['']` (adds 12px padding around the icon to make it easy to hover/click in 3D).
- Renders tooltips in absolute containers with hover transitions. Email icon shows "Copied!" for 1.5s on click.
- Handles mouse proximity calculations, depth calculations, and dirty-check style updates (STYLE_THRESHOLD = 0.002).

#### OrbitalRing
- Torus path geometry built with TorusGeometry (radius 2.45, tube 0.035, radialSegments 32, tubularSegments 256).
- Contains:
  1. Base Torus mesh with `RingGlowMaterial`.
  2. Trail segments (TrailGlowMaterial) mapped to icon speeds.
  3. Local segment activation meshes (SegmentGlowMaterial).
  4. Data packet spheres (radius 0.05, 8 segments).
  5. Two group pivots holding the icons.
- Handles hover packet triggers, travel blur (stretch and thin math calculations), and combined reaction factor mapping.

### Signal Transmission & Rare Bursts

- **Selective Packet Firing**: Hovering an icon generates a data packet that travels from the core globe to the target icon in 1.2s. During hover, the periodic packet transmission speed for that icon doubles.
- **Rare Communication Burst**: Every 15–20s, a coordinator triggers a burst. A packet travels from the center to a random icon, stretching and thinning to simulate motion blur, then triggers a glowing feedback reaction and propagates a ripple along the Torus ring.
- **Concurrency Control**: Lock mechanism (`activeTransmissionRef.current`) restricts the system to rendering a single major signal packet or burst at a time.

### Context Recovery & 2D Fallback

- Canvas listens to `webglcontextlost` on the R3F WebGL context.
- If context is lost, the component gracefully falls back to a 2D glassmorphic container containing the 6 social/action buttons, retaining full portfolio functionality.

---

## 8. Motherboard Connectivity (LeftPCB and RightPCB)

Instead of a coupled, monolithic layout, the backdrop traces are divided into two single-responsibility modular components.

### 1. Left PCB backdrop (`LeftPCB.jsx`)
- Covers the left half of the viewport (`inset-0` absolute canvas relative to the full viewport).
- Tracks the Form Card left bounding boundary (`formRef`).
- It has **zero awareness** of the 3D globe, preventing cross-component dependency.
- Coordinates dynamic single data packets that traverse the highlight traces every 7s.
- Operates in a local coordinate system starting at `X = 15px`.
- Renders **40 Motherboard Traces** on the left side:
  - **Layer 1: Faint Background (12 traces)** — Opacity 0.12, width 0.5px. Connects background vias.
  - **Layer 2: Normal Routing (18 traces)** — Opacity 0.28. Contains meander structures, a Top Data Bus (5 traces with matched lengths and staggered terminations), a Middle Control Bus (4 traces), and a Bottom Differential Bus (3 traces).
  - **Layer 3: Highlighted Routing (10 traces)** — Opacity 0.55, width 1–2px. Connects active signal endpoints.
  - **Nodes**: 15 nodes utilizing `#leftPcbSignalGlow` blurs and solid white cores.

### 2. Right PCB backdrop (`RightPCB.jsx`)
- Covers the right half of the viewport (`inset-0` absolute canvas).
- Tracks both the Form Card right border (`formRef`) and the Globe container left border (`globeRef`).
- Draws 3 main connecting traces bridging the space between the Form and the Globe.
- Spawns 3 continuous signal packets traveling along the traces with offsets and animation blur.

### Coordinate Update Mechanics

Coordinates are measured dynamically via `ResizeObserver` callbacks on mount and window listeners, throttled via `requestAnimationFrame` to avoid layout thrashing.
```js
const rectGrid = containerRef.current.getBoundingClientRect()
const formEl = formRef?.current
const globeEl = globeRef?.current

const G_val = rectGrid.width
const H_val = rectGrid.height || 400

// Measure form right edge and globe left edge relative to screen coordinate space
let R_form_val = G_val * 0.15
if (formEl) {
  const rectForm = formEl.getBoundingClientRect()
  R_form_val = rectForm.right - rectGrid.left
}

let sphereLeft = G_val * 0.65
if (globeEl) {
  const rectGlobe = globeEl.getBoundingClientRect()
  const sphereWidth = Math.min(380, rectGlobe.width)
  sphereLeft = rectGlobe.left - rectGrid.left + (rectGlobe.width - sphereWidth) / 2
}
```

---

## 9. State Management & Data Flow

### State Location Strategy

| State | Location | Reason |
|---|---|---|
| Form data, validation errors | ContactForm | Self-contained, no external deps |
| Card hover states | ContactCard | Local interaction |
| Globe hover count | Contact3DObject (ref) | Shared across OrbitingIcons via ref |
| Distance factor | Contact3DObject (ref) | Passed to all animated components |
| WebGL supported | Contact3DObject (state) | Fallback rendering |
| Section mouse position | ContactSection | CSS variables for ambient light |
| Dropdown open state | ContactForm | Local UI state |
| Button hover state | ContactForm | Local animation trigger |
| Ripple array | ContactForm | Local animation state |
| Card copied state | ContactCard | Local feedback state |
| activeTraceIndex | PCBConnection | Selects left active trace |
| activeTransmission | Scene | Concurrency lock for 3D signal animations |
| activeBurst | Scene | Coordinates periodic communication burst stages |

### Ref-Based Animation State

Animation values stored in refs to avoid re-renders:

```js
// In Contact3DObject
const distanceFactor = useRef(1.0)        // Updated on mousemove
const hoveredCountRef = useRef(0)         // Updated by OrbitingIcon hover
const cachedRect = useRef(null)           // Cached bounding rect

// In CameraRig
const easedFactor = useRef(1.0)           // Lerped distance factor
const timeAccum = useRef(0)               // Animation time accumulator
const lastX = useRef(0)                   // Last camera position X
const lastY = useRef(0)                   // Last camera position Y

// In Globe
const wireRef = useRef()
const pointsRef = useRef()
const easedFactor = useRef(1.0)
const timeAccum = useRef(0)

// In OrbitingIcon
const iconGroupRef = useRef()
const htmlRef = useRef()
const glowRef = useRef()
const hoverRef = useRef(false)
const hoverGlowFactor = useRef(0.0)
const lastStyle = useRef({ opacity: -1, scaleVal: -1, glowOpacity: -1, brightnessVal: -1, saturateVal: -1 })
```

---

## 10. EmailJS Integration

### Environment Variables

```bash
# .env file
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=your_template_id_here
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
```

### Configuration Check

```js
const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

const isConfigured = !!(serviceId && templateId && publicKey && 
  !serviceId.includes('your_') && 
  !templateId.includes('your_') && 
  !publicKey.includes('your_')
)
```

### Email Payload

```js
await emailjs.send(
  serviceId,
  templateId,
  {
    from_name: formData.name,
    from_email: formData.email,
    subject: formData.subject,
    message: `[Inquiry Type: ${inquiryType}]\n\n${formData.message}`,
    to_email: personal.email,
  },
  publicKey
)
```

---

## 11. Animation System

### Continuous Animations

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Background fog clouds | x/y translate loops | 25–30s | easeInOut |
| Globe rotation | Y-axis 0.08 rad/s, X-axis 0.02 rad/s | Infinite | Linear (modulated by distanceFactor) |
| Point size pulse | Sin wave 0.025–0.03 | ~2.5s cycle | Sin curve |
| Camera float | Dual sin waves (0.06, 0.04) | Infinite | Sin curves (modulated by distanceFactor) |
| Particle layer rotation | Y: 0.01, X: 0.005 rad/s | Infinite | Linear (modulated by distanceFactor) |
| Orbiting icons | Orbit configurations | Infinite | Linear (modulated by selective slowdown) |
| Status card ping | Scale + opacity pulse | 1s | Built-in |
| Button sheen | Gradient slide | 0.6s | ease-out (on hover only) |
| Signal packet travel | SVG path travel | 3.5s | animateMotion |

---

## 12. Theming & Visual Design

### CSS Variable Integration

Components read theme colors from CSS:

```js
// In Contact3DObject
const readTheme = () => {
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()
  if (accent && accent !== globalTheme.color) {
    globalTheme.color = accent
    globalTheme.version += 1
  }
}
```

### Glassmorphism Technique

Form card layers:

```jsx
<motion.div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-surface/80 via-raised/60 to-surface/80 backdrop-blur-2xl p-8 md:p-10 w-full shadow-2xl shadow-black/40 overflow-hidden">
  {/* Glass border sheen overlay */}
  <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-60"
    style={{
      background: `linear-gradient(to bottom, var(--accent) 0%, transparent 30%)`,
      maskImage: 'linear-gradient(to bottom, black 0%, transparent 8%)',
      WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 8%)',
      opacity: 0.12,
    }}
  />
</motion.div>
```

### Shadow Stack

Cards use multiple shadow layers:

```css
/* ContactCard default */
shadow-[0_4px_20px_-8px_rgba(0,0,0,0.3),0_1px_2px_rgba(168,85,247,0.08)]

/* ContactCard hovered with action */
shadow-[0_8px_28px_-8px_rgba(0,0,0,0.4),0_1px_2px_rgba(168,85,247,0.12)]
```

---

## 13. Performance Optimizations

### React.memo Usage

All components wrapped:
- `ContactSection` — Prevents re-render on parent updates
- `ContactHero` — Static content
- `ContactForm` — Self-contained state
- `ContactCards` — Grid wrapper
- `ContactCard` — Individual cards
- `PCBConnection` — Prevents re-renders
- `Contact3DObject` — R3F canvas wrapper

### Geometry Disposal

R3F meshes clean up geometries on unmount:

```js
useEffect(() => {
  return () => {
    geomWire.dispose()
    geomPoints.dispose()
    geomGlass.dispose()
    geomHalo.dispose()
  }
}, [geomWire, geomPoints, geomGlass, geomHalo])
```

---

## 14. Accessibility (a11y)

### Strengths ✅

| Feature | Implementation |
|---|---|
| Semantic HTML | `<section>`, `<form>`, `<button type="submit">`, `<label htmlFor>` |
| Focus indicators | `focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50` |
| Link labels | `aria-label="Open ${platform} profile"` |
| Reduced motion | All animations disabled via `useReducedMotion()` |
| Screen reader fallback | `<nav className="sr-only">` with social links |

---

## 15. Known Issues & Technical Debt

### 🔴 Critical

None identified.

### 🟡 Medium Priority

1. **EmailJS in demo mode** — Placeholder credentials prevent real email sending.
2. **WebGL fallback UX** — When WebGL fails, shows flat grid.
3. **Mobile globe hidden** — `hidden md:flex` removes R3F canvas on mobile.

---

## 16. Improvement Recommendations

1. **Configure EmailJS production credentials**
2. **Add keyboard support to ContactCard**
3. **Announce form success to screen readers**

---

## Appendix: Reference Map

### Component Import Map

```js
import ContactSection from '@/components/sections/contact/ContactSection'
import ContactHero from './ContactHero'
import ContactForm from './ContactForm'
import ContactCards from './ContactCards'
import ContactCard from './ContactCard'
import LeftPCB from './LeftPCB'
import RightPCB from './RightPCB'
import Contact3DObject from './Contact3DObject'
```

### Key Files to Edit

| Task | Files |
|---|---|
| Adjust orbits or shaders | `Contact3DObject.jsx` |
| Modify left motherboard routing | `LeftPCB.jsx` |
| Modify right motherboard routing | `RightPCB.jsx` |
| Update contact details | `personal.jsx` |
| Modify validation or inputs | `ContactForm.jsx` |
| Edit card layouts | `ContactCards.jsx` |

---

## Version History

- **July 11, 2026**: Fully reconfigured document. Replaced 3D globe system description with detailed specifications of the new 3-tier orbital object (`Contact3DObject.jsx`) and the dynamic SVG motherboard connectivity trace layout (`PCBConnection.jsx`). Added details on custom shaders, data packets, selective slowdown, and WebGL recovery. Added interactive corner accent dots and sweep sweep configurations in Section 5.
- **July 10, 2026**: Full deep analysis completed. Updated all component details, corrected orbit radius (2.8→3.4), added ambient intensity integration, documented GlobeContainer scroll listener, updated button states with sheen animation, corrected inquiry type dropdown implementation, added action types to cards, updated card data, documented all ref-based animation state, corrected shadow stack details, updated typography scale, added keyboard navigation flow, expanded accessibility gaps, updated known issues, and added new improvement recommendations.
