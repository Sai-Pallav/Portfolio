# Orbital System Reconfiguration - 6 Icons with Premium Mechanics

## Overview
Reconfigured the Contact section's 3D orbital globe from 4 icons to 6 icons with a hierarchical three-tier orbital system and premium physics-based motion.

## Implementation Summary

### 1. Orbital Configuration (3 Hierarchical Planes)

**Orbit 1 (Inner) - Professional Identity**
- **Icons**: GitHub, LinkedIn
- **Inclination**: 28° tilt
- **Radius**: 2.6 units (closest)
- **Period**: 18 seconds per revolution
- **Precession**: 100 seconds
- **Phase**: 180° phase-locked separation

**Orbit 2 (Middle) - Technical Proof**
- **Icons**: LeetCode, GeeksforGeeks
- **Inclination**: 68° tilt
- **Radius**: 3.0 units (medium)
- **Period**: 26 seconds per revolution
- **Precession**: 110 seconds
- **Phase**: 180° phase-locked separation

**Orbit 3 (Outer) - Direct Action**
- **Icons**: Email (copy-to-clipboard), Resume (download)
- **Inclination**: 115° tilt
- **Radius**: 3.3 units (outermost)
- **Period**: 38 seconds per revolution
- **Precession**: 120 seconds
- **Phase**: 180° phase-locked separation

### 2. Premium Orbital Mechanics

**Pure Constant Angular Velocity**
- Icons move at constant speed along their orbital paths
- No easing during continuous orbit motion
- Angular velocity computed from period: `ω = 2π / period`

**Selective Orbit Slowdown**
- Only the hovered orbit slows to 65% speed
- Non-hovered orbits continue at 100% speed
- System never appears frozen

**Orbital Precession**
- Each orbital plane's axis slowly rotates over time
- Barely noticeable (2-3% amplitude)
- Creates living mechanical system feel
- Different precession periods per orbit (100s, 110s, 120s)

**Removed Vertical Bobbing**
- No artificial sine-wave Y-axis offset
- Icons remain rigidly attached to orbital planes
- Orbital planes rotate, icons follow mathematically

**Depth-Based Visual Effects**
- Opacity: 0.55 → 1.0 (based on Z-depth)
- Scale: 0.95 → 1.03 (subtle size variation)
- Brightness: 0.8 → 1.0 (depth-driven lighting)
- Saturation: 0.85 → 1.0 (subtle color shift)
- All transitions subtle and physically motivated

### 3. Special Icon Behaviors

**Email Icon**
- Platform: `email`
- Action: Copy-to-clipboard on click
- Uses `navigator.clipboard.writeText(personal.email)`
- Visual feedback: "Copied!" tooltip for 1.5s
- Reuses logic pattern from ContactCard component

**Resume Icon**
- Platform: `resume`
- Action: Opens `/resume.pdf` in new tab
- Attributes: `href`, `target="_blank"`, `download`
- Standard link behavior with download prompt

**Regular Social Icons**
- GitHub, LinkedIn, LeetCode, GeeksforGeeks
- Standard `target="_blank"` links
- Open profile URLs in new tabs

### 4. Updated Components

**SocialIcon.jsx**
- Added `email` icon (envelope path)
- Added `resume` icon (document with lines path)
- Updated `gfg` icon path for better visual consistency

**personal.jsx**
- Updated GFG URL from `'TODO_URL_GFG_PROFILE'` to actual profile URL:
  - `https://auth.geeksforgeeks.org/user/saipallav`

**Contact3DObject.jsx**
- Replaced `SOCIAL_ORBITS` with `ORBITAL_PLANES` and `ICON_ORBIT_CONFIG`
- Updated `OrbitingIcon` component:
  - Accepts `iconData` and `orbitConfig` instead of individual props
  - Computes angular velocity from period
  - Implements selective orbit slowdown via `hoveredOrbitRef`
  - Handles special icon types (email, resume)
  - Renders appropriate link/button elements per icon type
- Updated `Scene` component:
  - Maps icons to orbital planes dynamically
  - Passes `hoveredOrbitRef` for selective slowdown
- Updated main component:
  - Builds `iconsToRender` array with all 6 icons
  - Includes special icon metadata (`isSpecial`, `specialType`)
  - Updated accessibility fallback for special icons

### 5. Key Technical Improvements

**Framerate-Independent Motion**
- Uses delta time for all animations
- Exponential decay lerp: `lerpFI(current, target, factor, delta)`
- Accumulator wrapping to prevent precision loss

**Performance Optimizations**
- Dirty-check style updates (STYLE_THRESHOLD = 0.002)
- Imperative DOM updates bypass React re-renders
- Cached bounding rects updated only on resize/scroll
- Theme color updates via MutationObserver

**Accessibility**
- Screen-reader nav with descriptive text
- Special handling for email button and resume link
- Focus-visible ring indicators on all interactive elements
- Proper ARIA labels for all actions

### 6. Visual Goals Achieved

✅ Resembles premium scientific visualization (armillary sphere, gyroscope)  
✅ Mathematically intentional movement  
✅ Natural 3D spatial distribution (non-symmetrical inclinations)  
✅ Icons rigidly attached to orbital planes (no fake offsets)  
✅ Hierarchical depth through radius and period variation  
✅ Barely noticeable precession creates living system feel  
✅ Subtle depth effects without exaggeration  
✅ Selective slowdown maintains animation fluidity  
✅ Pure orbital mechanics, no synthetic decorative motion  

## Files Modified

1. `src/components/sections/contact/Contact3DObject.jsx` - Core orbital system implementation
2. `src/data/personal.jsx` - Added GFG URL
3. `src/components/ui/SocialIcon.jsx` - Added email and resume icons

## Testing Recommendations

1. **Orbit verification**: Confirm all 6 icons visible and rotating smoothly
2. **Email copy**: Click email icon, verify clipboard contains email address
3. **Resume download**: Click resume icon, verify PDF opens/downloads
4. **Hover behavior**: Hover each orbit, verify only that orbit slows
5. **Phase locking**: Verify icons on same orbit maintain 180° separation
6. **Precession**: Watch for ~2 minutes, confirm subtle axis rotation
7. **Depth effects**: Watch icons as they orbit, verify opacity/scale/brightness changes
8. **Theme reactivity**: Switch themes, verify all icons/glow update colors
9. **Reduced motion**: Enable `prefers-reduced-motion`, verify system hides correctly
10. **Mobile**: Verify entire orbital system hidden on mobile breakpoints

## Performance Notes

- Orbital calculations use pure math (no heavy Three.js operations)
- Phase locking prevents angular drift (no accumulated errors)
- Precession amplitude kept minimal (2-3%) for performance
- All effects use GPU-accelerated properties (transform, opacity)
- No React re-renders during continuous animation
