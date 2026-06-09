import { useRef, useCallback } from 'react'
import { colorToCss, sampleColorsAt } from '@/utils/cursorColors'

const SIZE_DEFAULT = 16
const SIZE_TEXT = 80
const SIZE_INTERACTIVE = 48
const LERP_POS = 0.18
const LERP_SIZE = 0.14
const LERP_SHAPE = 0.35

export function useCursorAnimation(cursorRef) {
  const state = useRef({
    tx: -200,
    ty: -200,
    x: -200,
    y: -200,
    size: SIZE_DEFAULT,
    targetSize: SIZE_DEFAULT,
    opacity: 0,
    targetOpacity: 0,
    fg: { r: 250, g: 250, b: 250, a: 1 },
    snapped: false,
    keyboardMode: false,
    lastSample: 0,
    // Shape transformation properties
    targetWidth: SIZE_DEFAULT,
    targetHeight: SIZE_DEFAULT,
    targetBorderRadius: '50%',
    currentWidth: SIZE_DEFAULT,
    currentHeight: SIZE_DEFAULT,
    currentBorderRadius: '50%',
    isShapeMode: false,
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

  const updateCursorShape = useCallback((shape) => {
    if (shape && shape.isInteractive) {
      // Expand cursor size for interactive elements, but keep it circular
      state.current.targetSize = SIZE_INTERACTIVE
      state.current.targetWidth = SIZE_INTERACTIVE
      state.current.targetHeight = SIZE_INTERACTIVE
      state.current.targetBorderRadius = '50%'
      state.current.isShapeMode = false
    } else {
      state.current.targetSize = SIZE_DEFAULT
      state.current.targetWidth = SIZE_DEFAULT
      state.current.targetHeight = SIZE_DEFAULT
      state.current.targetBorderRadius = '50%'
      state.current.isShapeMode = false
    }
  }, [])

  const updateCursorSize = useCallback((isText) => {
    state.current.targetSize = isText ? SIZE_TEXT : SIZE_DEFAULT
    if (isText) {
      state.current.targetWidth = SIZE_TEXT
      state.current.targetHeight = SIZE_TEXT
      state.current.targetBorderRadius = '50%'
      state.current.isShapeMode = false
    }
  }, [])

  const updateCursorColor = useCallback((x, y) => {
    const now = performance.now()
    if (now - state.current.lastSample > 32) {
      state.current.lastSample = now
      const { fg } = sampleColorsAt(x, y)
      state.current.fg = fg
      if (cursorRef.current) {
        cursorRef.current.style.backgroundColor = colorToCss(fg)
      }
    }
  }, [cursorRef])

  const setKeyboardMode = useCallback((enabled) => {
    state.current.keyboardMode = enabled
    state.current.targetOpacity = enabled ? 0 : 1
  }, [])

  const setOpacity = useCallback((opacity) => {
    state.current.targetOpacity = opacity
  }, [])

  const animate = useCallback((reducedMotion) => {
    const s = state.current
    const posLerp = reducedMotion ? 1 : LERP_POS
    const sizeLerp = reducedMotion ? 1 : LERP_SIZE

    s.x += (s.tx - s.x) * posLerp
    s.y += (s.ty - s.y) * posLerp
    s.size += (s.targetSize - s.size) * sizeLerp
    s.opacity += (s.targetOpacity - s.opacity) * 0.22

    // Interpolate shape properties
    s.currentWidth += (s.targetWidth - s.currentWidth) * LERP_SHAPE
    s.currentHeight += (s.targetHeight - s.currentHeight) * LERP_SHAPE

    return {
      x: s.x,
      y: s.y,
      width: s.isShapeMode ? s.currentWidth : s.size,
      height: s.isShapeMode ? s.currentHeight : s.size,
      opacity: s.opacity,
      borderRadius: s.isShapeMode ? s.targetBorderRadius : '50%',
    }
  }, [])

  return {
    updateCursorPosition,
    updateCursorShape,
    updateCursorSize,
    updateCursorColor,
    setKeyboardMode,
    setOpacity,
    animate,
  }
}
