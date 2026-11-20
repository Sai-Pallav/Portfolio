import { useState, useCallback, useRef, useEffect, memo } from 'react'
import {
  useWireframeConfig,
  DEFAULT_SIDE_CONFIG,
  PRESETS,
} from './WireframeConfigContext'

/* ─── Thin scrollbar style injected once ──────────────────────────────── */
const SCROLLBAR_STYLE = `
  .wf-scroll::-webkit-scrollbar { width: 5px; }
  .wf-scroll::-webkit-scrollbar-track { background: transparent; }
  .wf-scroll::-webkit-scrollbar-thumb {
    background: rgba(0,210,255,0.28);
    border-radius: 10px;
  }
  .wf-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,210,255,0.55); }
  .wf-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,210,255,0.28) transparent; }

  .wf-scroll-x::-webkit-scrollbar { height: 4px; width: 4px; }
  .wf-scroll-x::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 4px; }
  .wf-scroll-x::-webkit-scrollbar-thumb {
    background: rgba(0,210,255,0.32);
    border-radius: 4px;
  }
  .wf-scroll-x::-webkit-scrollbar-thumb:hover { background: rgba(0,210,255,0.65); }
  .wf-scroll-x { scrollbar-width: thin; scrollbar-color: rgba(0,210,255,0.32) transparent; }
`
let _styleInjected = false
function injectScrollbarStyle() {
  if (_styleInjected || typeof document === 'undefined') return
  _styleInjected = true
  const s = document.createElement('style')
  s.textContent = SCROLLBAR_STYLE
  document.head.appendChild(s)
}

/* ─── Section divider ─────────────────────────────────────────────────── */
function SectionLabel({ children, right }) {
  return (
    <div className="mt-2 mb-0.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/30 rounded border border-cyan-800/30 flex items-center justify-between">
      <span>{children}</span>
      {right && <span className="text-[9px] text-cyan-300 font-normal">{right}</span>}
    </div>
  )
}

/**
 * Smooth horizontal scroll container supporting:
 * 1. Mouse wheel horizontal scrolling (including deltaY -> horizontal mapping for standard mice)
 * 2. Click-and-drag grab-to-scroll with mouse
 * 3. Left & Right clickable chevron buttons with soft gradient fade
 * 4. Custom thin cyan scrollbar
 */
function HorizontalScrollContainer({ children, className = '', containerRef = null }) {
  const innerRef = useRef(null)
  const ref = containerRef || innerRef
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const isDraggingRef = useRef(false)
  const dragInfoRef = useRef({ startX: 0, scrollLeft: 0, hasMoved: false })

  const updateScrollState = () => {
    const el = ref.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return

    updateScrollState()
    const onScroll = () => updateScrollState()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updateScrollState)

    const mo = new MutationObserver(updateScrollState)
    mo.observe(el, { childList: true, subtree: true })

    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateScrollState)
      mo.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  // Mouse wheel listener dedicated to horizontal container
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleWheel = (e) => {
      e.stopPropagation()
      e.preventDefault()
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      el.scrollLeft += delta
      updateScrollState()
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  // Click-and-drag mouse handler
  const handlePointerDown = (e) => {
    if (e.button !== 0) return
    const el = ref.current
    if (!el) return

    isDraggingRef.current = true
    dragInfoRef.current = {
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      hasMoved: false,
    }

    const onPointerMove = (ev) => {
      if (!isDraggingRef.current) return
      const dx = ev.clientX - dragInfoRef.current.startX
      if (Math.abs(dx) > 3) {
        dragInfoRef.current.hasMoved = true
      }
      el.scrollLeft = dragInfoRef.current.scrollLeft - dx
      updateScrollState()
    }

    const onPointerUp = () => {
      isDraggingRef.current = false
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const handleClickCapture = (e) => {
    if (dragInfoRef.current.hasMoved) {
      e.stopPropagation()
      e.preventDefault()
      dragInfoRef.current.hasMoved = false
    }
  }

  const scrollByDelta = (dx) => {
    ref.current?.scrollBy({ left: dx, behavior: 'smooth' })
  }

  return (
    <div className="relative group/hscroll w-full overflow-hidden">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByDelta(-140)}
          className="absolute left-0 top-0 bottom-0 z-20 w-6 flex items-center justify-center bg-gradient-to-r from-neutral-950 via-neutral-950/90 to-transparent text-cyan-400 hover:text-white font-bold text-sm transition-all"
          title="Scroll left"
        >
          ‹
        </button>
      )}

      <div
        ref={ref}
        onPointerDown={handlePointerDown}
        onClickCapture={handleClickCapture}
        data-scroll-x="true"
        className={`wf-scroll-x overflow-x-auto scroll-smooth cursor-grab active:cursor-grabbing select-none ${className}`}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByDelta(140)}
          className="absolute right-0 top-0 bottom-0 z-20 w-6 flex items-center justify-center bg-gradient-to-l from-neutral-950 via-neutral-950/90 to-transparent text-cyan-400 hover:text-white font-bold text-sm transition-all"
          title="Scroll right"
        >
          ›
        </button>
      )}
    </div>
  )
}

/**
 * Clean numeric slider control row with direct click-to-type precision editing
 */
