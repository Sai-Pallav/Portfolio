import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { isTextHoverTarget, getElementShape } from '@/utils/cursorColors'
import { useCursorAnimation } from '@/hooks/useCursorAnimation'

function prefersFinePointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

/**
 * Custom cursor with foreground-colored circle + mix-blend-mode: difference.
 * For each pixel under the circle: result = |pixel − foreground|, which swaps
 * foreground and background exactly when only those two colors are present.
 * Transforms into the shape of hovered buttons and symbols.
 */
export function CustomCursor() {
  const [enabled] = useState(prefersFinePointer())
  const cursorRef = useRef(null)
  const {
    updateCursorPosition,
    updateCursorShape,
    updateCursorSize,
    updateCursorColor,
    setKeyboardMode,
    setOpacity,
    animate,
  } = useCursorAnimation(cursorRef)

  useEffect(() => {
    if (!enabled) return undefined

    const cursor = cursorRef.current
    if (!cursor) return undefined

    const styleEl = document.createElement('style')
    styleEl.id = 'custom-cursor-hide-native'
    styleEl.textContent =
      'html.custom-cursor-active, html.custom-cursor-active * { cursor: none !important; }'
    document.head.appendChild(styleEl)

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const enableNativeCursor = () => {
      setKeyboardMode(true)
      document.documentElement.classList.remove('custom-cursor-active')
    }

    const enableCustomCursor = () => {
      setKeyboardMode(false)
      document.documentElement.classList.add('custom-cursor-active')
    }

    enableCustomCursor()

    let rafId = 0
    let lastX = -200
    let lastY = -200
    let lastDetect = 0
    const DETECT_INTERVAL = 60 // ms between expensive DOM inspections

    // Cheap: only record the latest pointer position on every move.
    // The expensive DOM inspection (hit testing, shape, color) is throttled
    // and runs inside the RAF loop so it never blocks pointer tracking.
    const onPointerMove = (e) => {
      lastX = e.clientX
      lastY = e.clientY
      updateCursorPosition(e)
    }

    // Expensive: hit-test, shape detection and color sampling.
    const detectHover = () => {
      const hit = document.elementFromPoint(lastX, lastY)
      const isText = isTextHoverTarget(hit)
      updateCursorSize(isText)

      // Get element shape for non-text elements
      if (!isText) {
        const shape = getElementShape(hit)
        updateCursorShape(shape)
      }

      updateCursorColor(lastX, lastY)
    }

    const onDocumentLeave = () => {
      setOpacity(0)
    }

    const onDocumentEnter = () => {
      setOpacity(1)
    }

    const onKeyDown = (e) => {
      if (e.key === 'Tab') enableNativeCursor()
    }

    const onPointerDown = () => {
      enableCustomCursor()
    }

    const tick = () => {
      const now = performance.now()
      if (now - lastDetect > DETECT_INTERVAL) {
        lastDetect = now
        detectHover()
      }

      const { x, y, width, height, opacity, borderRadius } = animate(reducedMotion)

      cursor.style.width = `${width}px`
      cursor.style.height = `${height}px`
      cursor.style.opacity = String(opacity)
      cursor.style.borderRadius = borderRadius
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`

      rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', onDocumentLeave)
    document.documentElement.addEventListener('mouseenter', onDocumentEnter)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown, { passive: true })

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onPointerMove)
      document.documentElement.removeEventListener('mouseleave', onDocumentLeave)
      document.documentElement.removeEventListener('mouseenter', onDocumentEnter)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
      document.documentElement.classList.remove('custom-cursor-active')
      styleEl.remove()
    }
  }, [enabled, updateCursorPosition, updateCursorShape, updateCursorSize, updateCursorColor, setKeyboardMode, setOpacity, animate])

  if (!enabled) return null

  return createPortal(
    <div
      ref={cursorRef}
      aria-hidden
      data-custom-cursor-ignore
      className="fixed left-0 top-0 pointer-events-none"
      style={{
        zIndex: 99999,
        mixBlendMode: 'difference',
        backgroundColor: 'rgb(250, 250, 250)',
        opacity: 0,
        willChange: 'transform, width, height, opacity, border-radius',
        borderRadius: '50%',
      }}
    />,
    document.body,
  )
}

export default CustomCursor
