import { useRef, useMemo, useEffect, useState, useCallback, memo } from 'react'
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber'
import { Html, shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { motion, useReducedMotion } from 'framer-motion'
import { personal } from '@/data/personal'
import SocialIcon from '@/components/ui/SocialIcon'
import { useThemeContext } from '@/context/ThemeContext'

// --- Theme Palettes for all portfolio themes ---
const THEME_PALETTES = {
  'obsidian': {
    primary: '#2563eb',
    secondary: '#6366f1',
    hover: '#3b82f6',
  },
  'midnight-violet': {
    primary: '#a78bfa',
    secondary: '#9f7aea',
    hover: '#c4b5fd',
  },
  'emerald-noir': {
    primary: '#10b981',
    secondary: '#14b8a6',
    hover: '#34d399',
  },
  'graphite': {
    primary: '#9ca3af',
    secondary: '#6b7280',
    hover: '#d1d5db',
  },
  'nordic-frost': {
    primary: '#3b82f6',
    secondary: '#6366f1',
    hover: '#60a5fa',
  },
  'electric-blue': {
    primary: '#00e5ff',
    secondary: '#0077ff',
    hover: '#38bdf8',
  },
  'professional': {
    primary: '#2563eb',
    secondary: '#6366f1',
    hover: '#3b82f6',
  },
}

const getInitialThemeKey = () => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('portfolio-theme')
      if (saved && THEME_PALETTES[saved]) return saved
      const docTheme = document.documentElement.getAttribute('data-theme')
      if (docTheme && THEME_PALETTES[docTheme]) return docTheme
    } catch {
      // ignore
    }
  }
  return 'obsidian'
}

const initialPalette = THEME_PALETTES[getInitialThemeKey()] || THEME_PALETTES['obsidian']

// --- Universal Perceptual Luminance Normalization Helper ---
// Computes ITU-R BT.709 relative luminance and applies a continuous photometric
// power curve to achieve consistent perceived brightness across all hues without hardcoding.
const computeThemeLuminanceComp = (hex) => {
  try {
    const col = new THREE.Color(hex)
    const lum = 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b
    return Math.pow(0.38 / Math.max(0.15, Math.min(0.85, lum)), 0.35)
  } catch {
    return 1.0
  }
}

// --- Global Theme Ref for Imperative Material Updates (No React Re-renders) ---
const globalTheme = {
  primary: initialPalette.primary,
  secondary: initialPalette.secondary,
  hover: initialPalette.hover,
  lumComp: computeThemeLuminanceComp(initialPalette.primary),
  version: 0,
}

function applyThemeColors(themeKey) {
  const palette = THEME_PALETTES[themeKey]
  if (palette) {
    if (
      globalTheme.primary !== palette.primary ||
      globalTheme.secondary !== palette.secondary ||
      globalTheme.hover !== palette.hover
    ) {
      globalTheme.primary = palette.primary
      globalTheme.secondary = palette.secondary
      globalTheme.hover = palette.hover
      globalTheme.lumComp = computeThemeLuminanceComp(palette.primary)
      globalTheme.version += 1
    }
    return
  }

  // Fallback to DOM styles for unknown custom themes
  if (typeof document !== 'undefined') {
    try {
      const styles = getComputedStyle(document.documentElement)
      const accent = styles.getPropertyValue('--accent').trim()
      const secondary = styles.getPropertyValue('--accent-secondary').trim() || styles.getPropertyValue('--accent-hover').trim() || accent
      const hover = styles.getPropertyValue('--accent-hover').trim() || accent
      if (accent && (accent !== globalTheme.primary || secondary !== globalTheme.secondary || hover !== globalTheme.hover)) {
        globalTheme.primary = accent
        globalTheme.secondary = secondary
        globalTheme.hover = hover
        globalTheme.lumComp = computeThemeLuminanceComp(accent)
        globalTheme.version += 1
      }
    } catch {
      // ignore
    }
  }
}

// Scene constants
const SCENE_CONFIG = {
  camera: { position: [0, 0, 8], fov: 45 },
  globe: {
    radius: 2.0,
    glassRadius: 1.96,
    haloRadius: 2.08,
    innerRadius: 1.72,
    wireframeOpacity: 0.12,
    pointsOpacity: 0.50,
    glowIntensity: 0.75,
    glowPower: 4.8,
  },
  orbit: {
    radius: 2.45,
    tiltX: 0,
    tiltA: Math.PI / 4,
    tiltB: -Math.PI / 4,
  },
  depth: { cameraZ: 8 },
  proximity: { maxDistance: 220, minDistance: 40, minFactor: 0.05 },
  particles: { count: 30, minRadius: 2.4, spread: 2.0 },
}

// Three-tier hierarchical orbital system (TASK 15 configuration)


// Named constants for framerate-independent easing rates
const LERP = {
  orbitSpeed: 4.0,
  proximitySpeed: 3.5,
  hoverGlowIn: 8.0,
  hoverGlowOut: 4.8,
  bobOffset: 5.0,
}

