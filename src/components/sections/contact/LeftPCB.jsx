import React, { useRef, useState, useEffect, useMemo, memo } from 'react'
import { useReducedMotion } from 'framer-motion'

const getTraceStyleAttrs = (category) => {
  if (category === 'main') {
    return { w: 1.8, opDefault: 0.9 };
  } else if (category === 'auxiliary') {
    return { w: 0.5, opDefault: 0.6 };
  } else {
    return { w: 0.2, opDefault: 0.15 };
  }
};

const drawLeftPCBPath = (x1, y1, x2, y2, category) => {
  const dx = Math.abs(x2 - x1);
  const dy = y2 - y1;
  const absDy = Math.abs(dy);
  const direction = x2 > x1 ? 1 : -1;

  if (absDy === 0) {
    return `M ${x1},${y1} H ${x2}`;
  }

  // Define Left PCB custom percentages for each tier
  let pStart, pEnd;
  if (category === 'main') {
    pStart = 0.40;
    pEnd = 0.70;
  } else if (category === 'auxiliary') {
    pStart = 0.25;
    pEnd = 0.60;
  } else { // ground
    pStart = 0.45;
    pEnd = 0.75;
  }

  const pCenter = (pStart + pEnd) / 2; // Center point of the diagonal

  // To keep 45-degree, diagonal width must equal absDy.
  // We center the diagonal around pCenter.
  const px1 = x1 + (dx * pCenter - absDy / 2) * direction;
  const px2 = px1 + absDy * direction;

  // Check boundaries
  const leftBound = Math.min(x1, x2);
  const rightBound = Math.max(x1, x2);

  if (px1 >= leftBound && px1 <= rightBound && px2 >= leftBound && px2 <= rightBound) {
    return `M ${x1},${y1} H ${px1} L ${px2},${y2} H ${x2}`;
  }

  // Fallback if space is restricted
  if (absDy < dx) {
    const remainingX = dx - absDy;
    const px1_f = x1 + (remainingX / 2) * direction;
    const px2_f = px1_f + absDy * direction;
    return `M ${x1},${y1} H ${px1_f} L ${px2_f},${y2} H ${x2}`;
  }

  return `M ${x1},${y1} L ${x2},${y2}`;
};

