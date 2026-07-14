import React, { useRef, useState, useEffect, useMemo, memo } from 'react'
import { useReducedMotion } from 'framer-motion'

export default memo(function LeftPCB({ formRef, globeRef, contactSystemState = 'dormant', transmissionFailed, isTyping }) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)

  const [layout, setLayout] = useState({
    G: 600,
    H: 600,
    xStart: 5,
    L_form_end: 250,
    globeCenterX: 800,
    globeCenterY: 300
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
        const H_val = rectGrid.height || 600

        let L_form_val = G_val * 0.5
        if (formEl) {
          const rectForm = formEl.getBoundingClientRect()
          L_form_val = rectForm.left - rectGrid.left
        }

        let gx = G_val * 0.8
        let gy = H_val * 0.5
        if (globeEl) {
          const rectGlobe = globeEl.getBoundingClientRect()
          gx = rectGlobe.left - rectGrid.left + rectGlobe.width / 2
          gy = rectGlobe.top - rectGrid.top + rectGlobe.height / 2
        }

        setLayout({
          G: G_val,
          H: H_val,
          xStart: 5,
          L_form_end: L_form_val - 12,
          globeCenterX: gx,
          globeCenterY: gy
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

    update()
    const resizeObserver = new ResizeObserver(() => throttledUpdate())
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    if (formRef?.current) resizeObserver.observe(formRef.current)
    if (globeRef?.current) resizeObserver.observe(globeRef.current)
    window.addEventListener('resize', throttledUpdate, { passive: true })

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', throttledUpdate)
    }
  }, [formRef, globeRef])

  const { G, H, xStart, L_form_end } = layout
  const W_left = Math.max(50, L_form_end - xStart)
  const scale = W_left / 280

  // Vertical anchors for channels matching standard inputs
  const CH1_Y = H * 0.18
  const CH2_Y = H * 0.40
  const CH3_Y = H * 0.62
  const CH4_Y = H * 0.82

  const buildPath = (startX, startY, segments) => {
    let path = `M ${xStart + startX * scale},${startY}`
    let cx = startX
    let cy = startY

    segments.forEach(([type, val1, val2]) => {
      if (type === 'H') {
        cx = val1
        path += ` L ${xStart + cx * scale},${cy}`
      } else if (type === 'V') {
        cy = val1
        path += ` L ${xStart + cx * scale},${cy}`
      } else if (type === 'L') {
        cx = val1
        cy = val2
        path += ` L ${xStart + cx * scale},${cy}`
      }
    })
    return path
  }

  // Draw intricate traces.
  // CH3 (Subject) is a direct vertical Y-mirror of CH2 (Email).
  // CH4 (Message) is a direct vertical Y-mirror of CH1 (Name).
  const traces = useMemo(() => [
    // --- CHANNEL 1 (NAME) & ITS TOP Zone ---
    { chKey: 'name', d: buildPath(0, CH1_Y - 90, [['H', 20], ['L', 40, CH1_Y - 70], ['H', 150], ['L', 170, CH1_Y - 50], ['H', 200], ['L', 222, CH1_Y - 30], ['H', 280]]), w: 0.6, opDefault: 0.15 },
    { chKey: 'name', d: buildPath(0, CH1_Y - 75, [['H', 14], ['L', 36, CH1_Y - 55], ['H', 123], ['L', 141, CH1_Y - 35], ['H', 179], ['L', 196, CH1_Y - 20], ['H', 280]]), w: 0.45, opDefault: 0.15 },
    { chKey: 'name', d: buildPath(0, CH1_Y - 55, [['H', 10], ['L', 30, CH1_Y - 35], ['H', 100], ['L', 120, CH1_Y - 15], ['H', 180], ['L', 190, CH1_Y - 5], ['H', 280]]), w: 1.6, opDefault: 0.25, main: true },
    { chKey: 'name', d: buildPath(0, CH1_Y - 45, [['H', 5], ['L', 24, CH1_Y - 25], ['H', 91], ['L', 111, CH1_Y - 5], ['H', 176], ['L', 186, CH1_Y + 5], ['H', 280]]), w: 0.6, opDefault: 0.15 },
    { chKey: 'name', d: buildPath(0, CH1_Y - 62, [['H', 8], ['L', 27, CH1_Y - 42], ['H', 96], ['L', 116, CH1_Y - 22], ['H', 168]]), w: 0.3, opDefault: 0.1 },

    { chKey: 'name', d: buildPath(0, CH1_Y, [['H', 72], ['L', 82, CH1_Y + 10], ['H', 130]]), w: 0.45, opDefault: 0.15 },
    { chKey: 'name', d: buildPath(60, CH1_Y + 20, [['H', 153], ['L', 171, CH1_Y + 40], ['H', 280]]), w: 0.6, opDefault: 0.15 },
    { chKey: 'name', d: buildPath(140, CH1_Y + 10, [['H', 160], ['L', 180, CH1_Y + 30], ['H', 280]]), w: 0.45, opDefault: 0.15 },

    // --- CHANNEL 2 (EMAIL) ---
    { chKey: 'email', d: buildPath(0, CH2_Y - 20, [['H', 32], ['L', 52, CH2_Y], ['H', 101], ['L', 121, CH2_Y + 20], ['H', 152], ['L', 172, CH2_Y + 40], ['H', 280]]), w: 0.6, opDefault: 0.15 },
    { chKey: 'email', d: buildPath(0, CH2_Y, [['H', 20], ['L', 40, CH2_Y + 20], ['H', 90], ['L', 110, CH2_Y + 40], ['H', 180], ['L', 190, CH2_Y + 30], ['H', 280]]), w: 1.6, opDefault: 0.25, main: true },
    { chKey: 'email', d: buildPath(40, CH2_Y - 30, [['H', 83], ['L', 101, CH2_Y - 11], ['H', 170], ['L', 190, CH2_Y + 10], ['H', 280]]), w: 0.6, opDefault: 0.15 },
    { chKey: 'email', d: buildPath(0, CH2_Y - 26, [['H', 23], ['L', 44, CH2_Y - 6], ['H', 94], ['L', 114, CH2_Y + 14]]), w: 0.3, opDefault: 0.1 },
    { chKey: 'email', d: buildPath(50, CH2_Y + 24, [['H', 86], ['L', 104, CH2_Y + 44], ['H', 176]]), w: 0.3, opDefault: 0.1 },

    // --- CHANNEL 3 (SUBJECT) - Mirrored Y-version of CHANNEL 2 ---
    { chKey: 'subject', d: buildPath(0, CH3_Y + 20, [['H', 32], ['L', 52, CH3_Y], ['H', 101], ['L', 121, CH3_Y - 20], ['H', 152], ['L', 172, CH3_Y - 40], ['H', 280]]), w: 0.6, opDefault: 0.15 },
    { chKey: 'subject', d: buildPath(0, CH3_Y, [['H', 20], ['L', 40, CH3_Y - 20], ['H', 90], ['L', 110, CH3_Y - 40], ['H', 180], ['L', 190, CH3_Y - 30], ['H', 280]]), w: 1.6, opDefault: 0.25, main: true },
    { chKey: 'subject', d: buildPath(40, CH3_Y + 30, [['H', 83], ['L', 101, CH3_Y + 11], ['H', 170], ['L', 190, CH3_Y - 10], ['H', 280]]), w: 0.6, opDefault: 0.15 },
    { chKey: 'subject', d: buildPath(0, CH3_Y + 26, [['H', 23], ['L', 44, CH3_Y + 6], ['H', 94], ['L', 114, CH3_Y - 14]]), w: 0.3, opDefault: 0.1 },
    { chKey: 'subject', d: buildPath(50, CH3_Y - 24, [['H', 86], ['L', 104, CH3_Y - 44], ['H', 176]]), w: 0.3, opDefault: 0.1 },

    // --- CHANNEL 4 (MESSAGE) - Mirrored Y-version of CHANNEL 1 ---
    { chKey: 'message', d: buildPath(0, CH4_Y + 90, [['H', 20], ['L', 40, CH4_Y + 70], ['H', 150], ['L', 170, CH4_Y + 50], ['H', 200], ['L', 222, CH4_Y + 30], ['H', 280]]), w: 0.6, opDefault: 0.15 },
    { chKey: 'message', d: buildPath(0, CH4_Y + 75, [['H', 14], ['L', 36, CH4_Y + 55], ['H', 123], ['L', 141, CH4_Y + 35], ['H', 179], ['L', 196, CH4_Y + 20], ['H', 280]]), w: 0.45, opDefault: 0.15 },
    { chKey: 'message', d: buildPath(0, CH4_Y + 55, [['H', 10], ['L', 30, CH4_Y + 35], ['H', 100], ['L', 120, CH4_Y + 15], ['H', 180], ['L', 190, CH4_Y + 5], ['H', 280]]), w: 1.6, opDefault: 0.25, main: true },
    { chKey: 'message', d: buildPath(0, CH4_Y + 45, [['H', 5], ['L', 24, CH4_Y + 25], ['H', 91], ['L', 111, CH4_Y + 5], ['H', 176], ['L', 186, CH4_Y - 5], ['H', 280]]), w: 0.6, opDefault: 0.15 },
    { chKey: 'message', d: buildPath(0, CH4_Y + 62, [['H', 8], ['L', 27, CH4_Y + 42], ['H', 96], ['L', 116, CH4_Y + 22], ['H', 168]]), w: 0.3, opDefault: 0.1 },

    { chKey: 'message', d: buildPath(0, CH4_Y, [['H', 72], ['L', 82, CH4_Y - 10], ['H', 130]]), w: 0.45, opDefault: 0.15 },
    { chKey: 'message', d: buildPath(60, CH4_Y - 20, [['H', 153], ['L', 171, CH4_Y - 40], ['H', 280]]), w: 0.6, opDefault: 0.15 },
    { chKey: 'message', d: buildPath(140, CH4_Y - 10, [['H', 160], ['L', 180, CH4_Y - 30], ['H', 280]]), w: 0.45, opDefault: 0.15 },

    // Edge Connectors on the far right
    { chKey: 'name', d: buildPath(260, CH1_Y - 40, [['H', 280]]), w: 1.5, opDefault: 0.25 },
    { chKey: 'email', d: buildPath(260, CH2_Y + 20, [['H', 280]]), w: 1.5, opDefault: 0.25 },
    { chKey: 'subject', d: buildPath(260, CH3_Y - 20, [['H', 280]]), w: 1.5, opDefault: 0.25 },
    { chKey: 'message', d: buildPath(260, CH4_Y + 40, [['H', 280]]), w: 1.5, opDefault: 0.25 },
  ], [scale, xStart, CH1_Y, CH2_Y, CH3_Y, CH4_Y])

  // Nodes (Mirrored Y coordinates)
  const nodes = useMemo(() => [
    { x: 180, y: CH1_Y - 15, id: 'A1', chKey: 'name' },
    { x: 170, y: CH2_Y + 30, id: 'A2', chKey: 'email' },
    { x: 170, y: CH3_Y - 30, id: 'A3', chKey: 'subject' },
    { x: 180, y: CH4_Y + 15, id: 'A4', chKey: 'message' },
  ], [CH1_Y, CH2_Y, CH3_Y, CH4_Y])

  // SMT / SMD Components with realistic footprints, solder mask openings, and silkscreen labels.
  const getTransitionStyle = () => {
    if (contactSystemState === 'dormant') {
      return { transition: 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)' }
    }
    if (isTransmit) {
      return { transition: 'opacity 750ms cubic-bezier(0.65, 0, 0.35, 1)' }
    }
    return { transition: 'opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)' }
  }

  const getTargetOpacity = (chKey) => {
    const isHero = ['name', 'email', 'subject', 'message'].includes(chKey)
    return (isTransmit || (transmissionFailed && isHero)) 
      ? 0 
      : (contactSystemState === 'engaged' ? (isHero ? 0.85 : 0.30) : 0.40)
  }

  const renderGlassBlock = (x, y, w, h, label, chKey) => {
    const px = xStart + x * scale
    const dropShadowClass = contactSystemState === 'dormant' ? "" : "filter drop-shadow-[0.5px_0.8px_0.5px_rgba(0,0,0,0.8)]"
    const targetOpacity = getTargetOpacity(chKey)

    return (
      <g 
        key={`comp-${label}-${x}-${y}`} 
        transform={`translate(${px}, ${y})`} 
        className={dropShadowClass}
        opacity={targetOpacity}
        style={getTransitionStyle()}
      >
        <rect x={-w / 2 - 1} y={-h / 2 - 0.5} width={w + 2} height={h + 1} fill="#030304" />
        <rect x={-w / 2} y={-h / 2} width={3} height={h} fill="#2f2f38" stroke="#4a4a58" strokeWidth="0.3" />
        <rect x={w / 2 - 3} y={-h / 2} width={3} height={h} fill="#2f2f38" stroke="#4a4a58" strokeWidth="0.3" />
        <rect x={-w / 2 - 1.5} y={-h / 2 - 1.5} width={w + 3} height={h + 3} fill="none" stroke="#ffffff" strokeWidth="0.3" opacity="0.35" />
        <rect x={-w / 2 + 2.5} y={-h / 2 + 0.5} width={w - 5} height={h - 1} rx={0.5} fill="#0d0d10" stroke="#1c1c21" strokeWidth="0.4" />
        <rect x={-w / 2 + 4} y={-h / 2 + 2} width={w - 8} height={h - 4} fill="none" stroke="var(--accent)" strokeWidth="0.3" opacity={0.65} />
      </g>
    )
  }

  // Small Vias with outer copper pad ring for mechanical depth
  const renderSmallVia = (x, y, label, chKey) => {
    const targetOpacity = getTargetOpacity(chKey)
    const ringAnimation = isTyping ? {
      animation: 'pcbViaPulse 1.5s ease-in-out infinite',
      animationDelay: `${(x + y) % 5 * 150}ms`
    } : {}

    return (
      <g 
        key={`via-${x}-${y}`} 
        transform={`translate(${xStart + x * scale}, ${y})`}
        opacity={targetOpacity}
        style={getTransitionStyle()}
      >
        <circle cx="0" cy="0" r="2.2" fill="none" stroke="var(--accent)" strokeWidth="0.4" opacity={0.65} style={ringAnimation} />
        <circle cx="0" cy="0" r="1.4" fill="#030304" stroke="#4a4a58" strokeWidth="0.3" />
        <circle cx="0" cy="0" r="0.6" fill="#000000" />
      </g>
    )
  }

  // Plated Through Hole / Test Pad Terminations
  const renderTerminationPad = (x, y, label, chKey) => {
    const targetOpacity = getTargetOpacity(chKey)
    const ringAnimation = {
      animation: 'pcbViaPulse 1.5s ease-in-out infinite',
      animationPlayState: isTyping ? 'running' : 'paused',
      animationDelay: `${(x + y) % 5 * 150}ms`
    }

    return (
      <g 
        key={`term-${x}-${y}`} 
        transform={`translate(${xStart + x * scale}, ${y})`}
        opacity={targetOpacity}
        style={getTransitionStyle()}
      >
        <circle cx="0" cy="0" r="3" fill="#18181f" stroke="#333" strokeWidth="0.5" />
        <circle cx="0" cy="0" r="1.8" fill="#2d2d3a" stroke="var(--accent)" strokeWidth="0.3" opacity={0.65} style={ringAnimation} />
        <circle cx="0" cy="0" r="0.8" fill="#000" />
      </g>
    )
  }

  const isTransmit = contactSystemState === 'transmit'
  const isTransmitOrFailed = isTransmit || transmissionFailed

  const getTrailPath = (chKey) => {
    const startX = xStart + 275 * scale
    let startY = CH1_Y - 40
    if (chKey === 'email') startY = CH2_Y + 20
    else if (chKey === 'subject') startY = CH3_Y - 20
    else if (chKey === 'message') startY = CH4_Y + 40

    const targetX = layout.globeCenterX
    let targetY = layout.globeCenterY
    if (chKey === 'name') {
      targetY = layout.globeCenterY - 35
    } else if (chKey === 'subject') {
      targetY = layout.globeCenterY + 35
    }

    const dx = targetX - startX
    const dy = targetY - startY

    let cy1 = -60
    if (chKey === 'email') cy1 = -30
    else if (chKey === 'subject') cy1 = 30
    else if (chKey === 'message') cy1 = 60

    return `M ${startX},${startY} C ${startX + dx * 0.3},${startY + cy1} ${startX + dx * 0.7},${startY + dy - 20} ${startX + dx},${startY + dy}`
  }

  const getTrailStyle = (chIdx) => {
    const delay = 150 + chIdx * 80
    return {
      strokeDasharray: '120 280',
      strokeDashoffset: 400,
      animation: `pcbTrailAnim 650ms cubic-bezier(0.65, 0, 0.35, 1) ${delay}ms forwards`
    }
  }

  const getTravelStyle = (chKey, index) => {
    if (!isTransmit && !transmissionFailed) return {}

    const startX = xStart + 275 * scale
    let startY = CH1_Y - 40
    if (chKey === 'email') startY = CH2_Y + 20
    else if (chKey === 'subject') startY = CH3_Y - 20
    else if (chKey === 'message') startY = CH4_Y + 40

    // Targets relative to globe center
    const targetX = layout.globeCenterX
    let targetY = layout.globeCenterY
    if (chKey === 'name') {
      targetY = layout.globeCenterY - 35
    } else if (chKey === 'subject') {
      targetY = layout.globeCenterY + 35
    }

    const dx = targetX - startX
    const dy = targetY - startY

    let cy1 = -60
    if (chKey === 'email') cy1 = -30
    else if (chKey === 'subject') cy1 = 30
    else if (chKey === 'message') cy1 = 60

    const pathData = `M 0,0 C ${dx * 0.3},${cy1} ${dx * 0.7},${dy - 20} ${dx},${dy}`

    const delay = 150 + index * 80 // Stagger by 80ms

    return {
      offsetPath: `path('${pathData}')`,
      offsetRotate: '0deg',
      transformOrigin: `${startX}px ${startY}px`,
      animation: `pcbTravel 650ms cubic-bezier(0.65, 0, 0.35, 1) ${delay}ms forwards`
    }
  }

  const getChannelGroupStyle = (chKey, index) => {
    const baseStyle = getTravelStyle(chKey, index)
    if (transmissionFailed) {
      return {
        ...baseStyle,
        opacity: 0,
        transition: 'opacity 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }
    }
    return baseStyle
  }

  const renderTrace = (t, i) => {
    const isHero = ['name', 'email', 'subject', 'message'].includes(t.chKey)
    const targetOpacity = getTargetOpacity(t.chKey)

    return (
      <React.Fragment key={`trace-${i}`}>
        {isHero && contactSystemState === 'engaged' && !isTransmit && (
          <>
            <path
              d={t.d}
              stroke="var(--accent)"
              strokeWidth={t.w + 0.8}
              opacity="0.35"
              filter="url(#pcbHairlineGlow)"
              style={getTransitionStyle()}
            />
            {t.main && isTyping && (
              <path
                d={t.d}
                stroke="var(--accent)"
                strokeWidth={t.w + 0.2}
                fill="none"
                opacity="0.8"
                style={{
                  strokeDasharray: '40 160',
                  animation: 'pcbSignalFlow 3s ease-in-out infinite alternate'
                }}
              />
            )}
          </>
        )}
        {/* Main trace core */}
        <path
          d={t.d}
          stroke="var(--accent)"
          strokeWidth={t.w}
          opacity={targetOpacity}
          style={getTransitionStyle()}
        />
      </React.Fragment>
    )
  }

  const renderNode = (n, i) => {
    const targetOpacity = getTargetOpacity(n.chKey)
    const isUpper = n.id === 'A1' || n.id === 'A2'
    const moveX1 = -60 * scale
    const moveX2 = -80 * scale
    const moveY1 = isUpper ? -20 : 20

    const nodeStyle = {
      '--move-x1': `${moveX1}px`,
      '--move-x2': `${moveX2}px`,
      '--move-y1': `${moveY1}px`,
      transition: 'transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)'
    }

    if (contactSystemState === 'engaged') {
      nodeStyle.animation = 'pcbNodeMove 6s ease-in-out infinite'
      nodeStyle.animationPlayState = isTyping ? 'running' : 'paused'
    }

    return (
      <g 
        key={`node-${i}`} 
        transform={`translate(${xStart + n.x * scale}, ${n.y})`}
        opacity={targetOpacity}
        style={getTransitionStyle()}
      >
        <g style={nodeStyle}>
          {/* Solder Mask Opening */}
          <circle cx="0" cy="0" r="16" fill="#030304" opacity={0.6} />

        {/* Concentric Copper Pad Ring */}
        <circle cx="0" cy="0" r="14.5" fill="none" stroke="var(--accent)" strokeWidth="0.8" opacity={0.45} />
        <circle cx="0" cy="0" r="12" fill="none" stroke="#4a4a58" strokeWidth="0.5" opacity={0.5} />

        {/* Outer expanding pulse ring (Radar Effect) */}
        <circle cx="0" cy="0" r="10" fill="none" stroke="var(--accent)" strokeWidth="0.8"
          style={{
            animation: 'pcbRadarPulse 1.0s cubic-bezier(0.1, 0.8, 0.3, 1) infinite',
            animationPlayState: isTyping ? 'running' : 'paused',
            transformOrigin: '0px 0px'
          }}
        />

        {/* Rotatable Inner Details Group (Clockwise) */}
        <g style={{ 
          animation: 'pcbRadarRotate 5s linear infinite',
          animationPlayState: isTyping ? 'running' : 'paused', 
          transformOrigin: '0px 0px' 
        }}>
          {/* Tiny surrounding via array around node */}
          {[0, 60, 120, 180, 240, 300].map((angle, vIdx) => {
            const rad = (angle * Math.PI) / 180
            const vx = 12 * Math.cos(rad)
            const vy = 12 * Math.sin(rad)
            return (
              <g key={`node-via-${vIdx}`}>
                <circle cx={vx} cy={vy} r="0.8" fill="#000" stroke="var(--accent)" strokeWidth="0.3" opacity={0.5} />
                <circle cx={vx} cy={vy} r="0.3" fill="#000" />
              </g>
            )
          })}

          {/* Radial traces entering node */}
          {[30, 90, 150, 210, 270, 330].map((angle, rIdx) => {
            const rad = (angle * Math.PI) / 180
            const x1 = 6 * Math.cos(rad)
            const y1 = 6 * Math.sin(rad)
            const x2 = 12 * Math.cos(rad)
            const y2 = 12 * Math.sin(rad)
            return (
              <line
                key={`radial-${rIdx}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--accent)"
                strokeWidth="0.4"
                opacity={0.5}
              />
            )
          })}
        </g>

        {/* Counter-Rotatable Outer Details Group (Counter-Clockwise) */}
        <g style={{ 
          animation: 'pcbRadarRotateCounter 7s linear infinite',
          animationPlayState: isTyping ? 'running' : 'paused', 
          transformOrigin: '0px 0px' 
        }}>
          {/* Solder Joint Pads surrounding Node */}
          {[45, 135, 225, 315].map((angle, sIdx) => {
            const rad = (angle * Math.PI) / 180
            const sx = 14.5 * Math.cos(rad)
            const sy = 14.5 * Math.sin(rad)
            return (
              <rect
                key={`node-pad-${sIdx}`}
                x={sx - 1}
                y={sy - 1}
                width="2"
                height="2"
                fill="#2f2f38"
                stroke="#555"
                strokeWidth="0.25"
                opacity={0.5}
              />
            )
          })}
        </g>

        {/* Outer pulse ring */}
        <circle cx="0" cy="0" r="8" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity={0.4} 
          style={{
            animation: 'pcbRingBreathe 1.5s ease-in-out infinite',
            animationPlayState: isTyping ? 'running' : 'paused',
            transformOrigin: '0px 0px'
          }}
        />

        {/* Inner Metallic Ring */}
        <circle cx="0" cy="0" r="5" fill="none" stroke="var(--accent)" strokeWidth="1" opacity={0.65} />

        {/* Core */}
        <circle cx="0" cy="0" r="2.5" fill="var(--accent)" opacity={0.7} 
          style={{
            animation: 'pcbCorePulse 0.8s ease-in-out infinite',
            animationPlayState: isTyping ? 'running' : 'paused',
            transformOrigin: '0px 0px'
          }}
        />
        </g>
      </g>
    )
  }

  const renderEdgeConnector = (y, i) => {
    const keys = ['name', 'email', 'subject', 'message']
    const targetOpacity = getTargetOpacity(keys[i])
    const ringAnimation = {
      animation: 'pcbViaPulse 1.5s ease-in-out infinite',
      animationPlayState: isTyping ? 'running' : 'paused',
      animationDelay: `${(275 + y) % 5 * 150}ms`
    }
    return (
      <g 
        key={`edge-${i}`} 
        transform={`translate(${xStart + 275 * scale}, ${y})`}
        opacity={targetOpacity}
        style={getTransitionStyle()}
      >
        <circle cx="0" cy="0" r="3" fill="#18181f" stroke="#333" strokeWidth="0.5" />
        <circle cx="0" cy="0" r="1.8" fill="#2d2d3a" stroke="var(--accent)" strokeWidth="0.3" opacity={0.65} style={ringAnimation} />
        <circle cx="0" cy="0" r="0.8" fill="#000" />
      </g>
    )
  }

  if (shouldReduceMotion) return null

  const dormantStyles = contactSystemState === 'dormant' ? {
    opacity: 0.40,
    filter: 'saturate(0)'
  } : {}

  return (
    <div
      ref={containerRef}
      className="absolute top-0 bottom-0 left-0 w-full pointer-events-none z-0 hidden lg:block"
      style={{ ...dormantStyles, transition: 'opacity 800ms cubic-bezier(0.4,0,0.2,1)' }}
    >
      <style>{`
        @keyframes pcbTravel {
          0% {
            offset-distance: 0%;
            transform: scale(1);
            opacity: 0.35;
          }
          100% {
            offset-distance: 100%;
            transform: scale(0.45);
            opacity: 0.35;
          }
        }
        @keyframes pcbPulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.55;
          }
        }
        @keyframes pcbStandbyPulse {
          0%, 100% {
            opacity: 0.12;
            transform: scale(1);
          }
          50% {
            opacity: 0.32;
            transform: scale(1.08);
          }
        }
        @keyframes pcbTrailAnim {
          0% {
            stroke-dashoffset: 400;
            opacity: 0.8;
          }
          70% {
            stroke-dashoffset: 120;
            opacity: 0.8;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0;
          }
        }
        @keyframes pcbRadarRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes pcbRadarRotateCounter {
          0% {
            transform: rotate(360deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }
        @keyframes pcbRadarPulse {
          0% {
            transform: scale(0.6);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        .animate-standby-pulse {
          animation: pcbStandbyPulse 3.5s ease-in-out infinite;
        }
        @keyframes pcbSignalFlow {
          0% {
            stroke-dashoffset: 200;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes pcbNodeMove {
          0% {
            transform: translate(0px, 0px);
          }
          30% {
            transform: translate(var(--move-x1), 0px);
          }
          50% {
            transform: translate(var(--move-x2), var(--move-y1));
          }
          70% {
            transform: translate(var(--move-x1), 0px);
          }
          100% {
            transform: translate(0px, 0px);
          }
        }
        @keyframes pcbCorePulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.6);
            opacity: 1.0;
          }
        }
        @keyframes pcbRingBreathe {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.15);
          }
        }
        @keyframes pcbViaPulse {
          0%, 100% {
            opacity: 0.65;
          }
          50% {
            opacity: 1.0;
          }
        }
      `}</style>

      <svg
        className="w-full h-full"
        viewBox={`0 0 ${G || 600} ${H || 600}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="pcbHairlineGlow" filterUnits="userSpaceOnUse" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="pcbGlowActive" filterUnits="userSpaceOnUse" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="pcbTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0)" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.8" />
          </linearGradient>

          <pattern id="pcbDots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#ffffff" opacity="0.015" />
          </pattern>
        </defs>

        {/* Background Grid - Extremely faint */}
        <rect 
          width="100%" 
          height="100%" 
          fill="url(#pcbDots)" 
          opacity={isTransmit ? 0 : 1}
          style={{ transition: 'opacity 750ms cubic-bezier(0.65, 0, 0.35, 1)' }}
        />

        {/* Trailing Lines for Traveling Hero Channels */}
        {isTransmitOrFailed && ['name', 'email', 'subject', 'message'].map((chKey, chIdx) => (
          <path
            key={`trail-${chKey}`}
            d={getTrailPath(chKey)}
            stroke="url(#pcbTrailGradient)"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            style={{
              ...getTrailStyle(chIdx),
              ...(transmissionFailed ? {
                opacity: 0,
                transition: 'opacity 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
              } : {})
            }}
          />
        ))}

        {/* Engineering marks on grid (matte, very subtle) */}
        <g 
          fill="#ffffff" 
          opacity={isTransmit ? 0 : 0.03}
          style={{ transition: 'opacity 750ms cubic-bezier(0.65, 0, 0.35, 1)' }}
        >
          <circle cx={xStart + 30} cy={H - 50} r="0.8" />
          <circle cx={xStart + 45} cy={H - 50} r="0.8" />
          <circle cx={xStart + 30} cy={H - 35} r="0.8" />
          <circle cx={xStart + 45} cy={H - 35} r="0.8" />
          <circle cx={xStart + 60} cy={H - 50} r="0.8" />
          <circle cx={xStart + 60} cy={H - 35} r="0.8" />
        </g>

        <g 
          fill="#ffffff" 
          opacity={isTransmit ? 0 : 0.03}
          style={{ transition: 'opacity 750ms cubic-bezier(0.65, 0, 0.35, 1)' }}
        >
          <circle cx={xStart + 260} cy={100} r="0.8" />
          <circle cx={xStart + 260} cy={115} r="0.8" />
          <circle cx={xStart + 260} cy={130} r="0.8" />
        </g>

        {/* CHANNEL 1 (NAME) GROUP */}
        <g style={getChannelGroupStyle('name', 0)}>
          {/* Traces */}
          <g strokeLinecap="round" strokeLinejoin="round" fill="none">
            {traces.filter(t => t.chKey === 'name').map((t, i) => renderTrace(t, i))}
          </g>
          {/* SMT Components */}
          {renderGlassBlock(130, CH1_Y - 70, 16, 8, 'R12', 'name')}
          {renderGlassBlock(150, CH1_Y - 15, 20, 10, 'C08', 'name')}
          {renderGlassBlock(130, CH1_Y + 10, 14, 8, 'R15', 'name')}
          {renderTerminationPad(0, CH1_Y - 90, 'TP1_S1', 'name')}
          {renderTerminationPad(0, CH1_Y - 55, 'TP1_S2', 'name')}
          {/* Nodes */}
          {nodes.filter(n => n.chKey === 'name').map((n, i) => renderNode(n, i))}
          {/* Edge Connector */}
          {renderEdgeConnector(CH1_Y - 40, 0)}
        </g>

        {/* CHANNEL 2 (EMAIL) GROUP */}
        <g style={getChannelGroupStyle('email', 1)}>
          {/* Traces */}
          <g strokeLinecap="round" strokeLinejoin="round" fill="none">
            {traces.filter(t => t.chKey === 'email').map((t, i) => renderTrace(t, i))}
          </g>
          {/* SMT Components */}
          {renderGlassBlock(100, CH2_Y, 18, 9, 'R21', 'email')}
          {renderGlassBlock(140, CH2_Y + 30, 24, 11, 'C14', 'email')}
          {renderGlassBlock(75, CH2_Y - 20, 14, 8, 'R22', 'email')}
          {renderTerminationPad(0, CH2_Y - 20, 'TP2_S1', 'email')}
          {renderTerminationPad(0, CH2_Y, 'TP2_S2', 'email')}
          {/* Nodes */}
          {nodes.filter(n => n.chKey === 'email').map((n, i) => renderNode(n, i))}
          {/* Edge Connector */}
          {renderEdgeConnector(CH2_Y + 20, 1)}
        </g>

        {/* CHANNEL 3 (SUBJECT) GROUP */}
        <g style={getChannelGroupStyle('subject', 2)}>
          {/* Traces */}
          <g strokeLinecap="round" strokeLinejoin="round" fill="none">
            {traces.filter(t => t.chKey === 'subject').map((t, i) => renderTrace(t, i))}
          </g>
          {/* SMT Components */}
          {renderGlassBlock(100, CH3_Y, 18, 9, 'R31', 'subject')}
          {renderGlassBlock(140, CH3_Y - 30, 24, 11, 'C31', 'subject')}
          {renderGlassBlock(75, CH3_Y + 20, 14, 8, 'R32', 'subject')}
          {renderTerminationPad(0, CH3_Y + 20, 'TP3_S1', 'subject')}
          {renderTerminationPad(0, CH3_Y, 'TP3_S2', 'subject')}
          {/* Nodes */}
          {nodes.filter(n => n.chKey === 'subject').map((n, i) => renderNode(n, i))}
          {/* Edge Connector */}
          {renderEdgeConnector(CH3_Y - 20, 2)}
        </g>

        {/* CHANNEL 4 (MESSAGE) GROUP */}
        <g style={getChannelGroupStyle('message', 3)}>
          {/* Traces */}
          <g strokeLinecap="round" strokeLinejoin="round" fill="none">
            {traces.filter(t => t.chKey === 'message').map((t, i) => renderTrace(t, i))}
          </g>
          {/* SMT Components */}
          {renderGlassBlock(130, CH4_Y + 70, 16, 8, 'R41', 'message')}
          {renderGlassBlock(150, CH4_Y + 15, 20, 10, 'C41', 'message')}
          {renderGlassBlock(130, CH4_Y - 10, 14, 8, 'R42', 'message')}
          {renderTerminationPad(0, CH4_Y + 90, 'TP4_S1', 'message')}
          {renderTerminationPad(0, CH4_Y + 55, 'TP4_S2', 'message')}
          {/* Nodes */}
          {nodes.filter(n => n.chKey === 'message').map((n, i) => renderNode(n, i))}
          {/* Edge Connector */}
          {renderEdgeConnector(CH4_Y + 40, 3)}
        </g>

      </svg>
    </div>
  )
})