// Simple pure seed-based LCG PRNG helper to keep render-phase calculations pure
const createPRNG = (seed) => {
  let value = seed
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

// Issue #5: Mathematically correct framerate-independent exponential decay
const lerpFI = (current, target, factor, delta) =>
  current + (target - current) * (1.0 - Math.exp(-factor * delta))

// Fresnel Atmospheric Glow
const FresnelGlowMaterial = shaderMaterial(
  {
    color: new THREE.Color('#2563eb'),
    glowPower: SCENE_CONFIG.globe.glowPower,
    glowIntensity: SCENE_CONFIG.globe.glowIntensity,
  },
  `varying vec3 vNormal; varying vec3 vViewPosition;
   void main() { 
     vNormal = normalize(normalMatrix * normal); 
     vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); 
     vViewPosition = -mvPosition.xyz; 
     gl_Position = projectionMatrix * mvPosition; 
   }`,
  `uniform vec3 color; 
   uniform float glowPower; 
   uniform float glowIntensity; 
   varying vec3 vNormal; 
   varying vec3 vViewPosition;
   void main() { 
     vec3 normal = normalize(vNormal); 
     vec3 viewDir = normalize(vViewPosition); 
     float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), glowPower); 
     float intensity = fresnel * glowIntensity; 
     gl_FragColor = vec4(color, intensity); 
   }`
)
extend({ FresnelGlowMaterial })

// Premium Glass-Like Orbital Ring Shader Material
// Architecture: TorusGeometry(R=2.45, r=0.0346, 16 radial, 128 tubular)
// - Has full per-vertex 3D surface normals (radially outward from tube center)
// - Has UVs: uv.x = along torus ring, uv.y = around tube cross-section (0..1)
// - Is a true mesh — supports physically-grounded view-dependent shading
//
// Root causes of previous "transparent wire" appearance:
// 1. edgeFade=smoothstep(0,0.08,NdotV) erased the glass RIMS (NdotV≈0 at tube sides)
//    — the tube side-edges are where Fresnel rim highlights define the glass rod shape
// 2. Flat body shading (color*baseLum) with no cross-section gradient → uniform wire look
// 3. Back-facing tube fragments (NdotV_raw<0) contributed noise with depthTest=false
// 4. uv.y (tube cross-section angle) was unused — no cylindrical graduation possible
//
// Correct glass rod appearance:
// A) Tube rim highlights: Fresnel rim at tube sides (NdotV→0) brightens the glass edges
// B) Body transparency gradient: tube center (NdotV=1) is most transparent; rim is denser
// C) Specular stripe: NdotH sweeps continuously around the torus as a light stripe
// D) Back-face discard: fragments where normal faces away from camera are culled
// E) Cross-section curvature shading: body darkens toward tube sides, brightens at center
const RingGlowMaterial = shaderMaterial(
  {
    color: new THREE.Color(initialPalette.primary),
    opacity: 0.50,
    passMode: 0.0, // 0.0 = Background pass (renderOrder 0), 1.0 = Foreground pass (renderOrder 6)
  },
  `varying vec3 vNormal;
   varying vec3 vTangent;
   varying vec3 vViewPosition;
   varying vec3 vRelativeViewPos;
   varying float vWorldScale;
   varying vec2 vUv;
   
   void main() { 
     vNormal = normalize(normalMatrix * normal);
     // Tangent vector along the orbital ring circumference in local space:
     // For TorusGeometry in the XY plane, the ring curve tangent is normalize(-y, x, 0)
     vec3 localTangent = normalize(vec3(-position.y, position.x, 0.0));
     // Tangents transform via modelViewMatrix (direct transformation, not inverse transpose):
     vTangent = normalize(mat3(modelViewMatrix) * localTangent);
     vWorldScale = length(modelMatrix[0].xyz);
     vUv = uv;
     
     vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
     vViewPosition = -mvPosition.xyz;
     
     // Globe center in camera view space
     vec4 globeCenterView = viewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
     
     // Relative camera-space position (fragment relative to globe center along camera ray)
     vRelativeViewPos = vec3(
       mvPosition.x - globeCenterView.x,
       mvPosition.y - globeCenterView.y,
       mvPosition.z - globeCenterView.z
     );
     
     gl_Position = projectionMatrix * mvPosition; 
   }`,
  `uniform vec3 color; 
   uniform float opacity; 
   uniform float passMode;
   
   varying vec3 vNormal; 
   varying vec3 vTangent;
   varying vec3 vViewPosition; 
   varying vec3 vRelativeViewPos;
   varying float vWorldScale;
   varying vec2 vUv;

   #define PI 3.14159265359
   
   void main() { 
     vec3 normal = normalize(vNormal); 
     vec3 rawTangent = normalize(vTangent);
     // Gram-Schmidt orthogonalization guarantees tangent is strictly perpendicular to normal
     vec3 tangent = normalize(rawTangent - dot(rawTangent, normal) * normal);
     vec3 viewDir = normalize(vViewPosition);

     // --- Back-face tube cull with smooth antialiased edge feather ---
     // TorusGeometry has 3D outward normals. With depthTest=false, back-facing tube fragments
     // are softly culled to avoid double-layer rendering while preventing jagged edge noise.
     float NdotV_raw = dot(normal, viewDir);
     if (NdotV_raw < -0.06) discard;
     float edgeFeather = smoothstep(-0.06, 0.04, NdotV_raw);
     float NdotV = max(NdotV_raw, 0.0);
     
     float s = max(vWorldScale, 0.001);
     float globeRadius = 2.0 * s;
     float maxZ = 2.45 * s;
     
     // Normalized camera-space depth along viewing line of sight:
     // +1.0 = front apex (closest to camera, passing in front of globe)
     //  0.0 = center plane / equatorial limbs
     // -1.0 = back apex (farthest from camera, passing behind globe)
     float zRel = vRelativeViewPos.z;
     float normZ = clamp(zRel / maxZ, -1.0, 1.0);
     
     // Continuous depth factor: 0.0 at maximum back, 0.5 at equator, 1.0 at maximum front
     float depthFactor = clamp((normZ + 1.0) * 0.5, 0.0, 1.0);
     
     // 2D distance from camera ray through globe center (in camera projection plane)
     float dist2D = length(vRelativeViewPos.xy);
     float normDist = dist2D / globeRadius;
     
     // Spherical absorption factor: accounts for light passing through translucent globe body
     // Engages smoothly when segment is behind the globe (zRel < 0) and inside its projected silhouette (normDist < 1.0)
     float behindFactor = smoothstep(0.0, -0.30 * maxZ, zRel);
     float insideSilhouette = 1.0 - smoothstep(0.65, 1.0, normDist);
     float globeOcclusion = behindFactor * insideSilhouette;

     // =========================================================================
     // CALIBRATED DEPTH & OPACITY BASE (LOCKED — DO NOT MODIFY)
     // =========================================================================
     // Base Luminance:
     // Foreground apex: 1.12
     // Background outside silhouette: 0.65
     // Background behind globe: 0.52
     float baseLum = mix(0.65, 1.12, smoothstep(0.10, 0.90, depthFactor));
     baseLum = mix(baseLum, 0.52, globeOcclusion * 0.55);

     // Base Opacity:
     // Foreground: 0.78  |  Background outside: 0.44  |  Background behind globe: 0.36
     float baseOpacity = mix(0.44, 0.78, smoothstep(0.10, 0.90, depthFactor));
     baseOpacity = mix(baseOpacity, 0.36, globeOcclusion * 0.45);

     // =========================================================================
     // 1. SILKY-SMOOTH CURVATURE-FOLLOWING SPECULAR REFLECTION
     // =========================================================================
     // Primary key directional light vector at [5, 4, 4] in view space:
     vec3 keyLight = normalize(vec3(0.662, 0.530, 0.530));
     vec3 halfVec1 = normalize(keyLight + viewDir);

     // Cylindrical reflection alignment along orbital ring curve:
     // The specular highlight tracks the curve where H_dot_T approaches 0.
     float H1_dot_T = dot(tangent, halfVec1);
     vec3 H1_perp = halfVec1 - H1_dot_T * tangent;
     vec3 H1_perp_norm = H1_perp / max(length(H1_perp), 0.001);

     // Cross-sectional crest alignment:
     // Calibrated for a polished, silky-smooth optical glass surface without harsh banding:
     float crossSpec1 = max(dot(normal, H1_perp_norm), 0.0);
     float specCore1  = pow(crossSpec1, 14.0); // smooth, polished optical specular core
     float specSheen1 = pow(crossSpec1, 4.0);  // gentle dielectric gloss
     float crossProfile1 = specCore1 * 0.65 + specSheen1 * 0.35;

     // Continuous smooth ribbon envelope along the ring path:
     float longArc1 = exp(-H1_dot_T * H1_dot_T * 3.0);

     // Directional gating: silky smooth terminator falloff
     float lightGate1 = smoothstep(-0.08, 0.30, dot(normal, keyLight));

     float primarySpecular = crossProfile1 * longArc1 * lightGate1;

     // Secondary front-left celestial fill reflection (soft optical glint):
     vec3 secLight = normalize(vec3(-0.696, -0.174, -0.696));
     vec3 halfVec2 = normalize(secLight + viewDir);
     float H2_dot_T = dot(tangent, halfVec2);
     vec3 H2_perp = halfVec2 - H2_dot_T * tangent;
     vec3 H2_perp_norm = H2_perp / max(length(H2_perp), 0.001);
     float crossSpec2 = max(dot(normal, H2_perp_norm), 0.0);
     float specCore2  = pow(crossSpec2, 10.0);
     float longArc2   = exp(-H2_dot_T * H2_dot_T * 3.6);
     float lightGate2 = smoothstep(-0.08, 0.25, dot(normal, secLight));
     float secSpecular = specCore2 * longArc2 * lightGate2 * 0.30;

     // Back rim light reflection (matching point light at [-4, -1, -4] in view space):
     vec3 reflectRay = reflect(-viewDir, normal);
     float rimDot = max(dot(reflectRay, secLight), 0.0);
     float backRimGlint = pow(rimDot, 5.0) * 0.18;

     // =========================================================================
     // UNIVERSAL THEME-AWARE PERCEPTUAL NORMALIZATION
     // =========================================================================
     // Standard Rec. 709 / CIE 1931 relative luminance of the active theme color:
     float colorLum = dot(color, vec3(0.2126, 0.7152, 0.0722));
     float lumComp = pow(0.38 / clamp(colorLum, 0.15, 0.85), 0.35);

     // Chromatic saturation of active theme color:
     float maxC = max(color.r, max(color.g, color.b));
     float minC = min(color.r, min(color.g, color.b));
     float colorSat = maxC > 0.001 ? clamp((maxC - minC) / maxC, 0.0, 1.0) : 0.0;

     // Theme-adaptive optical glass specular & reflection color:
     // Dielectric glass exhibits a brilliant neutral white specular core:
     vec3 specWhiteCore = vec3(0.98, 0.99, 1.00);
     // Subtle theme-adaptive reflection sheen with chromatic purity scaling:
     float sheenAccentWeight = mix(0.22, 0.45, colorSat);
     vec3 themeSheen = mix(specWhiteCore, color, sheenAccentWeight);
     vec3 keySpecColor = mix(themeSheen, specWhiteCore, 0.70);
     vec3 fillSpecColor = themeSheen;

     // Depth modulation: foreground shines crisply; background is naturally subdued:
     float specDepthMod = mix(0.35, 1.0, depthFactor) * (1.0 - globeOcclusion * 0.42);
     vec3 totalSpecular = (keySpecColor * (primarySpecular * (1.35 * lumComp)) + fillSpecColor * (secSpecular * (1.05 * lumComp) + backRimGlint * lumComp)) * specDepthMod;

     // =========================================================================
     // 2. VIEW-DEPENDENT REFLECTIVE EDGE DEFINITION
     // =========================================================================
     // Smooth dielectric Fresnel edge definition calibrated to glass cylinder optics:
     float edgeFresnel = pow(1.0 - NdotV, 2.0);

     // Directional & view-dependent modulation:
     float rimSky = smoothstep(-0.2, 0.8, reflectRay.y);
     float rimGlanceKey = max(dot(reflectRay, keyLight), 0.0);
     float rimGlint = pow(rimGlanceKey, 4.0) * 0.30;
     float rimDirectional = 0.55 + 0.35 * rimSky + rimGlint;

     // Delicate theme-adaptive reflective edge highlight with saturation adaptation:
     float edgeAccentWeight = mix(0.25, 0.50, colorSat);
     vec3 edgeTint = mix(specWhiteCore, color, edgeAccentWeight);
     float edgeDepthMod = mix(0.50, 1.0, depthFactor) * (1.0 - globeOcclusion * 0.35);
     // Calibrated orbital ring glow intensity (+6.7% subtle increase within 5-8% target range):
     vec3 edgeColor = edgeTint * (edgeFresnel * rimDirectional * (1.12 * lumComp) * edgeDepthMod);

     // =========================================================================
     // 3. NATURAL GLASS-LIKE SURFACE SHADING
     // =========================================================================
     // Translucent optical glass body with smooth subtle tint and luminance compensation:
     vec3 glassBodyTint = mix(color, specWhiteCore, mix(0.25, 0.40, colorSat));
     float bodyTransmission = 0.50 + 0.50 * NdotV;
     vec3 glassBody = glassBodyTint * (baseLum * (0.32 * lumComp) * bodyTransmission);

     // Subtle internal light transmission / caustic:
     float internalCaustic = pow(NdotV, 2.0) * max(dot(normal, keyLight), 0.0) * (0.08 * depthFactor * lumComp);
     glassBody += glassBodyTint * internalCaustic;

     // =========================================================================
     // 4. GLASS TRANSMISSION ALPHA & VISUAL HIERARCHY
     // =========================================================================
     // Glass transmission alpha:
     float centerAlpha = baseOpacity * 0.30;
     float rimAlpha    = baseOpacity * 0.82;
     float specAlphaBoost = (specCore1 * longArc1 * 0.25 + specSheen1 * longArc1 * 0.12 + secSpecular * 0.10) * specDepthMod;
     float glassAlpha = clamp(mix(centerAlpha, rimAlpha, edgeFresnel) + specAlphaBoost, 0.0, 1.0);

     // =========================================================================
     // 5. CONTINUOUS EQUATORIAL TWO-PASS DEPTH PARTITION (LOCKED — DO NOT MODIFY)
     // =========================================================================
     // passMode == 0.0: Background pass (renderOrder 0, behind globe)
     // passMode == 1.0: Foreground pass (renderOrder 6, in front of globe)
     float transitionBand = 0.18 * maxZ;
     float frontWeight = smoothstep(-transitionBand, transitionBand, zRel);
     
     float passWeight = 1.0;
     if (passMode < 0.5) {
       passWeight = 1.0 - frontWeight;
       if (passWeight <= 0.001) {
         discard;
       }
     } else {
       passWeight = frontWeight;
       if (passWeight <= 0.001) {
         discard;
       }
     }

     // =========================================================================
     // 6. FINAL COMPOSITE (OPTICAL GLASS REFLECTION REFINEMENT)
     // =========================================================================
     vec3 surfaceReflections = edgeColor + totalSpecular;
     vec3 finalColor = glassBody + surfaceReflections;
     float finalOpacity = glassAlpha * passWeight * edgeFeather;
     
     gl_FragColor = vec4(finalColor, finalOpacity); 
   }`
)
extend({ RingGlowMaterial })

// Shared static geometries
const staticGeomWire = new THREE.IcosahedronGeometry(SCENE_CONFIG.globe.radius, 2)
const staticGeomInnerWire = new THREE.IcosahedronGeometry(SCENE_CONFIG.globe.radius * 1.025, 1)
const staticGeomPoints = new THREE.IcosahedronGeometry(SCENE_CONFIG.globe.radius, 4)
const staticGeomGlass = new THREE.SphereGeometry(SCENE_CONFIG.globe.glassRadius, 32, 32)
const staticGeomHalo = new THREE.SphereGeometry(SCENE_CONFIG.globe.haloRadius, 32, 32)

// Unified orbital ring geometry shared by all three rings with silky-smooth tessellation
const sharedRingGeometry = new THREE.TorusGeometry(2.45, 0.0346, 32, 256)

// Shared static materials - allocated once to completely eliminate GC churn
const staticMatGlassCore = new THREE.MeshStandardMaterial({
  color: new THREE.Color(initialPalette.primary).multiplyScalar(0.10).add(new THREE.Color('#05060a')),
  roughness: 0.25,
  metalness: 0.60,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
})

const staticMatInnerWire = new THREE.MeshBasicMaterial({
  color: new THREE.Color(initialPalette.secondary).multiplyScalar(0.70).lerp(new THREE.Color(initialPalette.primary), 0.30),
  wireframe: true,
  transparent: true,
  opacity: SCENE_CONFIG.globe.wireframeOpacity * 0.7,
  depthWrite: false,
  blending: THREE.NormalBlending,
})

const staticMatOuterWire = new THREE.MeshBasicMaterial({
  color: new THREE.Color(initialPalette.primary),
  wireframe: true,
  transparent: true,
  opacity: SCENE_CONFIG.globe.wireframeOpacity,
  depthWrite: false,
  blending: THREE.NormalBlending,
})

const staticMatOuterPoints = new THREE.PointsMaterial({
  color: new THREE.Color(initialPalette.primary).lerp(new THREE.Color('#ffffff'), 0.22),
  size: 0.026,
  transparent: true,
  opacity: SCENE_CONFIG.globe.pointsOpacity,
  sizeAttenuation: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})

const staticMatAtmosphericHalo = new FresnelGlowMaterial()
staticMatAtmosphericHalo.transparent = true
staticMatAtmosphericHalo.depthWrite = false
staticMatAtmosphericHalo.blending = THREE.AdditiveBlending
staticMatAtmosphericHalo.uniforms.color.value.copy(new THREE.Color(initialPalette.primary))

// Calibrated orbital ring materials shared by all three rings:
// 1. Background material: renders behind globe at renderOrder = 0
const sharedRingMaterialBg = (() => {
  const mat = new RingGlowMaterial()
  mat.transparent = true
  mat.blending = THREE.NormalBlending
  mat.depthWrite = false
  mat.depthTest = false
  mat.uniforms.passMode.value = 0.0
  mat.color = new THREE.Color(initialPalette.primary)
  mat.opacity = 0.50
  return mat
})()

// 2. Foreground material: renders in front of globe at renderOrder = 6
const sharedRingMaterialFg = (() => {
  const mat = new RingGlowMaterial()
  mat.transparent = true
  mat.blending = THREE.NormalBlending
  mat.depthWrite = false
  mat.depthTest = false
  mat.uniforms.passMode.value = 1.0
  mat.color = new THREE.Color(initialPalette.primary)
  mat.opacity = 0.50
  return mat
})()

const staticMatMicroParticles = new THREE.PointsMaterial({
  color: new THREE.Color(initialPalette.secondary).lerp(new THREE.Color('#ffffff'), 0.15),
  size: 0.020,
  transparent: true,
  opacity: 0.18,
  sizeAttenuation: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})

// ─────────────────────────────────────────────────────────────────────────────
// Issue #7: Camera drift respects distanceFactor.
// Issue #18: lookAt cached and only calculated on subpixel movement.
// Issue #4: Wrap timer accumulator to prevent precision loss.
function CameraRig({ distanceFactor }) {
  const shouldReduceMotion = useReducedMotion()
  const easedFactor = useRef(1.0)
  const timeAccum = useRef(0)
  const lastX = useRef(0)
  const lastY = useRef(0)

  useFrame((state, delta) => {
    if (shouldReduceMotion) return
    const safeDelta = Math.min(delta, 0.05)

    // Wrap time accumulator (Issue #4)
    timeAccum.current = (timeAccum.current + safeDelta) % 100000
    const t = timeAccum.current

    easedFactor.current = lerpFI(easedFactor.current, distanceFactor.current, LERP.proximitySpeed, safeDelta)
    const f = easedFactor.current

    const nextX = (Math.sin(t * 0.06) * 0.035 + Math.cos(t * 0.14) * 0.015) * f
    const nextY = (Math.cos(t * 0.04) * 0.035 + Math.sin(t * 0.11) * 0.015) * f

    state.camera.position.x = nextX
    state.camera.position.y = nextY

    // Issue #18: Clamp lookAt matrix calculations to subpixel offsets
    if (Math.abs(nextX - lastX.current) > 0.0001 || Math.abs(nextY - lastY.current) > 0.0001) {
      state.camera.lookAt(0, 0, 0)
      lastX.current = nextX
      lastY.current = nextY
    }
  })
  return null
}

function Lights({ theme }) {
  const lightRef = useRef()
  const ambientRef = useRef()
  const lastColorVersion = useRef(-1)

  useEffect(() => {
    lastColorVersion.current = -1
  }, [theme])

  useFrame(() => {
    if (lastColorVersion.current !== globalTheme.version) {
      if (lightRef.current) {
        lightRef.current.color.set(globalTheme.primary)
        lightRef.current.intensity = 2.2 * globalTheme.lumComp
      }
      if (ambientRef.current) {
        ambientRef.current.color.set('#ffffff').lerp(new THREE.Color(globalTheme.primary), 0.08)
        ambientRef.current.intensity = 0.25 * Math.min(1.15, Math.max(0.85, globalTheme.lumComp))
      }
      lastColorVersion.current = globalTheme.version
    }
  })
  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.25} />
      <hemisphereLight args={['#ffffff', '#090913', 0.30]} />
      {/* Specular directional light creating subtle highlight on upper-right */}
      <directionalLight position={[5, 4, 4]} intensity={1.2} color="#ffffff" />
      {/* Deep back rim light */}
      <pointLight ref={lightRef} position={[-4, -1, -4]} intensity={2.2 * globalTheme.lumComp} color={globalTheme.primary} distance={12} decay={2.2} />
    </>
  )
}

