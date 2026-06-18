import { useRef, useCallback } from 'react'

const CURSOR_CONFIG = {
  sizes: {
    default: 16,
    text: 80,
    interactive: 48,
    portal: 180,
  },
  lerp: {
    pos: 0.18,
    size: 0.14,
    opacity: 0.22,
  },
  thresholds: {
    pos: 0.05,
    size: 0.05,
    opacity: 0.005,
  }
}

export function useCursorAnimation() {
  const state = useRef({
    tx: -200,
    ty: -200,
    x: -200,
    y: -200,
    size: CURSOR_CONFIG.sizes.default,
    targetSize: CURSOR_CONFIG.sizes.default,
    opacity: 0,
    targetOpacity: 0,
    snapped: false,
    keyboardMode: false,
    portalMode: false,
    portalImg: null,
    portalRect: null,
  })

  const updateCursorPosition = useCallback((e) => {
    if (state.current.keyboardMode) return

    state.current.tx = e.clientX
    state.current.ty = e.clientY
    state.current.targetOpacity = 1

    if (!state.current.snapped) {
      state.current.x = e.clientX
      state.current.y = e.clientY
      state.current.snapped = true
    }
  }, [])

  const updateCursorState = useCallback((isText, isInteractive, portalData = null) => {
    const s = state.current
    if (portalData) {
      s.portalMode = true
      s.portalImg = portalData.img
      s.portalRect = portalData.rect
      s.targetSize = CURSOR_CONFIG.sizes.portal
    } else {
      s.portalMode = false
      s.portalImg = null
      s.portalRect = null
      if (isText) {
        s.targetSize = CURSOR_CONFIG.sizes.text
      } else if (isInteractive) {
        s.targetSize = CURSOR_CONFIG.sizes.interactive
      } else {
        s.targetSize = CURSOR_CONFIG.sizes.default
      }
    }
  }, [])

  const setKeyboardMode = useCallback((enabled) => {
    state.current.keyboardMode = enabled
    state.current.targetOpacity = enabled ? 0 : 1
  }, [])

  const setOpacity = useCallback((opacity) => {
    state.current.targetOpacity = opacity
    if (opacity === 0) {
      state.current.snapped = false
    }
  }, [])

  const animate = useCallback((reducedMotion) => {
    const s = state.current
    const posLerp = reducedMotion ? 1 : CURSOR_CONFIG.lerp.pos
    const sizeLerp = reducedMotion ? 1 : CURSOR_CONFIG.lerp.size

    const dx = s.tx - s.x
    const dy = s.ty - s.y
    const ds = s.targetSize - s.size
    const do_ = s.targetOpacity - s.opacity

    // Check if the values have virtually settled (sub-pixel thresholds)
    const isIdle =
      Math.abs(dx) < CURSOR_CONFIG.thresholds.pos &&
      Math.abs(dy) < CURSOR_CONFIG.thresholds.pos &&
      Math.abs(ds) < CURSOR_CONFIG.thresholds.size &&
      Math.abs(do_) < CURSOR_CONFIG.thresholds.opacity

    if (isIdle) {
      s.x = s.tx
      s.y = s.ty
      s.size = s.targetSize
      s.opacity = s.targetOpacity
    } else {
      s.x += dx * posLerp
      s.y += dy * posLerp
      s.size += ds * sizeLerp
      s.opacity += do_ * CURSOR_CONFIG.lerp.opacity
    }

    return {
      x: s.x,
      y: s.y,
      width: s.size,
      height: s.size,
      opacity: s.opacity,
      borderRadius: '50%',
      portalMode: s.portalMode,
      portalImg: s.portalImg,
      portalRect: s.portalRect,
      isIdle,
    }
  }, [])

  return {
    updateCursorPosition,
    updateCursorState,
    setKeyboardMode,
    setOpacity,
    animate,
  }
}
