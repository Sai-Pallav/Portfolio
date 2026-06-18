/**
 * Simplified cursor utility functions.
 * Avoids any getComputedStyle or getBoundingClientRect calls on mouse movement
 * to eliminate layout thrashing and ensure 60/120 FPS performance.
 */

let cachedContainer = null
let cachedRects = null
let cachedPortraitEl = null
let cachedPortraitRect = null

export function clearCursorCache() {
  cachedContainer = null
  cachedRects = null
  cachedPortraitEl = null
  cachedPortraitRect = null
}

/**
 * Retrieves the bounding rect of the portrait element, caching it to
 * avoid layout thrashing during mouse movements.
 * @param {Element | null} el
 * @returns {DOMRect | null}
 */
export function getPortraitRect(el) {
  if (!el) return null
  if (el !== cachedPortraitEl) {
    cachedPortraitEl = el
    cachedPortraitRect = el.getBoundingClientRect()
  }
  return cachedPortraitRect
}

/**
 * Checks if the cursor is exactly over text lines.
 * Uses getClientRects() on the text container to get precise bounding boxes for each
 * line of text, preventing cursor flickering/shrinking in the spaces between words.
 * Caches client rects to prevent layout thrashing and maintain 120 FPS performance.
 * @param {PointerEvent} e
 * @returns {boolean}
 */
export function isCursorOverText(e) {
  const hit = e.target
  if (!hit || !hit.closest || hit.closest('[data-custom-cursor-ignore]')) {
    return false
  }

  // Prioritize interactive elements for the interactive cursor shape
  if (hit.closest('a, button, [role="button"], input, textarea, select')) {
    return false
  }

  // Find the closest text container element
  const container = hit.closest('p, span, h1, h2, h3, h4, h5, h6, li, label, code, pre, blockquote')
  if (!container || !container.textContent.trim()) {
    cachedContainer = null
    cachedRects = null
    return false
  }

  // Retrieve or compute precise inline bounding boxes of the text content
  let rects = cachedRects
  if (container !== cachedContainer) {
    cachedContainer = container
    const range = document.createRange()
    range.selectNodeContents(container)
    rects = range.getClientRects()
    cachedRects = rects
  }

  if (rects && rects.length > 0) {
    const padY = 5 // 5px vertical padding tolerance
    const padX = 5 // 5px horizontal padding tolerance
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]
      if (
        e.clientX >= rect.left - padX &&
        e.clientX <= rect.right + padX &&
        e.clientY >= rect.top - padY &&
        e.clientY <= rect.bottom + padY
      ) {
        return true
      }
    }
  }

  return false
}

/**
 * Checks if the element or any of its parents is interactive.
 * @param {Element | null} el
 * @returns {boolean}
 */
export function isInteractiveHoverTarget(el) {
  if (!el || !el.closest || el.closest('[data-custom-cursor-ignore]')) {
    return false
  }
  return el.closest('a, button, [role="button"], input, textarea, select, svg, [class*="icon"]') !== null
}
