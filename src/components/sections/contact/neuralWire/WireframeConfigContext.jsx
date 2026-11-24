import { createContext, useContext, useState, useEffect, useCallback, useMemo, startTransition } from 'react'

// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_SIDE_CONFIG = {
  // ── Dimensions ──
  lengthMultiplier: 1,       // Total wireframe length multiplier
  breadthMultiplier: 1.35,   // Vertical ribbon breadth / height multiplier
  depthMultiplier: 0.3,      // Depth thickness multiplier
  strandSpread: 0.85,        // Companion silk strands width/spread multiplier (refined balance)
  stringCount: 13,           // Number of strings/strands per hero wave
  stringWidth: 0.95,         // Width and thickness of individual strings

  // ── Independent End Lengths & Outer Flexibility ──
  innerExtension: 1.3,       // Lengthens inner end inward towards globe (positive = closer / into globe)
  outerExtension: -2,        // Lengthens outer end outward past screen edge
  outerFlexibility: 0,       // Wave flexibility & harmonic whip at outer ends (0.0 = rigid, 1.0 = natural silk)
  outerFlare: 0,             // Vertical fan-out & separation of ribbon streams at outer tips
  outerFade: 0.07,           // Soft feather fade distance at outer tips

  // ── Waves & Amplitude ──
  amplitude: 1.65,           // Wave oscillation amplitude multiplier
  frequency: 0.85,           // Wave frequency / cycles multiplier
  zAmplitude: 1.5,           // Z-depth wave oscillation multiplier
  wingSweep: 0.34,           // Wing sweep curvature (outer parabolic lift)

  // ── 4 Hero Waves (Individual Ribbon Controls - Mirrored Symmetrically) ──
  ribbon1Amp: 1.0,           // Ribbon 1 (Upper Almond Arch, Cyan-White Core)
  ribbon2Amp: 1.0,           // Ribbon 2 (Lower Almond Arch, Cyan-White Core)
  ribbon3Amp: 1.0,           // Ribbon 3 (Violet/Magenta Accent Wave #b83dff)
  ribbon4Amp: 1.0,           // Ribbon 4 (Counter-Braid, Electric Blue-Cyan)

  ribbon1YOffset: 0.0,       // Vertical shift for Ribbon 1
  ribbon2YOffset: 0.0,       // Vertical shift for Ribbon 2
  ribbon3YOffset: 0.0,       // Vertical shift for Ribbon 3
  ribbon4YOffset: 0.0,       // Vertical shift for Ribbon 4

  ribbon1Freq: 1,            // Frequency/cycle density for Ribbon 1
  ribbon2Freq: 1.05,         // Frequency/cycle density for Ribbon 2
  ribbon3Freq: 1.1,          // Frequency/cycle density for Ribbon 3
  ribbon4Freq: 0.9,          // Frequency/cycle density for Ribbon 4

  // ── Inter-Ribbon Spacing & Distances (Pairwise & Outer/Inner Taper) ──
  distRibbon01: 0,           // Distance offset between Ribbon 0 (Upper Arch) and Ribbon 1 (Lower Arch)
  distRibbon12: 0,           // Distance offset between Ribbon 1 (Lower Arch) and Ribbon 2 (Violet Accent)
  distRibbon23: 0,           // Distance offset between Ribbon 2 (Violet Accent) and Ribbon 3 (Counter-Braid)
  ribbonSpacingOuter: 1.0,   // Distance multiplier between all ribbons at outer wingtips (fanning out)
  ribbonSpacingInner: 1.0,   // Distance multiplier between all ribbons at inner globe connection (converging)

  // ── Two Ends Placement ──
  innerGap: 0.2,             // Fine inner gap offset from globe center
  innerYOffset: 0,           // Inner end height offset
  innerFade: 0.05,           // Inner tip feather distance (crisp luminous entry matching reference video)
  outerXOffset: 0,           // Fine outer X offset
  outerYOffset: -0.3,        // Outer end lift/drop
  outerZOffset: -0.7,        // Outer end depth offset

  // ── Overall Placement & Tilt ──
  yOffset: 0,                // Global Y offset
  xOffset: 0,                // Global X offset
  zOffset: 0.2,              // Global Z depth offset
  tiltZ: 0,                  // 2D tilt angle (degrees)
  pitchX: 2,                 // 3D pitch tilt (degrees)
  yawY: 16,                  // 3D yaw tilt (degrees)

  // ── Styling & Appearance ──
  wireOpacity: 1,            // Wire opacity multiplier
  glowIntensity: 1.25,       // Halo glow intensity multiplier
  nodeScale: 1,              // Nodes & flares scale multiplier
}

