import React, { useRef, useState, useEffect, useMemo, memo, useCallback } from 'react'
import { useReducedMotion } from 'framer-motion'

const drawPCBPath = (x1, y1, x2, y2, bendPositions, style = 1) => {
  const dx = Math.abs(x2 - x1);
  const dy = y2 - y1;
  const absDy = Math.abs(dy);
  const direction = x2 > x1 ? 1 : -1;

  if (absDy === 0) {
    return [
      { x1, y1, x2, y2 }
    ];
  }

  if (bendPositions.length === 2) {
    const [p1, p2] = bendPositions;
    const pCenter = (p1 + p2) / 2;
    const px1 = x1 + (dx * pCenter - absDy / 2) * direction;
    const px2 = px1 + absDy * direction;

    const leftBound = Math.min(x1, x2);
    const rightBound = Math.max(x1, x2);

    if (px1 >= leftBound && px1 <= rightBound && px2 >= leftBound && px2 <= rightBound) {
      return [
        { x1, y1, x2: px1, y2: y1 },
        { x1: px1, y1: y1, x2: px2, y2 },
        { x1: px2, y1: y2, x2, y2 }
      ];
    }
  }

  if (bendPositions.length === 3) {
    const [p1, p2, p3] = bendPositions;
    const diagWidth = style === 1 ? dx * (p2 - p1) : dx * (p3 - p2);

    if (absDy >= diagWidth) {
      if (style === 1) {
        // H -> D -> V -> H
        const px1 = x1 + dx * p1 * direction;
        const px2 = x1 + dx * p2 * direction;
        const dyPart = diagWidth * Math.sign(dy);
        const py2 = y1 + dyPart;
        return [
          { x1, y1, x2: px1, y2: y1 },
          { x1: px1, y1: y1, x2: px2, y2: py2 },
          { x1: px2, y1: py2, x2: px2, y2 },
          { x1: px2, y1: y2, x2, y2 }
        ];
      } else {
        // H -> V -> D -> H
        const px1_v = x1 + dx * p2 * direction;
        const px2_v = x1 + dx * p3 * direction;
        const dyPart = diagWidth * Math.sign(dy);
        const py2_v = y1 + (dy - dyPart);
        return [
          { x1, y1, x2: px1_v, y2: y1 },
          { x1: px1_v, y1: y1, x2: px1_v, y2: py2_v },
          { x1: px1_v, y1: py2_v, x2: px2_v, y2 },
          { x1: px2_v, y1: y2, x2, y2 }
        ];
      }
    } else {
      // Fallback to 2-bend centered around p2
      const px1_f = x1 + (dx * p2 - absDy / 2) * direction;
      const px2_f = px1_f + absDy * direction;
      const leftBound = Math.min(x1, x2);
      const rightBound = Math.max(x1, x2);

      if (px1_f >= leftBound && px1_f <= rightBound && px2_f >= leftBound && px2_f <= rightBound) {
        return [
          { x1, y1, x2: px1_f, y2: y1 },
          { x1: px1_f, y1: y1, x2: px2_f, y2 },
          { x1: px2_f, y1: y2, x2, y2 }
        ];
      }
    }
  }

  // General fallback
  if (absDy < dx) {
    const remainingX = dx - absDy;
    const px1_alt = x1 + (remainingX / 2) * direction;
    const px2_alt = px1_alt + absDy * direction;
    return [
      { x1, y1, x2: px1_alt, y2: y1 },
      { x1: px1_alt, y1: y1, x2: px2_alt, y2 },
      { x1: px2_alt, y1: y2, x2, y2 }
    ];
  }

  return [
    { x1, y1, x2, y2 }
  ];
};

const clipSegment = (x1, y1, x2, y2, components) => {
  let intervals = [[0, 1]];

  const dx_seg = x2 - x1;
  const dy_seg = y2 - y1;
  const len2 = dx_seg * dx_seg + dy_seg * dy_seg;

  if (len2 === 0) return [];

  components.forEach(c => {
    let t_in = -1;
    let t_out = -1;

    if (c.type === 'circle') {
      const X_0 = x1 - c.cx;
      const Y_0 = y1 - c.cy;

      const a = len2;
      const b = 2 * (X_0 * dx_seg + Y_0 * dy_seg);
      const c_val = X_0 * X_0 + Y_0 * Y_0 - c.r * c.r;

      const disc = b * b - 4 * a * c_val;
      if (disc >= 0) {
        const sqrtDisc = Math.sqrt(disc);
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);
        t_in = Math.min(t1, t2);
        t_out = Math.max(t1, t2);
      }
    } else if (c.type === 'rect') {
      const x_left = c.cx - c.w / 2;
      const x_right = c.cx + c.w / 2;
      const y_top = c.cy - c.h / 2;
      const y_bottom = c.cy + c.h / 2;

      let tx_min = -Infinity;
      let tx_max = Infinity;
      if (dx_seg !== 0) {
        const tx1 = (x_left - x1) / dx_seg;
        const tx2 = (x_right - x1) / dx_seg;
        tx_min = Math.min(tx1, tx2);
        tx_max = Math.max(tx1, tx2);
      } else {
        if (x1 < x_left || x1 > x_right) return;
      }

      let ty_min = -Infinity;
      let ty_max = Infinity;
      if (dy_seg !== 0) {
        const ty1 = (y_top - y1) / dy_seg;
        const ty2 = (y_bottom - y1) / dy_seg;
        ty_min = Math.min(ty1, ty2);
        ty_max = Math.max(ty1, ty2);
      } else {
        if (y1 < y_top || y1 > y_bottom) return;
      }

      t_in = Math.max(tx_min, ty_min);
      t_out = Math.min(tx_max, ty_max);
    }

    if (t_in < t_out && t_out > 0 && t_in < 1) {
      const clip_start = Math.max(0, t_in);
      const clip_end = Math.min(1, t_out);

      const next_intervals = [];
      intervals.forEach(([s, e]) => {
        if (e <= clip_start || s >= clip_end) {
          next_intervals.push([s, e]);
        } else {
          if (s < clip_start) {
            next_intervals.push([s, clip_start]);
          }
          if (e > clip_end) {
            next_intervals.push([clip_end, e]);
          }
        }
      });
      intervals = next_intervals;
    }
  });

  return intervals.map(([s, e]) => ({
    x1: x1 + s * dx_seg,
    y1: y1 + s * dy_seg,
    x2: x1 + e * dx_seg,
    y2: y1 + e * dy_seg
  }));
};

const applyClearance = (segments, components) => {
  const clipped = [];
  segments.forEach(seg => {
    clipped.push(...clipSegment(seg.x1, seg.y1, seg.x2, seg.y2, components));
  });
  if (clipped.length === 0) return '';
  return clipped.map((seg, idx) => {
    const prefix = idx === 0 || clipped[idx - 1].x2 !== seg.x1 || clipped[idx - 1].y2 !== seg.y1 ? `M ${seg.x1},${seg.y1}` : '';
    return `${prefix} L ${seg.x2},${seg.y2}`;
  }).join(' ');
};

