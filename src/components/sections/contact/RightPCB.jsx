import React, { useRef, useState, useEffect, useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'

export default React.memo(function RightPCB({ formRef, globeRef }) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)

  const [layout, setLayout] = useState({
    G: 600,
    H: 400,
    M_form: 220,
    L_globe: 200,
    R_globe: 500
  })

  useEffect(() => {
    let ticking = false
    const update = () => {
      const gridEl = containerRef.current
      const formEl = formRef?.current
      const globeEl = globeRef?.current

      if (gridEl) {
        const rectGrid = gridEl.getBoundingClientRect()
        const G_val = rectGrid.width
        const H_val = rectGrid.height || 400

        // Measure form right edge and globe edges in the full-width PCB coordinate space.
        let formRight = G_val * 0.42
        if (formEl) {
          const rectForm = formEl.getBoundingClientRect()
          formRight = rectForm.right - rectGrid.left
        }

        let sphereLeft = G_val * 0.5
        let sphereRight = G_val * 0.9
        if (globeEl) {
          const rectGlobe = globeEl.getBoundingClientRect()
          const sphereWidth = Math.min(460, rectGlobe.width)
          sphereLeft = rectGlobe.left - rectGrid.left + (rectGlobe.width - sphereWidth) / 2
          sphereRight = rectGlobe.right - rectGrid.left - (rectGlobe.width - sphereWidth) / 2
        }

        const FORM_PCB_GAP = 28
        const GLOBE_PCB_OVERLAP = 15
        const middleStart = Math.min(formRight + FORM_PCB_GAP, sphereLeft + GLOBE_PCB_OVERLAP)
        const middleEnd = Math.max(sphereLeft + GLOBE_PCB_OVERLAP, middleStart + 20)

        setLayout({
          G: G_val,
          H: H_val,
          M_form: middleStart,
          L_globe: middleEnd,
          R_globe: sphereRight - GLOBE_PCB_OVERLAP
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
    const globeEl = globeRef?.current

    update()

    const resizeObserver = new ResizeObserver(() => {
      throttledUpdate()
    })

    if (gridEl) resizeObserver.observe(gridEl)
    if (formEl) resizeObserver.observe(formEl)
    if (globeEl) resizeObserver.observe(globeEl)

    window.addEventListener('resize', throttledUpdate, { passive: true })
    window.addEventListener('scroll', throttledUpdate, { passive: true })

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', throttledUpdate)
      window.removeEventListener('scroll', throttledUpdate)
    }
  }, [formRef, globeRef])

  const { G, H, M_form, L_globe, R_globe } = layout
  const Y_center = H / 2
  const endX = G - 15 // Extended start offset rightward to increase right-end length

  // Right PCB: independent boundaries
  const rightTargetLimit = R_globe + 15 // stops closer to globe
  const rightWidth = Math.max(80, endX - rightTargetLimit)

  // Middle PCB: independent start point connected directly to the Form container
  const middleTargetLimit = L_globe - 15 // stops closer to globe
  const midStart = M_form
  const W_mid = Math.max(50, middleTargetLimit - midStart)

  // Middle PCB traces connecting Form to Globe
  const middleTraces = useMemo(() => {
    const scale = W_mid / 220

    const traceDefs = [
      // Primary Traces (8 Traces - grouped into clean, non-overlapping parallel buses)
      // Top Bus
      { id: 'M-top', layer: 3, yStart: -120, xStartOffset: 0, bends: [[70, -120], [110, -80]], endXOffset: 180, hasNode: true },
      { id: 'M-topmid', layer: 2, yStart: -100, xStartOffset: 0, bends: [[70, -100], [110, -60]], endXOffset: 160 },
      { id: 'M-mid1', layer: 3, yStart: -80, xStartOffset: 0, bends: [[70, -80], [110, -40]], endXOffset: 180, hasNode: true },
      
      // Center Bus
      { id: 'M-center', layer: 3, yStart: -10, xStartOffset: 0, bends: [], endXOffset: 210, hasNode: true },
      { id: 'M-mid2', layer: 2, yStart: 10, xStartOffset: 0, bends: [], endXOffset: 190 },
      
      // Bottom Bus
      { id: 'M-mid3', layer: 3, yStart: 80, xStartOffset: 0, bends: [[70, 80], [110, 40]], endXOffset: 180, hasNode: true },
      { id: 'M-botmid', layer: 2, yStart: 100, xStartOffset: 0, bends: [[70, 100], [110, 60]], endXOffset: 160 },
      { id: 'M-bottom', layer: 3, yStart: 120, xStartOffset: 0, bends: [[70, 120], [110, 80]], endXOffset: 180, hasNode: true },

      // Secondary Branches (8 Branches - perfectly aligned on 45-degree channels)
      { id: 'M-b1', layer: 2, yStart: -120, xStartOffset: 30, bends: [[30, -120], [50, -100]], endXOffset: 140 },
      { id: 'M-b2', layer: 2, yStart: -40, xStartOffset: 120, bends: [[120, -40], [140, -60]], endXOffset: 170 },
      { id: 'M-b3', layer: 2, yStart: 40, xStartOffset: 120, bends: [[120, 40], [140, 60]], endXOffset: 170 },
      { id: 'M-b4', layer: 2, yStart: 120, xStartOffset: 30, bends: [[30, 120], [50, 100]], endXOffset: 140 },
      
      { id: 'M-b5', layer: 1, yStart: -100, xStartOffset: 50, bends: [[50, -100], [70, -80]], endXOffset: 130 },
      { id: 'M-b6', layer: 1, yStart: 100, xStartOffset: 50, bends: [[50, 100], [70, 80]], endXOffset: 130 },
      
      { id: 'M-b7', layer: 2, yStart: -80, xStartOffset: 140, bends: [[140, -80], [160, -100]], endXOffset: 180 },
      { id: 'M-b8', layer: 2, yStart: 80, xStartOffset: 140, bends: [[140, 80], [160, 100]], endXOffset: 180 }
    ]

    return traceDefs.map(t => ({
      ...t,
      xStartOffset: t.xStartOffset * scale,
      bends: t.bends.map(([bx, by]) => [bx * scale, by]),
      endXOffset: t.endXOffset * scale
    }))
  }, [W_mid])

  // Right-hand PCB traces extending from the right edge toward the Globe
  const rightTraces = useMemo(() => {
    const scale = rightWidth / 160

    const traceDefs = [
      // Primary Traces (8 Traces)
      { id: 'R-top', layer: 3, yStart: -120, xStartOffset: 0, bends: [[40, -120], [60, -100]], endXOffset: 140, hasNode: true },
      { id: 'R-topmid', layer: 2, yStart: -80, xStartOffset: 0, bends: [[50, -80], [65, -95]], endXOffset: 130 },
      { id: 'R-mid1', layer: 3, yStart: -40, xStartOffset: 0, bends: [[70, -40], [85, -25]], endXOffset: 145, hasNode: true },
      { id: 'R-center', layer: 3, yStart: -5, xStartOffset: 0, bends: [], endXOffset: 155, hasNode: true },
      { id: 'R-mid2', layer: 2, yStart: 25, xStartOffset: 0, bends: [], endXOffset: 135 },
      { id: 'R-mid3', layer: 3, yStart: 60, xStartOffset: 0, bends: [[55, 60], [70, 45]], endXOffset: 140, hasNode: true },
      { id: 'R-botmid', layer: 2, yStart: 100, xStartOffset: 0, bends: [[60, 100], [75, 115]], endXOffset: 130 },
      { id: 'R-bottom', layer: 3, yStart: 140, xStartOffset: 0, bends: [[50, 140], [70, 120]], endXOffset: 145, hasNode: true },

      // Secondary Branches (12 Branches)
      { id: 'R-b1', layer: 1, yStart: -120, xStartOffset: 40, bends: [[60, -140]], endXOffset: 110 },
      { id: 'R-b2', layer: 2, yStart: -100, xStartOffset: 60, bends: [[80, -85]], endXOffset: 120 },
      { id: 'R-b3', layer: 1, yStart: -95, xStartOffset: 70, bends: [[85, -110]], endXOffset: 115 },
      { id: 'R-b4', layer: 3, yStart: -40, xStartOffset: 50, bends: [[65, -55]], endXOffset: 115, hasNode: true },
      { id: 'R-b5', layer: 2, yStart: -25, xStartOffset: 90, bends: [], endXOffset: 130 },
      { id: 'R-b6', layer: 3, yStart: -5, xStartOffset: 60, bends: [[75, 10]], endXOffset: 125, hasNode: true },
      { id: 'R-b7', layer: 2, yStart: 25, xStartOffset: 50, bends: [[65, 10]], endXOffset: 110 },
      { id: 'R-b8', layer: 1, yStart: 60, xStartOffset: 45, bends: [[60, 75]], endXOffset: 115 },
      { id: 'R-b9', layer: 2, yStart: 45, xStartOffset: 75, bends: [[90, 30]], endXOffset: 125 },
      { id: 'R-b10', layer: 3, yStart: 100, xStartOffset: 50, bends: [[65, 85]], endXOffset: 120, hasNode: true },
      { id: 'R-b11', layer: 1, yStart: 115, xStartOffset: 80, bends: [[95, 130]], endXOffset: 125 },
      { id: 'R-b12', layer: 2, yStart: 120, xStartOffset: 70, bends: [[85, 105]], endXOffset: 115 }
    ]

    return traceDefs.map(t => ({
      ...t,
      xStartOffset: t.xStartOffset * scale,
      bends: t.bends.map(([bx, by]) => [bx * scale, by]),
      endXOffset: t.endXOffset * scale
    }))
  }, [rightWidth])

  const buildMiddlePath = (trace) => {
    const startX = midStart + (trace.xStartOffset || 0)
    const startY = Y_center + trace.yStart
    let path = `M ${startX},${startY}`
    let currentY = startY

    if (trace.bends) {
      trace.bends.forEach(([bx, by]) => {
        const targetX = midStart + bx
        const targetY = Y_center + by
        path += ` L ${targetX},${targetY}`
        currentY = targetY
      })
    }

    const endXVal = midStart + trace.endXOffset
    path += ` L ${endXVal},${currentY}`
    return path
  }

  const getMiddleEndY = (trace) => {
    if (trace.bends && trace.bends.length > 0) {
      return Y_center + trace.bends[trace.bends.length - 1][1]
    }
    return Y_center + trace.yStart
  }

  const buildRightPath = (trace) => {
    const startX = endX - (trace.xStartOffset || 0)
    const startY = Y_center + trace.yStart
    let path = `M ${startX},${startY}`
    let currentY = startY

    if (trace.bends) {
      trace.bends.forEach(([bx, by]) => {
        const targetX = endX - bx
        const targetY = Y_center + by
        path += ` L ${targetX},${targetY}`
        currentY = targetY
      })
    }

    const endXVal = endX - trace.endXOffset
    path += ` L ${endXVal},${currentY}`
    return path
  }

  const getRightEndY = (trace) => {
    if (trace.bends && trace.bends.length > 0) {
      return Y_center + trace.bends[trace.bends.length - 1][1]
    }
    return Y_center + trace.yStart
  }

  if (shouldReduceMotion) return null

  const midLayer1Traces = middleTraces.filter(t => t.layer === 1)
  const midLayer2Traces = middleTraces.filter(t => t.layer === 2)
  const midLayer3Traces = middleTraces.filter(t => t.layer === 3)

  const rightLayer1Traces = rightTraces.filter(t => t.layer === 1)
  const rightLayer2Traces = rightTraces.filter(t => t.layer === 2)
  const rightLayer3Traces = rightTraces.filter(t => t.layer === 3)

  return (
    <div ref={containerRef} className="absolute top-0 bottom-0 left-0 w-full pointer-events-none z-0 hidden lg:block">
      <svg
        className="w-full h-full"
        viewBox={`0 0 ${G || 600} ${H || 400}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="rightPcbSignalGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="gradR2" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.05" />
            <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.6" />
          </linearGradient>

          <linearGradient id="gradR3" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-hover)" stopOpacity="0.1" />
            <stop offset="80%" stopColor="var(--accent-hover)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--accent-hover)" stopOpacity="1" />
          </linearGradient>

          <pattern id="pcbDotGridR" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.03)" />
          </pattern>
        </defs>

        {/* Decorative Tech Background Grids */}
        <rect x={midStart} y={Y_center - 200} width={W_mid} height="400" fill="url(#pcbDotGridR)" />
        <rect x={rightTargetLimit} y={Y_center - 200} width={Math.max(50, endX - rightTargetLimit)} height="400" fill="url(#pcbDotGridR)" opacity="0.30" />

        {/* High-Tech Labels */}
        <text x={midStart + 20} y={Y_center - 180} fontSize="7" fill="var(--accent-dim)" opacity="0.7" fontFamily="monospace" letterSpacing="1">LINK_NODE_A</text>
        <text x={midStart + 50} y={Y_center + 180} fontSize="7" fill="var(--accent-dim)" opacity="0.7" fontFamily="monospace" letterSpacing="1">LINK_NODE_B</text>
        <text x={endX - 120} y={Y_center - 165} fontSize="6" fill="rgba(255,255,255,0.2)" fontFamily="monospace">NODE_MATRIX_RX</text>

        {/* ========================================================
            MIDDLE SECTION: Connecting Form to Globe
            (REWORKED - DECOUPLED INDEPENDENT WIDTHS)
           ======================================================== */}
        {/* Layer 1: Background Traces (faint - 24% opacity) */}
        <g fill="none" stroke="url(#gradR2)" strokeWidth="1.0" opacity="0.24">
          {midLayer1Traces.map((trace) => <path key={trace.id} d={buildMiddlePath(trace)} strokeDasharray={trace.strokeDasharray} />)}
        </g>

        {/* Layer 2: Middle Traces (Normal - 34% opacity) */}
        <g fill="none" stroke="url(#gradR2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.34">
          {midLayer2Traces.map((trace) => <path key={trace.id} d={buildMiddlePath(trace)} strokeDasharray={trace.strokeDasharray} />)}
        </g>

        {/* Layer 3: Foreground Traces (Slightly brighter - 45% opacity) */}
        <g fill="none" stroke="url(#gradR3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.45">
          {midLayer3Traces.map((trace) => <path key={trace.id} d={buildMiddlePath(trace)} strokeDasharray={trace.strokeDasharray} />)}
        </g>

        {/* Glowing Nodes - Middle Section (solid blocker backing underneath) */}
        {middleTraces.filter(t => t.hasNode).map((trace) => {
          const endXVal = midStart + trace.endXOffset
          const endY = getMiddleEndY(trace)
          return (
            <g key={`mid-node-${trace.id}`}>
              {/* Opaque Base Body Blocker to mask out background grid/dots completely */}
              <circle cx={endXVal} cy={endY} r="3.2" fill="#050506" opacity="1.0" />
              {/* Outer Glow Ring (50% opacity) */}
              <circle cx={endXVal} cy={endY} r="3" fill="none" stroke="var(--accent)" strokeWidth="0.8" filter="url(#rightPcbSignalGlow)" opacity="0.50" />
              {/* Core */}
              <circle cx={endXVal} cy={endY} r="1" fill="#ffffff" opacity="0.80" />
            </g>
          )
        })}

        {/* Tiny isolated pads / connector markers - Middle Section (30% opacity) */}
        <g fill="var(--accent)" opacity="0.30">
          {[
            { x: 30, y: -130 },
            { x: 75, y: -100 },
            { x: 110, y: -70 },
            { x: 45, y: -15 },
            { x: 80, y: 15 },
            { x: 120, y: 40 },
            { x: 50, y: 85 },
            { x: 85, y: 110 },
            { x: 130, y: 135 }
          ].map((pt, idx) => {
            const scale = Math.max(80, W_mid) / 220
            const cx = midStart + pt.x * scale
            const cy = Y_center + pt.y
            return (
              <React.Fragment key={`mid-tp-${idx}`}>
                {idx % 3 === 0 ? (
                  <g>
                    {/* Solid blocker */}
                    <rect x={cx - 1.7} y={cy - 1.7} width="3.4" height="3.4" fill="#050506" opacity="1.0" />
                    {/* Square pad */}
                    <rect x={cx - 1.5} y={cy - 1.5} width="3" height="3" fill="none" stroke="var(--accent)" strokeWidth="0.8" />
                  </g>
                ) : (
                  <circle cx={cx} cy={cy} r="1" />
                )}
              </React.Fragment>
            )
          })}
        </g>

        {/* Single Traveling Signal Packet - Middle Section */}
        {!shouldReduceMotion && midLayer3Traces.length > 0 && (
          <g style={{
            offsetPath: `path("${buildMiddlePath(midLayer3Traces[0])}")`,
            animation: `pcbTravel 7s linear infinite`
          }}>
            <circle r="1.5" fill="#ffffff" filter="url(#rightPcbSignalGlow)" />
            <circle cx="-3" r="1.0" fill="var(--accent-hover)" opacity="0.6" filter="url(#rightPcbSignalGlow)" />
          </g>
        )}

        {/* ========================================================
            RIGHT SECTION: Extending inwards from Right Edge
            (STRICTLY UNCHANGED)
           ======================================================== */}
        {/* Layer 1: Background Traces (faint - 24% opacity) */}
        <g fill="none" stroke="url(#gradR2)" strokeWidth="1.0" opacity="0.24">
          {rightLayer1Traces.map((trace) => <path key={trace.id} d={buildRightPath(trace)} strokeDasharray={trace.strokeDasharray} />)}
        </g>

        {/* Layer 2: Middle Traces (Normal - 34% opacity) */}
        <g fill="none" stroke="url(#gradR2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.34">
          {rightLayer2Traces.map((trace) => <path key={trace.id} d={buildRightPath(trace)} strokeDasharray={trace.strokeDasharray} />)}
        </g>

        {/* Layer 3: Foreground Traces (Slightly brighter - 45% opacity) */}
        <g fill="none" stroke="url(#gradR3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.45">
          {rightLayer3Traces.map((trace) => <path key={trace.id} d={buildRightPath(trace)} strokeDasharray={trace.strokeDasharray} />)}
        </g>

        {/* Glowing Nodes - Right Section (solid blocker backing underneath) */}
        {rightTraces.filter(t => t.hasNode).map((trace) => {
          const endXVal = endX - trace.endXOffset
          const endY = getRightEndY(trace)
          return (
            <g key={`node-${trace.id}`}>
              {/* Opaque Base Body Blocker to mask out background grid/dots completely */}
              <circle cx={endXVal} cy={endY} r="3.2" fill="#050506" opacity="1.0" />
              {/* Outer Glow Ring (50% opacity) */}
              <circle cx={endXVal} cy={endY} r="3" fill="none" stroke="var(--accent)" strokeWidth="0.8" filter="url(#rightPcbSignalGlow)" opacity="0.50" />
              {/* Core */}
              <circle cx={endXVal} cy={endY} r="1" fill="#ffffff" opacity="0.80" />
            </g>
          )
        })}

        {/* Tiny isolated pads / connector markers - Right Section */}
        <g fill="var(--accent)" opacity="0.30">
          {[
            { x: 30, y: -130 },
            { x: 75, y: -100 },
            { x: 110, y: -70 },
            { x: 45, y: -15 },
            { x: 80, y: 15 },
            { x: 120, y: 40 },
            { x: 50, y: 85 },
            { x: 85, y: 110 },
            { x: 130, y: 135 }
          ].map((pt, idx) => {
            const scale = Math.max(50, endX - rightTargetLimit) / 160
            const cx = endX - pt.x * scale
            const cy = Y_center + pt.y
            return (
              <React.Fragment key={`tp-${idx}`}>
                {idx % 3 === 0 ? (
                  <g>
                    {/* Solid blocker */}
                    <rect x={cx - 1.7} y={cy - 1.7} width="3.4" height="3.4" fill="#050506" opacity="1.0" />
                    {/* Square pad */}
                    <rect x={cx - 1.5} y={cy - 1.5} width="3" height="3" fill="none" stroke="var(--accent)" strokeWidth="0.8" />
                  </g>
                ) : (
                  // Tiny circular pad
                  <circle cx={cx} cy={cy} r="1" />
                )}
              </React.Fragment>
            )
          })}
        </g>

        {/* Single Traveling Signal Packet - Right Section */}
        {!shouldReduceMotion && rightLayer3Traces.length > 0 && (
          <g style={{
            offsetPath: `path("${buildRightPath(rightLayer3Traces[0])}")`,
            animation: `pcbTravel 7s linear infinite`
          }}>
            <circle r="1.5" fill="#ffffff" filter="url(#rightPcbSignalGlow)" />
            <circle cx="-3" r="1.0" fill="var(--accent-hover)" opacity="0.6" filter="url(#rightPcbSignalGlow)" />
          </g>
        )}
      </svg>
    </div>
  )
})