const staticParticlePositions = (() => {
  const random = createPRNG(42)
  const { count, minRadius, spread } = SCENE_CONFIG.particles
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const u = random(), v = random()
    const theta = u * 2.0 * Math.PI
    const phi = Math.acos(2.0 * v - 1.0)
    const r = minRadius + random() * spread
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    pos[i * 3 + 2] = r * Math.cos(phi)
  }
  return pos
})()

const staticGeomMicroParticles = (() => {
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(staticParticlePositions, 3))
  return geom
})()

const tempIconVec = new THREE.Vector3()

function MicroParticles({ distanceFactor, isTransmit = false }) {
  const pointsRef = useRef()
  const easedFactor = useRef(1.0)
  const transmitFactor = useRef(0)
  const shouldReduceMotion = useReducedMotion()

  useFrame((state, delta) => {
    if (!shouldReduceMotion && pointsRef.current) {
      const safeDelta = Math.min(delta, 0.05)
      easedFactor.current = lerpFI(easedFactor.current, distanceFactor.current, LERP.proximitySpeed, safeDelta)
      const targetTransmit = isTransmit ? 1.0 : 0.0
      transmitFactor.current = lerpFI(transmitFactor.current, targetTransmit, 4.0, safeDelta)
      const p = transmitFactor.current
      const f = easedFactor.current

      pointsRef.current.rotation.y += safeDelta * (0.012 * f + p * 0.8)
      pointsRef.current.rotation.x += safeDelta * (0.006 * f + p * 0.4)
      if (pointsRef.current.material) {
        pointsRef.current.material.opacity = 0.24 + p * 0.30
        pointsRef.current.material.size = 0.022 + p * 0.018
      }
    }
  })

  return (
    <points ref={pointsRef} geometry={staticGeomMicroParticles} material={staticMatMicroParticles} />
  )
}