const getPCBPathBends = (x1, y1, x2, y2, category, isRight = false) => {
  let bendPositions;
  const style = 1;
  const isUp = y2 < y1;

  if (isRight) {
    if (category === 'main') {
      bendPositions = [0.30, 0.55, 0.80];
    } else if (category === 'auxiliary') {
      if (isUp) {
        bendPositions = [0.20, 0.45, 0.70];
      } else {
        bendPositions = [0.40, 0.65, 0.90];
      }
    } else {
      if (isUp) {
        bendPositions = [0.40, 0.65, 0.90];
      } else {
        bendPositions = [0.20, 0.45, 0.70];
      }
    }
  } else {
    if (category === 'main') {
      bendPositions = [0.30, 0.55, 0.80];
    } else if (category === 'auxiliary') {
      if (isUp) {
        bendPositions = [0.15, 0.40, 0.65];
      } else {
        bendPositions = [0.45, 0.70, 0.95];
      }
    } else {
      if (isUp) {
        bendPositions = [0.45, 0.70, 0.95];
      } else {
        bendPositions = [0.15, 0.40, 0.65];
      }
    }
  }

  const rawSegments = drawPCBPath(x1, y1, x2, y2, bendPositions, style);
  const bends = [];
  for (let i = 0; i < rawSegments.length - 1; i++) {
    bends.push({ x: rawSegments[i].x2, y: rawSegments[i].y2 });
  }
  return bends;
};

const generateLeftBusPaths = (x1, y1, x2, y2, category, components) => {
  let bendPositions;
  const style = 1; // H-D-V-H
  const isUp = y2 < y1;

  if (category === 'main') {
    bendPositions = [0.30, 0.55, 0.80];
  } else if (category === 'auxiliary') {
    if (isUp) {
      bendPositions = [0.15, 0.40, 0.65];
    } else {
      bendPositions = [0.45, 0.70, 0.95];
    }
  } else {
    if (isUp) {
      bendPositions = [0.45, 0.70, 0.95];
    } else {
      bendPositions = [0.15, 0.40, 0.65];
    }
  }
  const rawSegments = drawPCBPath(x1, y1, x2, y2, bendPositions, style);
  return applyClearance(rawSegments, components);
};

const generateRightBusPaths = (x1, y1, x2, y2, category, components) => {
  let bendPositions;
  const style = 1; // H-D-V-H
  const isUp = y2 < y1;

  if (category === 'main') {
    bendPositions = [0.30, 0.55, 0.80];
  } else if (category === 'auxiliary') {
    if (isUp) {
      bendPositions = [0.20, 0.45, 0.70];
    } else {
      bendPositions = [0.40, 0.65, 0.90];
    }
  } else {
    if (isUp) {
      bendPositions = [0.40, 0.65, 0.90];
    } else {
      bendPositions = [0.20, 0.45, 0.70];
    }
  }
  const rawSegments = drawPCBPath(x1, y1, x2, y2, bendPositions, style);
  return applyClearance(rawSegments, components);
};

const getWidthForCategory = (category) => {
  return category === 'main' ? 2.0 : category === 'auxiliary' ? 0.55 : 0.15;
};

export default memo(function RightPCB({ isInView, formRef, globeRef, contactSystemState = 'dormant', transmissionFailed, formProgress = 0 }) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef(null)
  const particlesContainerRef = useRef(null)
  const particlePoolRef = useRef([])
  const poolIndexRef = useRef(0)

  const [layout, setLayout] = useState({
    G: 600,
    H: 600,
    M_form: 220,
    L_globe: 200,
    R_globe: 500,
    globeCenterX: 800,
    globeCenterY: 300
  })



  const lastLayoutRef = useRef({ G: 0, H: 0, M_form: 0, L_globe: 0, R_globe: 0, globeCenterX: 0, globeCenterY: 0 })

  // Layout calculations (throttled using requestAnimationFrame)
  useEffect(() => {
    if (!isInView) return
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

        const rGlobeVal = sphereRight - GLOBE_PCB_OVERLAP
        const threshold = 1.0
        const diffG = Math.abs(G_val - lastLayoutRef.current.G)
        const diffH = Math.abs(H_val - lastLayoutRef.current.H)
        const diffM = Math.abs(middleStart - lastLayoutRef.current.M_form)
        const diffL = Math.abs(middleEnd - lastLayoutRef.current.L_globe)
        const diffR = Math.abs(rGlobeVal - lastLayoutRef.current.R_globe)
        const diffGX = Math.abs(gx - lastLayoutRef.current.globeCenterX)
        const diffGY = Math.abs(gy - lastLayoutRef.current.globeCenterY)

        if (diffG > threshold || diffH > threshold || diffM > threshold || diffL > threshold || diffR > threshold || diffGX > threshold || diffGY > threshold) {
          lastLayoutRef.current = { G: G_val, H: H_val, M_form: middleStart, L_globe: middleEnd, R_globe: rGlobeVal, globeCenterX: gx, globeCenterY: gy }
          setLayout({
            G: G_val,
            H: H_val,
            M_form: middleStart,
            L_globe: middleEnd,
            R_globe: rGlobeVal,
            globeCenterX: gx,
            globeCenterY: gy
          })
        }
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

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', throttledUpdate)
    }
  }, [formRef, globeRef, isInView])

  const { G, H, M_form, L_globe, R_globe } = layout
  const Y_center = H / 2
  const endX = G - 15
  const isTransmit = contactSystemState === 'transmit'
  const isTransmitOrFailed = isTransmit || transmissionFailed

  const getTransitionStyle = useCallback(() => {
    if (contactSystemState === 'dormant') {
      return { transition: 'opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)' }
    }
    if (isTransmit) {
      return { transition: 'opacity 750ms cubic-bezier(0.65, 0, 0.35, 1)' }
    }
    return { transition: 'opacity 600ms cubic-bezier(0.22, 1, 0.36, 1)' }
  }, [contactSystemState, isTransmit])

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

const pcbComponentsData = useMemo(() => {
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
  ];

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
  ];

  const padsList = [
    { x: midStart + W_mid * 0.22, y: Y_center - 130, l: 'TP51' },
    { x: midStart + W_mid * 0.22, y: Y_center + 130, l: 'TP52' },
    { x: rightTargetLimit + W_right * 0.45, y: Y_center - 60, l: 'TP61' },
    { x: rightTargetLimit + W_right * 0.45, y: Y_center + 60, l: 'TP62' }
  ];

  const mountingHolesList = [
    // Between globe and middle PCB
    { x: middleTargetLimit + 30, y: Y_center - 24 },
    { x: middleTargetLimit + 30, y: Y_center + 24 },
    // Between globe and right PCB
    { x: rightTargetLimit - 30, y: Y_center - 24 },
    { x: rightTargetLimit - 30, y: Y_center + 24 }
  ];

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
  ];

  return {
    components: componentsList,
    vias: viasList,
    pads: padsList,
    mountingHoles: mountingHolesList,
    nodes: nodesList
  };
}, [midStart, middleTargetLimit, rightTargetLimit, endX, Y_center, W_mid, W_right]);