function ControlSlider({
  label,
  description,
  paramKey,
  min,
  max,
  step = 0.05,
  unit = '',
  value,
  defaultValue,
  onChange,
  onReset,
}) {
  const isChanged = Math.abs((value ?? defaultValue) - defaultValue) > 0.001
  const displayVal = value !== undefined && value !== null ? value : defaultValue
  const [isEditing, setIsEditing] = useState(false)
  const [tempVal, setTempVal] = useState('')

  const handleStartEdit = () => {
    setTempVal(
      typeof displayVal === 'number'
        ? Number.isInteger(step)
          ? String(displayVal)
          : displayVal.toFixed(2)
        : String(displayVal)
    )
    setIsEditing(true)
  }

  const handleCommitEdit = () => {
    setIsEditing(false)
    const parsed = parseFloat(tempVal)
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed))
      onChange(paramKey, clamped)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCommitEdit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  return (
    <div className="flex flex-col gap-1 py-1.5 px-2.5 rounded-lg transition-colors hover:bg-white/[0.03]">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-neutral-200">{label}</span>
          {isChanged && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" title="Modified" />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isEditing ? (
            <input
              type="number"
              value={tempVal}
              onChange={(e) => setTempVal(e.target.value)}
              onBlur={handleCommitEdit}
              onKeyDown={handleKeyDown}
              autoFocus
              step={step}
              className="w-16 px-1 py-0.5 text-[11px] font-mono rounded bg-black/80 border border-cyan-400 text-cyan-300 text-right focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              title="Click to type exact value"
              className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-cyan-950/40 border border-white/10 hover:border-cyan-500/40 text-cyan-300 min-w-[48px] text-right tabular-nums transition-colors cursor-text"
            >
              {typeof displayVal === 'number'
                ? Number.isInteger(step)
                  ? displayVal
                  : displayVal.toFixed(2)
                : displayVal}
              {unit}
            </button>
          )}
          {isChanged && (
            <button
              onClick={() => onReset(paramKey, defaultValue)}
              title="Reset to default"
              className="text-neutral-500 hover:text-cyan-400 text-[10px] p-0.5 rounded transition-colors"
            >
              ↺
            </button>
          )}
        </div>
      </div>
      {description && (
        <span className="text-[10px] text-neutral-500 leading-tight">{description}</span>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={displayVal}
        onChange={(e) => onChange(paramKey, parseFloat(e.target.value))}
        className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 focus:outline-none mt-0.5"
      />
      <div className="flex justify-between text-[9px] text-neutral-600 px-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

export default memo(function WireframeController() {
  const {
    leftConfig,
    rightConfig,
    linkSides,
    activeSideTab,
    updateParam,
    applyPreset,
    resetToDefaults,
    saveToLocalStorage,
    copyConfigJson,
    loadCustomJson,
  } = useWireframeConfig()

  const [isOpen, setIsOpen] = useState(true)
  const [activeCategory, setActiveCategory] = useState('dimensions')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState(false)
  const [pasteInput, setPasteInput] = useState('')
  const [pasteError, setPasteError] = useState(null)

  // ── DRAGGABLE PANEL POSITION STATE ──
  const [panelPos, setPanelPos] = useState(null) // null = default bottom-right
  const [isDraggingPanel, setIsDraggingPanel] = useState(false)
  const panelRef = useRef(null)
  const dragStartRef = useRef({ startMouseX: 0, startMouseY: 0, startPanelX: 0, startPanelY: 0 })

  // ── RESIZABLE PANEL ──
  const [panelWidth, setPanelWidth] = useState(390)
  const [panelHeight, setPanelHeight] = useState(null) // null = auto
  const isResizingRef = useRef(false)
  const resizeStartRef = useRef({ mx: 0, my: 0, w: 390, h: 0 })

  const handleResizePointerDown = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    isResizingRef.current = true
    const rect = panelRef.current?.getBoundingClientRect()
    if (!panelPos && rect) {
      setPanelPos({ x: rect.left, y: rect.top })
    }
    resizeStartRef.current = {
      mx: e.clientX,
      my: e.clientY,
      w: rect ? rect.width : panelWidth,
      h: rect ? rect.height : 520,
    }
    const onMove = (ev) => {
      if (!isResizingRef.current) return
      const dw = ev.clientX - resizeStartRef.current.mx
      const dh = ev.clientY - resizeStartRef.current.my
      setPanelWidth(Math.max(300, Math.min(620, resizeStartRef.current.w + dw)))
      setPanelHeight(Math.max(260, Math.min(window.innerHeight - 40, resizeStartRef.current.h + dh)))
    }
    const onUp = () => {
      isResizingRef.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [panelPos, panelWidth])

  // Inject scrollbar style once
  useEffect(() => { injectScrollbarStyle() }, [])

  const scrollContainerRef = useRef(null)
  const tabsContainerRef = useRef(null)

  // Auto-scroll active tab button into center view
  useEffect(() => {
    if (!tabsContainerRef.current) return
    const activeBtn = tabsContainerRef.current.querySelector(`[data-tab-id="${activeCategory}"]`)
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [activeCategory])

  // ── MOUSE WHEEL & LENIS SCROLL CONTROL ──
  // Pauses Lenis page scroll when mouse enters controller panel.
  // Routes wheel events to active horizontal containers, code blocks, or main controls body.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const handleMouseEnter = () => {
      if (window.lenis && typeof window.lenis.stop === 'function') {
        window.lenis.stop()
      }
    }

    const handleMouseLeave = () => {
      if (window.lenis && typeof window.lenis.start === 'function') {
        window.lenis.start()
      }
    }

    panel.addEventListener('mouseenter', handleMouseEnter)
    panel.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      panel.removeEventListener('mouseenter', handleMouseEnter)
      panel.removeEventListener('mouseleave', handleMouseLeave)
      if (window.lenis && typeof window.lenis.start === 'function') {
        window.lenis.start()
      }
    }
  }, [])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const handleWheel = (e) => {
      // 1. If mouse is over a designated horizontal scroll container, let its listener handle it
      if (e.target.closest('[data-scroll-x="true"]')) {
        return
      }

      // 2. If mouse is over a pre or textarea, let its native or local scroll work
      const textBlock = e.target.closest('pre, textarea')
      if (textBlock) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
          e.stopPropagation()
          e.preventDefault()
          textBlock.scrollLeft += e.deltaX || e.deltaY
          return
        }
        if (textBlock.scrollHeight > textBlock.clientHeight) {
          e.stopPropagation()
          return
        }
      }

      // 3. Otherwise, smoothly scroll the main controls container vertically
      if (scrollContainerRef.current) {
        e.stopPropagation()
        e.preventDefault()
        scrollContainerRef.current.scrollTop += e.deltaY
      }
    }

    panel.addEventListener('wheel', handleWheel, { passive: false })
    return () => panel.removeEventListener('wheel', handleWheel)
  }, [])

  // Current config being edited
  const currentConfig = linkSides || activeSideTab === 'left' ? leftConfig : rightConfig

  const handleSliderChange = useCallback((key, val) => {
    updateParam(key, val)
  }, [updateParam])

  const handleSliderReset = useCallback((key, defaultVal) => {
    updateParam(key, defaultVal)
  }, [updateParam])

  const handleCopy = useCallback(async () => {
    const success = await copyConfigJson()
    if (success) {
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2200)
    }
  }, [copyConfigJson])

  const handleSave = useCallback(() => {
    const success = saveToLocalStorage()
    if (success) {
      setSaveFeedback(true)
      setTimeout(() => setSaveFeedback(false), 2200)
    }
  }, [saveToLocalStorage])

  const handleLoadJson = useCallback(() => {
    if (!pasteInput.trim()) return
    const success = loadCustomJson(pasteInput)
    if (success) {
      setPasteError(null)
      setPasteInput('')
    } else {
      setPasteError('Invalid JSON format. Please verify structure.')
    }
  }, [pasteInput, loadCustomJson])

  // ── HEADER DRAG HANDLER (Move controller anywhere) ──
  const handleHeaderPointerDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return
    e.preventDefault()

    const rect = panelRef.current?.getBoundingClientRect()
    const currentX = panelPos ? panelPos.x : (rect ? rect.left : window.innerWidth - 410)
    const currentY = panelPos ? panelPos.y : (rect ? rect.top : window.innerHeight - 560)

    dragStartRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPanelX: currentX,
      startPanelY: currentY,
    }

    setIsDraggingPanel(true)
  }

  useEffect(() => {
    if (!isDraggingPanel) return

    const handlePointerMove = (e) => {
      const deltaX = e.clientX - dragStartRef.current.startMouseX
      const deltaY = e.clientY - dragStartRef.current.startMouseY
      const newX = dragStartRef.current.startPanelX + deltaX
      const newY = dragStartRef.current.startPanelY + deltaY

      // Clamp within viewport
      const panelWidth = panelRef.current ? panelRef.current.offsetWidth : 390
      const panelHeight = panelRef.current ? panelRef.current.offsetHeight : 520
      const clampedX = Math.max(10, Math.min(window.innerWidth - panelWidth - 10, newX))
      const clampedY = Math.max(10, Math.min(window.innerHeight - panelHeight - 10, newY))

      setPanelPos({ x: clampedX, y: clampedY })
    }

    const handlePointerUp = () => {
      setIsDraggingPanel(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDraggingPanel])

  // If collapsed: Sleek minimized floating pill
  if (!isOpen) {
    return (
      <div
        style={
          panelPos
            ? {
                left: `${panelPos.x}px`,
                top: `${panelPos.y}px`,
                right: 'auto',
                bottom: 'auto',
              }
            : undefined
        }
        className="fixed bottom-6 right-6 z-50 pointer-events-auto select-none"
      >
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-neutral-950/85 backdrop-blur-xl border border-cyan-500/30 text-white shadow-[0_8px_32px_rgba(0,180,255,0.22)] hover:border-cyan-400 hover:shadow-[0_8px_36px_rgba(0,210,255,0.35)] transition-all duration-300"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
          </span>
          <span className="text-xs font-medium tracking-wide text-neutral-200 group-hover:text-white">
            🎛️ Wireframe Ribbon Controls
          </span>
        </button>
      </div>
    )
  }

  return (
    <div
      ref={panelRef}
      data-lenis-prevent="true"
      data-lenis-prevent
      style={
        panelPos
          ? {
              left: `${panelPos.x}px`,
              top: `${panelPos.y}px`,
              right: 'auto',
              bottom: 'auto',
              width: `${panelWidth}px`,
              ...(panelHeight ? { height: `${panelHeight}px` } : {}),
            }
          : {
              width: `${panelWidth}px`,
              ...(panelHeight ? { height: `${panelHeight}px` } : {}),
            }
      }
      className={`fixed ${!panelPos ? 'bottom-4 right-4 md:bottom-6 md:right-6' : ''} z-50 max-w-[90vw] flex flex-col bg-neutral-950/92 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.85)] text-white overflow-hidden pointer-events-auto select-none font-sans transition-shadow ${
        isDraggingPanel ? 'shadow-[0_20px_60px_rgba(0,200,255,0.25)] border-cyan-500/40' : ''
      }`}
    >
      {/* ── DRAGGABLE HEADER ── */}
      <div
        onPointerDown={handleHeaderPointerDown}
        className={`flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-white/[0.03] cursor-grab active:cursor-grabbing select-none ${
          isDraggingPanel ? 'bg-cyan-500/10' : ''
        }`}
        title="Click and drag anywhere on this header to move the window"
      >
        <div className="flex items-center gap-2">
          <span className="text-neutral-400 text-xs tracking-tighter font-mono font-bold" title="Drag Handle">
            ⋮⋮
          </span>
          <span className="text-sm">🎛️</span>
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-white flex items-center gap-1.5">
              Side Ribbon Controls
              {panelPos && (
                <span className="text-[9px] text-cyan-400 font-normal px-1 py-0.2 rounded bg-cyan-950 border border-cyan-800/40">
                  Floating
                </span>
              )}
            </h3>
            <p className="text-[10px] text-neutral-400 leading-none">Drag header · resize corner ↘</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {panelPos && (
            <button
              onClick={() => setPanelPos(null)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors border border-white/10"
              title="Snap back to default corner"
            >
              ↺ Corner
            </button>
          )}
          <button
            onClick={() => { setPanelWidth(390); setPanelHeight(null) }}
            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors border border-white/10"
            title="Reset panel size"
          >
            ⊡
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 text-neutral-400 hover:text-white text-xs transition-colors"
            title="Minimize controller"
          >
            _
          </button>
        </div>
      </div>

      {/* ── PRESETS BAR ── */}
      <div className="px-3 py-2 border-b border-white/5 bg-white/[0.01]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Quick Presets</span>
          <button
            onClick={resetToDefaults}
            className="text-[10px] text-neutral-400 hover:text-cyan-300 transition-colors"
          >
            Reset All Defaults
          </button>
        </div>
        <HorizontalScrollContainer className="flex gap-1.5 pb-1">
          {Object.entries(PRESETS).map(([key, item]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              title={item.description}
              className="shrink-0 px-2.5 py-1 text-[11px] rounded-full whitespace-nowrap bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/40 border border-white/10 text-neutral-300 hover:text-cyan-200 transition-all duration-200"
            >
              {item.name}
            </button>
          ))}
        </HorizontalScrollContainer>
      </div>

      {/* ── CHANNEL SYMMETRY STATUS ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-cyan-950/20 text-[11px]">
        <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
          <span>🔗</span>
          <span>Symmetrical Ribbons (Left & Right Mirrored)</span>
        </div>
        <span className="text-[10px] text-neutral-400">1 unified control</span>
      </div>

      {/* ── CATEGORY TABS ── */}
      <div className="border-b border-white/10 bg-black/40">
        <HorizontalScrollContainer containerRef={tabsContainerRef} className="flex text-[11px] pb-0.5">
          {[
            { id: 'dimensions', label: '📏 Size & Strings' },
            { id: 'waves', label: '〰️ Waves & Amplitudes' },
            { id: 'heroRibbons', label: '🎚️ 4 Ribbons Detail' },
            { id: 'ends', label: '🎯 Ends & Tilt' },
            { id: 'style', label: '✨ Glow' },
            { id: 'json', label: '📋 Values' },
          ].map((tab) => (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`shrink-0 px-3 py-2 text-center whitespace-nowrap border-b-2 text-xs font-medium transition-all duration-200 ${
                activeCategory === tab.id
                  ? 'border-cyan-400 text-cyan-300 font-semibold bg-white/[0.04]'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.02]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </HorizontalScrollContainer>
      </div>

      {/* ── SCROLLABLE CONTROLS BODY ── */}
      <div
        ref={scrollContainerRef}
        data-lenis-prevent="true"
        data-lenis-prevent
        className="wf-scroll flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-1 text-xs overscroll-contain"
        style={{ maxHeight: panelHeight ? `${panelHeight - 180}px` : '64vh' }}
      >
        {/* ══════════════════════════════════════════════════════
            1. SIZE & SPREAD TAB
        ══════════════════════════════════════════════════════ */}
        {activeCategory === 'dimensions' && (
          <div className="space-y-0.5 pb-2">
            <SectionLabel right="Vertical & Fibers">Ribbon Spread & Breadth</SectionLabel>
            <ControlSlider
              label="Width (Ribbon Breadth)"
              description="Vertical height & overall width/spread of the ribbons"
              paramKey="breadthMultiplier"
              min={0.2} max={3.5} step={0.05} unit="x"
              value={currentConfig.breadthMultiplier}
              defaultValue={DEFAULT_SIDE_CONFIG.breadthMultiplier}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Strand Spread"
              description="Radial spread & fullness of companion silk filaments"
              paramKey="strandSpread"
              min={0.1} max={3.0} step={0.05} unit="x"
              value={currentConfig.strandSpread}
              defaultValue={DEFAULT_SIDE_CONFIG.strandSpread}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel right="Bundle & Filaments">String Strands & Fiber Width</SectionLabel>
            <ControlSlider
              label="String Count (Strings per Ribbon)"
              description="Number of bundled silk strings running through each wave (2 to 30 strands)"
              paramKey="stringCount"
              min={2} max={30} step={1} unit=" strings"
              value={currentConfig.stringCount ?? 11}
              defaultValue={DEFAULT_SIDE_CONFIG.stringCount}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="String Width / Thickness"
              description="Width and thickness of individual strings in the ribbon bundle"
              paramKey="stringWidth"
              min={0.2} max={4.0} step={0.05} unit="x"
              value={currentConfig.stringWidth ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.stringWidth}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel>Proportional Scales</SectionLabel>
            <ControlSlider
              label="Total Length Multiplier"
              description="Proportional scale multiplier across the entire ribbon span"
              paramKey="lengthMultiplier"
              min={0.2} max={3.0} step={0.05} unit="x"
              value={currentConfig.lengthMultiplier}
              defaultValue={DEFAULT_SIDE_CONFIG.lengthMultiplier}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Depth (Z-Spread)"
              description="Volumetric thickness along the camera depth axis"
              paramKey="depthMultiplier"
              min={0.1} max={3.0} step={0.05} unit="x"
              value={currentConfig.depthMultiplier}
              defaultValue={DEFAULT_SIDE_CONFIG.depthMultiplier}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel right="Ends & Reach">Outer End Length & Reach</SectionLabel>
            <ControlSlider
              label="Outer End Length (Extension)"
              description="Extends ribbon outer ends far outward past screen borders"
              paramKey="outerExtension"
              min={-2.0} max={12.0} step={0.10} unit="u"
              value={currentConfig.outerExtension ?? 1.5}
              defaultValue={DEFAULT_SIDE_CONFIG.outerExtension}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Outer Ends Flexibility"
              description="Harmonic wave flexibility & flutter at outer ends"
              paramKey="outerFlexibility"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.outerFlexibility ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.outerFlexibility}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Outer Ends Flare (Fan-Out)"
              description="Vertical fan-out & separation of ribbon streams at outer tips"
              paramKey="outerFlare"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.outerFlare ?? 0.6}
              defaultValue={DEFAULT_SIDE_CONFIG.outerFlare}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon Spacing: Outer Wingtips"
              description="Distance multiplier between all ribbons at outer wingtips (fanning out)"
              paramKey="ribbonSpacingOuter"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbonSpacingOuter ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbonSpacingOuter}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon Spacing: Inner Globe End"
              description="Distance multiplier between all ribbons at inner globe connection (converging)"
              paramKey="ribbonSpacingInner"
              min={0.0} max={2.0} step={0.05} unit="x"
              value={currentConfig.ribbonSpacingInner ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbonSpacingInner}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel right="Inner End">Inner End & Globe Connection</SectionLabel>
            <ControlSlider
              label="Inner End Length"
              description="Lengthens ribbon towards/into the central globe"
              paramKey="innerExtension"
              min={-2.0} max={3.0} step={0.05} unit="u"
              value={currentConfig.innerExtension ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.innerExtension}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Inner Gap Fine Offset"
              description="Fine gap offset where ribbon connects near globe center"
              paramKey="innerGap"
              min={-1.0} max={1.0} step={0.02} unit="u"
              value={currentConfig.innerGap ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.innerGap}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel>Global Position</SectionLabel>
            <ControlSlider
              label="Vertical Shift (Y)"
              description="Moves entire ribbon assembly up or down"
              paramKey="yOffset"
              min={-2.5} max={2.5} step={0.05}
              value={currentConfig.yOffset}
              defaultValue={DEFAULT_SIDE_CONFIG.yOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Horizontal Shift (X)"
              description="Moves ribbon assembly left or right"
              paramKey="xOffset"
              min={-2.0} max={2.0} step={0.05}
              value={currentConfig.xOffset}
              defaultValue={DEFAULT_SIDE_CONFIG.xOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Depth Shift (Z)"
              description="Pushes assembly towards/away from camera"
              paramKey="zOffset"
              min={-3.0} max={3.0} step={0.05}
              value={currentConfig.zOffset ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.zOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel>Rotation & Tilt</SectionLabel>
            <ControlSlider
              label="2D Tilt (Z-Rotation)"
              description="In-plane screen tilt angle"
              paramKey="tiltZ"
              min={-60} max={60} step={1} unit="°"
              value={currentConfig.tiltZ}
              defaultValue={DEFAULT_SIDE_CONFIG.tiltZ}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="3D Pitch (X-Rotation)"
              description="Forward/backward 3D tilt"
              paramKey="pitchX"
              min={-60} max={60} step={1} unit="°"
              value={currentConfig.pitchX}
              defaultValue={DEFAULT_SIDE_CONFIG.pitchX}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="3D Yaw (Y-Rotation)"
              description="Left/right 3D spin"
              paramKey="yawY"
              min={-60} max={60} step={1} unit="°"
              value={currentConfig.yawY}
              defaultValue={DEFAULT_SIDE_CONFIG.yawY}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            2. WAVES & MOTION TAB
        ══════════════════════════════════════════════════════ */}
        {activeCategory === 'waves' && (
          <div className="space-y-0.5 pb-2">
            <SectionLabel right="Global Multiplier">Master Wave Amplitude</SectionLabel>
            <ControlSlider
              label="Master Wave Amplitude"
              description="Scales all 4 hero ribbons together symmetrically (0 = flat beam, 3 = very steep)"
              paramKey="amplitude"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.amplitude}
              defaultValue={DEFAULT_SIDE_CONFIG.amplitude}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel right="4 Hero Ribbons (Symmetrical)">Individual Ribbon Amplitude</SectionLabel>
            <ControlSlider
              label="Ribbon 1: Upper Arch Amplitude"
              description="Cyan-White upper almond wave crest amplitude"
              paramKey="ribbon1Amp"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbon1Amp ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon1Amp}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon 2: Lower Arch Amplitude"
              description="Cyan-White lower almond wave trough amplitude"
              paramKey="ribbon2Amp"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbon2Amp ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon2Amp}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon 3: Violet Accent Amplitude"
              description="Magenta/violet (#b83dff) center-to-lower accent wave amplitude"
              paramKey="ribbon3Amp"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbon3Amp ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon3Amp}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon 4: Counter-Braid Amplitude"
              description="Electric blue-cyan secondary counter-braid wave amplitude"
              paramKey="ribbon4Amp"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbon4Amp ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon4Amp}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel>Frequency & Wavelength</SectionLabel>
            <ControlSlider
              label="Frequency / Wavelength"
              description="Cycles per span — more = tighter oscillating loops"
              paramKey="frequency"
              min={0.2} max={5.0} step={0.05} unit="x"
              value={currentConfig.frequency}
              defaultValue={DEFAULT_SIDE_CONFIG.frequency}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel>Depth & Screen-Plane</SectionLabel>
            <ControlSlider
              label="Z-Depth Wave Amplitude"
              description="Oscillation depth into and out of the screen plane"
              paramKey="zAmplitude"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.zAmplitude}
              defaultValue={DEFAULT_SIDE_CONFIG.zAmplitude}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel right="Tips & Flutter">Curvature, Shape & Outer Ends</SectionLabel>
            <ControlSlider
              label="Wing Sweep Curvature"
              description="Parabolic upward sweep of the outer wing arc"
              paramKey="wingSweep"
              min={-0.8} max={1.5} step={0.02}
              value={currentConfig.wingSweep}
              defaultValue={DEFAULT_SIDE_CONFIG.wingSweep}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Outer Ends Flexibility"
              description="Harmonic wave whip & flutter amplitude at outer ends"
              paramKey="outerFlexibility"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.outerFlexibility ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.outerFlexibility}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Outer Ends Flare (Fan-Out)"
              description="Vertical separation & fan-out of ribbons at outer tips"
              paramKey="outerFlare"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.outerFlare ?? 0.6}
              defaultValue={DEFAULT_SIDE_CONFIG.outerFlare}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel>Rotation & Tilt</SectionLabel>
            <ControlSlider
              label="2D Tilt (Z-Rotation)"
              description="In-plane screen tilt angle"
              paramKey="tiltZ"
              min={-60} max={60} step={1} unit="°"
              value={currentConfig.tiltZ}
              defaultValue={DEFAULT_SIDE_CONFIG.tiltZ}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="3D Pitch (X-Rotation)"
              description="Forward/backward 3D tilt"
              paramKey="pitchX"
              min={-60} max={60} step={1} unit="°"
              value={currentConfig.pitchX}
              defaultValue={DEFAULT_SIDE_CONFIG.pitchX}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="3D Yaw (Y-Rotation)"
              description="Left/right 3D spin"
              paramKey="yawY"
              min={-60} max={60} step={1} unit="°"
              value={currentConfig.yawY}
              defaultValue={DEFAULT_SIDE_CONFIG.yawY}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            3. 4 INDIVIDUAL HERO RIBBONS DETAIL (SYMMETRICAL)
        ══════════════════════════════════════════════════════ */}
        {activeCategory === 'heroRibbons' && (
          <div className="space-y-1 pb-2">
            <div className="px-2.5 py-2 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-200">
              <span className="font-semibold block text-cyan-300">4 Hero Ribbons inside each side bundle:</span>
              <span className="text-[10px] text-neutral-400">
                Adjust amplitude, height offset, and frequency for each individual ribbon independently (mirrored on Left & Right).
              </span>
            </div>

            {/* ── Ribbon 1: Upper Arch ── */}
            <SectionLabel right="Cyan-White Core">Ribbon 1: Upper Arch</SectionLabel>
            <ControlSlider
              label="Ribbon 1 Amplitude"
              description="Wave crest height of upper arch ribbon"
              paramKey="ribbon1Amp"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbon1Amp ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon1Amp}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon 1 Height Shift (Y)"
              description="Vertical position offset of upper arch ribbon"
              paramKey="ribbon1YOffset"
              min={-1.5} max={1.5} step={0.02} unit="u"
              value={currentConfig.ribbon1YOffset ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon1YOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon 1 Frequency"
              description="Wave oscillation density and cycles for Ribbon 1"
              paramKey="ribbon1Freq"
              min={0.2} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbon1Freq ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon1Freq}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            {/* ── Ribbon 2: Lower Arch ── */}
            <SectionLabel right="Cyan-White Core">Ribbon 2: Lower Arch</SectionLabel>
            <ControlSlider
              label="Ribbon 2 Amplitude"
              description="Wave trough depth of lower arch ribbon"
              paramKey="ribbon2Amp"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbon2Amp ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon2Amp}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon 2 Height Shift (Y)"
              description="Vertical position offset of lower arch ribbon"
              paramKey="ribbon2YOffset"
              min={-1.5} max={1.5} step={0.02} unit="u"
              value={currentConfig.ribbon2YOffset ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon2YOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon 2 Frequency"
              description="Wave oscillation density and cycles for Ribbon 2"
              paramKey="ribbon2Freq"
              min={0.2} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbon2Freq ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon2Freq}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            {/* ── Ribbon 3: Violet Accent Ribbon ── */}
            <SectionLabel right="#b83dff Accent">Ribbon 3: Violet Accent Ribbon</SectionLabel>
            <ControlSlider
              label="Ribbon 3 Amplitude"
              description="Magenta/violet center-to-lower accent wave amplitude"
              paramKey="ribbon3Amp"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbon3Amp ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon3Amp}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon 3 Height Shift (Y)"
              description="Vertical position offset of violet accent ribbon"
              paramKey="ribbon3YOffset"
              min={-1.5} max={1.5} step={0.02} unit="u"
              value={currentConfig.ribbon3YOffset ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon3YOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon 3 Frequency"
              description="Wave oscillation density and cycles for Ribbon 3"
              paramKey="ribbon3Freq"
              min={0.2} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbon3Freq ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon3Freq}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            {/* ── Ribbon 4: Counter-Braid Ribbon ── */}
            <SectionLabel right="Electric Blue-Cyan">Ribbon 4: Counter-Braid</SectionLabel>
            <ControlSlider
              label="Ribbon 4 Amplitude"
              description="Electric blue-cyan secondary counter-braid wave amplitude"
              paramKey="ribbon4Amp"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbon4Amp ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon4Amp}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon 4 Height Shift (Y)"
              description="Vertical position offset of counter-braid ribbon"
              paramKey="ribbon4YOffset"
              min={-1.5} max={1.5} step={0.02} unit="u"
              value={currentConfig.ribbon4YOffset ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon4YOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon 4 Frequency"
              description="Wave oscillation density and cycles for Ribbon 4"
              paramKey="ribbon4Freq"
              min={0.2} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbon4Freq ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbon4Freq}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            {/* ── Inter-Ribbon Distance / Spacing Controls ── */}
            <SectionLabel right="Inter-Ribbon Gaps">🔗 Inter-Ribbon Distances</SectionLabel>
            <div className="px-2.5 py-2 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-200">
              <span className="font-semibold block text-cyan-300">Pairwise Distances & Spacing:</span>
              <span className="text-[10px] text-neutral-400">
                Increase or decrease the distance between adjacent ribbons.
              </span>
            </div>

            <ControlSlider
              label="Distance: Ribbon 0 ↔ Ribbon 1"
              description="Vertical distance / gap between Ribbon 0 (Upper Arch) and Ribbon 1 (Lower Arch)"
              paramKey="distRibbon01"
              min={-0.8} max={1.5} step={0.02} unit="u"
              value={currentConfig.distRibbon01 ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.distRibbon01}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Distance: Ribbon 1 ↔ Ribbon 2"
              description="Vertical distance / gap between Ribbon 1 (Lower Arch) and Ribbon 2 (Violet Accent)"
              paramKey="distRibbon12"
              min={-0.8} max={1.5} step={0.02} unit="u"
              value={currentConfig.distRibbon12 ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.distRibbon12}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Distance: Ribbon 2 ↔ Ribbon 3"
              description="Vertical distance / gap between Ribbon 2 (Violet Accent) and Ribbon 3 (Counter-Braid)"
              paramKey="distRibbon23"
              min={-0.8} max={1.5} step={0.02} unit="u"
              value={currentConfig.distRibbon23 ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.distRibbon23}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel right="Outer / Inner Taper">Global Ribbon Spacing (Outer vs Inner)</SectionLabel>
            <ControlSlider
              label="Ribbon Spacing: Outer Wingtips"
              description="Distance multiplier between all ribbons at outer wingtips (fanning out)"
              paramKey="ribbonSpacingOuter"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.ribbonSpacingOuter ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbonSpacingOuter}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Ribbon Spacing: Inner Globe End"
              description="Distance multiplier between all ribbons at inner globe connection (converging)"
              paramKey="ribbonSpacingInner"
              min={0.0} max={2.0} step={0.05} unit="x"
              value={currentConfig.ribbonSpacingInner ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.ribbonSpacingInner}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            3. ENDS & POSITION TAB
        ══════════════════════════════════════════════════════ */}
        {activeCategory === 'ends' && (
          <div className="space-y-0.5 pb-2">
            <SectionLabel>Inner End (Globe Interface)</SectionLabel>
            <ControlSlider
              label="Inner End Length"
              description="Stretches inner tip closer to/into central globe"
              paramKey="innerExtension"
              min={-2.0} max={3.0} step={0.05} unit="u"
              value={currentConfig.innerExtension ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.innerExtension}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Inner Height Offset"
              description="Raise or lower the inner connection point"
              paramKey="innerYOffset"
              min={-2.0} max={2.0} step={0.05}
              value={currentConfig.innerYOffset}
              defaultValue={DEFAULT_SIDE_CONFIG.innerYOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Inner Gap Fine Offset"
              description="Fine offset where ribbon connects near globe edge"
              paramKey="innerGap"
              min={-1.0} max={1.0} step={0.02} unit="u"
              value={currentConfig.innerGap ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.innerGap}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Inner Tip Feather Fade"
              description="Smoothstep fade distance at inner tip edge"
              paramKey="innerFade"
              min={0.01} max={0.80} step={0.01}
              value={currentConfig.innerFade}
              defaultValue={DEFAULT_SIDE_CONFIG.innerFade}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel right="Reach & Flexibility">Outer End Reach & Flexibility</SectionLabel>
            <ControlSlider
              label="Outer End Length (Extension)"
              description="Stretches outer tip further outward past screen borders"
              paramKey="outerExtension"
              min={-2.0} max={12.0} step={0.10} unit="u"
              value={currentConfig.outerExtension ?? 1.5}
              defaultValue={DEFAULT_SIDE_CONFIG.outerExtension}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Outer Ends Flexibility"
              description="Fluid wave whip & harmonic flutter at the outer tips"
              paramKey="outerFlexibility"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.outerFlexibility ?? 1.0}
              defaultValue={DEFAULT_SIDE_CONFIG.outerFlexibility}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Outer Ends Flare (Fan-Out)"
              description="Vertical separation & fan-out of ribbons at outer tips"
              paramKey="outerFlare"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.outerFlare ?? 0.6}
              defaultValue={DEFAULT_SIDE_CONFIG.outerFlare}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Outer Tip Soft Fade"
              description="Feather fade distance so outer tips dissolve softly into space"
              paramKey="outerFade"
              min={0.0} max={0.45} step={0.01}
              value={currentConfig.outerFade ?? DEFAULT_SIDE_CONFIG.outerFade}
              defaultValue={DEFAULT_SIDE_CONFIG.outerFade}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Outer Height Offset (Y)"
              description="Vertical position of the outer end"
              paramKey="outerYOffset"
              min={-4.0} max={4.0} step={0.05}
              value={currentConfig.outerYOffset}
              defaultValue={DEFAULT_SIDE_CONFIG.outerYOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Outer Depth Offset (Z)"
              description="Z-depth position of the outer end"
              paramKey="outerZOffset"
              min={-3.0} max={3.0} step={0.05}
              value={currentConfig.outerZOffset ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.outerZOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Outer X Fine Offset"
              description="Fine horizontal nudge of outer end"
              paramKey="outerXOffset"
              min={-2.0} max={2.0} step={0.05}
              value={currentConfig.outerXOffset ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.outerXOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel>Overall Positioning & Tilt</SectionLabel>
            <ControlSlider
              label="Vertical Shift (Y Offset)"
              description="Moves entire ribbon structure up (+) or down (-)"
              paramKey="yOffset"
              min={-2.5} max={2.5} step={0.05}
              value={currentConfig.yOffset}
              defaultValue={DEFAULT_SIDE_CONFIG.yOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Horizontal Shift (X Offset)"
              description="Moves entire ribbon structure left or right"
              paramKey="xOffset"
              min={-2.0} max={2.0} step={0.05}
              value={currentConfig.xOffset}
              defaultValue={DEFAULT_SIDE_CONFIG.xOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Depth Shift (Z Offset)"
              description="Pushes/pulls the ribbon towards or away from camera"
              paramKey="zOffset"
              min={-3.0} max={3.0} step={0.05}
              value={currentConfig.zOffset ?? 0.0}
              defaultValue={DEFAULT_SIDE_CONFIG.zOffset}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="2D Tilt (Z-Rotation)"
              description="Rotational tilt angle in the screen plane"
              paramKey="tiltZ"
              min={-60} max={60} step={1} unit="°"
              value={currentConfig.tiltZ}
              defaultValue={DEFAULT_SIDE_CONFIG.tiltZ}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="3D Pitch (X-Rotation)"
              description="Pitch tilt forward/backward in 3D perspective"
              paramKey="pitchX"
              min={-60} max={60} step={1} unit="°"
              value={currentConfig.pitchX}
              defaultValue={DEFAULT_SIDE_CONFIG.pitchX}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="3D Yaw (Y-Rotation)"
              description="Yaw angle left/right in 3D perspective"
              paramKey="yawY"
              min={-60} max={60} step={1} unit="°"
              value={currentConfig.yawY}
              defaultValue={DEFAULT_SIDE_CONFIG.yawY}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            4. GLOW & STYLE TAB
        ══════════════════════════════════════════════════════ */}
        {activeCategory === 'style' && (
          <div className="space-y-0.5 pb-2">
            <SectionLabel>Opacity & Brightness</SectionLabel>
            <ControlSlider
              label="Wire Opacity"
              description="Overall line opacity of ribbons and companion strands"
              paramKey="wireOpacity"
              min={0.0} max={2.0} step={0.05} unit="x"
              value={currentConfig.wireOpacity}
              defaultValue={DEFAULT_SIDE_CONFIG.wireOpacity}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
            <ControlSlider
              label="Glow Intensity"
              description="Halo bloom and optical fiber glow intensity"
              paramKey="glowIntensity"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.glowIntensity}
              defaultValue={DEFAULT_SIDE_CONFIG.glowIntensity}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />

            <SectionLabel>Nodes & Particles</SectionLabel>
            <ControlSlider
              label="Node & Flare Size"
              description="Size of curve-crossing flares and graph nodes"
              paramKey="nodeScale"
              min={0.0} max={3.0} step={0.05} unit="x"
              value={currentConfig.nodeScale}
              defaultValue={DEFAULT_SIDE_CONFIG.nodeScale}
              onChange={handleSliderChange} onReset={handleSliderReset}
            />
          </div>
        )}

        {/* 5. VALUES & JSON TAB */}
        {activeCategory === 'json' && (
          <div className="space-y-2.5 px-1 py-1">
            <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 text-xs">
              <span className="text-[11px] font-semibold text-cyan-300 block mb-1">
                Active Parameters JSON
              </span>
              <p className="text-[10px] text-neutral-400 mb-2">
                Click Copy below to capture all configured values, or paste custom values to load.
              </p>
              <pre
                data-scroll-x="true"
                className="wf-scroll-x text-[10px] text-neutral-200 font-mono bg-neutral-900/90 p-2.5 rounded border border-white/5 overflow-x-auto max-h-48 select-text"
              >
                {JSON.stringify(
                  linkSides
                    ? currentConfig
                    : { left: leftConfig, right: rightConfig },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/20"
              >
                {copyFeedback ? '✓ Copied to Clipboard!' : '📋 Copy Config JSON'}
              </button>
              <button
                onClick={handleSave}
                className="py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-200 font-medium text-xs transition-colors border border-white/10"
              >
                {saveFeedback ? '✓ Saved!' : '💾 Save to Browser'}
              </button>
            </div>

            <div className="pt-2 border-t border-white/10">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-400 block mb-1">
                Load Custom Config JSON
              </span>
              <textarea
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder='Paste JSON here e.g. {"innerExtension": 1.2, "outerExtension": 2.0, ...}'
                className="w-full h-16 p-2 rounded-lg bg-black/50 border border-white/10 text-[11px] font-mono text-neutral-300 focus:outline-none focus:border-cyan-400 select-text"
              />
              {pasteError && (
                <span className="text-[10px] text-red-400 block mt-1">{pasteError}</span>
              )}
              <button
                onClick={handleLoadJson}
                disabled={!pasteInput.trim()}
                className="mt-1.5 w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 disabled:opacity-40 text-xs font-medium transition-colors"
              >
                Apply Pasted JSON
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div className="flex items-center justify-between px-3.5 py-2 border-t border-white/10 bg-black/60 text-[11px]">
        <button
          onClick={handleCopy}
          className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
        >
          {copyFeedback ? '✓ Copied!' : '📋 Copy Values'}
        </button>
        <div className="flex items-center gap-2 text-neutral-500 text-[10px]">
          <span>W:{Math.round(panelWidth)}px</span>
          {panelHeight && <span>H:{Math.round(panelHeight)}px</span>}
        </div>
        <button
          onClick={resetToDefaults}
          className="text-neutral-400 hover:text-white transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* ── RESIZE HANDLE (bottom-right corner) ── */}
      <div
        onPointerDown={handleResizePointerDown}
        title="Drag to resize panel"
        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end pb-0.5 pr-0.5 opacity-40 hover:opacity-100 transition-opacity z-10"
        style={{ touchAction: 'none' }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M9 1L1 9M9 5L5 9M9 9" stroke="rgb(0,210,255)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  )
})