function Globe({ distanceFactor, isTransmit = false }) {
  const globeGroupRef = useRef()
  const wireRef = useRef()
  const innerWireRef = useRef()
  const pointsRef = useRef()
  const easedFactor = useRef(1.0)
  const transmitFactor = useRef(0)
  const timeAccum = useRef(0)
  const shouldReduceMotion = useReducedMotion()

  useFrame((state, delta) => {
    if (shouldReduceMotion) return
    const safeDelta = Math.min(delta, 0.05)
    timeAccum.current = (timeAccum.current + safeDelta) % 100000
    const time = timeAccum.current

    easedFactor.current = lerpFI(easedFactor.current, distanceFactor.current, LERP.proximitySpeed, safeDelta)
    const targetTransmit = isTransmit ? 1.0 : 0.0
    transmitFactor.current = lerpFI(transmitFactor.current, targetTransmit, 4.5, safeDelta)
    const p = transmitFactor.current
    const f = easedFactor.current

    if (wireRef.current) wireRef.current.rotation.y += safeDelta * (0.08 * f + p * 2.8)
    if (innerWireRef.current) {
      innerWireRef.current.rotation.y -= safeDelta * (0.05 * f + p * 2.2)
      innerWireRef.current.rotation.x -= safeDelta * (0.015 * f + p * 1.0)
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y += safeDelta * (0.08 * f + p * 2.8)
      pointsRef.current.rotation.x += safeDelta * (0.02 * f + p * 0.8)
      pointsRef.current.material.size = (0.025 + p * 0.015 + Math.sin(time * 2.5) * 0.005) * (0.3 + 0.7 * f)
      pointsRef.current.material.opacity = SCENE_CONFIG.globe.pointsOpacity
    }
    if (globeGroupRef.current) {
      const s = 1.0 + p * 0.14
      globeGroupRef.current.scale.set(s, s, s)
    }
  })

  return (
    <group ref={globeGroupRef}>
      {/* 1. Translucent Cosmic Obsidian Glass Core - provides deep optical depth */}
      <mesh geometry={staticGeomGlass} material={staticMatGlassCore} name="glassCore" renderOrder={1} />

      {/* 2. Secondary Depth Grid Network */}
      <mesh ref={innerWireRef} geometry={staticGeomInnerWire} material={staticMatInnerWire} renderOrder={2} />

      {/* 3. Primary Outer Geodesic Wireframe Network */}
      <mesh ref={wireRef} geometry={staticGeomWire} material={staticMatOuterWire} renderOrder={3} />

      {/* 4. Delicate Constellation Nodes at Vertices */}
      <points ref={pointsRef} geometry={staticGeomPoints} material={staticMatOuterPoints} renderOrder={4} />

      {/* 5. Luminous Atmospheric Rim Glow (Halo) */}
      <mesh geometry={staticGeomHalo} material={staticMatAtmosphericHalo} renderOrder={5} />
    </group>
  )
}