export default memo(function LeftPCB({ formRef, globeRef, contactSystemState = 'dormant', transmissionFailed, isTyping }) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)
  const particlesContainerRef = useRef(null)

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

  // Draw intricate traces.
  const traces = useMemo(() => {
    const list = [];
    
    const addTrace = (chKey, x1_unscaled, y1, x2_unscaled, y2, category, extra = {}) => {
      const x1 = xStart + x1_unscaled * scale;
      const x2 = xStart + x2_unscaled * scale;
      const d = drawLeftPCBPath(x1, y1, x2, y2, category);
      const styleAttrs = getTraceStyleAttrs(category);
      list.push({
        chKey,
        d,
        w: styleAttrs.w,
        opDefault: styleAttrs.opDefault,
        ...extra
      });
    };

    // --- CHANNEL 1 (NAME) & ITS TOP Zone ---
    addTrace('name', 0, CH1_Y - 90, 280, CH1_Y - 30, 'auxiliary', { pulse: true });
    addTrace('name', 0, CH1_Y - 75, 280, CH1_Y - 20, 'auxiliary');
    addTrace('name', 0, CH1_Y - 55, 280, CH1_Y - 5, 'main', { main: true });
    addTrace('name', 0, CH1_Y - 45, 280, CH1_Y + 5, 'auxiliary');
    addTrace('name', 0, CH1_Y - 62, 168, CH1_Y - 22, 'ground');

    addTrace('name', 0, CH1_Y, 130, CH1_Y + 10, 'auxiliary');
    addTrace('name', 60, CH1_Y + 20, 280, CH1_Y + 40, 'auxiliary');
    addTrace('name', 140, CH1_Y + 10, 280, CH1_Y + 30, 'auxiliary');

    // --- CHANNEL 2 (EMAIL) ---
    addTrace('email', 0, CH2_Y - 20, 280, CH2_Y + 40, 'auxiliary', { pulse: true });
    addTrace('email', 0, CH2_Y, 280, CH2_Y + 30, 'main', { main: true });
    addTrace('email', 40, CH2_Y - 30, 280, CH2_Y + 10, 'auxiliary');
    addTrace('email', 0, CH2_Y - 26, 114, CH2_Y + 14, 'ground');
    addTrace('email', 50, CH2_Y + 24, 176, CH2_Y + 44, 'ground');

    // --- CHANNEL 3 (SUBJECT) ---
    addTrace('subject', 0, CH3_Y + 20, 280, CH3_Y - 40, 'auxiliary', { pulse: true });
    addTrace('subject', 0, CH3_Y, 280, CH3_Y - 30, 'main', { main: true });
    addTrace('subject', 40, CH3_Y + 30, 280, CH3_Y - 10, 'auxiliary');
    addTrace('subject', 0, CH3_Y + 26, 114, CH3_Y - 14, 'ground');
    addTrace('subject', 50, CH3_Y - 24, 176, CH3_Y - 44, 'ground');

    // --- CHANNEL 4 (MESSAGE) ---
    addTrace('message', 0, CH4_Y + 90, 280, CH4_Y + 30, 'auxiliary', { pulse: true });
    addTrace('message', 0, CH4_Y + 75, 280, CH4_Y + 20, 'auxiliary');
    addTrace('message', 0, CH4_Y + 55, 280, CH4_Y + 5, 'main', { main: true });
    addTrace('message', 0, CH4_Y + 45, 280, CH4_Y - 5, 'auxiliary');
    addTrace('message', 0, CH4_Y + 62, 168, CH4_Y + 22, 'ground');

    addTrace('message', 0, CH4_Y, 130, CH4_Y - 10, 'auxiliary');
    addTrace('message', 60, CH4_Y - 20, 280, CH4_Y - 40, 'auxiliary');
    addTrace('message', 140, CH4_Y - 10, 280, CH4_Y - 30, 'auxiliary');

    // Edge Connectors on the far right
    addTrace('name', 260, CH1_Y - 40, 280, CH1_Y - 40, 'main');
    addTrace('email', 260, CH2_Y + 20, 280, CH2_Y + 20, 'main');
    addTrace('subject', 260, CH3_Y - 20, 280, CH3_Y - 20, 'main');
    addTrace('message', 260, CH4_Y + 40, 280, CH4_Y + 40, 'main');

    return list;
  }, [scale, xStart, CH1_Y, CH2_Y, CH3_Y, CH4_Y])

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

  useEffect(() => {
    if (shouldReduceMotion) return

    const container = particlesContainerRef.current
    if (!container) return

    let intervalId = null

    const spawnParticle = (trace, isBurst = false, delayMs = 0) => {
      const delayTimer = setTimeout(() => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('cx', '0')
        circle.setAttribute('cy', '0')
        
        const r = isBurst ? '2.0' : '1.6'
        circle.setAttribute('r', r)
        
        const colors = ['var(--accent)', 'var(--accent-secondary)', '#ffffff']
        const randomColor = isBurst 
          ? colors[Math.floor(Math.random() * colors.length)] 
          : 'var(--accent)'
        circle.setAttribute('fill', randomColor)
        
        circle.setAttribute('filter', isBurst ? 'url(#pcbGlowActive)' : 'url(#pcbHairlineGlow)')
        circle.style.offsetPath = `path('${trace.d}')`
        
        const duration = isBurst ? '0.7s' : '1.2s'
        circle.style.animation = `pcbParticleTravel ${duration} linear forwards`
        
        container.appendChild(circle)

        const cleanupTimer = setTimeout(() => {
          circle.remove()
        }, isBurst ? 700 : 1200)

        circle.__cleanupTimer = cleanupTimer
      }, delayMs)

      return delayTimer
    }

    const timers = []

    const isTransmit = contactSystemState === 'transmit'

    if (isTransmit) {
      traces.forEach((t) => {
        if (t.main) {
          timers.push(spawnParticle(t, true, 0))
          timers.push(spawnParticle(t, true, 120))
          timers.push(spawnParticle(t, true, 240))
          timers.push(spawnParticle(t, true, 360))
        }
      })
    } else if (isTyping) {
      const runSpawn = () => {
        traces.forEach((t) => {
          if (t.main) {
            timers.push(spawnParticle(t, false, Math.random() * 150))
          }
        })
      }
      runSpawn()
      intervalId = setInterval(runSpawn, 450)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
      timers.forEach((t) => clearTimeout(t))
    }
  }, [isTyping, contactSystemState, traces, shouldReduceMotion])

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
        {/* Negative space clearance gap */}
        <rect x={-w / 2 - 3} y={-h / 2 - 3} width={w + 6} height={h + 6} fill="#030304" />
        <rect x={-w / 2} y={-h / 2} width={3} height={h} fill="#2f2f38" stroke="#4a4a58" strokeWidth="0.3" />
        <rect x={w / 2 - 3} y={-h / 2} width={3} height={h} fill="#2f2f38" stroke="#4a4a58" strokeWidth="0.3" />
        <rect x={-w / 2 - 1.5} y={-h / 2 - 1.5} width={w + 3} height={h + 3} fill="none" stroke="#ffffff" strokeWidth="0.3" opacity="0.35" />
        <rect x={-w / 2 + 2.5} y={-h / 2 + 0.5} width={w - 5} height={h - 1} rx={0.5} fill="#0d0d10" stroke="#1c1c21" strokeWidth="0.4" />
        <rect x={-w / 2 + 4} y={-h / 2 + 2} width={w - 8} height={h - 4} fill="none" stroke="var(--accent)" strokeWidth="0.3" opacity={0.65} />
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
        {/* Negative space clearance gap */}
        <circle cx="0" cy="0" r="4.5" fill="#030304" />
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
        {/* Motherboard-style Negative Space Corridor Channel */}
        {t.category === 'main' && (
          <>
            <path
              d={t.d}
              stroke="var(--accent)"
              strokeWidth={t.w * 3.0 + 6.0}
              fill="none"
              opacity={targetOpacity * 0.05}
              strokeLinecap="square"
              strokeLinejoin="miter"
              style={getTransitionStyle()}
            />
            <path
              d={t.d}
              stroke="#080a12"
              strokeWidth={t.w * 3.0 + 5.2}
              fill="none"
              opacity={targetOpacity * 0.95}
              strokeLinecap="square"
              strokeLinejoin="miter"
              style={getTransitionStyle()}
            />
          </>
        )}
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
            {(t.main || t.pulse) && isTyping && (
              <path
                d={t.d}
                stroke="var(--accent)"
                strokeWidth={t.w + 1.2}
                fill="none"
                opacity="1"
                pathLength="100"
                filter="url(#pcbGlowActive)"
                style={{
                  strokeDasharray: '15 100',
                  animation: `pcbSignalFlow 1.8s linear infinite ${t.main ? '0s' : '0.6s'}`,
                  willChange: 'stroke-dashoffset',
                  transform: 'translate3d(0, 0, 0)'
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
          opacity={targetOpacity * (t.opDefault || 0.3)}
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
          {/* Substrate Clearance Gap */}
          <circle cx="0" cy="0" r="17.5" fill="#030304" />
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
        {/* Negative space clearance gap */}
        <circle cx="0" cy="0" r="4.5" fill="#030304" />
        <circle cx="0" cy="0" r="3" fill="#18181f" stroke="#333" strokeWidth="0.5" />
        <circle cx="0" cy="0" r="1.8" fill="#2d2d3a" stroke="var(--accent)" strokeWidth="0.3" opacity={0.65} style={ringAnimation} />
        <circle cx="0" cy="0" r="0.8" fill="#000" />
      </g>
    )
  }
  const renderCadTicks = (x, y, w, h) => (
    <g stroke="var(--accent)" strokeWidth="0.35" opacity="0.06">
      <path d={`M ${x},${y+4} V ${y} H ${x+4}`} fill="none" />
      <path d={`M ${x+w-4},${y} H ${x+w} V ${y+4}`} fill="none" />
      <path d={`M ${x},${y+h-4} V ${y+h} H ${x+4}`} fill="none" />
      <path d={`M ${x+w-4},${y+h} H ${x+w} V ${y+h-4}`} fill="none" />
    </g>
  )

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


      <svg
        className="w-full h-full"
        viewBox={`0 0 ${G || 600} ${H || 600}`}
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <filter id="pcbHairlineGlow" filterUnits="userSpaceOnUse" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="pcbGlowActive" filterUnits="userSpaceOnUse" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
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

        {/* Motherboard-style CAD Routing Zones & Inactive Infrastructure */}
        <g 
          className="pcb-zones-and-infrastructure" 
          opacity={isTransmit ? 0 : 1}
          style={{ transition: 'opacity 750ms cubic-bezier(0.65, 0, 0.35, 1)' }}
        >
          {/* ========================================================
                TOP MARGIN CAD ZONES (Left PCB)
             ======================================================== */}
          {/* Zone 1: Transmission (Input) Zone */}
          <rect 
            x={xStart + 2} 
            y={10} 
            width={60 * scale} 
            height={70} 
            fill="rgba(8, 10, 18, 0.25)" 
            stroke="var(--accent)" 
            strokeWidth="0.25" 
            opacity="0.05" 
          />
          {renderCadTicks(xStart + 2, 10, 60 * scale, 70)}
          <text x={xStart + 8} y={22} fill="var(--accent)" fontSize="5.5" fontFamily="monospace" letterSpacing="1" opacity="0.07">SYS_TX_L1</text>

          {/* Zone 2: Branching Zone */}
          <rect 
            x={xStart + 65 * scale} 
            y={10} 
            width={85 * scale} 
            height={70} 
            fill="rgba(8, 10, 18, 0.20)" 
            stroke="var(--accent)" 
            strokeWidth="0.25" 
            opacity="0.04" 
          />
          {renderCadTicks(xStart + 65 * scale, 10, 85 * scale, 70)}
          <text x={xStart + (65 + 6) * scale} y={22} fill="var(--accent)" fontSize="5.5" fontFamily="monospace" letterSpacing="1" opacity="0.07">SYS_BR_L2</text>

          {/* Zone 3: Buffer Zone */}
          <rect 
            x={xStart + 155 * scale} 
            y={10} 
            width={70 * scale} 
            height={70} 
            fill="rgba(8, 10, 18, 0.30)" 
            stroke="var(--accent)" 
            strokeWidth="0.25" 
            opacity="0.06" 
          />
          {renderCadTicks(xStart + 155 * scale, 10, 70 * scale, 70)}
          <text x={xStart + (155 + 6) * scale} y={22} fill="var(--accent)" fontSize="5.5" fontFamily="monospace" letterSpacing="1" opacity="0.08">SYS_BF_L3</text>

          {/* Zone 4: Interface Zone */}
          <rect 
            x={xStart + 230 * scale} 
            y={10} 
            width={46 * scale} 
            height={70} 
            fill="rgba(8, 10, 18, 0.35)" 
            stroke="var(--accent)" 
            strokeWidth="0.25" 
            opacity="0.07" 
          />
          {renderCadTicks(xStart + 230 * scale, 10, 46 * scale, 70)}
          <text x={xStart + (230 + 5) * scale} y={22} fill="var(--accent)" fontSize="5.5" fontFamily="monospace" letterSpacing="1" opacity="0.09">SYS_IT_L4</text>

          {/* ========================================================
                BOTTOM MARGIN CAD ZONES (Left PCB)
             ======================================================== */}
          <rect 
            x={xStart + 2} 
            y={H - 80} 
            width={60 * scale} 
            height={70} 
            fill="rgba(8, 10, 18, 0.25)" 
            stroke="var(--accent)" 
            strokeWidth="0.25" 
            opacity="0.05" 
          />
          {renderCadTicks(xStart + 2, H - 80, 60 * scale, 70)}

          <rect 
            x={xStart + 65 * scale} 
            y={H - 80} 
            width={85 * scale} 
            height={70} 
            fill="rgba(8, 10, 18, 0.20)" 
            stroke="var(--accent)" 
            strokeWidth="0.25" 
            opacity="0.04" 
          />
          {renderCadTicks(xStart + 65 * scale, H - 80, 85 * scale, 70)}

          <rect 
            x={xStart + 155 * scale} 
            y={H - 80} 
            width={70 * scale} 
            height={70} 
            fill="rgba(8, 10, 18, 0.30)" 
            stroke="var(--accent)" 
            strokeWidth="0.25" 
            opacity="0.06" 
          />
          {renderCadTicks(xStart + 155 * scale, H - 80, 70 * scale, 70)}

          <rect 
            x={xStart + 230 * scale} 
            y={H - 80} 
            width={46 * scale} 
            height={70} 
            fill="rgba(8, 10, 18, 0.35)" 
            stroke="var(--accent)" 
            strokeWidth="0.25" 
            opacity="0.07" 
          />
          {renderCadTicks(xStart + 230 * scale, H - 80, 46 * scale, 70)}

          {/* Inactive layered CAD tracks */}
          <path
            d={`M ${xStart + 20 * scale},10 V 80 L ${xStart + 80 * scale},140 H ${xStart + 160 * scale}`}
            stroke="var(--accent)"
            strokeWidth="0.6"
            fill="none"
            opacity="0.02"
          />
          <path
            d={`M ${xStart + 35 * scale},${H} V ${H - 80} L ${xStart + 95 * scale},${H - 140} H ${xStart + 175 * scale}`}
            stroke="var(--accent)"
            strokeWidth="0.6"
            fill="none"
            opacity="0.02"
          />
          <path
            d={`M ${xStart + 5 * scale},${CH2_Y + 12} H ${xStart + 60 * scale} L ${xStart + 90 * scale},${CH2_Y + 42} H ${xStart + 140 * scale}`}
            stroke="var(--accent)"
            strokeWidth="0.50"
            fill="none"
            opacity="0.015"
          />
          <path
            d={`M ${xStart + 5 * scale},${CH3_Y - 12} H ${xStart + 60 * scale} L ${xStart + 90 * scale},${CH3_Y - 42} H ${xStart + 140 * scale}`}
            stroke="var(--accent)"
            strokeWidth="0.50"
            fill="none"
            opacity="0.015"
          />
          <rect x={xStart + 140 * scale} y={CH2_Y - 80} width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="0.30" strokeDasharray="2 2" opacity="0.03" />
          <rect x={xStart + 140 * scale} y={CH3_Y + 60} width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="0.30" strokeDasharray="2 2" opacity="0.03" />
        </g>

        {/* Dynamic Particles Container */}
        <g ref={particlesContainerRef} />

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
