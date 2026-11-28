/**
 * Centralized theme-aware visual configuration for the 3D Neural Wire Structures.
 * Fully harmonized with the portfolio's themes (themes.js, themes.css, and Contact3DObject.jsx)
 * without dissonant, clashing color contaminations.
 */

export const WIRE_THEME_PALETTES = {
  // 1. Obsidian Terminal: Exact --accent (#2563eb), --accent-secondary (#6366f1), --accent-hover (#3b82f6)
  'obsidian': {
    primaryWire: '#2563eb',
    secondaryWire: '#6366f1',
    connectionNode: '#3b82f6',
    highlightNode: '#eef4ff',
    particle: '#60a5fa',
    wireOpacity: 0.94,
    glowIntensity: 1.15,
  },
  // 2. Electric Blue: Exact --accent (#00e5ff), --accent-secondary (#0077ff), --accent-hover (#38bdf8)
  'electric-blue': {
    primaryWire: '#00e5ff',
    secondaryWire: '#0077ff',
    connectionNode: '#38bdf8',
    highlightNode: '#e0f2fe',
    particle: '#7dd3fc',
    wireOpacity: 0.94,
    glowIntensity: 1.15,
  },
  // 3. Nordic Frost: Exact --accent (#3b82f6), --accent-secondary (#6366f1), --accent-hover (#60a5fa)
  'nordic-frost': {
    primaryWire: '#3b82f6',
    secondaryWire: '#6366f1',
    connectionNode: '#60a5fa',
    highlightNode: '#f8fafc',
    particle: '#93c5fd',
    wireOpacity: 0.90,
    glowIntensity: 1.10,
  },
  // 4. Midnight Violet: Calibrated for linear-output custom shaders to match true #a78bfa / #9f7aea royal violet
  'midnight-violet': {
    primaryWire: '#bc95f1',
    secondaryWire: '#b181e7',
    connectionNode: '#ceb8fa',
    highlightNode: '#f8f5ff',
    particle: '#d1b8f9',
    wireOpacity: 0.78,
    glowIntensity: 0.72,
    ribbonAuraScale: 0.70,
    ribbonMaxAlpha: 0.72,
    neuralHazeColor: '#6a4a95',
    neuralBaseColor: '#4a306a',
    neuralMidColor: '#9079bc',
    neuralHotColor: '#f6f2ff',
    neuralHazeScale: 0.78,
    neuralHazeAlphaCap: 0.056,
    neuralLineScale: 1.50,
    neuralSignalGain: 1.04,
    neuralPointScale: 0.80,
  },
  // 5. Emerald Noir: Exact --accent (#10b981), --accent-secondary (#14b8a6), --accent-hover (#34d399)
  'emerald-noir': {
    primaryWire: '#10b981',
    secondaryWire: '#14b8a6',
    connectionNode: '#34d399',
    highlightNode: '#e6fff5',
    particle: '#6ee7b7',
    wireOpacity: 0.90,
    glowIntensity: 1.10,
  },
  // 6. Graphite: Exact --accent (#9ca3af), --accent-secondary (#6b7280), --accent-hover (#d1d5db)
  'graphite': {
    primaryWire: '#9ca3af',
    secondaryWire: '#6b7280',
    connectionNode: '#d1d5db',
    highlightNode: '#f8fafc',
    particle: '#d1d5db',
    wireOpacity: 0.88,
    glowIntensity: 1.00,
  },
  // 7. Professional: Exact --accent (#2563eb), --accent-secondary (#6366f1), --accent-hover (#3b82f6)
  'professional': {
    primaryWire: '#2563eb',
    secondaryWire: '#6366f1',
    connectionNode: '#3b82f6',
    highlightNode: '#eef4ff',
    particle: '#60a5fa',
    wireOpacity: 0.90,
    glowIntensity: 1.10,
  },
}

/**
 * Retrieves the theme configuration, with fallback to DOM CSS custom properties.
 * @param {string} themeKey
 * @returns {typeof WIRE_THEME_PALETTES['obsidian']}
 */
export function getWireThemeConfig(themeKey) {
  if (themeKey && WIRE_THEME_PALETTES[themeKey]) {
    return WIRE_THEME_PALETTES[themeKey]
  }

  // Fallback to DOM CSS variables for unknown or custom themes
  if (typeof document !== 'undefined') {
    try {
      const styles = getComputedStyle(document.documentElement)
      const accent = styles.getPropertyValue('--accent').trim() || '#00d2ff'
      const hover = styles.getPropertyValue('--accent-hover').trim() || accent
      const secondary = styles.getPropertyValue('--accent-secondary').trim() || hover
      return {
        primaryWire: accent,
        secondaryWire: secondary,
        connectionNode: hover,
        highlightNode: '#ffffff',
        particle: hover,
        wireOpacity: 0.90,
        glowIntensity: 1.25,
      }
    } catch {
      // Ignore styles access errors on SSR
    }
  }

  return WIRE_THEME_PALETTES['obsidian']
}