// eslint-disable-next-line react-refresh/only-export-components
export const PRESETS = {
  default: {
    name: 'Default Balanced',
    description: 'Original calibrated baseline with smooth almond curves',
    config: { ...DEFAULT_SIDE_CONFIG },
  },
  extendedWings: {
    name: 'Extended Wings (Long)',
    description: 'Longer ribbons extending gracefully across the wide screen',
    config: {
      ...DEFAULT_SIDE_CONFIG,
      lengthMultiplier: 1.25,
      innerExtension: 0.45,
      outerExtension: 1.6,
      outerYOffset: 0.45,
      wingSweep: 0.38,
      amplitude: 1.15,
      breadthMultiplier: 1.1,
    },
  },
  highAmplitude: {
    name: 'High Amplitude Drama',
    description: 'Pronounced wave crests, wider vertical oscillation and rich depth',
    config: {
      ...DEFAULT_SIDE_CONFIG,
      amplitude: 1.65,
      breadthMultiplier: 1.35,
      zAmplitude: 1.5,
      strandSpread: 1.3,
      wingSweep: 0.34,
      glowIntensity: 1.25,
    },
  },
  thickRibbonBand: {
    name: 'Thick Ribbon Band',
    description: 'Dense, luminous silk volume forming prominent energy bands',
    config: {
      ...DEFAULT_SIDE_CONFIG,
      breadthMultiplier: 1.75,
      strandSpread: 1.6,
      depthMultiplier: 1.3,
      wireOpacity: 1.15,
      glowIntensity: 1.2,
      amplitude: 0.95,
    },
  },
  closeGlobeHugger: {
    name: 'Close Globe Connection',
    description: 'Wires start close to the central globe with extended inner length',
    config: {
      ...DEFAULT_SIDE_CONFIG,
      innerExtension: 1.1,
      innerGap: -0.2,
      innerFade: 0.12,
      lengthMultiplier: 1.15,
      amplitude: 1.1,
      glowIntensity: 1.15,
    },
  },
  sleekStreamline: {
    name: 'Sleek Streamline',
    description: 'Minimal, flatter trajectory with subtle refined motion',
    config: {
      ...DEFAULT_SIDE_CONFIG,
      amplitude: 0.65,
      breadthMultiplier: 0.75,
      wingSweep: 0.18,
      strandSpread: 0.75,
      wireOpacity: 0.85,
    },
  },
}

const STORAGE_KEY = 'portfolio_wireframe_ribbon_config_v25'

const WireframeConfigContext = createContext(null)

