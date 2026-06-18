import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { isCursorOverText, isInteractiveHoverTarget, getPortraitRect, clearCursorCache } from '@/utils/cursorColors'
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
  const portalWrapperRef = useRef(null)
  const portalImgRef = useRef(null)
  const {
    updateCursorPosition,
    updateCursorState,
    setKeyboardMode,
    setOpacity,
    animate,
  } = useCursorAnimation()

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
    let isTicking = false
    let lastHit = null
    let lastIsText = false
    let lastIsInteractive = false

    const startTick = () => {
      if (!isTicking) {
        isTicking = true
        rafId = requestAnimationFrame(tick)
      }
    }

    const onPointerMove = (e) => {
      updateCursorPosition(e)
      startTick()

      const hit = e.target
      if (!hit) return

      const isText = isCursorOverText(e)
      const isInteractive = !isText && isInteractiveHoverTarget(hit)
      const portraitEl = hit.closest('[data-portal-portrait]')

      let portalData = null
      if (portraitEl) {
        const rect = getPortraitRect(portraitEl)
        if (rect) {
          portalData = {
            img: portraitEl.getAttribute('data-portal-image') || '/hero-portrait-alternate.webp',
            rect,
          }
        }
      }

      if (
        hit !== lastHit ||
        isText !== lastIsText ||
        isInteractive !== lastIsInteractive ||
        (portalData !== null) !== (lastHit && !!lastHit.closest('[data-portal-portrait]'))
      ) {
        lastHit = hit
        lastIsText = isText
        lastIsInteractive = isInteractive
        updateCursorState(isText, isInteractive, portalData)
        startTick()
      }
    }

    const onDocumentLeave = () => {
      setOpacity(0)
      startTick()
    }

    const onDocumentEnter = () => {
      setOpacity(1)
      startTick()
    }

    const onKeyDown = (e) => {
      if (e.key === 'Tab') {
        enableNativeCursor()
        startTick()
      }
    }

    const onPointerDown = () => {
      enableCustomCursor()
      startTick()
    }

    const updateDOMStyles = (x, y, width, height, opacity, borderRadius, portalMode, portalImg, portalRect) => {
      cursor.style.width = `${width}px`
      cursor.style.height = `${height}px`
      cursor.style.opacity = String(opacity)
      cursor.style.borderRadius = borderRadius
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`

      const wrapper = portalWrapperRef.current
      const img = portalImgRef.current

      if (wrapper && img) {
        if (portalMode && portalRect && portalImg) {
          cursor.style.mixBlendMode = 'normal'
          cursor.style.backgroundColor = 'transparent'

          wrapper.style.display = 'block'
          if (img.src !== portalImg) {
            img.src = portalImg
          }

          img.style.width = `${portalRect.width}px`
          img.style.height = `${portalRect.height}px`

          const imgX = portalRect.left - x
          const imgY = portalRect.top - y
          img.style.transform = `translate3d(${imgX}px, ${imgY}px, 0)`
        } else {
          cursor.style.mixBlendMode = 'difference'
          cursor.style.backgroundColor = 'rgb(250, 250, 250)'
          cursor.style.border = 'none'
          wrapper.style.display = 'none'
        }
      }
    }

    const tick = () => {
      const { x, y, width, height, opacity, borderRadius, portalMode, portalImg, portalRect, isIdle } = animate(reducedMotion)

      updateDOMStyles(x, y, width, height, opacity, borderRadius, portalMode, portalImg, portalRect)

      if (isIdle) {
        isTicking = false
        return
      }

      rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', onDocumentLeave)
    document.documentElement.addEventListener('mouseenter', onDocumentEnter)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('scroll', clearCursorCache, { passive: true })
    window.addEventListener('resize', clearCursorCache, { passive: true })

    startTick()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', onPointerMove)
      document.documentElement.removeEventListener('mouseleave', onDocumentLeave)
      document.documentElement.removeEventListener('mouseenter', onDocumentEnter)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', clearCursorCache)
      window.removeEventListener('resize', clearCursorCache)
      document.documentElement.classList.remove('custom-cursor-active')
      styleEl.remove()
    }
  }, [enabled, updateCursorPosition, updateCursorState, setKeyboardMode, setOpacity, animate])

  if (!enabled) return null

  return createPortal(
    <div
      ref={cursorRef}
      aria-hidden
      data-custom-cursor-ignore
      className="fixed left-0 top-0 pointer-events-none overflow-hidden"
      style={{
        zIndex: 99999,
        mixBlendMode: 'difference',
        backgroundColor: 'rgb(250, 250, 250)',
        opacity: 0,
        willChange: 'transform, width, height, opacity, border-radius',
        borderRadius: '50%',
      }}
    >
      <div
        ref={portalWrapperRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 0,
          height: 0,
          pointerEvents: 'none',
          display: 'none',
        }}
      >
        <img
          ref={portalImgRef}
          alt=""
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            maxWidth: 'none',
            objectFit: 'cover',
            objectPosition: 'center',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)',
            maskImage: 'radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)',
            willChange: 'transform',
          }}
        />
      </div>
    </div>,
    document.body,
  )
}

export default CustomCursor
