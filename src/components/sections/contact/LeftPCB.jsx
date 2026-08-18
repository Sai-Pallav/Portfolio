import React, { useRef, useState, useEffect, useMemo, memo } from 'react'
import { useReducedMotion } from 'framer-motion'

const getTraceStyleAttrs = (category) => {
  if (category === 'main') {
    return { w: 2.2, opDefault: 0.58 };
  } else {
    return { w: 0.65, opDefault: 0.42 };
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

export default memo(function LeftPCB({ isInView, formRef, globeRef, contactSystemState = 'dormant', transmissionFailed, beamActive }) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)
  const particlesContainerRef = useRef(null)
  const particlePoolRef = useRef([])
  const poolIndexRef = useRef(0)
  const [isTypingActive, setIsTypingActive] = useState(false)
  const isTyping = isTypingActive
  const activationLevel = isTyping ? 3 : 0

  const [activatedNodes, setActivatedNodes] = useState({})
  const [isIlluminated, setIsIlluminated] = useState(false)

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
  const CH4_Y = H * 0.84

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
    addTrace('name', 0, CH1_Y - 70, 280, CH1_Y - 25, 'auxiliary', { pulse: true });
    addTrace('name', 0, CH1_Y - 50, 280, CH1_Y - 8, 'main', { main: true });
    addTrace('name', 0, CH1_Y - 38, 280, CH1_Y + 8, 'auxiliary');
    addTrace('name', 0, CH1_Y - 56, 200, CH1_Y - 18, 'ground');

    addTrace('name', 0, CH1_Y + 2, 130, CH1_Y + 12, 'auxiliary');
    addTrace('name', 60, CH1_Y + 22, 280, CH1_Y + 40, 'auxiliary');
    addTrace('name', 140, CH1_Y + 12, 280, CH1_Y + 30, 'auxiliary');

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
    addTrace('message', 0, CH4_Y + 70, 280, CH4_Y + 25, 'auxiliary', { pulse: true });
    addTrace('message', 0, CH4_Y + 50, 280, CH4_Y + 8, 'main', { main: true });
    addTrace('message', 0, CH4_Y + 38, 280, CH4_Y - 8, 'auxiliary');
    addTrace('message', 0, CH4_Y + 56, 200, CH4_Y + 18, 'ground');

    addTrace('message', 0, CH4_Y - 2, 130, CH4_Y - 12, 'auxiliary');
    addTrace('message', 60, CH4_Y - 22, 280, CH4_Y - 40, 'auxiliary');
    addTrace('message', 140, CH4_Y - 12, 280, CH4_Y - 30, 'auxiliary');

    // Edge Connectors on the far right
    addTrace('name', 260, CH1_Y - 33, 280, CH1_Y - 33, 'main');
    addTrace('email', 260, CH2_Y + 20, 280, CH2_Y + 20, 'main');
    addTrace('subject', 260, CH3_Y - 20, 280, CH3_Y - 20, 'main');
    addTrace('message', 260, CH4_Y + 33, 280, CH4_Y + 33, 'main');

    return list;
  }, [scale, xStart, CH1_Y, CH2_Y, CH3_Y, CH4_Y])

  const mainBeamTraces = useMemo(() => {
    return traces.filter(t => t.main)
  }, [traces])


  // Nodes (Mirrored Y coordinates)
  const nodes = useMemo(() => [
    { x: 180, y: CH1_Y - 12, id: 'A1', chKey: 'name' },
    { x: 170, y: CH2_Y + 30, id: 'A2', chKey: 'email' },
    { x: 170, y: CH3_Y - 30, id: 'A3', chKey: 'subject' },
    { x: 180, y: CH4_Y + 12, id: 'A4', chKey: 'message' },
  ], [CH1_Y, CH2_Y, CH3_Y, CH4_Y])

  // SMT Component Blocks per Channel
  const smtComponents = useMemo(() => [
    // Name (CH1)
    { chKey: 'name', x: 120, y: CH1_Y - 52, w: 16, h: 8, label: 'R12' },
    { chKey: 'name', x: 148, y: CH1_Y - 12, w: 20, h: 10, label: 'C08' },
    { chKey: 'name', x: 130, y: CH1_Y + 12, w: 14, h: 8, label: 'R15' },
    // Email (CH2)
    { chKey: 'email', x: 100, y: CH2_Y, w: 18, h: 9, label: 'R21' },
    { chKey: 'email', x: 140, y: CH2_Y + 30, w: 24, h: 11, label: 'C14' },
    { chKey: 'email', x: 75, y: CH2_Y - 20, w: 14, h: 8, label: 'R22' },
    // Subject (CH3)
    { chKey: 'subject', x: 100, y: CH3_Y, w: 18, h: 9, label: 'R31' },
    { chKey: 'subject', x: 140, y: CH3_Y - 30, w: 24, h: 11, label: 'C31' },
    { chKey: 'subject', x: 75, y: CH3_Y + 20, w: 14, h: 8, label: 'R32' },
    // Message (CH4)
    { chKey: 'message', x: 120, y: CH4_Y + 52, w: 16, h: 8, label: 'R41' },
    { chKey: 'message', x: 148, y: CH4_Y + 12, w: 20, h: 10, label: 'C41' },
    { chKey: 'message', x: 130, y: CH4_Y - 12, w: 14, h: 8, label: 'R42' }
  ], [CH1_Y, CH2_Y, CH3_Y, CH4_Y])

  // Custom Engineered Substrate Footprints specifically designed around each channel's trace & component architecture
  const substratePolygons = useMemo(() => ({
    name: [
      // Channel 1 Masterwork Substrate: Seamless continuous ground plane contouring Start intake, Middle core (R12, C08, Node A1, R15), and End transmission beam
      [
        { x: 44,  y: CH1_Y - 54 },
        { x: 138, y: CH1_Y - 54 },
        { x: 162, y: CH1_Y - 30 },
        { x: 194, y: CH1_Y - 30 },
        { x: 210, y: CH1_Y - 14 },
        { x: 248, y: CH1_Y - 14 },
        { x: 256, y: CH1_Y - 6 },
        { x: 248, y: CH1_Y + 2 },
        { x: 204, y: CH1_Y + 2 },
        { x: 194, y: CH1_Y + 12 },
        { x: 150, y: CH1_Y + 12 },
        { x: 140, y: CH1_Y + 22 },
        { x: 114, y: CH1_Y + 22 },
        { x: 102, y: CH1_Y + 10 },
        { x: 60,  y: CH1_Y + 10 },
        { x: 36,  y: CH1_Y - 14 },
        { x: 36,  y: CH1_Y - 46 }
      ]
    ],
    email: [
      // Channel 2: Pure 45° and orthogonal CAD chamfering around R22, R21, C14 and Node A2
      [
        { x: 120, y: CH2_Y + 54 },
        { x: 178, y: CH2_Y + 54 },
        { x: 194, y: CH2_Y + 38 },
        { x: 194, y: CH2_Y + 22 },
        { x: 184, y: CH2_Y + 12 },
        { x: 144, y: CH2_Y + 12 },
        { x: 124, y: CH2_Y - 8 },
        { x: 100, y: CH2_Y - 8 },
        { x: 84, y: CH2_Y - 24 },
        { x: 64, y: CH2_Y - 24 },
        { x: 54, y: CH2_Y - 14 },
        { x: 54, y: CH2_Y + 10 },
        { x: 76, y: CH2_Y + 32 },
        { x: 108, y: CH2_Y + 32 },
        { x: 120, y: CH2_Y + 44 }
      ]
    ],
    subject: [
      // Channel 3: Vertical mirror of Channel 2, perfectly contoured around Node A3
      [
        { x: 120, y: CH3_Y - 54 },
        { x: 178, y: CH3_Y - 54 },
        { x: 194, y: CH3_Y - 38 },
        { x: 194, y: CH3_Y - 22 },
        { x: 184, y: CH3_Y - 12 },
        { x: 144, y: CH3_Y - 12 },
        { x: 124, y: CH3_Y + 8 },
        { x: 100, y: CH3_Y + 8 },
        { x: 84, y: CH3_Y + 24 },
        { x: 64, y: CH3_Y + 24 },
        { x: 54, y: CH3_Y + 14 },
        { x: 54, y: CH3_Y - 10 },
        { x: 76, y: CH3_Y - 32 },
        { x: 108, y: CH3_Y - 32 },
        { x: 120, y: CH3_Y - 44 }
      ]
    ],
    message: [
      // Channel 4: Vertical mirror of Channel 1, perfectly contoured around Node A4
      [
        { x: 94, y: CH4_Y + 58 },
        { x: 140, y: CH4_Y + 58 },
        { x: 164, y: CH4_Y + 34 },
        { x: 188, y: CH4_Y + 34 },
        { x: 204, y: CH4_Y + 18 },
        { x: 204, y: CH4_Y + 6 },
        { x: 194, y: CH4_Y - 4 },
        { x: 152, y: CH4_Y - 4 },
        { x: 136, y: CH4_Y - 20 },
        { x: 114, y: CH4_Y - 20 },
        { x: 102, y: CH4_Y - 8 },
        { x: 102, y: CH4_Y + 18 },
        { x: 86, y: CH4_Y + 34 },
        { x: 86, y: CH4_Y + 50 }
      ]
    ]
  }), [CH1_Y, CH2_Y, CH3_Y, CH4_Y])

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
      substrate: 0.88,
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

    particlePoolRef.current = Array.from(container.children)
    let intervalId = null

    const spawnParticle = (trace, isBurst = false, delayMs = 0) => {
      const delayTimer = setTimeout(() => {
        if (!particlePoolRef.current || particlePoolRef.current.length === 0) return

        const circle = particlePoolRef.current[poolIndexRef.current]
        poolIndexRef.current = (poolIndexRef.current + 1) % particlePoolRef.current.length

        if (circle._cleanupTimer) {
          clearTimeout(circle._cleanupTimer)
          circle._cleanupTimer = null
        }

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
        circle.style.display = 'block'

        const cleanupTimer = setTimeout(() => {
          circle.style.display = 'none'
          circle.style.animation = 'none'
        }, isBurst ? 700 : 1200)

        circle._cleanupTimer = cleanupTimer
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
      if (particlePoolRef.current) {
        particlePoolRef.current.forEach((circle) => {
          if (circle._cleanupTimer) clearTimeout(circle._cleanupTimer)
          circle.style.display = 'none'
          circle.style.animation = 'none'
        })
      }
    }
  }, [isInView, isIlluminated, activationLevel, contactSystemState, traces, shouldReduceMotion])

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


  // Custom Engineered Substrate Renderer for Left PCB Component
  // Exact same structure as Middle PCB: bare polygon + fiducials only.
  // The mask and opacity wrapper is applied globally at the render site.
  const renderChannelSubstrates = (chKey) => {
    const polys = substratePolygons[chKey] || []
    return (
      <g key={`sub-group-${chKey}`}>
        {polys.map((poly, pIdx) => {
          const pointsStr = poly.map(pt => `${xStart + pt.x * scale},${pt.y}`).join(' ')
          const cornerFiducials = [poly[0], poly[3], poly[6], poly[9]].filter(Boolean)
          return (
            <g key={`sub-poly-${chKey}-${pIdx}`}>
              {/* Ground Pour Plane — identical to Middle PCB copper-hatch-pattern polygons */}
              <polygon
                points={pointsStr}
                fill="url(#copper-hatch-pattern-l)"
                stroke="color-mix(in srgb, var(--accent) 22%, transparent)"
                strokeWidth="0.6"
              />
              {/* Precision CAD Corner Fiducials */}
              {cornerFiducials.map((pt, cIdx) => (
                <g
                  key={`fiducial-${chKey}-${cIdx}`}
                  transform={`translate(${xStart + pt.x * scale}, ${pt.y})`}
                  opacity="0.35"
                >
                  <circle cx="0" cy="0" r="0.8" fill="var(--accent)" />
                  <line x1="-2" y1="0" x2="2" y2="0" stroke="var(--accent)" strokeWidth="0.25" />
                  <line x1="0" y1="-2" x2="0" y2="2" stroke="var(--accent)" strokeWidth="0.25" />
                </g>
              ))}
            </g>
          )
        })}
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
              stroke="color-mix(in srgb, var(--accent) 18%, transparent)"
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
                <circle cx={b.x} cy={b.y} r="3.8" fill="none" stroke="color-mix(in srgb, var(--accent) 30%, transparent)" strokeWidth="0.25" style={getTransitionStyle()} />
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
        filter: 'brightness(0.85) saturate(0.4)',
        transition: 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1), filter 800ms cubic-bezier(0.4, 0, 0.2, 1)'
      }
    }
    return {
      opacity: 0.95,
      filter: 'brightness(1.0) saturate(1.0)',
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
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
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
          
          {/* Copper Hatch Ground Pour Pattern — identical to Middle PCB copper-hatch-pattern */}
          <pattern id="copper-hatch-pattern-l" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="2" x2="4" y2="2" stroke="color-mix(in srgb, var(--accent) 22%, transparent)" strokeWidth="0.60" />
            <line x1="2" y1="0" x2="2" y2="4" stroke="color-mix(in srgb, var(--accent) 22%, transparent)" strokeWidth="0.60" />
          </pattern>

          {/* Single Global Copper Hatch Mask — identical structure to copperHatchMask in RightPCB */}
          <mask id="leftCopperHatchMask" x="-100%" y="-100%" width="300%" height="300%">
            <rect x="-100%" y="-100%" width="300%" height="300%" fill="white" />
            {/* Cut out clearance circles for all nodes */}
            {nodes.map((n, idx) => (
              <circle
                key={`left-hatch-clear-node-${idx}`}
                cx={xStart + n.x * scale}
                cy={n.y}
                r="18.5"
                fill="black"
              />
            ))}
            {/* Cut out clearance rectangles for all SMT components */}
            {smtComponents.map((c, idx) => (
              <rect
                key={`left-hatch-clear-comp-${idx}`}
                x={xStart + c.x * scale - c.w / 2 - 2.5}
                y={c.y - c.h / 2 - 2.5}
                width={c.w + 5.0}
                height={c.h + 5.0}
                fill="black"
              />
            ))}
          </mask>

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

        {/* Dynamic Particles Container (Recycled Pool) */}
        <g ref={particlesContainerRef}>
          {Array.from({ length: 24 }).map((_, i) => (
            <circle
              key={`p-pool-l-${i}`}
              cx="0"
              cy="0"
              r="1.6"
              fill="var(--accent)"
              style={{ display: 'none', pointerEvents: 'none' }}
            />
          ))}
        </g>

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

        {/* ========================================================
              LEFT PCB GROUND PLANE POURS — identical structure to Middle PCB
              Single global mask applied to all substrate polygons at once
           ======================================================== */}
        <g
          mask="url(#leftCopperHatchMask)"
          style={{ transition: 'opacity 750ms cubic-bezier(0.4, 0, 0.2, 1)' }}
          opacity={isTransmit ? 0.3 : 1}
        >
          {renderChannelSubstrates('name')}
          {renderChannelSubstrates('email')}
          {renderChannelSubstrates('subject')}
          {renderChannelSubstrates('message')}
        </g>

        {/* CHANNEL 1 (NAME) GROUP */}
        <g style={getChannelGroupStyle('name', 0)}>
          {/* Traces */}
          <g strokeLinecap="round" strokeLinejoin="round" fill="none">
            {traces.filter(t => t.chKey === 'name').map((t, i) => renderTrace(t, i))}
          </g>
          {/* SMT Components */}
          {smtComponents.filter(c => c.chKey === 'name').map(c => renderGlassBlock(c.x, c.y, c.w, c.h, c.label, c.chKey))}
          {/* Nodes */}
          {nodes.filter(n => n.chKey === 'name').map((n, i) => renderNode(n, i))}
          {/* Edge Connector */}
          {renderEdgeConnector(CH1_Y - 33, 0)}
        </g>

        {/* CHANNEL 2 (EMAIL) GROUP */}
        <g style={getChannelGroupStyle('email', 1)}>
          {/* Traces */}
          <g strokeLinecap="round" strokeLinejoin="round" fill="none">
            {traces.filter(t => t.chKey === 'email').map((t, i) => renderTrace(t, i))}
          </g>
          {/* SMT Components */}
          {smtComponents.filter(c => c.chKey === 'email').map(c => renderGlassBlock(c.x, c.y, c.w, c.h, c.label, c.chKey))}
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
          {smtComponents.filter(c => c.chKey === 'subject').map(c => renderGlassBlock(c.x, c.y, c.w, c.h, c.label, c.chKey))}
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
          {smtComponents.filter(c => c.chKey === 'message').map(c => renderGlassBlock(c.x, c.y, c.w, c.h, c.label, c.chKey))}
          {/* Nodes */}
          {nodes.filter(n => n.chKey === 'message').map((n, i) => renderNode(n, i))}
          {/* Edge Connector */}
          {renderEdgeConnector(CH4_Y + 33, 3)}
        </g>

      </svg>
    </div>
  )
})