const clearanceComponents = useMemo(() => {
  const list = [];

  // Nodes (dial gauges)
  pcbComponentsData.nodes.forEach(n => {
    list.push({
      type: 'circle',
      cx: n.x,
      cy: Y_center + n.y,
      r: 4.2 + 1.5
    });
  });

  // SMT components
  pcbComponentsData.components.forEach(c => {
    list.push({
      type: 'rect',
      cx: c.x,
      cy: c.y,
      w: c.w + 3.0,
      h: c.h + 3.0
    });
  });

  // Vias
  pcbComponentsData.vias.forEach(v => {
    list.push({
      type: 'circle',
      cx: v.x,
      cy: v.y,
      r: 1.6 + 1.5
    });
  });

  // Pads
  pcbComponentsData.pads.forEach(p => {
    list.push({
      type: 'circle',
      cx: p.x,
      cy: p.y,
      r: 2.0 + 1.5
    });
  });

  // Mounting holes
  pcbComponentsData.mountingHoles.forEach(mh => {
    list.push({
      type: 'circle',
      cx: mh.x,
      cy: mh.y,
      r: 10 + 1.5
    });
  });

  return list;
}, [pcbComponentsData, Y_center]);

const pcbTracesData = useMemo(() => {
  const middleTracesList = [];
  const addMiddleTrace = (chKey, y1, y2, category, extra = {}) => {
    const d = generateLeftBusPaths(midStart, y1, middleTargetLimit, y2, category, clearanceComponents);
    const bends = getPCBPathBends(midStart, y1, middleTargetLimit, y2, category, false);
    middleTracesList.push({
      chKey,
      d,
      category,
      bends,
      ...extra
    });
  };

  // --- CHANNEL 1 (Name Input) ---
  addMiddleTrace('name', Y_center - 100, Y_center - 36, 'main', { main: true });
  addMiddleTrace('name', Y_center - 112, Y_center - 44, 'auxiliary', { pulse: true });
  addMiddleTrace('name', Y_center - 88, Y_center - 28, 'ground');

  // --- CHANNEL 2 (Email Input) ---
  addMiddleTrace('email', Y_center - 50, Y_center - 12, 'main', { main: true });
  addMiddleTrace('email', Y_center - 58, Y_center - 20, 'auxiliary', { pulse: true });
  addMiddleTrace('email', Y_center - 42, Y_center - 4, 'ground');

  // --- CHANNEL 3 (Subject Input) ---
  addMiddleTrace('subject', Y_center + 50, Y_center + 12, 'main', { main: true });
  addMiddleTrace('subject', Y_center + 42, Y_center + 4, 'auxiliary', { pulse: true });
  addMiddleTrace('subject', Y_center + 58, Y_center + 20, 'ground');

  // --- CHANNEL 4 (Message Input) ---
  addMiddleTrace('message', Y_center + 100, Y_center + 36, 'main', { main: true });
  addMiddleTrace('message', Y_center + 88, Y_center + 28, 'auxiliary', { pulse: true });
  addMiddleTrace('message', Y_center + 112, Y_center + 44, 'ground');

  const rightTracesList = [];
  const addRightTrace = (y1, y2, category, extra = {}) => {
    const d = generateRightBusPaths(rightTargetLimit, y1, endX, y2, category, clearanceComponents);
    const bends = getPCBPathBends(rightTargetLimit, y1, endX, y2, category, true);
    rightTracesList.push({
      d,
      category,
      bends,
      ...extra
    });
  };

  // Trace 1: converges to Y_center - 30, exits to Y_center - 140
  addRightTrace(Y_center - 30, Y_center - 140, 'main', { main: true });
  addRightTrace(Y_center - 36, Y_center - 150, 'auxiliary', { pulse: true });
  addRightTrace(Y_center - 24, Y_center - 130, 'ground');

  // Trace 2: converges to Y_center - 12, exits to Y_center - 80
  addRightTrace(Y_center - 12, Y_center - 80, 'main', { main: true });
  addRightTrace(Y_center - 18, Y_center - 90, 'auxiliary', { pulse: true });
  addRightTrace(Y_center - 6, Y_center - 70, 'ground');

  // Trace 3: converges to Y_center + 12, exits to Y_center + 80
  addRightTrace(Y_center + 12, Y_center + 80, 'main', { main: true });
  addRightTrace(Y_center + 6, Y_center + 70, 'auxiliary', { pulse: true });
  addRightTrace(Y_center + 18, Y_center + 90, 'ground');

  // Trace 4: converges to Y_center + 30, exits to Y_center + 140
  addRightTrace(Y_center + 30, Y_center + 140, 'main', { main: true });
  addRightTrace(Y_center + 24, Y_center + 130, 'auxiliary', { pulse: true });
  addRightTrace(Y_center + 36, Y_center + 150, 'ground');

  return {
    middleTraces: middleTracesList,
    rightTraces: rightTracesList
  };
}, [clearanceComponents, midStart, middleTargetLimit, rightTargetLimit, endX, Y_center]);

const pcbData = useMemo(() => ({
  ...pcbComponentsData,
  ...pcbTracesData
}), [pcbComponentsData, pcbTracesData]);


const getTargetOpacity = useCallback((chKey) => {
  const isHero = ['name', 'email', 'subject', 'message'].includes(chKey)
  if (isTransmit) return 0
  if (transmissionFailed && isHero) return 0
  if (contactSystemState === 'engaged') {
    if (chKey === null || chKey === undefined) {
      return 0.50
    }
    return isHero ? 0.90 : 0.25
  }
  return 0.70
}, [contactSystemState, transmissionFailed, isTransmit])

