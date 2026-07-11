import React, { useRef, useState, useEffect, useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'

export default React.memo(function PCBConnection({ formRef, globeRef }) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)
  
  // Real-time calculated layout coordinates from the DOM
  const [layout, setLayout] = useState({
    G: 1200,
    H: 400,
    xStart: 15,
    L_form_end: 250,
    R_form_start: 720,
    L_globe: 850
  })
  
  const [activeTraceIndex, setActiveTraceIndex] = useState(0)

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

        // Measure actual form card position relative to full-width coordinate space
        let L_form_val = G_val * 0.25
        let R_form_val = G_val * 0.50
        if (formEl) {
          const rectForm = formEl.getBoundingClientRect()
          L_form_val = rectForm.left - rectGrid.left
          R_form_val = rectForm.right - rectGrid.left
        }

        // Measure globe container relative to full-width coordinate space
        let sphereLeft = G_val * 0.75
        if (globeEl) {
          const rectGlobe = globeEl.getBoundingClientRect()
          const sphereWidth = Math.min(380, rectGlobe.width)
          sphereLeft = rectGlobe.left - rectGrid.left + (rectGlobe.width - sphereWidth) / 2
        }

        const GAP = 40

        setLayout({
          G: G_val,
          H: H_val,
          xStart: 15,
          L_form_end: L_form_val - GAP,
          R_form_start: R_form_val + GAP,
          L_globe: sphereLeft + 15
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

    // Create ResizeObserver to monitor layout updates on container, form, and globe
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

  const { G, H, xStart, L_form_end, R_form_start, L_globe } = layout
  const Y_center = H / 2

  // Generate 40 traces for the left side dynamically matching layout constraints (20% higher density with data buses)
  const leftTraces = useMemo(() => {
    const W_left = Math.max(100, L_form_end - xStart)
    return [
      // ==========================================
      // --- LAYER 1: Faint Background (12 traces) ---
      // ==========================================
      { id: 'L1-1', layer: 1, widthType: 'micro', yStart: -170, xStartOffset: 10, bends: [], endXOffset: W_left - 30, hasStartVia: true, hasEndVia: true },
      { id: 'L1-2', layer: 1, widthType: 'secondary', yStart: -160, xStartOffset: 0, bends: [[110, -160], [130, -140]], endXOffset: W_left - 150, hasEndVia: true },
      { id: 'L1-3', layer: 1, widthType: 'micro', yStart: -150, xStartOffset: 80, bends: [], endXOffset: W_left - 180, hasStartVia: true },
      { id: 'L1-4', layer: 1, widthType: 'micro', yStart: -140, xStartOffset: 0, bends: [[140, -140], [160, -120]], endXOffset: W_left - 60, hasEndVia: true },
      { id: 'L1-5', layer: 1, widthType: 'secondary', yStart: -110, xStartOffset: 150, bends: [], endXOffset: W_left - 90, hasStartVia: true },
      { id: 'L1-6', layer: 1, widthType: 'micro', yStart: -90, xStartOffset: 0, bends: [[200, -90], [220, -70]], endXOffset: W_left - 40, hasEndVia: true },
      { id: 'L1-7', layer: 1, widthType: 'micro', yStart: -50, xStartOffset: 120, bends: [], endXOffset: W_left - 110, hasStartVia: true },
      { id: 'L1-8', layer: 1, widthType: 'micro', yStart: -10, xStartOffset: 0, bends: [[100, -10], [120, 10]], endXOffset: W_left - 200 },
      { id: 'L1-9', layer: 1, widthType: 'secondary', yStart: 40, xStartOffset: 60, bends: [], endXOffset: W_left - 240, hasStartVia: true },
      { id: 'L1-10', layer: 1, widthType: 'micro', yStart: 80, xStartOffset: 0, bends: [[220, 80], [240, 100]], endXOffset: W_left - 50, hasEndVia: true },
      { id: 'L1-11', layer: 1, widthType: 'micro', yStart: 130, xStartOffset: 100, bends: [], endXOffset: W_left - 120, hasStartVia: true },
      { id: 'L1-12', layer: 1, widthType: 'micro', yStart: 160, xStartOffset: 0, bends: [[180, 160], [200, 140]], endXOffset: W_left - 70, hasEndVia: true },

      // ==========================================
      // --- LAYER 2: Normal Routing (18 traces) ---
      // ==========================================
      // Top Data Bus (Traces L2-1 to L2-5 - Length matching meanders & staggered ends!)
      { id: 'L2-1', layer: 2, widthType: 'micro', yStart: -150, xStartOffset: 0, bends: [[100, -150], [120, -170], [180, -170], [200, -150]], endXOffset: W_left - 120 },
      { id: 'L2-2', layer: 2, widthType: 'micro', yStart: -142, xStartOffset: 0, bends: [[100, -142], [120, -162], [180, -162], [200, -142]], endXOffset: W_left - 100 },
      { id: 'L2-3', layer: 2, widthType: 'micro', yStart: -134, xStartOffset: 0, bends: [[100, -134], [120, -154], [180, -154], [200, -134]], endXOffset: W_left - 80 },
      { id: 'L2-4', layer: 2, widthType: 'micro', yStart: -126, xStartOffset: 0, bends: [[100, -126], [120, -146], [180, -146], [200, -126]], endXOffset: W_left - 60 },
      { id: 'L2-5', layer: 2, widthType: 'micro', yStart: -118, xStartOffset: 0, bends: [[100, -118], [120, -138], [180, -138], [200, -118]], endXOffset: W_left - 40 },

      // Middle Control Bus (Traces L2-6 to L2-9)
      { id: 'L2-6', layer: 2, widthType: 'secondary', yStart: -60, xStartOffset: 0, bends: [[150, -60], [180, -30]], endXOffset: W_left - 90 },
      { id: 'L2-7', layer: 2, widthType: 'secondary', yStart: -50, xStartOffset: 0, bends: [[150, -50], [180, -20]], endXOffset: W_left - 110 },
      { id: 'L2-8', layer: 2, widthType: 'secondary', yStart: -40, xStartOffset: 0, bends: [[150, -40], [180, -10]], endXOffset: W_left - 130 },
      { id: 'L2-9', layer: 2, widthType: 'secondary', yStart: -30, xStartOffset: 0, bends: [[150, -30], [180, 0]], endXOffset: W_left - 150 },

      // Bottom Differential Bus (Traces L2-10 to L2-12)
      { id: 'L2-10', layer: 2, widthType: 'primary', yStart: 100, xStartOffset: 50, bends: [[120, 100], [150, 130]], endXOffset: W_left - 30, hasStartVia: true },
      { id: 'L2-11', layer: 2, widthType: 'primary', yStart: 115, xStartOffset: 50, bends: [[120, 115], [150, 145]], endXOffset: W_left - 30, hasStartVia: true },
      { id: 'L2-12', layer: 2, widthType: 'primary', yStart: 130, xStartOffset: 50, bends: [[120, 130], [150, 160]], endXOffset: W_left - 30, hasStartVia: true },

      // Individual unique traces with vertical segments
      { id: 'L2-13', layer: 2, widthType: 'secondary', yStart: -80, xStartOffset: 40, bends: [[110, -80], [130, -60], [130, -30], [150, -10]], endXOffset: W_left - 180, hasStartVia: true },
      { id: 'L2-14', layer: 2, widthType: 'secondary', yStart: -20, xStartOffset: 0, bends: [[140, -20], [160, 0]], endXOffset: W_left - 70 },
      { id: 'L2-15', layer: 2, widthType: 'primary', yStart: 20, xStartOffset: 90, bends: [], endXOffset: W_left - 120, hasStartVia: true },
      { id: 'L2-16', layer: 2, widthType: 'secondary', yStart: 50, xStartOffset: 0, bends: [[210, 50], [230, 30]], endXOffset: W_left - 30 },
      { id: 'L2-17', layer: 2, widthType: 'secondary', yStart: 70, xStartOffset: 110, bends: [], endXOffset: W_left - 90, hasStartVia: true },
      { id: 'L2-18', layer: 2, widthType: 'secondary', yStart: 140, xStartOffset: 80, bends: [[200, 140], [220, 160]], endXOffset: W_left - 100, hasStartVia: true },

      // ==============================================
      // --- LAYER 3: Highlighted Routing (10 traces) ---
      // ==============================================
      { id: 'L3-1', layer: 3, widthType: 'primary', yStart: -130, xStartOffset: 0, bends: [[100, -130], [120, -150]], endXOffset: W_left - 50, hasNode: true, hasEndVia: true },
      { id: 'L3-2', layer: 3, widthType: 'secondary', yStart: -70, xStartOffset: 60, bends: [[200, -70], [220, -50]], endXOffset: W_left - 10, hasStartVia: true, hasNode: true, hasEndVia: true },
      { id: 'L3-3', layer: 3, widthType: 'primary', yStart: -40, xStartOffset: 0, bends: [], endXOffset: W_left - 130, hasNode: true, hasEndVia: true },
      { id: 'L3-4', layer: 3, widthType: 'secondary', yStart: -20, xStartOffset: 120, bends: [[220, -20], [245, 5]], endXOffset: W_left - 60, hasStartVia: true, hasNode: true, hasEndVia: true },
      { id: 'L3-5', layer: 3, widthType: 'primary', yStart: 30, xStartOffset: 0, bends: [[130, 30], [150, 10]], endXOffset: W_left - 140, hasNode: true, hasEndVia: true },
      { id: 'L3-6', layer: 3, widthType: 'secondary', yStart: 60, xStartOffset: 70, bends: [], endXOffset: W_left - 20, hasStartVia: true, hasNode: true, hasEndVia: true },
      { id: 'L3-7', layer: 3, widthType: 'primary', yStart: 110, xStartOffset: 0, bends: [[190, 110], [210, 130]], endXOffset: W_left - 70, hasNode: true, hasEndVia: true },
      { id: 'L3-8', layer: 3, widthType: 'secondary', yStart: 150, xStartOffset: 50, bends: [[180, 150], [200, 130]], endXOffset: W_left - 120, hasStartVia: true, hasNode: true, hasEndVia: true },
      { id: 'L3-9', layer: 3, widthType: 'primary', yStart: 10, xStartOffset: 0, bends: [[80, 10], [100, 30], [100, 50], [120, 70]], endXOffset: W_left - 95, hasNode: true, hasEndVia: true },
      { id: 'L3-10', layer: 3, widthType: 'secondary', yStart: -100, xStartOffset: 50, bends: [[130, -100], [150, -80], [150, -60], [170, -40]], endXOffset: W_left - 160, hasStartVia: true, hasNode: true, hasEndVia: true }
    ]
  }, [xStart, L_form_end, Y_center])

  // Periodic random packet animation interval (subtle, slow, one packet at a time)
  useEffect(() => {
    const layer3Traces = leftTraces.filter(t => t.layer === 3)
    const interval = setInterval(() => {
      if (layer3Traces.length > 0) {
        const randIdx = Math.floor(Math.random() * layer3Traces.length)
        setActiveTraceIndex(randIdx)
      }
    }, 7000)
    return () => clearInterval(interval)
  }, [leftTraces])

  // Helper to build SVG path commands
  const buildPath = (trace) => {
    const startX = xStart + (trace.xStartOffset || 0)
    const startY = Y_center + trace.yStart
    let path = `M ${startX},${startY}`
    let currentX = startX
    let currentY = startY

    if (trace.bends) {
      trace.bends.forEach(([bx, by]) => {
        const targetX = xStart + bx
        const targetY = Y_center + by
        path += ` L ${targetX},${targetY}`
        currentX = targetX
        currentY = targetY
      })
    }

    const endX = xStart + trace.endXOffset
    path += ` L ${endX},${currentY}`
    return path
  }

  // Helper to find Y coordinate at the end of the trace
  const getEndY = (trace) => {
    if (trace.bends && trace.bends.length > 0) {
      return Y_center + trace.bends[trace.bends.length - 1][1]
    }
    return Y_center + trace.yStart
  }

  // Dynamic Right-Side Paths (Globe connections - remaining completely unchanged)
  const pathA = `M ${R_form_start},${Y_center - 120} L ${R_form_start + 50},${Y_center - 120} L ${R_form_start + 80},${Y_center - 70} L ${L_globe},${Y_center - 70}`
  const pathB = `M ${R_form_start},${Y_center} L ${R_form_start + 110},${Y_center} L ${R_form_start + 140},${Y_center + 30} L ${L_globe},${Y_center + 30}`
  const pathC = `M ${R_form_start},${Y_center + 120} L ${R_form_start + 60},${Y_center + 120} L ${R_form_start + 90},${Y_center + 70} L ${L_globe},${Y_center + 70}`

  const branchA1 = `M ${R_form_start + 80},${Y_center - 120} L ${R_form_start + 100},${Y_center - 100} L ${R_form_start + 130},${Y_center - 100}`
  const branchB1 = `M ${R_form_start + 50},${Y_center} L ${R_form_start + 70},${Y_center - 20} L ${R_form_start + 100},${Y_center - 20}`
  const branchC1 = `M ${R_form_start + 90},${Y_center + 120} L ${R_form_start + 110},${Y_center + 100} L ${R_form_start + 130},${Y_center + 100}`
  const branchC2 = `M ${L_globe - 90},${Y_center + 70} L ${L_globe - 70},${Y_center + 90} L ${L_globe - 40},${Y_center + 90}`

  const layer3Traces = leftTraces.filter(t => t.layer === 3)
  const activeTrace = layer3Traces[activeTraceIndex] || layer3Traces[0]
  const activePathD = activeTrace ? buildPath(activeTrace) : ''

  if (shouldReduceMotion) return null

  return (
    <div ref={containerRef} className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-screen pointer-events-none z-0 hidden lg:block">
      <svg 
        className="w-full h-full" 
        viewBox={`0 0 ${G || 1000} ${H || 400}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glowing particle filter */}
          <filter id="pcbSignalGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* --- LEFT SIDE PCB ARTWORK --- */}
        {/* Render 40 Motherboard Traces with Opacity Layering */}
        <g fill="none">
          {leftTraces.map((trace) => {
            const d = buildPath(trace)
            const strokeWidth = trace.widthType === 'primary' ? 2 : trace.widthType === 'secondary' ? 1 : 0.5
            const strokeColor = trace.layer === 3 
              ? 'rgba(190,150,255,0.55)' 
              : trace.layer === 2 
                ? 'rgba(170,120,255,0.28)' 
                : 'rgba(170,120,255,0.12)'
                
            return (
              <path 
                key={trace.id} 
                d={d} 
                stroke={strokeColor} 
                strokeWidth={strokeWidth} 
              />
            )
          })}
        </g>

        {/* Solder Joints / Vias / Edge Nodes for Left Side */}
        <g fill="var(--bg)">
          {leftTraces.map((trace) => {
            const strokeColor = trace.layer === 3 ? 'rgba(190,150,255,0.55)' : 'rgba(170,120,255,0.28)'
            const radius = trace.widthType === 'primary' ? 3.5 : 2.5
            const opacity = trace.layer === 3 ? 0.75 : trace.layer === 2 ? 0.45 : 0.22

            return (
              <g key={`vias-${trace.id}`} opacity={opacity}>
                {trace.hasStartVia && (
                  <circle 
                    cx={xStart + trace.xStartOffset} 
                    cy={Y_center + trace.yStart} 
                    r={radius} 
                    stroke={strokeColor} 
                    strokeWidth="1.2" 
                  />
                )}
                {trace.hasEndVia && (
                  <circle 
                    cx={xStart + trace.endXOffset} 
                    cy={getEndY(trace)} 
                    r={radius} 
                    stroke={strokeColor} 
                    strokeWidth="1.2" 
                  />
                )}
              </g>
            )
          })}
        </g>

        {/* Engineering Details (vias, test points, etc. - very low opacity) */}
        <g opacity="0.3">
          {[
            { type: 'square', x: xStart + 180, y: Y_center - 150 },
            { type: 'circle', x: xStart + 240, y: Y_center - 100 },
            { type: 'square', x: xStart + 110, y: Y_center - 20 },
            { type: 'circle', x: xStart + 280, y: Y_center + 45 },
            { type: 'square', x: xStart + 160, y: Y_center + 90 },
            { type: 'circle', x: xStart + 320, y: Y_center + 140 }
          ].map((detail, idx) => {
            if (detail.type === 'square') {
              return (
                <rect 
                  key={`detail-${idx}`}
                  x={detail.x - 1.5}
                  y={detail.y - 1.5}
                  width="3"
                  height="3"
                  fill="none"
                  stroke="rgba(170,120,255,0.22)"
                  strokeWidth="0.8"
                />
              )
            } else {
              return (
                <circle 
                  key={`detail-${idx}`}
                  cx={detail.x}
                  cy={detail.y}
                  r="1.5"
                  fill="none"
                  stroke="rgba(170,120,255,0.22)"
                  strokeWidth="0.8"
                />
              )
            }
          })}
        </g>

        {/* Glowing Nodes (exactly 15) */}
        {leftTraces.filter(t => t.hasNode).map((trace) => {
          const endX = xStart + trace.endXOffset
          const endY = getEndY(trace)
          return (
            <g key={`node-${trace.id}`}>
              {/* Outer Glow */}
              <circle 
                cx={endX} 
                cy={endY} 
                r="4.5" 
                fill="var(--accent)" 
                opacity="0.5" 
                filter="url(#pcbSignalGlow)" 
              />
              {/* Node Core */}
              <circle 
                cx={endX} 
                cy={endY} 
                r="1.8" 
                fill="#FFFFFF" 
              />
            </g>
          )
        })}

        {/* 5 Intermediate Nodes to make exactly 15 nodes overall */}
        {[
          { x: xStart + 120, y: Y_center - 150 },
          { x: xStart + 220, y: Y_center - 50 },
          { x: xStart + 150, y: Y_center + 10 },
          { x: xStart + 200, y: Y_center + 130 },
          { x: xStart + 100, y: Y_center + 50 }
        ].map((pt, idx) => (
          <g key={`node-inter-${idx}`}>
            <circle 
              cx={pt.x} 
              cy={pt.y} 
              r="4.2" 
              fill="var(--accent)" 
              opacity="0.45" 
              filter="url(#pcbSignalGlow)" 
            />
            <circle 
              cx={pt.x} 
              cy={pt.y} 
              r="1.8" 
              fill="#FFFFFF" 
            />
          </g>
        ))}

        {/* --- RIGHT SIDE GLOBE CONNECTIONS (Remaining completely unchanged) --- */}
        <g stroke="var(--accent)" strokeWidth="4" fill="none" opacity="0.08">
          <path d={pathA} />
          <path d={pathB} />
          <path d={pathC} />
        </g>

        <g stroke="url(#pcbLineGrad)" strokeWidth="1.5" fill="none">
          <path d={pathA} />
          <path d={pathB} />
          <path d={pathC} />
          <path d={branchA1} opacity="0.4" />
          <path d={branchB1} opacity="0.4" />
          <path d={branchC1} opacity="0.4" />
          <path d={branchC2} opacity="0.4" />
        </g>

        <g fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.2">
          <circle cx={R_form_start} cy={Y_center - 120} r="3.5" className="animate-pulse" style={{ animationDuration: '3s' }} />
          <circle cx={R_form_start} cy={Y_center} r="3.5" className="animate-pulse" style={{ animationDuration: '2.5s' }} />
          <circle cx={R_form_start} cy={Y_center + 120} r="3.5" className="animate-pulse" style={{ animationDuration: '3.5s' }} />
          <circle cx={L_globe} cy={Y_center - 70} r="3" />
          <circle cx={L_globe} cy={Y_center + 30} r="3" />
          <circle cx={L_globe} cy={Y_center + 70} r="3" />
          <circle cx={R_form_start + 130} cy={Y_center - 100} r="1.5" fill="var(--accent)" opacity="0.5" stroke="none" />
          <circle cx={R_form_start + 100} cy={Y_center - 20} r="1.5" fill="var(--accent)" opacity="0.5" stroke="none" />
          <circle cx={R_form_start + 130} cy={Y_center + 100} r="1.5" fill="var(--accent)" opacity="0.5" stroke="none" />
          <circle cx={L_globe - 40} cy={Y_center + 90} r="1.5" fill="var(--accent)" opacity="0.5" stroke="none" />
        </g>

        <g fill="var(--accent)" opacity="0.6">
          <circle cx={R_form_start + 50} cy={Y_center - 120} r="1.5" />
          <circle cx={R_form_start + 80} cy={Y_center - 70} r="1.5" />
          <circle cx={R_form_start + 110} cy={Y_center} r="1.5" />
          <circle cx={R_form_start + 140} cy={Y_center + 30} r="1.5" />
          <circle cx={R_form_start + 60} cy={Y_center + 120} r="1.5" />
          <circle cx={R_form_start + 90} cy={Y_center + 70} r="1.5" />
        </g>

        {/* Dynamic Signals (Right Side - Unchanged) */}
        <circle 
          r="3" 
          fill="#ffffff" 
          filter="url(#pcbSignalGlow)"
          className="animate-pcb-travel"
          style={{ 
            offsetPath: `path("${pathA}")`,
            animationDuration: '4.2s',
            animationTimingFunction: 'linear'
          }} 
        />
        <circle 
          r="3" 
          fill="#ffffff" 
          filter="url(#pcbSignalGlow)"
          className="animate-pcb-travel"
          style={{ 
            offsetPath: `path("${pathB}")`,
            animationDuration: '5.8s',
            animationTimingFunction: 'linear',
            animationDelay: '1.4s'
          }} 
        />
        <circle 
          r="3" 
          fill="#ffffff" 
          filter="url(#pcbSignalGlow)"
          className="animate-pcb-travel"
          style={{ 
            offsetPath: `path("${pathC}")`,
            animationDuration: '5.0s',
            animationTimingFunction: 'linear',
            animationDelay: '2.8s'
          }} 
        />

        {/* --- DYNAMIC SINGLE LIGHT PACKET ANIMATION (Left Side - Subtle 7s Trigger) --- */}
        {activePathD && (
          <circle r="2.5" fill="#ffffff" filter="url(#pcbSignalGlow)" opacity="0">
            <animateMotion 
              dur="3.5s" 
              repeatCount="1" 
              path={activePathD}
              fill="remove"
              key={`motion-${activeTraceIndex}`}
            />
            <animate 
              attributeName="opacity" 
              values="0;1;1;0" 
              keyTimes="0;0.1;0.9;1" 
              dur="3.5s" 
              repeatCount="1"
              fill="freeze"
              key={`opacity-${activeTraceIndex}`}
            />
          </circle>
        )}
      </svg>
    </div>
  )
})