// Toggle to temporarily enable/disable the orbiting social & contact icons on the rings
const ENABLE_ORBITING_ICONS = false

const STATIC_RING_ICONS = [
  [
    { key: 'github', platform: 'github', url: personal.socials.github },
    { key: 'linkedin', platform: 'linkedin', url: personal.socials.linkedin },
  ],
  [
    { key: 'leetcode', platform: 'leetcode', url: personal.socials.leetcode },
    { key: 'gfg', platform: 'gfg', url: personal.socials.gfg },
  ],
  [
    { key: 'email', platform: 'email', url: personal.email, isSpecial: true, specialType: 'email' },
    { key: 'resume', platform: 'resume', url: personal.resume, isSpecial: true, specialType: 'resume' },
  ],
]
const STATIC_ALL_ICONS = STATIC_RING_ICONS.flat()

const OrbitingIcon = memo(function OrbitingIcon({ iconData, reactionGlowRef, onHoverChange, hoveredCountRef }) {
  const iconGroupRef = useRef()
  const htmlRef = useRef()
  const glowRef = useRef()

  const hoverRef = useRef(false)
  const shouldReduceMotion = useReducedMotion()

  const hoverGlowFactor = useRef(0.0)
  const lastStyle = useRef({ opacity: -1, scaleVal: -1, glowOpacity: -1, brightnessVal: -1, saturateVal: -1 })
  const STYLE_THRESHOLD = 0.005
  const FILTER_THRESHOLD = 0.015
  const GLOW_THRESHOLD = 0.015

  const { platform, url, specialType } = iconData
  const [copied, setCopied] = useState(false)

  const handlePointerOver = useCallback(() => {
    hoverRef.current = true
    if (hoveredCountRef) hoveredCountRef.current += 1
    if (onHoverChange) onHoverChange(true)
  }, [hoveredCountRef, onHoverChange])

  const handlePointerOut = useCallback(() => {
    hoverRef.current = false
    if (hoveredCountRef) hoveredCountRef.current = Math.max(0, hoveredCountRef.current - 1)
    if (onHoverChange) onHoverChange(false)
  }, [hoveredCountRef, onHoverChange])

  const handleIconClick = useCallback((e) => {
    if (specialType === 'email') {
      e.preventDefault()
      e.stopPropagation()
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = url
        textArea.style.position = "fixed"
        textArea.style.opacity = "0"
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand("copy")
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch (err) {
          console.error("Fallback copy failed", err)
        }
        document.body.removeChild(textArea)
      }
    }
  }, [specialType, url])

  // Combined physics loop and theme shadow synchronization
  const lastColorVersion = useRef(-1)

  useFrame((state, delta) => {
    if (shouldReduceMotion) return
    const safeDelta = Math.min(delta, 0.05)
    const hovered = hoverRef.current

    const targetGlow = hovered ? 1.0 : 0.0
    const glowSpeed = hovered ? LERP.hoverGlowIn : LERP.hoverGlowOut
    hoverGlowFactor.current = lerpFI(hoverGlowFactor.current, targetGlow, glowSpeed, safeDelta)

    // Depth-based opacity, scale, and brightness
    if (iconGroupRef.current && htmlRef.current) {
      iconGroupRef.current.getWorldPosition(tempIconVec)
      tempIconVec.applyMatrix4(state.camera.matrixWorldInverse)

      const camZ = state.camera.position.z || SCENE_CONFIG.depth.cameraZ
      const zWorld = tempIconVec.z + camZ
      // Streamlined depth calculation: (zWorld + 2.94) / 5.88
      const depth = THREE.MathUtils.clamp((zWorld + 2.94) * 0.170068, 0, 1)

      const baseScale = 0.95 + depth * 0.08
      const scaleVal = baseScale * (1.0 + hoverGlowFactor.current * 0.03)

      // 2D distance from globe center in camera plane for realistic planetary occlusion
      const dist2D = Math.sqrt(tempIconVec.x * tempIconVec.x + tempIconVec.y * tempIconVec.y)
      const isBehindGlobe = zWorld < -0.3 && dist2D < 2.05

      let opacityVal = 0.55 + depth * 0.45
      if (isBehindGlobe) {
        const occlusionFade = THREE.MathUtils.clamp((dist2D - 1.35) / 0.70, 0.0, 1.0)
        opacityVal = Math.min(opacityVal, 0.08 + occlusionFade * 0.35)
      }

      const brightnessVal = 0.8 + depth * 0.2
      const saturateVal = 0.85 + depth * 0.15
      const reactionGlow = reactionGlowRef ? reactionGlowRef.current : 0.0
      const glowOpacity = Math.max(hoverGlowFactor.current, reactionGlow)

      // Dirty-check style updates to eliminate unnecessary DOM writes
      const prev = lastStyle.current
      if (Math.abs(opacityVal - prev.opacity) > STYLE_THRESHOLD) {
        htmlRef.current.style.opacity = opacityVal.toFixed(3)
        prev.opacity = opacityVal
      }
      if (Math.abs(scaleVal - prev.scaleVal) > STYLE_THRESHOLD) {
        htmlRef.current.style.transform = `scale(${scaleVal.toFixed(3)})`
        prev.scaleVal = scaleVal
      }
      if (Math.abs(brightnessVal - prev.brightnessVal) > FILTER_THRESHOLD || Math.abs(saturateVal - prev.saturateVal) > FILTER_THRESHOLD) {
        htmlRef.current.style.filter = `brightness(${brightnessVal.toFixed(2)}) saturate(${saturateVal.toFixed(2)})`
        prev.brightnessVal = brightnessVal
        prev.saturateVal = saturateVal
      }
      if (glowRef.current && Math.abs(glowOpacity - prev.glowOpacity) > GLOW_THRESHOLD) {
        glowRef.current.style.opacity = glowOpacity.toFixed(2)
        prev.glowOpacity = glowOpacity
      }
    }

    // Theme shadow synchronization
    if (lastColorVersion.current !== globalTheme.version && glowRef.current) {
      glowRef.current.style.boxShadow = `0 0 16px ${globalTheme.primary}`
      lastColorVersion.current = globalTheme.version
    }
  })

  const renderLink = () => {
    const iconContent = (
      <>
        <SocialIcon
          platform={platform}
          className="h-4.5 w-4.5 text-[var(--text-secondary)] group-hover/icon:text-[var(--text-heading)] group-hover/icon:drop-shadow-[0_0_8px_var(--accent)] transition-all duration-200"
        />
        <div
          ref={glowRef}
          className="absolute inset-0 rounded-xl pointer-events-none opacity-0 transition-opacity duration-300 blur-sm"
          style={{ boxShadow: `0 0 16px ${globalTheme.primary}` }}
        />
      </>
    )

    const baseClass = "group/icon relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-surface)]/85 border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent)]/60 transition-all duration-300 backdrop-blur-md cursor-pointer shadow-[0_4px_20px_var(--shadow-color),0_0_12px_var(--accent-glow)] hover:shadow-[0_4px_24px_var(--shadow-color),0_0_20px_var(--accent-glow-strong)] outline-none focus-visible:ring-2 focus-visible:ring-accent after:absolute after:inset-[-12px] after:content-['']"

    if (specialType === 'email') {
      return (
        <button
          onClick={handleIconClick}
          aria-label="Copy email address to clipboard"
          className={baseClass}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          ref={htmlRef}
        >
          {iconContent}
        </button>
      )
    }

    if (specialType === 'resume') {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download
          aria-label="Download resume PDF"
          className={baseClass}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          ref={htmlRef}
        >
          {iconContent}
        </a>
      )
    }

    // Regular social link
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${platform} profile`}
        className={baseClass}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        ref={htmlRef}
      >
        {iconContent}
      </a>
    )
  }

  return (
    <group ref={iconGroupRef}>
      <Html center transform sprite distanceFactor={8} pointerEvents="auto">
        <div className="relative group/tooltip pointer-events-auto">
          {renderLink()}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 px-3 py-1.5 rounded-lg bg-[var(--bg-raised)]/95 border border-[var(--border)] backdrop-blur-md opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 pointer-events-none shadow-[0_4px_16px_var(--shadow-color)] scale-90 group-hover/tooltip:scale-100">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-heading)] whitespace-nowrap">
              {specialType === 'email' && copied ? 'Copied!' : platform}
            </span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[var(--bg-raised)] border-t border-l border-[var(--border)] rotate-45 -translate-y-[4px]" />
          </div>
        </div>
      </Html>
    </group>
  )
})

// =============================================================================
// 3D ORBITAL RING GEOMETRY
// =============================================================================
// The 3 orbital rings around the globe are arranged with symmetric 60° relative separation:
//   - Ring 0 (equatorial anchor): 0° azimuth tilt
//   - Ring 1 (slanted left): -60° azimuth tilt (60° to Ring 0)
//   - Ring 2 (slanted right): +60° azimuth tilt (120° to Ring 1, 60° to Ring 0)
//
// In local ring space, the torus lies in the XY plane. Applying Rx(65°) inclination
// followed by Rz(deg) creates 3 symmetrically distributed orbital planes (0°, -60°, +60°)
// wrapping gracefully around the globe with consistent bilateral spacing.
// =============================================================================
const radTilt = 65 * (Math.PI / 180)
const qTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), radTilt)

// Precomputed static quaternions for the 3 orbital rings symmetrically centered at the top: 0°, -60°, +60°
const ORBIT_RING_ANGLES = [0, -60, 60]
const ORBIT_RING_QUATERNIONS = ORBIT_RING_ANGLES.map((deg) => {
  const qZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), deg * (Math.PI / 180))
  return qZ.multiply(qTilt).normalize()
})


const OrbitalRing = memo(function OrbitalRing({
  myRingIndex,
  angle,
  quaternion,
  ringSpeed,
  iconSpeed,
  icons,
  zOffset,
  distanceFactor,
  hoveredCountRef,
  hoveredOrbitRef,
  isTransmit = false
}) {
  const orbitGroupRef = useRef()
  const pivotARef = useRef()
  const pivotBRef = useRef()

  const iconWrapperARef = useRef()
  const iconWrapperBRef = useRef()

  const orbitGroupPhase = useRef(0)
  const pivotAPhase = useRef(0)
  const pivotBPhase = useRef(Math.PI)

  const isHoveredARef = useRef(false)
  const isHoveredBRef = useRef(false)
  const hoverFactorA = useRef(0)
  const hoverFactorB = useRef(0)
  const easedDistance = useRef(1.0)

  const handleHoverA = useCallback((hovered) => {
    isHoveredARef.current = hovered
  }, [])

  const handleHoverB = useCallback((hovered) => {
    isHoveredBRef.current = hovered
  }, [])

  useFrame((state, delta) => {
    // Delta spike protection (50ms ceiling prevents teleportation on tab switch / scroll return)
    const safeDelta = Math.min(delta, 0.05)

    // Eased distance factor (smooth deceleration as cursor moves closer)
    const targetDist = distanceFactor ? distanceFactor.current : 1.0
    easedDistance.current = lerpFI(easedDistance.current, targetDist, LERP.proximitySpeed, safeDelta)
    const proximitySpeedFactor = easedDistance.current

    // Smooth hover factor lerping
    const targetHoverA = isHoveredARef.current ? 1.0 : 0.0
    hoverFactorA.current = lerpFI(hoverFactorA.current, targetHoverA, 6.0, safeDelta)

    const targetHoverB = isHoveredBRef.current ? 1.0 : 0.0
    hoverFactorB.current = lerpFI(hoverFactorB.current, targetHoverB, 6.0, safeDelta)

    const targetTransmit = isTransmit ? 1.0 : 0.0
    const transmitSurge = targetTransmit * (ringSpeed >= 0 ? 3.5 : -3.5)
    const iconTransmitSurge = targetTransmit * (iconSpeed >= 0 ? 4.8 : -4.8)

    // Orbital speed governed smoothly by cursor proximity and dynamic transmit surge
    const activeIconSpeed = (iconSpeed * proximitySpeedFactor) + iconTransmitSurge
    const activeRingSpeed = (ringSpeed * proximitySpeedFactor) + transmitSurge

    // 1. Monotonic continuous phase integration (immune to negative modulo jumps)
    orbitGroupPhase.current += safeDelta * activeRingSpeed
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.z = orbitGroupPhase.current
    }

    // 2. Monotonic continuous icon pivot integration
    pivotAPhase.current += safeDelta * activeIconSpeed
    pivotBPhase.current += safeDelta * activeIconSpeed

    if (pivotARef.current) {
      pivotARef.current.rotation.z = pivotAPhase.current
    }
    if (pivotBRef.current) {
      pivotBRef.current.rotation.z = pivotBPhase.current
    }

    // Hover scale applied to icon wrappers
    const hoverScaleA = 1.0 + hoverFactorA.current * 0.05
    if (iconWrapperARef.current) {
      iconWrapperARef.current.scale.set(hoverScaleA, hoverScaleA, hoverScaleA)
    }

    const hoverScaleB = 1.0 + hoverFactorB.current * 0.05
    if (iconWrapperBRef.current) {
      iconWrapperBRef.current.scale.set(hoverScaleB, hoverScaleB, hoverScaleB)
    }
  })

  const radius = 2.45
  const ringQuaternion = useMemo(() => {
    if (quaternion) return quaternion
    if (typeof angle === 'number') {
      const qZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle * (Math.PI / 180))
      return qZ.multiply(qTilt).normalize()
    }
    if (typeof myRingIndex === 'number') {
      return ORBIT_RING_QUATERNIONS[((myRingIndex % ORBIT_RING_QUATERNIONS.length) + ORBIT_RING_QUATERNIONS.length) % ORBIT_RING_QUATERNIONS.length]
    }
    return ORBIT_RING_QUATERNIONS[0]
  }, [quaternion, angle, myRingIndex])

  const ringGeom = sharedRingGeometry

  return (
    <group quaternion={ringQuaternion}>
      <group ref={orbitGroupRef}>
        {/* Pass 1: Background orbital ring portion - seamlessly renders behind the globe at renderOrder = 0 */}
        <mesh
          position={[0, 0, zOffset]}
          geometry={ringGeom}
          material={sharedRingMaterialBg}
          renderOrder={0}
        />

        {/* Pass 2: Foreground orbital ring portion - crisp, prominent render in front of globe at renderOrder = 6 */}
        <mesh
          position={[0, 0, zOffset]}
          geometry={ringGeom}
          material={sharedRingMaterialFg}
          renderOrder={6}
        />

        {/* IconPivot A */}
        {ENABLE_ORBITING_ICONS && (
          <group ref={pivotARef}>
            <group ref={iconWrapperARef} position={[radius, 0, zOffset]}>
              {icons[0] && (
                <OrbitingIcon
                  iconData={icons[0]}
                  onHoverChange={handleHoverA}
                  distanceFactor={distanceFactor}
                  hoveredCountRef={hoveredCountRef}
                  hoveredOrbitRef={hoveredOrbitRef}
                />
              )}
            </group>
          </group>
        )}

        {/* IconPivot B */}
        {ENABLE_ORBITING_ICONS && (
          <group ref={pivotBRef}>
            <group ref={iconWrapperBRef} position={[radius, 0, zOffset]}>
              {icons[1] && (
                <OrbitingIcon
                  iconData={icons[1]}
                  onHoverChange={handleHoverB}
                  distanceFactor={distanceFactor}
                  hoveredCountRef={hoveredCountRef}
                  hoveredOrbitRef={hoveredOrbitRef}
                />
              )}
            </group>
          </group>
        )}
      </group>
    </group>
  )
})

function Scene({ theme, distanceFactor, hoveredCountRef, hoveredOrbitRef, contactSystemState = 'dormant' }) {
  const isTransmit = contactSystemState === 'transmit'
  const { width } = useThree((state) => state.size)

  const scale = useMemo(() => {
    if (width < 300) return 0.55
    if (width > 380) return 0.78
    return 0.55 + ((width - 300) / 80) * 0.23
  }, [width])

  // Synchronous material color update on theme state transitions
  const lastColorVersion = useRef(-1)

  useEffect(() => {
    lastColorVersion.current = -1
  }, [theme])

  useFrame(() => {
    if (lastColorVersion.current !== globalTheme.version) {
      const primaryCol = new THREE.Color(globalTheme.primary)
      const secondaryCol = new THREE.Color(globalTheme.secondary)

      // 1. Cosmic Obsidian Glass Core - theme undertone on dark obsidian with luminance compensation
      staticMatGlassCore.color
        .copy(primaryCol)
        .multiplyScalar(0.10 * globalTheme.lumComp)
        .add(new THREE.Color('#05060a'))
      staticMatGlassCore.emissive.setHex(0x000000)

      // 2. Secondary Depth Network
      staticMatInnerWire.color
        .copy(secondaryCol)
        .multiplyScalar(0.70)
        .lerp(primaryCol, 0.30)

      // 3. Primary Outer Geodesic Network
      staticMatOuterWire.color.copy(primaryCol)
      staticMatOuterWire.opacity = SCENE_CONFIG.globe.wireframeOpacity * Math.min(1.2, Math.max(0.85, globalTheme.lumComp))

      // 4. Constellation Stars (delicate nodes with restrained luminous theme tint)
      staticMatOuterPoints.color
        .copy(primaryCol)
        .lerp(new THREE.Color('#ffffff'), 0.22)
      staticMatOuterPoints.opacity = SCENE_CONFIG.globe.pointsOpacity * Math.min(1.15, Math.max(0.88, globalTheme.lumComp))

      // 5. Atmospheric Rim Halo
      staticMatAtmosphericHalo.uniforms.color.value.copy(primaryCol)
      if (staticMatAtmosphericHalo.color) {
        staticMatAtmosphericHalo.color.copy(primaryCol)
      }
      staticMatAtmosphericHalo.uniforms.glowIntensity.value = SCENE_CONFIG.globe.glowIntensity * globalTheme.lumComp

      // 6. Orbital Rings (100% consistent theme accent across all 3 rings in both depth passes)
      sharedRingMaterialBg.uniforms.color.value.copy(primaryCol)
      if (sharedRingMaterialBg.color) {
        sharedRingMaterialBg.color.copy(primaryCol)
      }
      sharedRingMaterialFg.uniforms.color.value.copy(primaryCol)
      if (sharedRingMaterialFg.color) {
        sharedRingMaterialFg.color.copy(primaryCol)
      }

      // 7. Floating MicroParticles
      staticMatMicroParticles.color
        .copy(secondaryCol)
        .lerp(new THREE.Color('#ffffff'), 0.15)

      lastColorVersion.current = globalTheme.version
    }
  })

  return (
    <group scale={scale}>
      <Lights theme={theme} />
      <CameraRig distanceFactor={distanceFactor} />
      <Globe distanceFactor={distanceFactor} isTransmit={isTransmit} />
      <MicroParticles distanceFactor={distanceFactor} isTransmit={isTransmit} />

      {/* 3 Mathematically Calibrated 3D Orbital Rings: Ring 0 (0°), Ring 1 (-60°), Ring 2 (+60°) */}
      <OrbitalRing
        myRingIndex={0}
        angle={ORBIT_RING_ANGLES[0]}
        quaternion={ORBIT_RING_QUATERNIONS[0]}
        ringSpeed={0.018}
        iconSpeed={0.30}
        icons={STATIC_RING_ICONS[0]}
        zOffset={0.00}
        distanceFactor={distanceFactor}
        hoveredCountRef={hoveredCountRef}
        hoveredOrbitRef={hoveredOrbitRef}
        isTransmit={isTransmit}
      />
      <OrbitalRing
        myRingIndex={1}
        angle={ORBIT_RING_ANGLES[1]}
        quaternion={ORBIT_RING_QUATERNIONS[1]}
        ringSpeed={-0.018}
        iconSpeed={-0.30}
        icons={STATIC_RING_ICONS[1]}
        zOffset={0.00}
        distanceFactor={distanceFactor}
        hoveredCountRef={hoveredCountRef}
        hoveredOrbitRef={hoveredOrbitRef}
        isTransmit={isTransmit}
      />
      <OrbitalRing
        myRingIndex={2}
        angle={ORBIT_RING_ANGLES[2]}
        quaternion={ORBIT_RING_QUATERNIONS[2]}
        ringSpeed={0.018}
        iconSpeed={0.30}
        icons={STATIC_RING_ICONS[2]}
        zOffset={0.00}
        distanceFactor={distanceFactor}
        hoveredCountRef={hoveredCountRef}
        hoveredOrbitRef={hoveredOrbitRef}
        isTransmit={isTransmit}
      />
    </group>
  )
}

const Contact3DObject = memo(function Contact3DObject({ isInView, contactSystemState = 'dormant' }) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)
  const distanceFactor = useRef(1.0)
  const hoveredCountRef = useRef(0)
  const hoveredOrbitRef = useRef(null)
  const cachedRect = useRef(null)

  // WebGL Context Loss graceful UI recovery handler
  const [webglSupported, setWebglSupported] = useState(true)

  // React ThemeContext synchronization
  const themeCtx = useThemeContext()
  const currentThemeKey = themeCtx?.theme || (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null) || 'obsidian'

  useEffect(() => {
    applyThemeColors(currentThemeKey)
  }, [currentThemeKey])

  // MutationObserver on <html> (retains theme synchronization if changed outside React)
  useEffect(() => {
    const handleMutation = () => {
      const docTheme = document.documentElement.getAttribute('data-theme')
      if (docTheme) {
        applyThemeColors(docTheme)
      }
    }
    const observer = new MutationObserver(handleMutation)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    return () => observer.disconnect()
  }, [])

  // Cache rect, update on resize/scroll/mutation using ResizeObserver to prevent layout thrashing
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        cachedRect.current = containerRef.current.getBoundingClientRect()
      }
    }
    update()

    const resizeObserver = new ResizeObserver(() => {
      update()
    })
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener("resize", update, { passive: true })
    window.addEventListener("scroll", update, { passive: true })
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update)
    }
  }, [])

  useEffect(() => {
    if (!isInView || shouldReduceMotion || !webglSupported) return

    const { maxDistance, minDistance, minFactor } = SCENE_CONFIG.proximity
    let ticking = false

    const handleMouseMove = (e) => {
      if (ticking || !cachedRect.current) return
      ticking = true

      window.requestAnimationFrame(() => {
        const r = cachedRect.current
        if (r) {
          const dx = e.clientX - (r.left + r.width / 2)
          const dy = e.clientY - (r.top + r.height / 2)
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d > maxDistance) {
            distanceFactor.current = 1.0
          } else if (d < minDistance) {
            distanceFactor.current = minFactor
          } else {
            const t = (d - minDistance) / (maxDistance - minDistance)
            const eased = t * t * (3 - 2 * t)
            distanceFactor.current = minFactor + eased * (1.0 - minFactor)
          }
        }
        ticking = false
      })
    }
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [shouldReduceMotion, webglSupported, isInView])

  if (shouldReduceMotion) return null

  return (
    <>
      {/* Issue #14: Accessibility Fallback Nav Links - descriptive screen-reader text */}
      <nav aria-label="Social media links and contact options" className="sr-only">
        {STATIC_ALL_ICONS.map(icon => {
          if (icon.specialType === 'email') {
            return <button key={icon.key} onClick={() => navigator.clipboard.writeText(icon.url)}>Copy email: {icon.url}</button>
          }
          if (icon.specialType === 'resume') {
            return <a key={icon.key} href={icon.url} download>Download resume</a>
          }
          return (
            <a key={icon.key} href={icon.url} target="_blank" rel="noopener noreferrer">
              Visit Sai Pallav's {icon.platform} profile
            </a>
          )
        })}
      </nav>

      {/* Re-render wrapper only hidden on mobile (hidden md:flex) */}
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full aspect-square max-w-[380px] lg:max-w-[420px] z-10 pointer-events-none flex items-center justify-center"
      >
        <div
          className="absolute w-[60%] h-[60%] rounded-full blur-[100px] pointer-events-none -z-10 transition-colors duration-500"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', opacity: 0.08 }}
        />

        <div className="absolute inset-0 pointer-events-none">
          {webglSupported ? (
            <Canvas
              frameloop={isInView ? "always" : "never"}
              dpr={[1, 1.5]}
              gl={{
                powerPreference: "high-performance",
                antialias: true,
                alpha: true
              }}
              camera={SCENE_CONFIG.camera}
              onCreated={({ gl }) => {
                const canvasEl = gl.domElement
                const handleContextLost = (e) => {
                  e.preventDefault()
                  setWebglSupported(false)
                }
                canvasEl.addEventListener('webglcontextlost', handleContextLost)
                return () => {
                  canvasEl.removeEventListener('webglcontextlost', handleContextLost)
                }
              }}
              style={{ pointerEvents: 'auto', opacity: 1 }}
            >
              <Scene
                theme={currentThemeKey}
                distanceFactor={distanceFactor}
                hoveredCountRef={hoveredCountRef}
                hoveredOrbitRef={hoveredOrbitRef}
                contactSystemState={contactSystemState}
              />
            </Canvas>
          ) : (
            // Robust 2D recovery fallback: elegant animated list in place of crashed WebGL canvas
            <div className="flex items-center justify-center w-full h-full pointer-events-auto">
              <div className="flex gap-4 p-4 rounded-2xl bg-bg-surface/50 border border-white/5 backdrop-blur-md shadow-2xl animate-fade-in">
                {STATIC_ALL_ICONS.map(icon => {
                  if (icon.specialType === 'email') {
                    return (
                      <button
                        key={icon.key}
                        onClick={() => navigator.clipboard.writeText(icon.url)}
                        aria-label="Copy email address"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-bg-surface border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-all duration-300"
                      >
                        <SocialIcon platform={icon.platform} className="h-5 w-5" />
                      </button>
                    )
                  }
                  if (icon.specialType === 'resume') {
                    return (
                      <a
                        key={icon.key}
                        href={icon.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        aria-label="Download resume"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-bg-surface border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-all duration-300"
                      >
                        <SocialIcon platform={icon.platform} className="h-5 w-5" />
                      </a>
                    )
                  }
                  return (
                    <a
                      key={icon.key}
                      href={icon.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${icon.platform} profile`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-bg-surface border border-white/10 text-secondary hover:text-accent hover:border-accent/40 transition-all duration-300"
                    >
                      <SocialIcon platform={icon.platform} className="h-5 w-5" />
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
})

export default Contact3DObject;