useEffect(() => {
  if (!isInView || shouldReduceMotion) return

  const container = particlesContainerRef.current
  if (!container) return

  // Populate particle pool references
  particlePoolRef.current = Array.from(container.children)

  let intervalId = null

  const spawnParticle = (trace, isBurst = false, delayMs = 0, isRightTrace = false) => {
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

      const duration = isBurst ? '0.7s' : (isRightTrace ? '2.8s' : '1.2s')
      
      // Reset and trigger CSS animation
      circle.style.animation = 'none'
      void circle.offsetWidth // Trigger reflow
      circle.style.animation = `pcbParticleTravel ${duration} linear forwards`
      circle.style.display = 'block'

      const cleanupTimer = setTimeout(() => {
        circle.style.display = 'none'
        circle.style.animation = 'none'
      }, isBurst ? 700 : (isRightTrace ? 2800 : 1200))

      circle._cleanupTimer = cleanupTimer
    }, delayMs)

    return delayTimer
  }

  const timers = []

  const startTypingInterval = () => {
    if (intervalId) return
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

  const stopTypingInterval = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  const sectionEl = containerRef.current?.closest('#contact')

  // Initial check
  if (sectionEl && sectionEl.getAttribute('data-typing') === 'true') {
    startTypingInterval()
  }

  const handleTypingEvent = (e) => {
    if (e.detail.isTyping) {
      startTypingInterval()
    } else {
      stopTypingInterval()
    }
  }

  if (sectionEl) {
    sectionEl.addEventListener('contact-typing', handleTypingEvent)
  }

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
  }

  return () => {
    if (sectionEl) {
      sectionEl.removeEventListener('contact-typing', handleTypingEvent)
    }
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
}, [contactSystemState, pcbData, shouldReduceMotion, isInView])

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
      {/* Negative space clearance gap */}
      <rect x={-w / 2 - 2.7} y={-h / 2 - 2.3} width={w + 5.4} height={h + 4.6} fill="#030304" />
      <rect x={-w / 2} y={-h / 2} width={1.6} height={h} fill="#444452" stroke="#6e6e80" strokeWidth="0.25" opacity="1.0" />
      <rect x={w / 2 - 1.6} y={-h / 2} width={1.6} height={h} fill="#444452" stroke="#6e6e80" strokeWidth="0.25" opacity="1.0" />
      <rect x={-w / 2 + 1.4} y={-h / 2 + 0.3} width={w - 2.8} height={h - 0.6} rx={0.3} fill={isCap ? "#5c4b3c" : "#0e0e12"} stroke={isCap ? "#7d6855" : "#22222a"} strokeWidth="0.35" opacity="0.9" />
      <rect x={-w / 2 - 1.2} y={-h / 2 - 0.8} width={w + 2.4} height={h + 1.6} fill="none" stroke="#ffffff" strokeWidth="0.25" opacity="0.4" />
      <rect x={-w / 2 + 2} y={-h / 2 + 1} width={w - 4} height={h - 2} fill="none" stroke="var(--accent)" strokeWidth="0.25" opacity={0.6} />
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
      {/* Negative space clearance gap */}
      <circle cx="0" cy="0" r="3.1" fill="#030304" />
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
      {/* Negative space clearance gap */}
      <circle cx="0" cy="0" r="3.5" fill="#030304" />
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
    >
      <g opacity={targetOpacity} style={getTransitionStyle()}>
        {/* Negative space clearance gap */}
        <circle cx="0" cy="0" r="11.5" fill="#030304" />
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
      </g>

      {/* Progress fill on the same ring — rendered LAST so it remains a perfect circle without tick marks biting into it */}
      {pct > 0 && (
        <circle
          cx="0"
          cy="0"
          r={R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.6"
          opacity={isTransmit ? 0 : 1}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap={pct > 99 ? "butt" : "round"}
          transform="rotate(-90)"
          filter="url(#chargerGlowActive)"
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1), opacity 600ms cubic-bezier(0.4,0,0.2,1)' }}
        />
      )}
    </g>
  )
}


  const backgroundElements = useMemo(() => (
    <>
      {/* Substrate Base Layer */}
      <g mask="url(#substrateMaskR)">
        <rect
          x={midStart - 150}
          y={Y_center - 300}
          width={Math.max(0, endX - midStart + 300)}
          height="600"
          fill="#030805"
          opacity="0.04"
        />
        <rect
          x={midStart - 150}
          y={Y_center - 300}
          width={Math.max(0, endX - midStart + 300)}
          height="600"
          filter="url(#pcbSubstrateNoise)"
          opacity="0.03"
          style={{ mixBlendMode: 'screen' }}
        />
      </g>

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

      {/* ========================================================
            NEGATIVE-SPACE ROUTING & GEOMETRIC GROUND POURS
           ======================================================== */}
      <g style={{ transition: 'opacity 750ms ease-in-out' }} opacity={isTransmit ? 0.3 : 1}>
        {/* Middle Top Ground Plane */}
        <polygon
          points={`${midStart},${Y_center - 180} ${middleTargetLimit - 15},${Y_center - 180} ${middleTargetLimit},${Y_center - 165} ${middleTargetLimit},${Y_center - 120} ${midStart},${Y_center - 120}`}
          fill="rgba(168, 85, 247, 0.035)"
          stroke="rgba(168, 85, 247, 0.18)"
          strokeWidth="0.8"
        />

        {/* Middle Channel 1-2 Ground Plane */}
        <rect
          x={midStart}
          y={Y_center - 78}
          width={middleTargetLimit - midStart}
          height={10}
          fill="rgba(168, 85, 247, 0.035)"
          stroke="rgba(168, 85, 247, 0.18)"
          strokeWidth="0.8"
        />

        {/* Middle Central Ground Plane (Center Hub) */}
        <polygon
          points={`${midStart},${Y_center - 32} ${middleTargetLimit - 15},${Y_center - 32} ${middleTargetLimit},${Y_center - 17} ${middleTargetLimit},${Y_center + 17} ${middleTargetLimit - 15},${Y_center + 32} ${midStart},${Y_center + 32}`}
          fill="rgba(168, 85, 247, 0.035)"
          stroke="rgba(168, 85, 247, 0.18)"
          strokeWidth="0.8"
        />

        {/* Middle Channel 3-4 Ground Plane */}
        <rect
          x={midStart}
          y={Y_center + 68}
          width={middleTargetLimit - midStart}
          height={10}
          fill="rgba(168, 85, 247, 0.035)"
          stroke="rgba(168, 85, 247, 0.18)"
          strokeWidth="0.8"
        />

        {/* Middle Bottom Ground Plane */}
        <polygon
          points={`${midStart},${Y_center + 120} ${middleTargetLimit},${Y_center + 120} ${middleTargetLimit},${Y_center + 165} ${middleTargetLimit - 15},${Y_center + 180} ${midStart + 15},${Y_center + 180} ${midStart},${Y_center + 165}`}
          fill="rgba(168, 85, 247, 0.035)"
          stroke="rgba(168, 85, 247, 0.18)"
          strokeWidth="0.8"
        />

        {/* Right Top Ground Plane */}
        <polygon
          points={`${rightTargetLimit},${Y_center - 180} ${endX},${Y_center - 180} ${endX},${Y_center - 165} ${rightTargetLimit + (endX - rightTargetLimit) * 0.4},${Y_center - 60} ${rightTargetLimit},${Y_center - 60}`}
          fill="rgba(168, 85, 247, 0.035)"
          stroke="rgba(168, 85, 247, 0.18)"
          strokeWidth="0.8"
        />

        {/* Right Central Ground Plane */}
        <polygon
          points={`${rightTargetLimit},${Y_center - 10} ${rightTargetLimit + (endX - rightTargetLimit) * 0.5},${Y_center - 50} ${endX},${Y_center - 50} ${endX},${Y_center + 50} ${rightTargetLimit + (endX - rightTargetLimit) * 0.5},${Y_center + 50} ${rightTargetLimit},${Y_center + 10}`}
          fill="rgba(168, 85, 247, 0.035)"
          stroke="rgba(168, 85, 247, 0.18)"
          strokeWidth="0.8"
        />

        {/* Right Bottom Ground Plane */}
        <polygon
          points={`${rightTargetLimit},${Y_center + 60} ${rightTargetLimit + (endX - rightTargetLimit) * 0.4},${Y_center + 60} ${endX},${Y_center + 165} ${endX},${Y_center + 180} ${rightTargetLimit},${Y_center + 180}`}
          fill="rgba(168, 85, 247, 0.035)"
          stroke="rgba(168, 85, 247, 0.18)"
          strokeWidth="0.8"
        />

        {/* Inactive Sub-Surface Routing Lines */}
        <g stroke="rgba(168, 85, 247, 0.04)" strokeWidth="0.4" fill="none">
          <line x1={midStart + 30} y1={Y_center - 150} x2={midStart + 90} y2={Y_center - 150} />
          <line x1={midStart + 30} y1={Y_center - 155} x2={midStart + 90} y2={Y_center - 155} />
          <line x1={midStart + 30} y1={Y_center + 150} x2={midStart + 90} y2={Y_center + 150} />
          <line x1={midStart + 30} y1={Y_center + 155} x2={midStart + 90} y2={Y_center + 155} />
        </g>

        {/* Dummy BGA / Test-point array */}
        <g opacity="0.06">
          {[0, 1, 2].map(row => 
            [0, 1, 2, 3, 5, 6].map(col => (
              <rect
                key={`dummy-pad-r-${row}-${col}`}
                x={endX - 80 + col * 8}
                y={Y_center - 170 + row * 8}
                width="3"
                height="3"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="0.4"
              />
            ))
          )}
        </g>
      </g>

      {/* ========================================================
            NEGATIVE-SPACE CAD ROUTING ZONES (Right PCB)
           ======================================================== */}
      <g opacity={isTransmit ? 0 : 1} style={{ transition: 'opacity 750ms cubic-bezier(0.65, 0, 0.35, 1)' }}>

        {/* ========================================================
              TOP MARGIN CAD ZONES (Right PCB)
           ======================================================== */}
        {/* Zone 1 — Interface Zone: left entry band (globe inputs) */}
        <rect
          x={midStart}
          y={Y_center - 185}
          width={Math.max(0, (middleTargetLimit - midStart) * 0.30)}
          height={60}
          fill="rgba(8, 10, 18, 0.20)"
          stroke="var(--accent)"
          strokeWidth="0.25"
          opacity="0.05"
        />
        {/* CAD corner ticks — Zone 1 */}
        <g stroke="var(--accent)" strokeWidth="0.35" opacity="0.07" fill="none">
          <path d={`M ${midStart},${Y_center - 181} V ${Y_center - 185} H ${midStart + 5}`} />
          <path d={`M ${midStart + (middleTargetLimit - midStart) * 0.30 - 5},${Y_center - 185} H ${midStart + (middleTargetLimit - midStart) * 0.30} V ${Y_center - 181}`} />
          <path d={`M ${midStart},${Y_center - 129} V ${Y_center - 125} H ${midStart + 5}`} />
          <path d={`M ${midStart + (middleTargetLimit - midStart) * 0.30 - 5},${Y_center - 125} H ${midStart + (middleTargetLimit - midStart) * 0.30} V ${Y_center - 129}`} />
        </g>
        <text x={midStart + 4} y={Y_center - 172} fill="var(--accent)" fontSize="5.0" fontFamily="monospace" letterSpacing="0.8" opacity="0.07">SYS_IF_R1</text>

        {/* Zone 2 — Process Zone: central corridor */}
        <rect
          x={midStart + (middleTargetLimit - midStart) * 0.32}
          y={Y_center - 185}
          width={Math.max(0, (middleTargetLimit - midStart) * 0.36)}
          height={60}
          fill="rgba(8, 10, 18, 0.18)"
          stroke="var(--accent)"
          strokeWidth="0.25"
          opacity="0.04"
        />
        {/* CAD corner ticks — Zone 2 */}
        <g stroke="var(--accent)" strokeWidth="0.35" opacity="0.07" fill="none">
          <path d={`M ${midStart + (middleTargetLimit - midStart) * 0.32},${Y_center - 181} V ${Y_center - 185} H ${midStart + (middleTargetLimit - midStart) * 0.32 + 5}`} />
          <path d={`M ${midStart + (middleTargetLimit - midStart) * 0.68 - 5},${Y_center - 185} H ${midStart + (middleTargetLimit - midStart) * 0.68} V ${Y_center - 181}`} />
          <path d={`M ${midStart + (middleTargetLimit - midStart) * 0.32},${Y_center - 129} V ${Y_center - 125} H ${midStart + (middleTargetLimit - midStart) * 0.32 + 5}`} />
          <path d={`M ${midStart + (middleTargetLimit - midStart) * 0.68 - 5},${Y_center - 125} H ${midStart + (middleTargetLimit - midStart) * 0.68} V ${Y_center - 129}`} />
        </g>
        <text x={midStart + (middleTargetLimit - midStart) * 0.32 + 4} y={Y_center - 172} fill="var(--accent)" fontSize="5.0" fontFamily="monospace" letterSpacing="0.8" opacity="0.07">SYS_PR_R2</text>

        {/* Zone 3 — Signal Hub Zone: node / BGA area */}
        <rect
          x={middleTargetLimit}
          y={Y_center - 185}
          width={Math.max(0, rightTargetLimit - middleTargetLimit)}
          height={60}
          fill="rgba(8, 10, 18, 0.22)"
          stroke="var(--accent)"
          strokeWidth="0.25"
          opacity="0.06"
        />
        {/* CAD corner ticks — Zone 3 */}
        <g stroke="var(--accent)" strokeWidth="0.35" opacity="0.08" fill="none">
          <path d={`M ${middleTargetLimit},${Y_center - 181} V ${Y_center - 185} H ${middleTargetLimit + 5}`} />
          <path d={`M ${rightTargetLimit - 5},${Y_center - 185} H ${rightTargetLimit} V ${Y_center - 181}`} />
          <path d={`M ${middleTargetLimit},${Y_center - 129} V ${Y_center - 125} H ${middleTargetLimit + 5}`} />
          <path d={`M ${rightTargetLimit - 5},${Y_center - 125} H ${rightTargetLimit} V ${Y_center - 129}`} />
        </g>
        <text x={middleTargetLimit + 4} y={Y_center - 172} fill="var(--accent)" fontSize="5.0" fontFamily="monospace" letterSpacing="0.8" opacity="0.09">SYS_HB_R3</text>

        {/* Zone 4 — Exit Zone: far-right output edge */}
        <rect
          x={rightTargetLimit}
          y={Y_center - 185}
          width={Math.max(0, endX - rightTargetLimit)}
          height={60}
          fill="rgba(8, 10, 18, 0.28)"
          stroke="var(--accent)"
          strokeWidth="0.25"
          opacity="0.07"
        />
        {/* CAD corner ticks — Zone 4 */}
        <g stroke="var(--accent)" strokeWidth="0.35" opacity="0.09" fill="none">
          <path d={`M ${rightTargetLimit},${Y_center - 181} V ${Y_center - 185} H ${rightTargetLimit + 5}`} />
          <path d={`M ${endX - 5},${Y_center - 185} H ${endX} V ${Y_center - 181}`} />
          <path d={`M ${rightTargetLimit},${Y_center - 129} V ${Y_center - 125} H ${rightTargetLimit + 5}`} />
          <path d={`M ${endX - 5},${Y_center - 125} H ${endX} V ${Y_center - 129}`} />
        </g>
        <text x={rightTargetLimit + 4} y={Y_center - 172} fill="var(--accent)" fontSize="5.0" fontFamily="monospace" letterSpacing="0.8" opacity="0.09">SYS_EX_R4</text>

        {/* ========================================================
              BOTTOM MARGIN CAD ZONES (Right PCB)
           ======================================================== */}
        <rect
          x={midStart}
          y={Y_center + 125}
          width={Math.max(0, (middleTargetLimit - midStart) * 0.30)}
          height={60}
          fill="rgba(8, 10, 18, 0.20)"
          stroke="var(--accent)"
          strokeWidth="0.25"
          opacity="0.05"
        />
        {/* CAD corner ticks — Bottom Zone 1 */}
        <g stroke="var(--accent)" strokeWidth="0.35" opacity="0.07" fill="none">
          <path d={`M ${midStart},${Y_center + 129} V ${Y_center + 125} H ${midStart + 5}`} />
          <path d={`M ${midStart + (middleTargetLimit - midStart) * 0.30 - 5},${Y_center + 125} H ${midStart + (middleTargetLimit - midStart) * 0.30} V ${Y_center + 129}`} />
          <path d={`M ${midStart},${Y_center + 181} V ${Y_center + 185} H ${midStart + 5}`} />
          <path d={`M ${midStart + (middleTargetLimit - midStart) * 0.30 - 5},${Y_center + 185} H ${midStart + (middleTargetLimit - midStart) * 0.30} V ${Y_center + 181}`} />
        </g>

        <rect
          x={midStart + (middleTargetLimit - midStart) * 0.32}
          y={Y_center + 125}
          width={Math.max(0, (middleTargetLimit - midStart) * 0.36)}
          height={60}
          fill="rgba(8, 10, 18, 0.18)"
          stroke="var(--accent)"
          strokeWidth="0.25"
          opacity="0.04"
        />
        {/* CAD corner ticks — Bottom Zone 2 */}
        <g stroke="var(--accent)" strokeWidth="0.35" opacity="0.07" fill="none">
          <path d={`M ${midStart + (middleTargetLimit - midStart) * 0.32},${Y_center + 129} V ${Y_center + 125} H ${midStart + (middleTargetLimit - midStart) * 0.32 + 5}`} />
          <path d={`M ${midStart + (middleTargetLimit - midStart) * 0.68 - 5},${Y_center + 125} H ${midStart + (middleTargetLimit - midStart) * 0.68} V ${Y_center + 129}`} />
          <path d={`M ${midStart + (middleTargetLimit - midStart) * 0.32},${Y_center + 181} V ${Y_center + 185} H ${midStart + (middleTargetLimit - midStart) * 0.32 + 5}`} />
          <path d={`M ${midStart + (middleTargetLimit - midStart) * 0.68 - 5},${Y_center + 185} H ${midStart + (middleTargetLimit - midStart) * 0.68} V ${Y_center + 181}`} />
        </g>

        <rect
          x={middleTargetLimit}
          y={Y_center + 125}
          width={Math.max(0, rightTargetLimit - middleTargetLimit)}
          height={60}
          fill="rgba(8, 10, 18, 0.22)"
          stroke="var(--accent)"
          strokeWidth="0.25"
          opacity="0.06"
        />
        {/* CAD corner ticks — Bottom Zone 3 */}
        <g stroke="var(--accent)" strokeWidth="0.35" opacity="0.08" fill="none">
          <path d={`M ${middleTargetLimit},${Y_center + 129} V ${Y_center + 125} H ${middleTargetLimit + 5}`} />
          <path d={`M ${rightTargetLimit - 5},${Y_center + 125} H ${rightTargetLimit} V ${Y_center + 129}`} />
          <path d={`M ${middleTargetLimit},${Y_center + 181} V ${Y_center + 185} H ${middleTargetLimit + 5}`} />
          <path d={`M ${rightTargetLimit - 5},${Y_center + 185} H ${rightTargetLimit} V ${Y_center + 181}`} />
        </g>

        <rect
          x={rightTargetLimit}
          y={Y_center + 125}
          width={Math.max(0, endX - rightTargetLimit)}
          height={60}
          fill="rgba(8, 10, 18, 0.28)"
          stroke="var(--accent)"
          strokeWidth="0.25"
          opacity="0.07"
        />
        {/* CAD corner ticks — Bottom Zone 4 */}
        <g stroke="var(--accent)" strokeWidth="0.35" opacity="0.09" fill="none">
          <path d={`M ${rightTargetLimit},${Y_center + 129} V ${Y_center + 125} H ${rightTargetLimit + 5}`} />
          <path d={`M ${endX - 5},${Y_center + 125} H ${endX} V ${Y_center + 129}`} />
          <path d={`M ${rightTargetLimit},${Y_center + 181} V ${Y_center + 185} H ${rightTargetLimit + 5}`} />
          <path d={`M ${endX - 5},${Y_center + 185} H ${endX} V ${Y_center + 181}`} />
        </g>

        {/* Inactive layered infrastructure CAD tracks */}
        <g stroke="var(--accent)" strokeWidth="0.55" fill="none" opacity="0.018">
          <path d={`M ${midStart + 10},${Y_center - 185} V ${Y_center - 100} L ${midStart + 50},${Y_center - 60} H ${middleTargetLimit - 20}`} />
          <path d={`M ${midStart + 10},${Y_center + 185} V ${Y_center + 100} L ${midStart + 50},${Y_center + 60} H ${middleTargetLimit - 20}`} />
          <path d={`M ${midStart + 20},${Y_center - 145} H ${midStart + 80} L ${midStart + 110},${Y_center - 115} H ${middleTargetLimit}`} />
          <path d={`M ${midStart + 20},${Y_center + 145} H ${midStart + 80} L ${midStart + 110},${Y_center + 115} H ${middleTargetLimit}`} />
        </g>
        <g stroke="var(--accent)" strokeWidth="0.40" fill="none" opacity="0.015">
          <rect x={endX - 55} y={Y_center - 178} width={16} height={16} strokeDasharray="2 2" />
          <rect x={endX - 55} y={Y_center + 162} width={16} height={16} strokeDasharray="2 2" />
          <rect x={rightTargetLimit + 8} y={Y_center - 178} width={14} height={14} strokeDasharray="2 2" />
          <rect x={rightTargetLimit + 8} y={Y_center + 164} width={14} height={14} strokeDasharray="2 2" />
        </g>
      </g>
    </>
  ), [midStart, middleTargetLimit, rightTargetLimit, endX, Y_center, isTransmit])

  const traceCorridors = useMemo(() => (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={isTransmit ? 0.3 : 1}>
      {/* Middle Trace Corridors */}
      {pcbData.middleTraces.map((t, idx) => {
        const targetOpacity = getTargetOpacity(t.chKey)
        const w = getWidthForCategory(t.category)
        return (
          <React.Fragment key={`m-corridor-${idx}`}>
            <path
              d={t.d}
              stroke="rgba(168, 85, 247, 0.14)"
              strokeWidth={w + 6.0}
              opacity={targetOpacity}
              style={getTransitionStyle()}
            />
            <path
              d={t.d}
              stroke="#020203"
              strokeWidth={w + 4.8}
              opacity={targetOpacity}
              style={getTransitionStyle()}
            />
          </React.Fragment>
        )
      })}

      {/* Right Trace Corridors */}
      {pcbData.rightTraces.map((t, idx) => {
        const targetOpacity = getTargetOpacity(null)
        const w = getWidthForCategory(t.category)
        return (
          <React.Fragment key={`r-corridor-${idx}`}>
            <path
              d={t.d}
              stroke="rgba(168, 85, 247, 0.14)"
              strokeWidth={w + 6.0}
              opacity={targetOpacity}
              style={getTransitionStyle()}
            />
            <path
              d={t.d}
              stroke="#020203"
              strokeWidth={w + 4.8}
              opacity={targetOpacity}
              style={getTransitionStyle()}
            />
          </React.Fragment>
        )
      })}
    </g>
  ), [pcbData, getTargetOpacity, getTransitionStyle, isTransmit])

  if (shouldReduceMotion) return null

