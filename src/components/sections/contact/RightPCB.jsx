import React, { useRef, useState, useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'

export default React.memo(function RightPCB({ formRef, globeRef }) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)

  const [layout, setLayout] = useState({
    G: 600,
    H: 400,
    R_form_start: 10,
    L_globe: 200
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

        // Measure form right edge and globe left edge relative to right coordinate space (starts at 50vw)
        let R_form_val = G_val * 0.1
        if (formEl) {
          const rectForm = formEl.getBoundingClientRect()
          R_form_val = rectForm.right - rectGrid.left
        }

        let sphereLeft = G_val * 0.5
        if (globeEl) {
          const rectGlobe = globeEl.getBoundingClientRect()
          const sphereWidth = Math.min(380, rectGlobe.width)
          sphereLeft = rectGlobe.left - rectGrid.left + (rectGlobe.width - sphereWidth) / 2
        }

        const GAP = 40

        setLayout({
          G: G_val,
          H: H_val,
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

  const { G, H, R_form_start, L_globe } = layout
  const Y_center = H / 2

  const pathA = `M ${R_form_start},${Y_center - 120} L ${R_form_start + 50},${Y_center - 120} L ${R_form_start + 80},${Y_center - 70} L ${L_globe},${Y_center - 70}`
  const pathB = `M ${R_form_start},${Y_center} L ${R_form_start + 110},${Y_center} L ${R_form_start + 140},${Y_center + 30} L ${L_globe},${Y_center + 30}`
  const pathC = `M ${R_form_start},${Y_center + 120} L ${R_form_start + 60},${Y_center + 120} L ${R_form_start + 90},${Y_center + 70} L ${L_globe},${Y_center + 70}`

  const branchA1 = `M ${R_form_start + 80},${Y_center - 120} L ${R_form_start + 100},${Y_center - 100} L ${R_form_start + 130},${Y_center - 100}`
  const branchB1 = `M ${R_form_start + 50},${Y_center} L ${R_form_start + 70},${Y_center - 20} L ${R_form_start + 100},${Y_center - 20}`
  const branchC1 = `M ${R_form_start + 90},${Y_center + 120} L ${R_form_start + 110},${Y_center + 100} L ${R_form_start + 130},${Y_center + 100}`
  const branchC2 = `M ${L_globe - 90},${Y_center + 70} L ${L_globe - 70},${Y_center + 90} L ${L_globe - 40},${Y_center + 90}`

  if (shouldReduceMotion) return null

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-0 hidden lg:block">
      <svg 
        className="w-full h-full" 
        viewBox={`0 0 ${G || 600} ${H || 400}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="rightPcbSignalGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Traces */}
        <g fill="none" stroke="rgba(170,120,255,0.28)" strokeWidth="1">
          <path d={pathA} />
          <path d={pathB} />
          <path d={pathC} />
          <path d={branchA1} opacity="0.4" />
          <path d={branchB1} opacity="0.4" />
          <path d={branchC1} opacity="0.4" />
          <path d={branchC2} opacity="0.4" />
        </g>

        {/* Solder Joints / Nodes */}
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

        {/* Standard Decorative Nodes */}
        <g fill="var(--accent)" opacity="0.6">
          <circle cx={R_form_start + 50} cy={Y_center - 120} r="1.5" />
          <circle cx={R_form_start + 80} cy={Y_center - 70} r="1.5" />
          <circle cx={R_form_start + 110} cy={Y_center} r="1.5" />
          <circle cx={R_form_start + 140} cy={Y_center + 30} r="1.5" />
          <circle cx={R_form_start + 60} cy={Y_center + 120} r="1.5" />
          <circle cx={R_form_start + 90} cy={Y_center + 70} r="1.5" />
        </g>

        {/* Dynamic Signal Packets */}
        <circle 
          r="3" 
          fill="#ffffff" 
          filter="url(#rightPcbSignalGlow)"
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
          filter="url(#rightPcbSignalGlow)"
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
          filter="url(#rightPcbSignalGlow)"
          className="animate-pcb-travel"
          style={{ 
            offsetPath: `path("${pathC}")`,
            animationDuration: '5.0s',
            animationTimingFunction: 'linear',
            animationDelay: '2.8s'
          }} 
        />
      </svg>
    </div>
  )
})
