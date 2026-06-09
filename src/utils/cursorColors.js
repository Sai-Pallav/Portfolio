const TEXT_TAGS = new Set([
  'P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'A', 'LI', 'LABEL',
  'TD', 'TH', 'EM', 'STRONG', 'SMALL', 'B', 'I', 'U', 'BUTTON', 'FIGCAPTION',
  'BLOCKQUOTE', 'CITE', 'CODE', 'PRE', 'KBD', 'DD', 'DT', 'HGROUP', 'LEGEND',
  'CAPTION', 'MARK', 'DEL', 'INS', 'SUB', 'SUP', 'ABBR', 'Q', 'TIME',
])

let colorProbe = null

function getColorProbe() {
  if (!colorProbe && typeof document !== 'undefined') {
    colorProbe = document.createElement('div')
    colorProbe.setAttribute('aria-hidden', 'true')
    colorProbe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;top:-9999px;left:-9999px'
    document.documentElement.appendChild(colorProbe)
  }
  return colorProbe
}

/** @returns {{ r: number, g: number, b: number, a: number } | null} */
export function parseColor(input) {
  if (!input || input === 'transparent' || input === 'inherit' || input === 'none') {
    return null
  }
  const probe = getColorProbe()
  if (!probe) return null

  probe.style.color = input
  const computed = getComputedStyle(probe).color

  const match = computed.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/,
  )
  if (!match) return null

  return {
    r: Math.round(Number(match[1])),
    g: Math.round(Number(match[2])),
    b: Math.round(Number(match[3])),
    a: match[4] !== undefined ? Number(match[4]) : 1,
  }
}

/** @returns {{ r: number, g: number, b: number, a: number } | null} */
export function parseBackground(input) {
  if (!input || input === 'transparent' || input === 'inherit' || input === 'none') {
    return null
  }
  const probe = getColorProbe()
  if (!probe) return null

  probe.style.backgroundColor = input
  const computed = getComputedStyle(probe).backgroundColor

  const match = computed.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/,
  )
  if (!match) return null

  return {
    r: Math.round(Number(match[1])),
    g: Math.round(Number(match[2])),
    b: Math.round(Number(match[3])),
    a: match[4] !== undefined ? Number(match[4]) : 1,
  }
}

export function colorToCss({ r, g, b, a = 1 }) {
  if (a < 1) return `rgba(${r}, ${g}, ${b}, ${a})`
  return `rgb(${r}, ${g}, ${b})`
}

export function getThemeDefaults() {
  if (typeof document === 'undefined') {
    return {
      fg: { r: 250, g: 250, b: 250, a: 1 },
      bg: { r: 10, g: 10, b: 11, a: 1 },
    }
  }
  const root = getComputedStyle(document.documentElement)
  const fg =
    parseColor(root.getPropertyValue('--text-primary').trim()) ||
    parseColor(root.color) ||
    { r: 250, g: 250, b: 250, a: 1 }
  const bg =
    parseBackground(root.getPropertyValue('--bg').trim()) ||
    parseBackground(root.backgroundColor) ||
    { r: 10, g: 10, b: 11, a: 1 }
  return { fg, bg }
}

/** @param {number} x @param {number} y */
export function sampleColorsAt(x, y) {
  const defaults = getThemeDefaults()
  const target = document.elementFromPoint(x, y)
  if (!target || target.closest?.('[data-custom-cursor-ignore]')) {
    return defaults
  }

  let fg = null
  let bg = null
  let el = target

  while (el && el !== document.documentElement) {
    const style = getComputedStyle(el)

    if (!fg) {
      const c = parseColor(style.color)
      if (c && c.a > 0.08) fg = c
    }

    if (!bg) {
      const c = parseBackground(style.backgroundColor)
      if (c && c.a > 0.04) bg = c
    }

    if (fg && bg) break
    el = el.parentElement
  }

  return {
    fg: fg || defaults.fg,
    bg: bg || defaults.bg,
  }
}

/** @param {Element | null} el */
export function isTextHoverTarget(el) {
  if (!el || el.closest?.('[data-custom-cursor-ignore]')) return false

  let node = el
  while (node && node !== document.body) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      return true
    }

    const tag = node.tagName
    if (tag && TEXT_TAGS.has(tag) && node.textContent?.trim()) {
      return true
    }

    node = node.parentElement
  }

  return false
}

/**
 * Extracts the shape and size information from a hovered element
 * @param {Element | null} el
 * @returns {{ width: number, height: number, borderRadius: string, isInteractive: boolean } | null}
 */
export function getElementShape(el) {
  if (!el || el.closest?.('[data-custom-cursor-ignore]')) return null

  // Find the closest interactive element with defined dimensions
  let target = el
  let depth = 0
  const maxDepth = 5

  while (target && target !== document.body && depth < maxDepth) {
    // Skip elements marked as cursor-ignore (also catches ancestors)
    if (target.hasAttribute?.('data-custom-cursor-ignore')) return null

    const rect = target.getBoundingClientRect()
    const style = window.getComputedStyle(target)
    const display = style.display
    const visibility = style.visibility
    const opacity = style.opacity

    // Skip hidden or non-interactive elements
    if (visibility === 'hidden' || opacity === '0' || display === 'none') {
      target = target.parentElement
      depth++
      continue
    }

    // Check if element has meaningful dimensions
    if (rect.width > 0 && rect.height > 0) {
      // Extract border-radius values - simplify to single value if it's a shorthand
      let borderRadius = style.borderRadius || '0px'
      // If border-radius has multiple values (e.g., "12px 12px 12px 12px"), use the first one
      const radiusValues = borderRadius.split(' ').filter(v => v.trim())
      if (radiusValues.length > 1) {
        borderRadius = radiusValues[0]
      }

      // Check if this is an interactive element (button, a, etc.)
      // Only transform for buttons and symbols/icons
      const isInteractive = 
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.getAttribute('role') === 'button' ||
        target.tagName === 'SVG' ||
        target.closest('button') !== null ||
        target.closest('a') !== null ||
        (target.closest('svg') !== null && target.closest('[class*="icon"]') !== null)

      // Use exact size for transformation (100% of element size)
      const scaleFactor = 1.0

      return {
        width: rect.width * scaleFactor,
        height: rect.height * scaleFactor,
        borderRadius,
        isInteractive
      }
    }

    target = target.parentElement
    depth++
  }

  return null
}
