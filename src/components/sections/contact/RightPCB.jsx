import React, { useRef, useState, useEffect, useMemo, memo } from 'react'
import { useReducedMotion } from 'framer-motion'

export default memo(function RightPCB({ formRef, globeRef, contactSystemState = 'dormant', transmissionFailed, isTyping, formProgress = 0 }) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)
  const particlesContainerRef = useRef(null)

  const [layout, setLayout] = useState({
    G: 600,
    H: 600,
    M_form: 220,
    L_globe: 200,
    R_globe: 500,
    globeCenterX: 800,
    globeCenterY: 300
  })



  // Layout calculations (throttled using requestAnimationFrame)
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
          M_form: middleStart,
          L_globe: middleEnd,
          R_globe: sphereRight - GLOBE_PCB_OVERLAP,
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

    const gridEl = containerRef.current
    const formEl = formRef?.current
    const globeEl = globeRef?.current

    update()

    const resizeObserver = new ResizeObserver(() => throttledUpdate())
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
  const endX = G - 15
  const isTransmit = contactSystemState === 'transmit'
  const isTransmitOrFailed = isTransmit || transmissionFailed

  const getTransitionStyle = () => {
    if (contactSystemState === 'dormant') {
      return { transition: 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)' }
    }
    if (isTransmit) {
      return { transition: 'opacity 750ms cubic-bezier(0.65, 0, 0.35, 1)' }
    }
    return { transition: 'opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)' }
  }
  
  const getTrailPath = (chKey) => {
    const startX = middleTargetLimit
    let startY = Y_center - 36
    if (chKey === 'email') startY = Y_center - 12
    else if (chKey === 'subject') startY = Y_center + 12
    else if (chKey === 'message') startY = Y_center + 36

    const targetX = layout.globeCenterX
    let targetY = layout.globeCenterY
    if (chKey === 'name') {
      targetY = layout.globeCenterY - 35
    } else if (chKey === 'subject') {
      targetY = layout.globeCenterY + 35
    }

    const dx = targetX - startX
    const dy = targetY - startY

    let cy1 = -30
    if (chKey === 'email') cy1 = -15
    else if (chKey === 'subject') cy1 = 15
    else if (chKey === 'message') cy1 = 30

    return `M ${startX},${startY} C ${startX + dx * 0.3},${startY + cy1} ${startX + dx * 0.7},${startY + dy - 10} ${startX + dx},${startY + dy}`
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

    const startX = middleTargetLimit
    let startY = Y_center - 36
    if (chKey === 'email') startY = Y_center - 12
    else if (chKey === 'subject') startY = Y_center + 12
    else if (chKey === 'message') startY = Y_center + 36

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

    let cy1 = -30
    if (chKey === 'email') cy1 = -15
    else if (chKey === 'subject') cy1 = 15
    else if (chKey === 'message') cy1 = 30

    const pathData = `M 0,0 C ${dx * 0.3},${cy1} ${dx * 0.7},${dy - 10} ${dx},${dy}`

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

  const rightTargetLimit = R_globe + 15
  const middleTargetLimit = L_globe - 15
  const midStart = M_form
  const W_mid = Math.max(50, middleTargetLimit - midStart)
  const W_right = Math.max(50, endX - rightTargetLimit)

  // Precision 45-degree PCB Auto-Router Path Helper
  // Guarantees all routes run exclusively horizontally and at exact 45-degree angles.
  const drawPCBPath = (x1, y1, x2, y2) => {
    const dx = Math.abs(x2 - x1)
    const dy = y2 - y1
    const absDy = Math.abs(dy)
    const direction = x2 > x1 ? 1 : -1
    
    if (absDy < dx) {
      // Center the 45-degree angled segment in the available space
      const remainingX = dx - absDy
      const px1 = x1 + (remainingX / 2) * direction
      const px2 = px1 + absDy * direction
      return `M ${x1},${y1} H ${px1} L ${px2},${y2} H ${x2}`
    } else {
      // Fallback if space is extremely restricted (no vertical stretch)
      return `M ${x1},${y1} L ${x2},${y2}`
    }
  }

  const pcbData = useMemo(() => {
    const middleTracesList = []

    // --- CHANNEL 1 (Name Input, starts at Y_center - 100, converges to Y_center - 36) ---
    middleTracesList.push({ chKey: 'name', d: drawPCBPath(midStart, Y_center - 100, middleTargetLimit, Y_center - 36), w: 1.5, opDefault: 0.25, main: true })
    middleTracesList.push({ chKey: 'name', d: drawPCBPath(midStart, Y_center - 112, middleTargetLimit, Y_center - 44), w: 0.6, opDefault: 0.15, pulse: true })
    middleTracesList.push({ chKey: 'name', d: drawPCBPath(midStart, Y_center - 88, middleTargetLimit, Y_center - 28), w: 0.6, opDefault: 0.15 })

    // --- CHANNEL 2 (Email Input, starts at Y_center - 50, converges to Y_center - 12) ---
    middleTracesList.push({ chKey: 'email', d: drawPCBPath(midStart, Y_center - 50, middleTargetLimit, Y_center - 12), w: 1.5, opDefault: 0.25, main: true })
    middleTracesList.push({ chKey: 'email', d: drawPCBPath(midStart, Y_center - 58, middleTargetLimit, Y_center - 20), w: 0.6, opDefault: 0.15, pulse: true })
    middleTracesList.push({ chKey: 'email', d: drawPCBPath(midStart, Y_center - 42, middleTargetLimit, Y_center - 4), w: 0.6, opDefault: 0.15 })

    // --- CHANNEL 3 (Subject Input, starts at Y_center + 50, converges to Y_center + 12) ---
    middleTracesList.push({ chKey: 'subject', d: drawPCBPath(midStart, Y_center + 50, middleTargetLimit, Y_center + 12), w: 1.5, opDefault: 0.25, main: true })
    middleTracesList.push({ chKey: 'subject', d: drawPCBPath(midStart, Y_center + 42, middleTargetLimit, Y_center + 4), w: 0.6, opDefault: 0.15, pulse: true })
    middleTracesList.push({ chKey: 'subject', d: drawPCBPath(midStart, Y_center + 58, middleTargetLimit, Y_center + 20), w: 0.6, opDefault: 0.15 })

    // --- CHANNEL 4 (Message Input, starts at Y_center + 100, converges to Y_center + 36) ---
    middleTracesList.push({ chKey: 'message', d: drawPCBPath(midStart, Y_center + 100, middleTargetLimit, Y_center + 36), w: 1.5, opDefault: 0.25, main: true })
    middleTracesList.push({ chKey: 'message', d: drawPCBPath(midStart, Y_center + 88, middleTargetLimit, Y_center + 28), w: 0.6, opDefault: 0.15, pulse: true })
    middleTracesList.push({ chKey: 'message', d: drawPCBPath(midStart, Y_center + 112, middleTargetLimit, Y_center + 44), w: 0.6, opDefault: 0.15 })

    const rightTracesList = []
    // Right section traces (reversed direction: starts at globe rightTargetLimit and goes to screen edge endX)
    // Trace 1: converges to Y_center - 30, exits to Y_center - 140
    rightTracesList.push({ d: drawPCBPath(rightTargetLimit, Y_center - 30, endX, Y_center - 140), w: 1.5, op: 0.45, main: true })
    rightTracesList.push({ d: drawPCBPath(rightTargetLimit, Y_center - 36, endX, Y_center - 150), w: 0.6, op: 0.22, pulse: true })
    rightTracesList.push({ d: drawPCBPath(rightTargetLimit, Y_center - 24, endX, Y_center - 130), w: 0.6, op: 0.22 })

    // Trace 2: converges to Y_center - 12, exits to Y_center - 80
    rightTracesList.push({ d: drawPCBPath(rightTargetLimit, Y_center - 12, endX, Y_center - 80), w: 1.5, op: 0.45, main: true })
    rightTracesList.push({ d: drawPCBPath(rightTargetLimit, Y_center - 18, endX, Y_center - 90), w: 0.6, op: 0.22, pulse: true })
    rightTracesList.push({ d: drawPCBPath(rightTargetLimit, Y_center - 6, endX, Y_center - 70), w: 0.6, op: 0.22 })

    // Trace 3: converges to Y_center + 12, exits to Y_center + 80
    rightTracesList.push({ d: drawPCBPath(rightTargetLimit, Y_center + 12, endX, Y_center + 80), w: 1.5, op: 0.45, main: true })
    rightTracesList.push({ d: drawPCBPath(rightTargetLimit, Y_center + 6, endX, Y_center + 70), w: 0.6, op: 0.22, pulse: true })
    rightTracesList.push({ d: drawPCBPath(rightTargetLimit, Y_center + 18, endX, Y_center + 90), w: 0.6, op: 0.22 })

    // Trace 4: converges to Y_center + 30, exits to Y_center + 140
    rightTracesList.push({ d: drawPCBPath(rightTargetLimit, Y_center + 30, endX, Y_center + 140), w: 1.5, op: 0.45, main: true })
    rightTracesList.push({ d: drawPCBPath(rightTargetLimit, Y_center + 24, endX, Y_center + 130), w: 0.6, op: 0.22, pulse: true })
    rightTracesList.push({ d: drawPCBPath(rightTargetLimit, Y_center + 36, endX, Y_center + 150), w: 0.6, op: 0.22 })

    // Hardware Components (Aligned horizontally on trace flat sections)
    const componentsList = [
      // Resistors on Middle Traces (Input protection array)
      { x: midStart + 15, y: Y_center - 112, w: 7.5, h: 4.0, l: 'R501', chKey: 'name' },
      { x: midStart + 15, y: Y_center - 100, w: 7.5, h: 4.0, l: 'R502', chKey: 'name' },
      { x: midStart + 15, y: Y_center - 88, w: 7.5, h: 4.0, l: 'R503', chKey: 'name' },

      { x: midStart + 20, y: Y_center - 58, w: 7.5, h: 4.0, l: 'R504', chKey: 'email' },
      { x: midStart + 20, y: Y_center - 50, w: 7.5, h: 4.0, l: 'R505', chKey: 'email' },
      { x: midStart + 20, y: Y_center - 42, w: 7.5, h: 4.0, l: 'R506', chKey: 'email' },

      { x: midStart + 20, y: Y_center + 42, w: 7.5, h: 4.0, l: 'R507', chKey: 'subject' },
      { x: midStart + 20, y: Y_center + 50, w: 7.5, h: 4.0, l: 'R508', chKey: 'subject' },
      { x: midStart + 20, y: Y_center + 58, w: 7.5, h: 4.0, l: 'R509', chKey: 'subject' },

      { x: midStart + 15, y: Y_center + 88, w: 7.5, h: 4.0, l: 'R510', chKey: 'message' },
      { x: midStart + 15, y: Y_center + 100, w: 7.5, h: 4.0, l: 'R511', chKey: 'message' },
      { x: midStart + 15, y: Y_center + 112, w: 7.5, h: 4.0, l: 'R512', chKey: 'message' },

      // Transceiver chips
      { x: midStart + W_mid * 0.45, y: Y_center - 65, w: 12, h: 8.0, l: 'U10', chKey: 'email' },
      { x: midStart + W_mid * 0.45, y: Y_center + 65, w: 12, h: 8.0, l: 'U11', chKey: 'subject' },

      // Capacitors on Middle Traces (Globe filter pads)
      { x: middleTargetLimit - 20, y: Y_center - 36, w: 7.5, h: 4.0, l: 'C501', chKey: 'name', isCap: true },
      { x: middleTargetLimit - 20, y: Y_center - 12, w: 7.5, h: 4.0, l: 'C502', chKey: 'email', isCap: true },
      { x: middleTargetLimit - 20, y: Y_center + 12, w: 7.5, h: 4.0, l: 'C503', chKey: 'subject', isCap: true },
      { x: middleTargetLimit - 20, y: Y_center + 36, w: 7.5, h: 4.0, l: 'C504', chKey: 'message', isCap: true },

      // Resistors on Right Traces (near screen edge)
      { x: endX - 22, y: Y_center - 140, w: 7.5, h: 4.0, l: 'R601' },
      { x: endX - 22, y: Y_center - 80, w: 7.5, h: 4.0, l: 'R602' },
      { x: endX - 22, y: Y_center + 80, w: 7.5, h: 4.0, l: 'R603' },
      { x: endX - 22, y: Y_center + 140, w: 7.5, h: 4.0, l: 'R604' },

      // Capacitors on Right Traces (near globe)
      { x: rightTargetLimit + 20, y: Y_center - 30, w: 7.5, h: 4.0, l: 'C601', isCap: true },
      { x: rightTargetLimit + 20, y: Y_center - 12, w: 7.5, h: 4.0, l: 'C602', isCap: true },
      { x: rightTargetLimit + 20, y: Y_center + 12, w: 7.5, h: 4.0, l: 'C603', isCap: true },
      { x: rightTargetLimit + 20, y: Y_center + 30, w: 7.5, h: 4.0, l: 'C604', isCap: true }
    ]

    const viasList = [
      // Middle Vias (Near trace start)
      { x: midStart + 8, y: Y_center - 100, l: 'V501', chKey: 'name' },
      { x: midStart + 8, y: Y_center - 50, l: 'V502', chKey: 'email' },
      { x: midStart + 8, y: Y_center + 50, l: 'V503', chKey: 'subject' },
      { x: midStart + 8, y: Y_center + 100, l: 'V504', chKey: 'message' },

      // Right Vias (Near trace start / screen edge)
      { x: endX - 10, y: Y_center - 140, l: 'V601' },
      { x: endX - 10, y: Y_center - 80, l: 'V602' },
      { x: endX - 10, y: Y_center + 80, l: 'V603' },
      { x: endX - 10, y: Y_center + 140, l: 'V604' }
    ]

    const padsList = [
      { x: midStart + W_mid * 0.22, y: Y_center - 130, l: 'TP51' },
      { x: midStart + W_mid * 0.22, y: Y_center + 130, l: 'TP52' },
      { x: rightTargetLimit + W_right * 0.45, y: Y_center - 60, l: 'TP61' },
      { x: rightTargetLimit + W_right * 0.45, y: Y_center + 60, l: 'TP62' }
    ]

    const mountingHolesList = [
      // Between globe and middle PCB
      { x: middleTargetLimit + 30, y: Y_center - 24 },
      { x: middleTargetLimit + 30, y: Y_center + 24 },
      // Between globe and right PCB
      { x: rightTargetLimit - 30, y: Y_center - 24 },
      { x: rightTargetLimit - 30, y: Y_center + 24 }
    ]

    // Nodes (Terminations)
    const nodesList = [
      { x: middleTargetLimit, y: -36, label: 'RX_0', chKey: 'name' },
      { x: middleTargetLimit, y: -12, label: 'RX_1', chKey: 'email' },
      { x: middleTargetLimit, y: 12, label: 'RX_2', chKey: 'subject' },
      { x: middleTargetLimit, y: 36, label: 'RX_3', chKey: 'message' },

      { x: rightTargetLimit, y: -30, label: 'TX_0' },
      { x: rightTargetLimit, y: -12, label: 'TX_1' },
      { x: rightTargetLimit, y: 12, label: 'TX_2' },
      { x: rightTargetLimit, y: 30, label: 'TX_3' }
    ]

    return {
      middleTraces: middleTracesList,
      rightTraces: rightTracesList,
      components: componentsList,
      vias: viasList,
      pads: padsList,
      mountingHoles: mountingHolesList,
      nodes: nodesList
    }
  }, [midStart, middleTargetLimit, rightTargetLimit, endX, Y_center, W_mid, W_right])

  if (shouldReduceMotion) return null

  const getTargetOpacity = (chKey) => {
    const isHero = ['name', 'email', 'subject', 'message'].includes(chKey)
    if (isTransmit) return 0
    if (transmissionFailed && isHero) return 0
    if (contactSystemState === 'engaged') {
      if (chKey === null || chKey === undefined) {
        return 0.80
      }
      return isHero ? 0.85 : 0.30
    }
    return 0.40
  }

  useEffect(() => {
    if (shouldReduceMotion) return

    const container = particlesContainerRef.current
    if (!container) return

    let intervalId = null

    const spawnParticle = (trace, isBurst = false, delayMs = 0, isRightTrace = false) => {
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
        
        const duration = isBurst ? '0.7s' : (isRightTrace ? '2.8s' : '1.2s')
        circle.style.animation = `pcbParticleTravel ${duration} linear forwards`
        
        container.appendChild(circle)

        const cleanupTimer = setTimeout(() => {
          circle.remove()
        }, isBurst ? 700 : (isRightTrace ? 2800 : 1200))

        circle.__cleanupTimer = cleanupTimer
      }, delayMs)

      return delayTimer
    }

    const timers = []

    const isTransmit = contactSystemState === 'transmit'

    if (isTransmit) {
      // Middle traces burst (inputs to globe)
      pcbData.middleTraces.forEach((t) => {
        if (t.main) {
          timers.push(spawnParticle(t, true, 0, false))
          timers.push(spawnParticle(t, true, 120, false))
          timers.push(spawnParticle(t, true, 240, false))
          timers.push(spawnParticle(t, true, 360, false))
        }
      })
      // Right traces burst (exiting globe)
      pcbData.rightTraces.forEach((t) => {
        if (t.main) {
          timers.push(spawnParticle(t, true, 200, true))
          timers.push(spawnParticle(t, true, 320, true))
          timers.push(spawnParticle(t, true, 440, true))
          timers.push(spawnParticle(t, true, 560, true))
        }
      })
    } else if (isTyping) {
      const runSpawn = () => {
        pcbData.middleTraces.forEach((t) => {
          if (t.main) {
            timers.push(spawnParticle(t, false, Math.random() * 150, false))
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
  }, [isTyping, contactSystemState, pcbData, shouldReduceMotion])

  // SMT Package Renderer
  const renderSMT = (x, y, w, h, label, chKey = null, isCap = false) => {
    const dropShadowClass = contactSystemState === 'dormant' ? "" : "filter drop-shadow-[0.5px_0.8px_0.5px_rgba(0,0,0,0.85)]"
    const targetOpacity = getTargetOpacity(chKey)

    return (
      <g 
        key={`smt-${label}-${x}-${y}`} 
        transform={`translate(${x}, ${y})`} 
        className={dropShadowClass}
        opacity={targetOpacity}
        style={getTransitionStyle()}
      >
        <rect x={-w/2 - 0.8} y={-h/2 - 0.4} width={w + 1.6} height={h + 0.8} fill="#030304" />
        <rect x={-w/2} y={-h/2} width={1.6} height={h} fill="#444452" stroke="#6e6e80" strokeWidth="0.25" opacity="1.0" />
        <rect x={w/2 - 1.6} y={-h/2} width={1.6} height={h} fill="#444452" stroke="#6e6e80" strokeWidth="0.25" opacity="1.0" />
        <rect x={-w/2 + 1.4} y={-h/2 + 0.3} width={w - 2.8} height={h - 0.6} rx={0.3} fill={isCap ? "#5c4b3c" : "#0e0e12"} stroke={isCap ? "#7d6855" : "#22222a"} strokeWidth="0.35" opacity="0.9" />
        <rect x={-w/2 - 1.2} y={-h/2 - 0.8} width={w + 2.4} height={h + 1.6} fill="none" stroke="#ffffff" strokeWidth="0.25" opacity="0.4" />
        <rect x={-w/2 + 2} y={-h/2 + 1} width={w - 4} height={h - 2} fill="none" stroke="var(--accent)" strokeWidth="0.25" opacity={0.6} />
      </g>
    )
  }

  // Micro Via Renderer
  const renderVia = (x, y, label, chKey = null) => {
    const targetOpacity = getTargetOpacity(chKey)

    return (
      <g 
        key={`via-${x}-${y}`} 
        transform={`translate(${x}, ${y})`}
        opacity={targetOpacity}
        style={getTransitionStyle()}
      >
        <circle cx="0" cy="0" r="1.6" fill="none" stroke="var(--accent)" strokeWidth="0.3" opacity={0.65} />
        <circle cx="0" cy="0" r="1.0" fill="#030304" stroke="#444452" strokeWidth="0.25" opacity="1.0" />
        <circle cx="0" cy="0" r="0.4" fill="#000000" />
      </g>
    )
  }

  // Exposed copper Test Point Pad
  const renderPad = (x, y, label, chKey = null) => {
    const targetOpacity = getTargetOpacity(chKey)

    return (
      <g 
        key={`pad-${x}-${y}`} 
        transform={`translate(${x}, ${y})`}
        opacity={targetOpacity}
        style={getTransitionStyle()}
      >
        <circle cx="0" cy="0" r="2.0" fill="#14141c" stroke="#333340" strokeWidth="0.4" />
        <circle cx="0" cy="0" r="1.1" fill="#3a3a4c" stroke="var(--accent)" strokeWidth="0.25" opacity={0.65} style={{ transition: 'opacity 0.4s ease' }} />
        <circle cx="0" cy="0" r="0.4" fill="#000000" />
      </g>
    )
  }

  // Grounded Mechanical Mounting Screw Hole
  const renderMountingHole = (x, y) => {
    const targetOpacity = (isTransmit || transmissionFailed) ? 0 : (contactSystemState === 'engaged' ? 0.30 : 0.40)
    // r=8.2, circumference = 2 * PI * 8.2 ≈ 51.52
    const R = 8.2
    const circumference = 2 * Math.PI * R
    // Clamp progress 0–100, convert to dashoffset
    const pct = Math.min(100, Math.max(0, formProgress))
    const fillLength = (pct / 100) * circumference
    const dashOffset = circumference - fillLength
    return (
      <g 
        key={`mount-${x}-${y}`} 
        transform={`translate(${x}, ${y})`}
        opacity={targetOpacity}
        style={getTransitionStyle()}
      >
        <circle cx="0" cy="0" r="10" fill="#030304" />
        
        {/* Inner detail circle - radius reduced to 4.8 to prevent antialiasing merging with tick marks */}
        <circle cx="0" cy="0" r="4.8" fill="none" stroke="#444452" strokeWidth="0.5" opacity="1.0" />
        <circle cx="0" cy="0" r="4.0" fill="#000" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => {
          const rad = angle * (Math.PI / 180)
          const vx = Math.cos(rad) * 6.8
          const vy = Math.sin(rad) * 6.8
          return (
            <circle key={idx} cx={vx} cy={vy} r="0.65" fill="#000" stroke="#444452" strokeWidth="0.25" opacity="1.0" />
          )
        })}
        {/* Existing base ring — rendered after the tick marks so it remains a perfect circle without tick marks biting into it */}
        <circle cx="0" cy="0" r={R} fill="none" stroke="var(--accent)" strokeWidth="1.6" opacity="0.75" filter="url(#pcbHairlineGlow)" />
        
        {/* Progress fill on the same ring — rendered LAST so it remains a perfect circle without tick marks biting into it */}
        <circle
          cx="0"
          cy="0"
          r={R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.6"
          opacity="1"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap={pct > 99 ? "butt" : "round"}
          transform="rotate(-90)"
          filter="url(#chargerGlowActive)"
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1)' }}
        />
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
      style={{ ...dormantStyles, transition: 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)' }}
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
          <filter id="chargerGlowActive" filterUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4.0" result="blur1" />
            <feGaussianBlur stdDeviation="1.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="pcbTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0)" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.8" />
          </linearGradient>
          <pattern id="pcbFiberglassWeaveR" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 0 3 L 6 3 M 3 0 L 3 6" stroke="rgba(255,255,255,0.012)" strokeWidth="0.4" />
          </pattern>
          <pattern id="pcbDotsR" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#ffffff" opacity="0.015" />
          </pattern>
        </defs>

        {/* Fiberglass weave and Grid overlays */}
        <rect 
          x={midStart} 
          y={Y_center - 180} 
          width={Math.max(0, endX - midStart)} 
          height="360" 
          fill="url(#pcbFiberglassWeaveR)" 
          opacity={isTransmit ? 0 : 1}
          style={{ transition: 'opacity 750ms cubic-bezier(0.65, 0, 0.35, 1)' }}
        />
        <rect 
          x={midStart} 
          y={Y_center - 180} 
          width={Math.max(0, endX - midStart)} 
          height="360" 
          fill="url(#pcbDotsR)" 
          opacity={isTransmit ? 0 : 1}
          style={{ transition: 'opacity 750ms cubic-bezier(0.65, 0, 0.35, 1)' }}
        />

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
            HERO TRANSMISSION CHANNELS
           ======================================================== */}
        {['name', 'email', 'subject', 'message'].map((chKey, chIdx) => {
          const travelStyle = getChannelGroupStyle(chKey, chIdx)
          return (
            <g key={chKey} style={travelStyle}>
              {/* Traces for this channel */}
              <g strokeLinecap="round" strokeLinejoin="round" fill="none">
                {pcbData.middleTraces.filter(t => t.chKey === chKey).map((t, idx) => {
                  const targetOpacity = getTargetOpacity(t.chKey)
                  return (
                    <React.Fragment key={`m-trace-${idx}`}>
                      {contactSystemState === 'engaged' && !isTransmit && (
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
                      <path
                        d={t.d}
                        stroke="var(--accent)"
                        strokeWidth={t.w}
                        opacity={targetOpacity}
                        style={getTransitionStyle()}
                      />
                    </React.Fragment>
                  )
                })}
              </g>

              {/* SMTs for this channel */}
              {pcbData.components.filter(c => c.chKey === chKey).map((comp, i) => (
                renderSMT(comp.x, comp.y, comp.w, comp.h, comp.l, comp.chKey, comp.isCap)
              ))}

              {/* Vias for this channel */}
              {pcbData.vias.filter(v => v.chKey === chKey).map((v, i) => (
                renderVia(v.x, v.y, v.l, v.chKey)
              ))}

              {/* Nodes for this channel */}
              {pcbData.nodes.filter(n => n.chKey === chKey).map((node, i) => {
                const targetOpacity = getTargetOpacity(node.chKey)
                return (
                  <g 
                    key={`core-node-${i}`} 
                    transform={`translate(${node.x}, ${Y_center + node.y})`}
                    opacity={targetOpacity}
                    style={getTransitionStyle()}
                  >
                    <circle cx="0" cy="0" r="4.2" fill="#030304" />
                    <circle cx="0" cy="0" r="3.5" fill="none" stroke="#ffffff" strokeWidth="0.4" opacity="0.55" />
                    <circle cx="0" cy="0" r="1.3" fill="var(--accent)" opacity="0.75" />
                    {/* Pulsing Outer Ring */}
                    <circle cx="0" cy="0" r="3.5" fill="none" stroke="var(--accent)" strokeWidth="0.4"
                      style={{
                        animation: isTyping ? 'pcbRadarPulse 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite' : 'none',
                        transformOrigin: '0px 0px'
                      }}
                    />
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* ========================================================
            AMBIENT COMPONENTS & TRACES (FADE OUT DURING TRANSMIT)
           ======================================================== */}
        <g strokeLinecap="round" strokeLinejoin="round" fill="none">
          {pcbData.rightTraces.map((t, idx) => {
            const targetOpacity = getTargetOpacity(null)
            return (
              <React.Fragment key={`r-trace-${idx}`}>
                {contactSystemState === 'engaged' && !isTransmit && (
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
                <path
                  d={t.d}
                  stroke="var(--accent)"
                  strokeWidth={t.w}
                  opacity={targetOpacity}
                  style={getTransitionStyle()}
                />
              </React.Fragment>
            )
          })}
        </g>

        {/* Mounting screw holes (ambient) */}
        {pcbData.mountingHoles.map(hole => (
          renderMountingHole(hole.x, hole.y)
        ))}

        {/* Right SMT components (ambient) */}
        {pcbData.components.filter(comp => !comp.chKey).map(comp => (
          renderSMT(comp.x, comp.y, comp.w, comp.h, comp.l, comp.chKey, comp.isCap)
        ))}

        {/* Right vias (ambient) */}
        {pcbData.vias.filter(v => !v.chKey).map((v, i) => (
          renderVia(v.x, v.y, v.l, v.chKey)
        ))}

        {/* Right pads (ambient) */}
        {pcbData.pads.map((p, i) => (
          renderPad(p.x, p.y, p.l)
        ))}

        {/* Ambient nodes (TX nodes on the right) */}
        {pcbData.nodes.filter(n => !n.chKey).map((node, i) => {
          const targetOpacity = getTargetOpacity(null)
          return (
            <g 
              key={`ambient-node-${i}`} 
              transform={`translate(${node.x}, ${Y_center + node.y})`}
              opacity={targetOpacity}
              style={getTransitionStyle()}
            >
              <circle cx="0" cy="0" r="4.2" fill="#030304" />
              <circle cx="0" cy="0" r="3.5" fill="none" stroke="#ffffff" strokeWidth="0.4" opacity="0.55" />
              <circle cx="0" cy="0" r="1.3" fill="var(--accent)" opacity="0.75" />
              {/* Pulsing Outer Ring */}
              <circle cx="0" cy="0" r="3.5" fill="none" stroke="var(--accent)" strokeWidth="0.4"
                style={{
                  animation: isTyping ? 'pcbRadarPulse 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite' : 'none',
                  transformOrigin: '0px 0px'
                }}
              />
            </g>
          )
        })}

      </svg>
    </div>
  )
})
