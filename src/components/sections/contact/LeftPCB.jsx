import React, { useRef, useState, useEffect, useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'

export default React.memo(function LeftPCB({ formRef }) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)

  const [layout, setLayout] = useState({
    G: 600,
    H: 400,
    xStart: 5,
    L_form_end: 250
  })

  useEffect(() => {
    let ticking = false
    const update = () => {
      const gridEl = containerRef.current
      const formEl = formRef?.current

      if (gridEl) {
        const rectGrid = gridEl.getBoundingClientRect()
        const G_val = rectGrid.width
        const H_val = rectGrid.height || 400

        // Measure form left edge relative to this container (starting at viewport 0)
        let L_form_val = G_val * 0.5
        if (formEl) {
          const rectForm = formEl.getBoundingClientRect()
          L_form_val = rectForm.left - rectGrid.left
        }

        const GAP_LEFT = 5
        const GAP_RIGHT = 12 // Maintain a small visible gap of 12px before the Form

        setLayout({
          G: G_val,
          H: H_val,
          xStart: GAP_LEFT,
          L_form_end: L_form_val - GAP_RIGHT
        })
      }
    }

    const throttledUpdate = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        update()
        ticking = false
      })
    }

    const gridEl = containerRef.current
    const formEl = formRef?.current

    update()

    const resizeObserver = new ResizeObserver(() => {
      throttledUpdate()
    })

    if (gridEl) resizeObserver.observe(gridEl)
    if (formEl) resizeObserver.observe(formEl)

    window.addEventListener('resize', throttledUpdate, { passive: true })
    window.addEventListener('scroll', throttledUpdate, { passive: true })

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', throttledUpdate)
      window.removeEventListener('scroll', throttledUpdate)
    }
  }, [formRef])

  const { G, H, xStart, L_form_end } = layout
  const Y_center = H / 2

  const leftTraces = useMemo(() => {
    const W_left = Math.max(50, L_form_end - xStart)
    const scale = W_left / 240

    const traceDefs = [
      // ==========================================
      // Level 1: Main Buses (13 Traces - Highlighted, Long, branching)
      // ==========================================
      // Top Bus
      { id: 'L3-1', layer: 3, yStart: -160, xStartOffset: 0, bends: [[70, -160], [110, -120]], endXOffset: 220, hasEndVia: true, hasNode: true },
      { id: 'L3-2', layer: 3, yStart: -140, xStartOffset: 0, bends: [[70, -140], [110, -100]], endXOffset: 200, hasEndVia: true, hasNode: true },
      { id: 'L3-3', layer: 3, yStart: -120, xStartOffset: 0, bends: [[70, -120], [110, -80]], endXOffset: 210, hasEndVia: true, hasNode: true },

      // Upper Mid Bus
      { id: 'L3-4', layer: 3, yStart: -80, xStartOffset: 0, bends: [[90, -80], [120, -50]], endXOffset: 220, hasEndVia: true, hasNode: true },
      { id: 'L3-5', layer: 3, yStart: -60, xStartOffset: 0, bends: [[90, -60], [120, -30]], endXOffset: 200, hasEndVia: true, hasNode: true },

      // Center Bus (Straight, dense)
      { id: 'L3-6', layer: 3, yStart: -20, xStartOffset: 0, bends: [], endXOffset: 230, hasEndVia: true, hasNode: true },
      { id: 'L3-7', layer: 3, yStart: 0, xStartOffset: 0, bends: [], endXOffset: 240, hasEndVia: true, hasNode: true },
      { id: 'L3-8', layer: 3, yStart: 20, xStartOffset: 0, bends: [], endXOffset: 230, hasEndVia: true, hasNode: true },

      // Lower Mid Bus
      { id: 'L3-9', layer: 3, yStart: 60, xStartOffset: 0, bends: [[90, 60], [120, 30]], endXOffset: 200, hasEndVia: true, hasNode: true },
      { id: 'L3-10', layer: 3, yStart: 80, xStartOffset: 0, bends: [[90, 80], [120, 50]], endXOffset: 220, hasEndVia: true, hasNode: true },

      // Bottom Bus
      { id: 'L3-11', layer: 3, yStart: 120, xStartOffset: 0, bends: [[70, 120], [110, 80]], endXOffset: 210, hasEndVia: true, hasNode: true },
      { id: 'L3-12', layer: 3, yStart: 140, xStartOffset: 0, bends: [[70, 140], [110, 100]], endXOffset: 200, hasEndVia: true, hasNode: true },
      { id: 'L3-13', layer: 3, yStart: 160, xStartOffset: 0, bends: [[70, 160], [110, 120]], endXOffset: 220, hasEndVia: true, hasNode: true },

      // ==========================================
      // Level 2: Secondary Traces (16 Traces - Standard, medium length)
      // ==========================================
      { id: 'L2-1', layer: 2, yStart: -150, xStartOffset: 0, bends: [[70, -150], [110, -110]], endXOffset: 170 },
      { id: 'L2-2', layer: 2, yStart: -130, xStartOffset: 0, bends: [[70, -130], [110, -90]], endXOffset: 180 },
      { id: 'L2-3', layer: 2, yStart: -110, xStartOffset: 0, bends: [[70, -110], [110, -70]], endXOffset: 160 },
      { id: 'L2-4', layer: 2, yStart: -90, xStartOffset: 0, bends: [[90, -90], [120, -60]], endXOffset: 190 },
      { id: 'L2-5', layer: 2, yStart: -70, xStartOffset: 0, bends: [[90, -70], [120, -40]], endXOffset: 170 },
      { id: 'L2-6', layer: 2, yStart: -50, xStartOffset: 0, bends: [[90, -50], [120, -20]], endXOffset: 180 },
      
      { id: 'L2-7', layer: 2, yStart: -30, xStartOffset: 0, bends: [], endXOffset: 190 },
      { id: 'L2-8', layer: 2, yStart: -10, xStartOffset: 0, bends: [], endXOffset: 200 },
      { id: 'L2-9', layer: 2, yStart: 10, xStartOffset: 0, bends: [], endXOffset: 200 },
      { id: 'L2-10', layer: 2, yStart: 30, xStartOffset: 0, bends: [], endXOffset: 190 },

      { id: 'L2-11', layer: 2, yStart: 50, xStartOffset: 0, bends: [[90, 50], [120, 20]], endXOffset: 180 },
      { id: 'L2-12', layer: 2, yStart: 70, xStartOffset: 0, bends: [[90, 70], [120, 40]], endXOffset: 170 },
      { id: 'L2-13', layer: 2, yStart: 90, xStartOffset: 0, bends: [[90, 90], [120, 60]], endXOffset: 190 },
      { id: 'L2-14', layer: 2, yStart: 110, xStartOffset: 0, bends: [[70, 110], [110, 70]], endXOffset: 160 },
      { id: 'L2-15', layer: 2, yStart: 130, xStartOffset: 0, bends: [[70, 130], [110, 90]], endXOffset: 180 },
      { id: 'L2-16', layer: 2, yStart: 150, xStartOffset: 0, bends: [[70, 150], [110, 110]], endXOffset: 170 },

      // ==========================================
      // Level 3: Micro Traces (12 Traces - very short, high engineering realism)
      // ==========================================
      { id: 'L1-1', layer: 1, yStart: -170, xStartOffset: 0, bends: [], endXOffset: 80 },
      { id: 'L1-2', layer: 1, yStart: -165, xStartOffset: 30, bends: [], endXOffset: 90 },
      { id: 'L1-3', layer: 1, yStart: -105, xStartOffset: 120, bends: [], endXOffset: 160 },
      { id: 'L1-4', layer: 1, yStart: -95, xStartOffset: 100, bends: [], endXOffset: 140 },
      { id: 'L1-5', layer: 1, yStart: -45, xStartOffset: 0, bends: [], endXOffset: 70 },
      { id: 'L1-6', layer: 1, yStart: -15, xStartOffset: 140, bends: [], endXOffset: 180 },
      { id: 'L1-7', layer: 1, yStart: 15, xStartOffset: 140, bends: [], endXOffset: 180 },
      { id: 'L1-8', layer: 1, yStart: 45, xStartOffset: 0, bends: [], endXOffset: 70 },
      { id: 'L1-9', layer: 1, yStart: 95, xStartOffset: 100, bends: [], endXOffset: 140 },
      { id: 'L1-10', layer: 1, yStart: 105, xStartOffset: 120, bends: [], endXOffset: 160 },
      { id: 'L1-11', layer: 1, yStart: 165, xStartOffset: 30, bends: [], endXOffset: 90 },
      { id: 'L1-12', layer: 1, yStart: 170, xStartOffset: 0, bends: [], endXOffset: 80 },

      // ==========================================
      // Secondary Branches (10 Branches originating from Level 1 Main Buses)
      // ==========================================
      { id: 'L-br1', layer: 3, yStart: -160, xStartOffset: 30, bends: [[30, -160], [50, -140]], endXOffset: 150, hasNode: true },
      { id: 'L-br2', layer: 2, yStart: -140, xStartOffset: 40, bends: [[40, -140], [60, -120]], endXOffset: 160 },
      { id: 'L-br3', layer: 3, yStart: -80, xStartOffset: 30, bends: [[30, -80], [50, -60]], endXOffset: 150, hasNode: true },
      { id: 'L-br4', layer: 2, yStart: -60, xStartOffset: 40, bends: [[40, -60], [60, -40]], endXOffset: 160 },
      
      { id: 'L-br5', layer: 3, yStart: -20, xStartOffset: 60, bends: [[60, -20], [80, 0]], endXOffset: 170, hasNode: true },
      { id: 'L-br6', layer: 3, yStart: 20, xStartOffset: 60, bends: [[60, 20], [80, 0]], endXOffset: 170, hasNode: true },
      
      { id: 'L-br7', layer: 2, yStart: 60, xStartOffset: 40, bends: [[40, 60], [60, 40]], endXOffset: 160 },
      { id: 'L-br8', layer: 3, yStart: 80, xStartOffset: 30, bends: [[30, 80], [50, 60]], endXOffset: 150, hasNode: true },
      { id: 'L-br9', layer: 2, yStart: 140, xStartOffset: 40, bends: [[40, 140], [60, 120]], endXOffset: 160 },
      { id: 'L-br10', layer: 3, yStart: 160, xStartOffset: 30, bends: [[30, 160], [50, 140]], endXOffset: 150, hasNode: true }
    ]

    return traceDefs.map(t => ({
      ...t,
      xStartOffset: t.xStartOffset * scale,
      bends: t.bends.map(([bx, by]) => [bx * scale, by]),
      endXOffset: t.endXOffset * scale
    }))
  }, [xStart, L_form_end])

  const buildPath = (trace) => {
    const startX = xStart + (trace.xStartOffset || 0)
    const startY = Y_center + trace.yStart
    let path = `M ${startX},${startY}`
    let currentY = startY

    if (trace.bends) {
      trace.bends.forEach(([bx, by]) => {
        const targetX = xStart + bx
        const targetY = Y_center + by
        path += ` L ${targetX},${targetY}`
        currentY = targetY
      })
    }

    const endXVal = xStart + trace.endXOffset
    path += ` L ${endXVal},${currentY}`
    return path
  }

  const getEndY = (trace) => {
    if (trace.bends && trace.bends.length > 0) {
      return Y_center + trace.bends[trace.bends.length - 1][1]
    }
    return Y_center + trace.yStart
  }

  if (shouldReduceMotion) return null

  const layer1Traces = leftTraces.filter(t => t.layer === 1)
  const layer2Traces = leftTraces.filter(t => t.layer === 2)
  const layer3Traces = leftTraces.filter(t => t.layer === 3)

  const renderVia = (x, y, isNode) => (
    <g key={`via-${x}-${y}`}>
      {/* Solid Blocker backing */}
      <circle cx={x} cy={y} r={isNode ? "2.7" : "2.0"} fill="#050506" opacity="1.0" />
      <circle cx={x} cy={y} r={isNode ? "2.5" : "1.8"} fill="none" stroke="var(--accent)" strokeWidth="1.0" />
      <circle cx={x} cy={y} r="0.6" fill="var(--accent)" opacity="0.8" />
      {isNode && (
        <circle 
          cx={x} 
          cy={y} 
          r="4.5" 
          fill="none" 
          stroke="var(--accent)" 
          opacity="0.3" 
          className="animate-pulse" 
          style={{ animationDuration: `${2 + Math.random() * 2}s` }} 
        />
      )}
    </g>
  )

  return (
    <div ref={containerRef} className="absolute top-0 bottom-0 left-0 w-full pointer-events-none z-0 hidden lg:block">
      <svg 
        className="w-full h-full" 
        viewBox={`0 0 ${G || 600} ${H || 400}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="leftPcbSignalGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="gradL2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.05" />
            <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.6" />
          </linearGradient>

          <linearGradient id="gradL3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-hover)" stopOpacity="0.1" />
            <stop offset="80%" stopColor="var(--accent-hover)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--accent-hover)" stopOpacity="1" />
          </linearGradient>
          
          <pattern id="pcbDotGrid" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.03)" />
          </pattern>
        </defs>

        {/* Decorative Tech Background Grid */}
        <rect x={xStart} y={Y_center - 200} width={Math.max(50, L_form_end - xStart)} height="400" fill="url(#pcbDotGrid)" />

        {/* High-Tech Labels */}
        <text x={xStart + 30} y={Y_center - 165} fontSize="7" fill="var(--accent-dim)" opacity="0.7" fontFamily="monospace" letterSpacing="1">DATA_LINK_01</text>
        <text x={xStart + 80} y={Y_center + 165} fontSize="7" fill="var(--accent-dim)" opacity="0.7" fontFamily="monospace" letterSpacing="1">SYS_PWR_OK</text>
        <text x={xStart + 180} y={Y_center - 30} fontSize="6" fill="rgba(255,255,255,0.2)" fontFamily="monospace">TX-8902</text>

        {/* Layer 1 Traces: Background Traces (faint - 24% opacity) */}
        <g fill="none" stroke="url(#gradL2)" strokeWidth="1.0" opacity="0.24">
          {layer1Traces.map((trace) => <path key={trace.id} d={buildPath(trace)} strokeDasharray={trace.strokeDasharray} />)}
        </g>

        {/* Layer 2 Traces: Middle Traces (Normal - 34% opacity) */}
        <g fill="none" stroke="url(#gradL2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.34">
          {layer2Traces.map((trace) => <path key={trace.id} d={buildPath(trace)} strokeDasharray={trace.strokeDasharray} />)}
        </g>

        {/* Layer 3 Traces: Foreground Traces (Slightly brighter - 45% opacity) */}
        <g fill="none" stroke="url(#gradL3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.45">
          {layer3Traces.map((trace) => <path key={trace.id} d={buildPath(trace)} strokeDasharray={trace.strokeDasharray} />)}
        </g>

        {/* Realistic Vias (Solder Joints) - ONLY at end points close to the form */}
        {leftTraces.map((trace) => {
          const endX = xStart + trace.endXOffset
          const endY = getEndY(trace)

          return (
            <React.Fragment key={`vias-${trace.id}`}>
              {trace.hasEndVia && renderVia(endX, endY, trace.hasNode)}
            </React.Fragment>
          )
        })}

        {/* Scattered Isolated Test Points (30% opacity) */}
        <g fill="var(--accent)" opacity="0.30">
          {[
            { x: 30, y: -150 },
            { x: 90, y: -120 },
            { x: 140, y: -70 },
            { x: 50, y: -10 },
            { x: 120, y: 30 },
            { x: 80, y: 70 },
            { x: 150, y: 110 },
            { x: 40, y: 150 }
          ].map((pt, idx) => {
            const scale = Math.max(50, L_form_end - xStart) / 240
            return (
              <React.Fragment key={`tp-${idx}`}>
                {idx % 3 === 0 ? (
                  <g>
                    {/* Solid blocker */}
                    <rect x={xStart + pt.x * scale - 1.7} y={Y_center + pt.y - 1.7} width="3.4" height="3.4" fill="#050506" opacity="1.0" />
                    {/* Square pad */}
                    <rect x={xStart + pt.x * scale - 1.5} y={Y_center + pt.y - 1.5} width="3" height="3" fill="none" stroke="var(--accent)" strokeWidth="0.8" />
                  </g>
                ) : (
                  <circle cx={xStart + pt.x * scale} cy={Y_center + pt.y} r="1" />
                )}
              </React.Fragment>
            )
          })}
        </g>

        {/* Glowing Nodes (Pure white core, accent purple outer glow, small bloom - solid body underneath) */}
        {leftTraces.filter(t => t.hasNode).map((trace) => {
          const endXVal = xStart + trace.endXOffset
          const endY = getEndY(trace)
          return (
            <g key={`node-${trace.id}`}>
              {/* Opaque Base Body Blocker to mask out background grid/dots completely */}
              <circle cx={endXVal} cy={endY} r="3.2" fill="#050506" opacity="1.0" />
              {/* Outer Glow Ring (50% opacity) */}
              <circle cx={endXVal} cy={endY} r="3" fill="none" stroke="var(--accent)" strokeWidth="0.8" filter="url(#leftPcbSignalGlow)" opacity="0.50" />
              {/* Core */}
              <circle cx={endXVal} cy={endY} r="1" fill="#ffffff" opacity="0.80" />
            </g>
          )
        })}

        {/* Single Traveling Signal Packet (travels every 7 seconds, linear) */}
        {!shouldReduceMotion && layer3Traces.length > 0 && (
          <g style={{
            offsetPath: `path("${buildPath(layer3Traces[0])}")`,
            animation: `pcbTravel 7s linear infinite`
          }}>
            <circle r="1.5" fill="#ffffff" filter="url(#leftPcbSignalGlow)" />
            <circle cx="-3" r="1.0" fill="var(--accent-hover)" opacity="0.6" filter="url(#leftPcbSignalGlow)" />
          </g>
        )}
      </svg>
    </div>
  )
})
