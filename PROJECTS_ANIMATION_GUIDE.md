# Projects Section Animation Guide

Quick reference for understanding and modifying the futuristic branching timeline animations.

---

## 🎬 Animation Flow

```
User Scrolls → Vertical Line Grows → Node Pulses → Branch Extends → Card Reveals → Energy Stream → Background Layers
     ↓              ↓                    ↓              ↓               ↓              ↓                    ↓
  Trigger      0-95% scroll         +0.2s delay     +0.5s delay    +0.9s delay   Continuous         Continuous
```

---

## 🎯 Key Animation Components

### 1. Vertical Timeline Line

**Location:** Main SVG in Projects component

**Trigger:** Scroll progress

**Code:**
```jsx
const { scrollYProgress } = useScroll({
  target: sectionRef,
  offset: ["start center", "end center"]
})

const verticalLineProgress = useTransform(scrollYProgress, [0, 0.95], [0, 1])
```

**Customization:**
- Change `[0, 0.95]` to adjust animation range
- Modify gradient colors in SVG `linearGradient`
- Adjust `strokeWidth` for line thickness

---

### 2. Pulse Nodes

**Location:** ProjectCard component

**Trigger:** `isInView` (when card enters viewport)

**Code:**
```jsx
<motion.div
  animate={{
    scale: [1, 1.5, 1],
    opacity: [0.5, 0, 0.5]
  }}
  transition={{
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }}
/>
```

**Customization:**
- Change `scale` values for pulse size
- Adjust `duration` for pulse speed
- Modify `opacity` for fade effect

---

### 3. Branch Connector Lines

**Location:** ProjectCard component (SVG line)

**Trigger:** `isInView` with delay

**Code:**
```jsx
<motion.line
  initial={{ pathLength: 0, opacity: 0 }}
  animate={isInView ? { pathLength: 1, opacity: 0.6 } : {}}
  transition={{ duration: 0.6, delay: branchDelay, ease: "easeOut" }}
/>
```

**Customization:**
- Change `duration` for extension speed
- Adjust `delay` for timing
- Modify `opacity` for line visibility

---

### 4. Project Cards

**Location:** ProjectCard component

**Trigger:** `isInView` with delay

**Code:**
```jsx
<motion.div
  initial={{ opacity: 0, y: 50, scale: 0.9 }}
  animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
  transition={{ duration: 0.6, delay: cardDelay, ease: "easeOut" }}
/>
```

**Customization:**
- Change `y` value for slide distance
- Adjust `scale` for zoom effect
- Modify `duration` for reveal speed

---

### 5. Energy Stream Connectors

**Location:** TimelineItem component (SVG between projects)

**Trigger:** Always animates (no scroll dependency)