const dormantStyles = contactSystemState === 'dormant' ? {
  opacity: 0.65,
  filter: 'saturate(0.7)'
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

        <filter id="pcbGlowIdle" filterUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%">
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
            <feMergeNode in="glowMid" />
            <feMergeNode in="glowCore" />
          </feMerge>
        </filter>

        <filter id="chargerGlowActive" filterUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%">
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
        <pattern id="pcbFiberglassWeaveR" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M 0 3 L 6 3 M 3 0 L 3 6" stroke="rgba(255,255,255,0.012)" strokeWidth="0.4" />
        </pattern>
        <pattern id="pcbDotsR" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#ffffff" opacity="0.015" />
        </pattern>

        {/* Substrate Effect Defs */}
        <filter id="pcbSubstrateBlur" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="45" />
        </filter>
        <filter id="pcbSubstrateNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.02  0 0 0 0 0.04  0 0 0 0 0.03  0 0 0 0.15 0" />
        </filter>
        <mask id="substrateMaskR" x="-100%" y="-100%" width="300%" height="300%">
          <rect
            x={midStart + 30}
            y={Y_center - 150}
            width={Math.max(0, endX - midStart - 60)}
            height="300"
            fill="white"
            filter="url(#pcbSubstrateBlur)"
          />
        </mask>
      </defs>

      {/* Memoized background grid, substrate, and ground pours */}
      {backgroundElements}

      {/* Memoized trace corridors to prevent layout recalculations when typing */}
      {traceCorridors}

      {/* Dynamic Particles Container */}
      <g ref={particlesContainerRef}>
        {Array.from({ length: 35 }).map((_, i) => (
          <circle
            key={`p-pool-r-${i}`}
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
                const w = getWidthForCategory(t.category)
                return (
                  <React.Fragment key={`m-trace-${idx}`}>
                    {/* Motherboard-style Negative Space Corridor Channel */}
                    {t.category === 'main' && (
                      <>
                        <path
                          d={t.d}
                          stroke="var(--accent)"
                          strokeWidth={w * 3.0 + 6.0}
                          fill="none"
                          opacity={targetOpacity * 0.05}
                          strokeLinecap="square"
                          strokeLinejoin="miter"
                          style={getTransitionStyle()}
                        />
                        <path
                          d={t.d}
                          stroke="#080a12"
                          strokeWidth={w * 3.0 + 5.2}
                          fill="none"
                          opacity={targetOpacity * 0.95}
                          strokeLinecap="square"
                          strokeLinejoin="miter"
                          style={getTransitionStyle()}
                        />
                      </>
                    )}
                    {/* Material Layer 2: Groove Shadow */}
                    {t.category !== 'ground' && (
                      <path
                        d={t.d}
                        stroke="rgba(0, 0, 0, 0.45)"
                        strokeWidth={w + 0.8}
                        fill="none"
                        opacity={targetOpacity * 0.75}
                        transform="translate(0.4, 0.4)"
                        style={getTransitionStyle()}
                      />
                    )}

                    {/* Material Layer 2: Groove Highlight */}
                    {t.category !== 'ground' && (
                      <path
                        d={t.d}
                        stroke="rgba(255, 255, 255, 0.03)"
                        strokeWidth={w + 0.8}
                        fill="none"
                        opacity={targetOpacity * 0.75}
                        transform="translate(-0.4, -0.4)"
                        style={getTransitionStyle()}
                      />
                    )}

                    {contactSystemState === 'engaged' && !isTransmit && (
                      <>
                        <path
                          d={t.d}
                          stroke="var(--accent)"
                          strokeWidth={w + 0.8}
                          opacity="0.25"
                          filter="url(#pcbHairlineGlow)"
                          style={getTransitionStyle()}
                        />
                        {(t.main || t.pulse) && (
                          <path
                            d={t.d}
                            stroke="var(--accent)"
                            strokeWidth={w + 1.2}
                            fill="none"
                            opacity="1"
                            pathLength="100"
                            filter="url(#pcbGlowActive)"
                            className="pcb-signal-flow-path"
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

                    {/* Material Layer 3: Trace Core */}
                    <path
                      d={t.d}
                      stroke="var(--accent)"
                      strokeWidth={w}
                      opacity={
                        t.category === 'main'
                          ? 0.95 * targetOpacity
                          : t.category === 'auxiliary'
                            ? 0.45 * targetOpacity
                            : 0.18 * targetOpacity
                      }
                      style={getTransitionStyle()}
                    />

                    {/* Passive Trace Idle Highlight */}
                    {t.category === 'auxiliary' && idx % 3 === 0 && !isTransmit && (
                      <path
                        d={t.d}
                        stroke="var(--accent)"
                        strokeWidth={w}
                        fill="none"
                        style={{
                          ...getTransitionStyle(),
                          animation: 'pcbIdleTraceHighlight 5s ease-in-out infinite',
                          animationDelay: `${idx * 0.6}s`
                        }}
                      />
                    )}

                    {/* Material Layer 4: Micro-Nodes at Bends */}
                    {t.category !== 'ground' && t.bends && t.bends.map((bend, bIdx) => {
                      const usePulse = bIdx % 2 === 0 && !isTransmit;
                      const pulseStyle = usePulse ? {
                        animation: 'pcbIdleNodePulse 4s ease-in-out infinite',
                        animationDelay: `${(idx * 3 + bIdx) * 0.4}s`
                      } : {};
                      return (
                        <g
                          key={`m-bend-${idx}-${bIdx}`}
                          transform={`translate(${bend.x}, ${bend.y})`}
                          opacity={targetOpacity * 0.8}
                          style={{ ...getTransitionStyle(), ...pulseStyle }}
                        >
                          <circle cx="0" cy="0" r="1.3" fill="#030304" />
                          <circle cx="0" cy="0" r="0.8" fill="none" stroke="var(--accent)" strokeWidth="0.25" opacity="0.75" />
                          <circle cx="0" cy="0" r="0.3" fill="#030304" />
                        </g>
                      );
                    })}
                  </React.Fragment>
                )
              })}
            </g>

            {/* SMTs for this channel */}
            {pcbData.components.filter(c => c.chKey === chKey).map(comp => (
              renderSMT(comp.x, comp.y, comp.w, comp.h, comp.l, comp.chKey, comp.isCap)
            ))}

            {/* Vias for this channel */}
            {pcbData.vias.filter(v => v.chKey === chKey).map(v => (
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
                  {/* Negative space clearance gap */}
                  <circle cx="0" cy="0" r="5.7" fill="#030304" />
                  <circle cx="0" cy="0" r="4.2" fill="#030304" />
                  <circle cx="0" cy="0" r="3.5" fill="none" stroke="#ffffff" strokeWidth="0.4" opacity="0.55" />
                  <circle cx="0" cy="0" r="1.3" fill="var(--accent)" opacity="0.75" />
                  {/* Pulsing Outer Ring */}
                  <circle cx="0" cy="0" r="3.5" fill="none" stroke="var(--accent)" strokeWidth="0.4"
                    className="pcb-radar-pulse-ring"
                    style={{
                      animation: 'pcbRadarPulse 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite',
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
          const w = getWidthForCategory(t.category)
          return (
            <React.Fragment key={`r-trace-${idx}`}>
              {/* Motherboard-style Negative Space Corridor Channel */}
              {t.category === 'main' && (
                <>
                  <path
                    d={t.d}
                    stroke="var(--accent)"
                    strokeWidth={w * 3.0 + 6.0}
                    fill="none"
                    opacity={targetOpacity * 0.05}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    style={getTransitionStyle()}
                  />
                  <path
                    d={t.d}
                    stroke="#080a12"
                    strokeWidth={w * 3.0 + 5.2}
                    fill="none"
                    opacity={targetOpacity * 0.95}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    style={getTransitionStyle()}
                  />
                </>
              )}
              {/* Material Layer 2: Groove Shadow */}
              {t.category !== 'ground' && (
                <path
                  d={t.d}
                  stroke="rgba(0, 0, 0, 0.45)"
                  strokeWidth={w + 0.8}
                  fill="none"
                  opacity={targetOpacity * 0.75}
                  transform="translate(0.4, 0.4)"
                  style={getTransitionStyle()}
                />
              )}

              {/* Material Layer 2: Groove Highlight */}
              {t.category !== 'ground' && (
                <path
                  d={t.d}
                  stroke="rgba(255, 255, 255, 0.03)"
                  strokeWidth={w + 0.8}
                  fill="none"
                  opacity={targetOpacity * 0.75}
                  transform="translate(-0.4, -0.4)"
                  style={getTransitionStyle()}
                />
              )}

              {contactSystemState === 'engaged' && !isTransmit && (
                <>
                  <path
                    d={t.d}
                    stroke="var(--accent)"
                    strokeWidth={w + 0.8}
                    opacity="0.25"
                    filter="url(#pcbHairlineGlow)"
                    style={getTransitionStyle()}
                  />
                  {(t.main || t.pulse) && (
                    <path
                      d={t.d}
                      stroke="var(--accent)"
                      strokeWidth={w + 1.2}
                      fill="none"
                      opacity="1"
                      pathLength="100"
                      filter="url(#pcbGlowActive)"
                      className="pcb-signal-flow-path"
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

              {/* Material Layer 3: Trace Core */}
              <path
                d={t.d}
                stroke="var(--accent)"
                strokeWidth={w}
                opacity={
                  t.category === 'main'
                    ? 0.95 * targetOpacity
                    : t.category === 'auxiliary'
                      ? 0.45 * targetOpacity
                      : 0.18 * targetOpacity
                }
                style={getTransitionStyle()}
              />

              {/* Passive Trace Idle Highlight */}
              {t.category === 'auxiliary' && idx % 3 === 0 && !isTransmit && (
                <path
                  d={t.d}
                  stroke="var(--accent)"
                  strokeWidth={w}
                  fill="none"
                  style={{
                    ...getTransitionStyle(),
                    animation: 'pcbIdleTraceHighlight 5s ease-in-out infinite',
                    animationDelay: `${(idx + 5) * 0.6}s`
                  }}
                />
              )}

              {/* Material Layer 4: Micro-Nodes at Bends */}
              {t.category !== 'ground' && t.bends && t.bends.map((bend, bIdx) => {
                const usePulse = bIdx % 2 === 0 && !isTransmit;
                const pulseStyle = usePulse ? {
                  animation: 'pcbIdleNodePulse 4s ease-in-out infinite',
                  animationDelay: `${(idx * 3 + bIdx + 7) * 0.4}s`
                } : {};
                return (
                  <g
                    key={`r-bend-${idx}-${bIdx}`}
                    transform={`translate(${bend.x}, ${bend.y})`}
                    opacity={targetOpacity * 0.8}
                    style={{ ...getTransitionStyle(), ...pulseStyle }}
                  >
                    <circle cx="0" cy="0" r="1.3" fill="#030304" />
                    <circle cx="0" cy="0" r="0.8" fill="none" stroke="var(--accent)" strokeWidth="0.25" opacity="0.75" />
                    <circle cx="0" cy="0" r="0.3" fill="#030304" />
                  </g>
                );
              })}
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
      {pcbData.vias.filter(v => !v.chKey).map(v => (
        renderVia(v.x, v.y, v.l, v.chKey)
      ))}

      {/* Right pads (ambient) */}
      {pcbData.pads.map(p => (
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
            {/* Negative space clearance gap */}
            <circle cx="0" cy="0" r="5.7" fill="#030304" />
            <circle cx="0" cy="0" r="4.2" fill="#030304" />
            <circle cx="0" cy="0" r="3.5" fill="none" stroke="#ffffff" strokeWidth="0.4" opacity="0.55" />
            <circle cx="0" cy="0" r="1.3" fill="var(--accent)" opacity="0.75" />
            {/* Pulsing Outer Ring */}
            <circle cx="0" cy="0" r="3.5" fill="none" stroke="var(--accent)" strokeWidth="0.4"
              className="pcb-radar-pulse-ring"
              style={{
                animation: 'pcbRadarPulse 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite',
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