export function WireframeConfigProvider({ children }) {
  const [linkSides, setLinkSides] = useState(true)
  const [activeSideTab, setActiveSideTab] = useState('both') // 'both' | 'left' | 'right'

  // ── Left Ribbon Config (side: 'left') ──
  const [leftConfig, setLeftConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.left) return { ...DEFAULT_SIDE_CONFIG, ...parsed.left }
          if (parsed.lengthMultiplier !== undefined) return { ...DEFAULT_SIDE_CONFIG, ...parsed }
        }
      } catch (err) {
        console.warn('Failed to load left wireframe config from localStorage', err)
      }
    }
    return { ...DEFAULT_SIDE_CONFIG }
  })

  // ── Right Ribbon Config (side: 'right') ──
  const [rightConfig, setRightConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.right) return { ...DEFAULT_SIDE_CONFIG, ...parsed.right }
          if (parsed.lengthMultiplier !== undefined) return { ...DEFAULT_SIDE_CONFIG, ...parsed }
        }
      } catch (err) {
        console.warn('Failed to load right wireframe config from localStorage', err)
      }
    }
    return { ...DEFAULT_SIDE_CONFIG }
  })

  // ── Exactly 2 Ribbons (1 Left, 1 Right) directly derived from configs ──
  const ribbons = useMemo(() => [
    { ...leftConfig, id: 0, label: 'Left Ribbon', side: 'left' },
    { ...rightConfig, id: 1, label: 'Right Ribbon', side: 'right' },
  ], [leftConfig, rightConfig])

  // Global window reference for inspection & automated evaluation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__WIREFRAME_CONFIG__ = {
        linkSides,
        left: leftConfig,
        right: rightConfig,
        ribbons,
      }
    }
  }, [linkSides, leftConfig, rightConfig, ribbons])

  /**
   * Update a parameter on both sides, or specifically left / right
   */
  const updateParam = useCallback((key, value, targetSide = null) => {
    const side = targetSide || (linkSides ? 'both' : activeSideTab)

    startTransition(() => {
      if (side === 'both') {
        setLeftConfig((prev) => ({ ...prev, [key]: value }))
        setRightConfig((prev) => ({ ...prev, [key]: value }))
      } else if (side === 'left') {
        setLeftConfig((prev) => ({ ...prev, [key]: value }))
      } else if (side === 'right') {
        setRightConfig((prev) => ({ ...prev, [key]: value }))
      }
    })
  }, [linkSides, activeSideTab])

  /**
   * Update a parameter specifically for an individual ribbon (by side or id)
   */
  const updateRibbonParam = useCallback((sideOrId, key, value) => {
    startTransition(() => {
      if (sideOrId === 'left' || sideOrId === 0) {
        setLeftConfig((prev) => ({ ...prev, [key]: value }))
      } else if (sideOrId === 'right' || sideOrId === 1) {
        setRightConfig((prev) => ({ ...prev, [key]: value }))
      }
    })
  }, [])

  const applyPreset = useCallback((presetKey) => {
    const preset = PRESETS[presetKey]
    if (!preset) return
    setLeftConfig({ ...preset.config })
    setRightConfig({ ...preset.config })
  }, [])

  const resetToDefaults = useCallback(() => {
    setLeftConfig({ ...DEFAULT_SIDE_CONFIG })
    setRightConfig({ ...DEFAULT_SIDE_CONFIG })
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    }
  }, [])

  const saveToLocalStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ linkSides, left: leftConfig, right: rightConfig })
        )
        return true
      } catch (e) {
        console.error('Failed to save to localStorage', e)
        return false
      }
    }
    return false
  }, [linkSides, leftConfig, rightConfig])

  const copyConfigJson = useCallback(async () => {
    const payload = linkSides
      ? { ...leftConfig }
      : { left: leftConfig, right: rightConfig }
    const jsonStr = JSON.stringify(payload, null, 2)
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(jsonStr)
        return true
      } catch (err) {
        console.warn('Clipboard write failed, using fallback', err)
      }
    }
    return false
  }, [linkSides, leftConfig, rightConfig])

  const loadCustomJson = useCallback((jsonInput) => {
    try {
      const parsed = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput
      if (parsed.left && parsed.right) {
        setLeftConfig({ ...DEFAULT_SIDE_CONFIG, ...parsed.left })
        setRightConfig({ ...DEFAULT_SIDE_CONFIG, ...parsed.right })
        setLinkSides(false)
      } else {
        setLeftConfig({ ...DEFAULT_SIDE_CONFIG, ...parsed })
        setRightConfig({ ...DEFAULT_SIDE_CONFIG, ...parsed })
      }
      return true
    } catch (err) {
      console.error('Failed to parse JSON config', err)
      return false
    }
  }, [])

  const value = useMemo(() => ({
    ribbons,
    leftConfig,
    rightConfig,
    setLeftConfig,
    setRightConfig,
    linkSides,
    setLinkSides,
    activeSideTab,
    setActiveSideTab,
    updateParam,
    updateRibbonParam,
    applyPreset,
    resetToDefaults,
    saveToLocalStorage,
    copyConfigJson,
    loadCustomJson,
    DEFAULT_SIDE_CONFIG,
    PRESETS,
  }), [
    ribbons,
    leftConfig,
    rightConfig,
    linkSides,
    activeSideTab,
    updateParam,
    updateRibbonParam,
    applyPreset,
    resetToDefaults,
    saveToLocalStorage,
    copyConfigJson,
    loadCustomJson,
  ])

  return (
    <WireframeConfigContext.Provider value={value}>
      {children}
    </WireframeConfigContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWireframeConfig() {
  const ctx = useContext(WireframeConfigContext)
  if (!ctx) {
    return {
      ribbons: [
        { ...DEFAULT_SIDE_CONFIG, id: 0, label: 'Left Ribbon', side: 'left' },
        { ...DEFAULT_SIDE_CONFIG, id: 1, label: 'Right Ribbon', side: 'right' },
      ],
      leftConfig: DEFAULT_SIDE_CONFIG,
      rightConfig: DEFAULT_SIDE_CONFIG,
      setLeftConfig: () => {},
      setRightConfig: () => {},
      linkSides: true,
      activeSideTab: 'both',
      setActiveSideTab: () => {},
      updateParam: () => {},
      updateRibbonParam: () => {},
      applyPreset: () => {},
      resetToDefaults: () => {},
      saveToLocalStorage: () => false,
      copyConfigJson: async () => false,
      loadCustomJson: () => false,
      DEFAULT_SIDE_CONFIG,
      PRESETS,
    }
  }
  return ctx
}