**Code:**
```jsx
<motion.path
  d="M 0 10 Q 50 ${10 + (index % 2 === 0 ? -3 : 3)} 100 10"
  stroke={`url(#energyGradient-${index})`}
  strokeWidth="2"
  initial={{ pathLength: 0, opacity: 0 }}
  animate={{ pathLength: 1, opacity: 0.6 }}
  transition={{ duration: 1, ease: "easeOut" }}
/>
```

**Customization:**
- Change `strokeWidth` for line thickness
- Adjust curve amount in `Q` path command
- Modify `opacity` for visibility

---

### 6. Multi-Layer Background System

**Location:** Projects section background

**Layer 1: Atmospheric Fog**
```jsx
<motion.div
  animate={{
    x: [0, 150, 0],
    y: [0, -80, 0],
    opacity: [0.2, 0.35, 0.2],
  }}
  transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
  style={{
    background: "radial-gradient(ellipse at center, rgba(0, 255, 255, 0.4) 0%, transparent 70%)",
    filter: "blur(150px)",
  }}
/>
```

**Layer 2: Particle Energy System**
```jsx
{[...Array(20)].map((_, i) => (
  <motion.div
    key={i}
    animate={{
      y: [0, -200 - Math.random() * 100, 0],
      x: [0, (i % 2 === 0 ? 30 : -30) + Math.random() * 20, 0],
      opacity: [0, 0.5 + Math.random() * 0.3, 0],
    }}
    transition={{
      duration: 12 + i * 1.5,
      repeat: Infinity,
      ease: "easeInOut",
      delay: i * 0.8,
    }}
  />
))}
```

**Layer 3: Dynamic Grid Distortion**
```jsx
<motion.div
  animate={{
    backgroundPosition: ["0px 0px", "40px 40px", "0px 0px"],
  }}
  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
  style={{
    backgroundImage: `
      linear-gradient(rgba(37, 99, 235, 0.4) 1px, transparent 1px),
      linear-gradient(90deg, rgba(37, 99, 235, 0.4) 1px, transparent 1px)
    `,
    backgroundSize: "100px 100px",
  }}
/>
```

**Customization:**
- Adjust `opacity` values for visibility
- Change `duration` for animation speed
- Modify `blur` for softness
- Change particle count in `Array(20)`

---

## ⏱️ Timing Configuration

### Sequential Delays

```jsx
const nodeDelay = 0.2           // Node appears after vertical line
const branchDelay = 0.5         // Branch extends after node (nodeDelay + 0.3)
const cardDelay = 0.9           // Card reveals after branch (branchDelay + 0.4)
```

### Recommended Timing Patterns

**Fast (Snappy):**
```jsx
const nodeDelay = 0.1
const branchDelay = 0.3
const cardDelay = 0.5
```

**Medium (Default):**
```jsx
const nodeDelay = 0.2
const branchDelay = 0.5
const cardDelay = 0.9
```

**Slow (Cinematic):**
```jsx
const nodeDelay = 0.4
const branchDelay = 0.8
const cardDelay = 1.4
```

---

## 🎨 Visual Effects

### Hover Glow Effect

**Location:** ProjectCard wrapper

**Code:**
```jsx
<div className="absolute -inset-1 bg-gradient-to-r from-accent/50 to-primary/50 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
```

**Customization:**
- Change `from-accent/50` and `to-primary/50` for colors
- Adjust `blur-xl` for glow intensity
- Modify `duration-500` for transition speed

### Ambient Background Orbs

**Location:** Projects section background

**Code:**
```jsx
<motion.div
  animate={{ 
    scale: [1, 1.2, 1],
    opacity: [0.03, 0.08, 0.03],
    x: [0, 100, 0],
    y: [0, -50, 0]
  }}
  transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
/>
```

**Customization:**
- Change `scale` for size variation
- Adjust `opacity` for visibility
- Modify `x` and `y` for movement range
- Change `duration` for animation speed

---

## 📱 Responsive Behavior

### Desktop Layout (≥768px)

```jsx
isLeft ? 'md:pr-[55%]' : 'md:pl-[55%]'
```

- Cards alternate left/right
- 55% spacing from center
- Vertical line in center

### Mobile Layout (<768px)

```jsx
'pl-12'
```

- Single column layout
- All cards aligned right
- Vertical line on left

### Customizing Breakpoints

Change `md:` prefix to adjust breakpoint:
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px

---

## 🔧 Common Modifications

### Change Animation Speed

**Make everything faster:**
```jsx
// Reduce all duration values by 50%
transition={{ duration: 0.3, delay: cardDelay }}
```

**Make everything slower:**
```jsx
// Increase all duration values by 50%
transition={{ duration: 0.9, delay: cardDelay }}
```

### Disable Animations

**For testing or accessibility:**
```jsx
// Add to motion components
transition={{ duration: 0 }}
```

Or use Framer Motion's `MotionConfig`:
```jsx
<MotionConfig reducedMotion="always">
  {/* Components */}
</MotionConfig>
```

### Change Card Spacing

```jsx
<div className="relative space-y-32 md:space-y-48">
  {/* Adjust space-y-* values */}
</div>
```

- `space-y-16` - Tight spacing
- `space-y-32` - Medium spacing (default mobile)
- `space-y-48` - Wide spacing (default desktop)
- `space-y-64` - Extra wide spacing

### Adjust Vertical Line Height

```jsx
style={{ height: `${projects.length * 600}px` }}
```

- Increase `600` for more spacing between projects
- Decrease for tighter layout

---

## 🎯 Performance Tips

### GPU Acceleration

Always use these properties for smooth animations:
- `transform` (translate, scale, rotate)
- `opacity`

Avoid animating:
- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`

### Optimize Re-renders

```jsx
const isInView = useInView(cardRef, { 
  once: true,        // Animation plays only once
  margin: "-100px"   // Trigger before fully visible
})
```

### Reduce Motion Preference

```jsx
// Respect user's motion preferences
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const duration = prefersReducedMotion ? 0 : 0.6
```

---

## 🐛 Troubleshooting

### Animations Not Playing

1. Check `isInView` is working:
```jsx
console.log('isInView:', isInView)
```

2. Verify Framer Motion imports:
```jsx
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
```

3. Ensure `ref` is attached:
```jsx
<div ref={cardRef}>
```

### Janky Animations

1. Use GPU-accelerated properties only
2. Reduce blur effects
3. Simplify SVG paths
4. Add `will-change` CSS property:
```jsx
className="will-change-transform"
```

### Layout Shifts

1. Reserve space for animated elements
2. Use `transform` instead of `margin`/`padding`
3. Set explicit dimensions on images

---

## 📚 Framer Motion Cheat Sheet

### Common Animation Props

```jsx
<motion.div
  initial={{ opacity: 0 }}           // Starting state
  animate={{ opacity: 1 }}           // End state
  exit={{ opacity: 0 }}              // Exit state
  transition={{ duration: 0.5 }}     // Timing
  whileHover={{ scale: 1.05 }}       // Hover state
  whileTap={{ scale: 0.95 }}         // Click state
/>
```

### Scroll Animations

```jsx
const { scrollYProgress } = useScroll({
  target: ref,                        // Element to track
  offset: ["start end", "end start"] // When to start/end
})

const opacity = useTransform(
  scrollYProgress,                    // Input
  [0, 0.5, 1],                       // Input range
  [0, 1, 0]                          // Output range
)
```

### Viewport Animations

```jsx
<motion.div
  initial={{ opacity: 0 }}
  whileInView={{ opacity: 1 }}
  viewport={{ 
    once: true,      // Animate only once
    margin: "-100px" // Trigger offset
  }}
/>
```

---

## 🎨 Color Customization

### Theme Colors

Colors are defined in `src/styles/themes.css`:

```css
--color-accent: /* Primary accent color */
--color-primary: /* Secondary accent color */
--color-text: /* Main text color */
--color-muted: /* Muted text color */
--color-bg: /* Background color */
--color-card: /* Card background */
--color-border: /* Border color */
```

### Using Theme Colors

```jsx
className="text-accent bg-accent/10 border-accent/20"
```

- `/10` = 10% opacity
- `/20` = 20% opacity
- `/50` = 50% opacity

---

## 📝 Quick Checklist

Before deploying animation changes:

- [ ] Test on mobile devices
- [ ] Test on slow connections
- [ ] Verify animations play smoothly
- [ ] Check accessibility (keyboard navigation)
- [ ] Test with `prefers-reduced-motion`
- [ ] Verify no layout shifts
- [ ] Check performance (60fps)
- [ ] Test in different browsers

---

**Last Updated:** After futuristic timeline implementation

**Status:** Production-ready ✅
