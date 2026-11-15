/**
 * Centralized theme-aware visual configuration for the 3D Neural Wire Structures.
 * Fully harmonized with the portfolio's themes (themes.js, themes.css, and Contact3DObject.jsx)
 * without dissonant, clashing color contaminations.
 */

export const WIRE_THEME_PALETTES = {
  // 1. Obsidian Terminal: Deep electric cyan-blue & vivid cobalt-violet
  'obsidian': {
    primaryWire: '#00d2ff',
    secondaryWire: '#818cf8',
    connectionNode: '#38bdf8',
    highlightNode: '#ffffff',
    particle: '#93c5fd',
    wireOpacity: 0.94,
    glowIntensity: 1.30,
  },
  // 2. Electric Blue: Brilliant electric cyan & vivid electric violet (Exact reference look!)
  'electric-blue': {
    primaryWire: '#00e5ff',
    secondaryWire: '#a855f7',
    connectionNode: '#38bdf8',
    highlightNode: '#ffffff',
    particle: '#67e8f9',
    wireOpacity: 0.96,
    glowIntensity: 1.40,
  },
  // 3. Nordic Frost: Ice blue & glacial arctic blue
  'nordic-frost': {
    primaryWire: '#38bdf8',
    secondaryWire: '#818cf8',
    connectionNode: '#93c5fd',
    highlightNode: '#f0f9ff',
    particle: '#bfdbfe',
    wireOpacity: 0.90,
    glowIntensity: 1.20,
  },
  // 4. Midnight Violet: Luminous lavender violet & electric accent
  'midnight-violet': {
    primaryWire: '#c084fc',
    secondaryWire: '#38bdf8',
    connectionNode: '#e9d5ff',
    highlightNode: '#ffffff',
    particle: '#ddd6fe',
    wireOpacity: 0.92,
    glowIntensity: 1.30,
  },
  // 5. Emerald Noir: Luminous emerald & cyber teal
  'emerald-noir': {
    primaryWire: '#10b981',
    secondaryWire: '#06b6d4',
    connectionNode: '#34d399',
    highlightNode: '#f0fdf4',
    particle: '#6ee7b7',
    wireOpacity: 0.90,
    glowIntensity: 1.25,
  },
  // 6. Graphite: High-tech metallic platinum & deep cool slate
  'graphite': {
    primaryWire: '#e2e8f0',
    secondaryWire: '#94a3b8',
    connectionNode: '#cbd5e1',
    highlightNode: '#ffffff',
    particle: '#cbd5e1',
    wireOpacity: 0.88,
    glowIntensity: 1.15,
  },
  // 7. Professional: Royal sapphire & cobalt
  'professional': {
    primaryWire: '#3b82f6',
    secondaryWire: '#818cf8',
    connectionNode: '#60a5fa',
    highlightNode: '#ffffff',
    particle: '#93c5fd',
    wireOpacity: 0.90,
    glowIntensity: 1.25,
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
