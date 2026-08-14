import React, { useRef, useState, useEffect, useMemo, memo } from 'react'
import { useReducedMotion } from 'framer-motion'

const getTraceStyleAttrs = (category) => {
  if (category === 'main') {
    return { w: 2.2, opDefault: 0.68 };
  } else {
    return { w: 0.65, opDefault: 0.48 };
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

export default memo(function LeftPCB({ isInView, formRef, globeRef, contactSystemState = 'dormant', transmissionFailed, isTyping: propsIsTyping, formProgress, beamActive }) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)
  const particlesContainerRef = useRef(null)
  const [isTypingActive, setIsTypingActive] = useState(false)
  const isTyping = Boolean(propsIsTyping || isTypingActive)
  const [hasWokenUp, setHasWokenUp] = useState(false)
  const activationLevel = isTyping ? 3 : 0

  const [activatedNodes, setActivatedNodes] = useState({})
  const [isIlluminated, setIsIlluminated] = useState(false)


  useEffect(() => {
    if (isInView || contactSystemState === 'engaged' || isTyping) {
      setHasWokenUp(true)
    }
  }, [isInView, contactSystemState, isTyping])

  useEffect(() => {
    if (!isInView && !isIlluminated) {
      setIsIlluminated(false)
      setActivatedNodes({})
      return
    }

    if (isIlluminated) return

    // 0s - 5s: Baseline state - all PCB components are properly visible at 85% opacity & static
    // At 5.0s: Illumination power-up! Opacity jumps to 100%, brightness lifts, nodes animate & pulse
    const tIllum = setTimeout(() => {
      setIsIlluminated(true)
      setActivatedNodes({ A1: true, A2: true, A3: true, A4: true })
    }, 5000)

    return () => {
      clearTimeout(tIllum)
    }
  }, [isInView, isIlluminated])

  useEffect(() => {
    const sectionEl = document.getElementById('contact')
    const handleTypingEvent = (e) => {
      setIsTypingActive(!!(e.detail && e.detail.isTyping))
    }
    if (sectionEl) {
      sectionEl.addEventListener('contact-typing', handleTypingEvent)
      return () => sectionEl.removeEventListener('contact-typing', handleTypingEvent)
    }
  }, [])

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

        setLayout(prev => {
          if (
            Math.abs(prev.G - G_val) < 2 &&
            Math.abs(prev.H - H_val) < 2 &&
            Math.abs(prev.L_form_end - (L_form_val - 12)) < 2 &&
            Math.abs(prev.globeCenterX - gx) < 2 &&
            Math.abs(prev.globeCenterY - gy) < 2
          ) {
            return prev
          }
          return {
            G: G_val,
            H: H_val,
            xStart: 5,
            L_form_end: L_form_val - 12,
            globeCenterX: gx,
            globeCenterY: gy
          }
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

      let bends = [];
      if (y1 !== y2) {
        let pStart, pEnd;
        if (category === 'main') {
          pStart = 0.40;
          pEnd = 0.70;
        } else if (category === 'auxiliary') {
          pStart = 0.25;
          pEnd = 0.60;
        } else {
          pStart = 0.45;
          pEnd = 0.75;
        }
        const pCenter = (pStart + pEnd) / 2;
        const dx = Math.abs(x2 - x1);
        const absDy = Math.abs(y2 - y1);
        const direction = x2 > x1 ? 1 : -1;
        const px1 = x1 + (dx * pCenter - absDy / 2) * direction;
        const px2 = px1 + absDy * direction;
        bends = [{ x: px1, y: y1 }, { x: px2, y: y2 }];
      }

      list.push({
        chKey,
        d,
        w: styleAttrs.w,
        opDefault: styleAttrs.opDefault,
        category,
        bends,
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

  const mainBeamTraces = useMemo(() => {
    return traces.filter(t => t.main)
  }, [traces])


  // Nodes (Mirrored Y coordinates)
  const nodes = useMemo(() => [
    { x: 180, y: CH1_Y - 15, id: 'A1', chKey: 'name' },
    { x: 170, y: CH2_Y + 30, id: 'A2', chKey: 'email' },
    { x: 170, y: CH3_Y - 30, id: 'A3', chKey: 'subject' },
    { x: 180, y: CH4_Y + 15, id: 'A4', chKey: 'message' },
  ], [CH1_Y, CH2_Y, CH3_Y, CH4_Y])

  const isTransmit = contactSystemState === 'transmit'
  const isFormInteracting = Boolean(isTyping)

  const getTransitionStyle = React.useCallback(() => {
    if (contactSystemState === 'dormant') {
      return { transition: 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)' }
    }
    if (isTransmit) {
      return { transition: 'opacity 750ms cubic-bezier(0.65, 0, 0.35, 1)' }
    }
    return { transition: 'opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)' }
  }, [contactSystemState, isTransmit])

  const getTargetOpacity = React.useCallback((chKey, elementType = 'trace') => {
    const isHero = ['name', 'email', 'subject', 'message'].includes(chKey)
    
    if (isTransmit) return elementType === 'particle' ? 1.0 : 0
    if (transmissionFailed && isHero) return 0
    
    const illumFactor = isIlluminated ? 1.0 : 0.65 // 65% opacity before 5s, 100% after 5s

    const baseOp = {
      trace: isHero ? 1.0 : 0.85,
      corridor: 0.85,
      component: 0.95,
      node: 1.0,
      background: 0.75
    }[elementType] || 0.85

    return baseOp * illumFactor
  }, [isTransmit, transmissionFailed, isIlluminated])

  useEffect(() => {
    if (!isInView || !isIlluminated || shouldReduceMotion) return

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
    } else if (activationLevel >= 1) {
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
  }, [isInView, activationLevel, contactSystemState, traces, shouldReduceMotion])

  // Glassmorphic Component Block
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

  // Circular Termination Landing Pad
  const renderTerminationPad = (x, y, label, chKey) => {
    const targetOpacity = getTargetOpacity(chKey)
    const ringAnimation = {
      animationPlayState: activationLevel >= 2 ? 'running' : 'paused',
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




  const isTransmitOrFailed = isTransmit || transmissionFailed

  const getCorridorWidth = (traceWidth, layer) => {
    const base = 1.5
    const multipliers = {
      outer: 4.5,
      channel: 4.0,
      inner: 3.5
    }
    return traceWidth * multipliers[layer] + base
  };

  const traceCorridors = React.useMemo(() => (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={isTransmit ? 0 : 1}>
      {traces.filter(t => t.category === 'main').map((t, idx) => {
        const targetOpacity = getTargetOpacity(t.chKey, 'corridor')
        const w = t.w
        return (
          <React.Fragment key={`l-corridor-${idx}`}>
            {/* Layer 1: Ambient Field (soft outer glow) */}
            <path
              d={t.d}
              stroke="rgba(168, 85, 247, 0.018)"
              strokeWidth={getCorridorWidth(w, 'outer') + 1}
              opacity={targetOpacity * 0.7}
              style={getTransitionStyle()}
            />
            {/* Layer 2: Recessed Well (gradient for depth) */}
            <path
              d={t.d}
              stroke="url(#corridor-recess-gradient-l)"
              strokeWidth={getCorridorWidth(w, 'channel')}
              opacity={targetOpacity * 1.0}
              style={getTransitionStyle()}
            />
            {/* Layer 3: Channel Base (matte substrate) */}
            <path
              d={t.d}
              stroke="#06060a"
              strokeWidth={getCorridorWidth(w, 'inner') + 0.5}
              opacity={targetOpacity * 0.95}
              style={getTransitionStyle()}
            />
            {/* Layer 4: Internal Highlight (optical depth cue) */}
            <path
              d={t.d}
              stroke="rgba(255, 255, 255, 0.015)"
              strokeWidth={getCorridorWidth(w, 'inner') - 0.2}
              opacity={targetOpacity * 0.9}
              transform="translate(-0.2, -0.3)"
              style={getTransitionStyle()}
            />

            {/* Bend Clearances */}
            {t.bends && t.bends.map((b, bIdx) => (
              <g key={`l-bend-clear-${idx}-${bIdx}`} opacity={targetOpacity * 0.95}>
                <circle cx={b.x} cy={b.y} r="4.2" fill="url(#radial-depth-gradient)" style={getTransitionStyle()} />
                <circle cx={b.x} cy={b.y} r="3.8" fill="none" stroke="rgba(168, 85, 247, 0.03)" strokeWidth="0.25" style={getTransitionStyle()} />
                <circle cx={b.x} cy={b.y} r="3.2" fill="#040407" opacity="0.9" style={getTransitionStyle()} />
                <circle cx={b.x - 0.3} cy={b.y - 0.4} r="2.8" fill="none" stroke="rgba(255, 255, 255, 0.015)" strokeWidth="0.5" style={getTransitionStyle()} />
              </g>
            ))}
          </React.Fragment>
        )
      })}
    </g>
  ), [traces, getTargetOpacity, isTransmit, getTransitionStyle])

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
    const isMain = t.category === 'main'
    const classOpacity = isMain ? 0.68 : 0.48
    const w = t.w

    return (
      <React.Fragment key={`trace-${i}`}>
        {/* Material Layer 2: Groove Shadow */}
        {isMain && (
          <path
            d={t.d}
            stroke="rgba(0, 0, 0, 0.45)"
            strokeWidth={w + 0.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={classOpacity * 0.75}
            transform="translate(0.4, 0.4)"
            style={getTransitionStyle()}
          />
        )}

        {/* Material Layer 2: Groove Highlight */}
        {isMain && (
          <path
            d={t.d}
            stroke="rgba(255, 255, 255, 0.03)"
            strokeWidth={w + 0.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={classOpacity * 0.75}
            transform="translate(-0.4, -0.4)"
            style={getTransitionStyle()}
          />
        )}

        {!isTransmit && isMain && (
          <path
            d={t.d}
            stroke="var(--accent)"
            strokeWidth={w * 1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.30"
            filter="url(#pcbHairlineGlow)"
            style={getTransitionStyle()}
          />
        )}

        {/* Material Layer 3: Trace Core */}
        <path
          d={t.d}
          stroke="var(--accent)"
          strokeWidth={w}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={classOpacity}
          style={getTransitionStyle()}
        />

        {/* Brushed copper texture overlay */}
        <path
          d={t.d}
          stroke="url(#copper-texture-l)"
          strokeWidth={w}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={classOpacity * 0.12}
          style={getTransitionStyle()}
        />

        {/* Passive Trace Idle Highlight across all non-main traces */}
        {!isMain && !isTransmit && (
          <path
            d={t.d}
            stroke="var(--accent)"
            strokeWidth={w}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0"
            style={{
              ...getTransitionStyle(),
              animation: 'pcbIdleTraceHighlight 6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              animationPlayState: activationLevel >= 2 ? 'running' : 'paused',
              animationDelay: `${i * 0.7}s`
            }}
          />
        )}

        {/* Plated Solder Joints at Bends */}
        {t.bends && t.bends.map((bend, bIdx) => {
          const isMainBend = isMain;
          const nodeRadius = isMainBend ? 1.5 : 1.1;
          const ringRadius = isMainBend ? 1.0 : 0.75;
          const coreRadius = isMainBend ? 0.35 : 0.25;
          const usePulse = isMainBend && bIdx === 0 && !isTransmit;
          const pulseStyle = usePulse ? {
            animation: 'pcbIdleNodePulse 4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            animationPlayState: activationLevel >= 2 ? 'running' : 'paused',
            animationDelay: `${(i * 2.5 + bIdx * 0.8) * 0.4}s`
          } : {};
          return (
            <g
              key={`l-bend-${i}-${bIdx}`}
              transform={`translate(${bend.x}, ${bend.y})`}
              opacity={classOpacity * (isMainBend ? 0.85 : 0.65)}
              style={{ ...getTransitionStyle(), ...pulseStyle }}
            >
              <circle cx="0" cy="0" r={nodeRadius} fill="#030304" />
              <circle cx="0" cy="0" r={ringRadius} fill="none" stroke="url(#gold-plated)" strokeWidth="0.25" opacity={isMainBend ? 0.80 : 0.60} />
              <circle cx="0" cy="0" r={coreRadius} fill="#030304" />
            </g>
          );
        })}
      </React.Fragment>
    )
  }

  const renderNode = (n, i) => {
    const targetOpacity = getTargetOpacity(n.chKey)
    const isNodeActive = Boolean(activatedNodes[n.id] || shouldReduceMotion)

    const nodeStyle = {
      transition: 'transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)'
    }

    return (
      <g
        key={`node-${i}`}
        transform={`translate(${xStart + n.x * scale}, ${n.y})`}
        opacity={isNodeActive ? targetOpacity : targetOpacity * 0.9}
        style={getTransitionStyle()}
      >
        <g style={nodeStyle}>
          {/* Stepped CAD Docking Frame */}
          <g stroke="var(--accent)" strokeWidth="0.45" fill="none" opacity="0.65">
            <circle cx="0" cy="0" r="20.5" strokeDasharray="2 2" />
          </g>
          {/* Substrate Clearance Gap */}
          <circle cx="0" cy="0" r="17.5" fill="#030304" />
          {/* Solder Mask Opening */}
          <circle cx="0" cy="0" r="16" fill="#030304" opacity={0.8} />

          {/* Concentric Copper Pad Rings */}
          <circle cx="0" cy="0" r="14.5" fill="none" stroke="url(#gold-plated)" strokeWidth="0.6" opacity="1.0" />
          <circle cx="0" cy="0" r="12" fill="none" stroke="rgba(255, 255, 255, 0.45)" strokeDasharray="1.5 1.5" strokeWidth="0.45" opacity="0.95" />
          <circle cx="0" cy="0" r="9.5" fill="none" stroke="url(#gold-plated)" strokeWidth="0.5" opacity="1.0" />

          {/* Outer expanding pulse ring (Radar Effect) - activates after 5s */}
          <circle cx="0" cy="0" r="10" fill="none" stroke="var(--accent)" strokeWidth="0.8"
            className="anim-pcb-radar-pulse"
            style={{
              animationPlayState: isNodeActive ? 'running' : 'paused',
              opacity: isNodeActive ? 1 : 0.85, // properly visible when paused
              transformOrigin: '0px 0px'
            }}
          />

          {/* Rotatable Inner Details Group (Clockwise) */}
          <g className="anim-pcb-radar-rotate" style={{
            animationPlayState: isNodeActive ? 'running' : 'paused',
            transformOrigin: '0px 0px'
          }}>
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
                  strokeWidth="0.8"
                  opacity="0.95"
                />
              )
            })}
          </g>

          {/* Counter-Rotatable Outer Details Group (Counter-Clockwise) */}
          <g className="anim-pcb-radar-rotate-counter" style={{
            animationPlayState: isNodeActive ? 'running' : 'paused',
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
                  fill="#3d3d48"
                  stroke="#777"
                  strokeWidth="0.35"
                  opacity="0.90"
                />
              )
            })}
          </g>

          {/* Outer pulse ring */}
          <circle cx="0" cy="0" r="8" fill="none" stroke="#ffffff" strokeWidth="0.9" opacity="0.75"
            className="anim-pcb-ring-breathe"
            style={{
              animationPlayState: isNodeActive ? 'running' : 'paused',
              transformOrigin: '0px 0px'
            }}
          />

          {/* Soft Radar-Ping (Concentric ring expansion scale 1 -> 2.2, opacity 0.6 -> 0, 4.8s loop) */}
          <circle
            cx="0" cy="0" r="7"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="0.4"
            style={{
              animation: 'pcbRadarPing 4.8s cubic-bezier(0.1, 0.8, 0.3, 1) infinite',
              animationDelay: '0s',
              transformOrigin: '0px 0px'
            }}
          />

          {/* Inner Metallic Ring */}
          <circle cx="0" cy="0" r="5" fill="none" stroke="var(--accent)" strokeWidth="1.4" opacity="1.0" />

          {/* Core - Glows & Pulses independently after pulse passes */}
          <circle cx="0" cy="0" r="2.5" fill="var(--accent)" opacity="1.0"
            className="anim-pcb-core-pulse"
            style={{
              animationPlayState: isNodeActive ? 'running' : 'paused',
              transformOrigin: '0px 0px'
            }}
          />

          {/* Activation Flare Ring when pulse passes */}
          {isNodeActive && (
            <circle
              cx="0" cy="0" r="16"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="0.8"
              filter="url(#pcbHairlineGlow)"
              style={{
                animation: 'pcbRadarPulse 1.8s ease-out infinite',
                transformOrigin: '0px 0px'
              }}
            />
          )}
        </g>
      </g>
    )
  }

  const renderEdgeConnector = (y, i) => {
    const keys = ['name', 'email', 'subject', 'message']
    const targetOpacity = getTargetOpacity(keys[i])
    const ringAnimation = {
      animationPlayState: isIlluminated ? 'running' : 'paused',
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
        <circle cx="0" cy="0" r="1.8" fill="#2d2d3a" stroke="var(--accent)" strokeWidth="0.3" opacity={0.65} className="anim-pcb-via-pulse" style={ringAnimation} />
        <circle cx="0" cy="0" r="0.8" fill="#000" />
      </g>
    )
  }
  if (shouldReduceMotion) return null

  const pcbContainerStyle = useMemo(() => {
    if (contactSystemState !== 'dormant') return {}
    if (!isIlluminated) {
      return {
        opacity: 0.65,
        filter: 'brightness(0.85) saturate(0.35) hue-rotate(-25deg)',
        transition: 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1), filter 800ms cubic-bezier(0.4, 0, 0.2, 1)'
      }
    }
    return {
      opacity: 1.0,
      filter: 'brightness(1.05) saturate(1.05)',
      transition: 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1), filter 800ms cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }, [contactSystemState, isIlluminated])

  return (
    <div
      ref={containerRef}
      className="absolute top-0 bottom-0 left-0 w-full pointer-events-none z-0 hidden lg:block"
      style={pcbContainerStyle}
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
          <filter id="pcbGlowActive" filterUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%">
            {/* Ambient Glow: stdDev ~8, low opacity, slightly darker */}
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blurAmbient" />
            <feColorMatrix in="blurAmbient" type="matrix" values="0.6 0 0 0 0  0 0.6 0 0 0  0 0 0.6 0 0  0 0 0 0.2 0" result="glowAmbient" />

            {/* Mid Glow: stdDev ~2.5, medium opacity, accent color */}
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blurMid" />
            <feComponentTransfer in="blurMid" result="glowMid">
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>

            {/* Hot Core: stdDev ~0.6, high opacity, white */}
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" result="whiteSource" />
            <feGaussianBlur in="whiteSource" stdDeviation="0.6" result="blurCore" />
            <feComponentTransfer in="blurCore" result="glowCore">
              <feFuncA type="linear" slope="0.9" />
            </feComponentTransfer>

            <feMerge>
              <feMergeNode in="glowAmbient" />
              <feMergeNode in="glowMid" />
              <feMergeNode in="glowCore" />
            </feMerge>
          </filter>

          <linearGradient id="pcbTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0)" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.8" />
          </linearGradient>

          <pattern id="pcbDots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#ffffff" opacity="0.015" />
          </pattern>

          {/* Brushed copper texture */}
          <pattern id="copper-texture-l" width="8" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(3)">
            <line x1="0" y1="1" x2="8" y2="1" stroke="rgba(255,255,255,0.025)" strokeWidth="0.4" />
          </pattern>

          {/* Recessed routing field corridors */}
          <linearGradient id="corridor-recess-gradient-l" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#030305" />
            <stop offset="50%" stopColor="#04040a" />
            <stop offset="100%" stopColor="#060610" />
          </linearGradient>
          <pattern id="corridor-texture-l" width="3" height="3" patternUnits="userSpaceOnUse">
            <rect width="3" height="3" fill="transparent" />
            <circle cx="1.5" cy="1.5" r="0.35" fill="#ffffff" opacity="0.015" />
          </pattern>

          {/* Radial depth gradient for clearances */}
          <radialGradient id="radial-depth-gradient">
            <stop offset="0%" stopColor="#020204" />
            <stop offset="70%" stopColor="#040408" />
            <stop offset="100%" stopColor="#050508" />
          </radialGradient>
          
          {/* Via depth well gradient */}
          <radialGradient id="via-depth-well">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#020204" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          
          {/* Gold Plating Gradient */}
          <linearGradient id="gold-plated" x1="0%" y1="0%" x2="1" y2="1">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="50%" stopColor="#f3e5ab" />
            <stop offset="100%" stopColor="#aa7c11" />
          </linearGradient>
        </defs>

        {/* ========================================================
              DYNAMICAL TRACE ROUTING FIELDS & CORRIDORS
           ======================================================== */}
        {traceCorridors}

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




        {/* ========================================================
            LEFT PCB CONTINUOUS TRAVELING LINE PULSE ANIMATION
           ======================================================== */}
        {beamActive && isIlluminated && mainBeamTraces.length > 0 && (
          <g className="left-pcb-light-beams" style={{ pointerEvents: 'none' }}>
            {mainBeamTraces.map((trace, idx) => {
              return (
                <g key={`left-beam-${idx}`}>
                  {/* Layer 1: Ambient Outer Glow Line Pulse */}
                  <path
                    d={trace.d}
                    pathLength="100"
                    stroke="var(--accent)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity="0.35"
                    strokeDasharray="15 120"
                    style={{
                      animation: 'pcbLeftLinePulse 2.4s linear infinite',
                      animationDelay: '0s'
                    }}
                  />
                  {/* Layer 2: Mid Laser Line Pulse */}
                  <path
                    d={trace.d}
                    pathLength="100"
                    stroke="var(--accent)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity="0.85"
                    strokeDasharray="15 120"
                    style={{
                      animation: 'pcbLeftLinePulse 2.4s linear infinite',
                      animationDelay: '0s'
                    }}
                  />
                  {/* Layer 3: Hot Laser Core Line Pulse */}
                  <path
                    d={trace.d}
                    pathLength="100"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray="15 120"
                    style={{
                      animation: 'pcbLeftLinePulse 2.4s linear infinite',
                      animationDelay: '0s'
                    }}
                  />
                </g>
              )
            })}
          </g>
        )}

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
