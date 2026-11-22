import { useMemo, useEffect, useState, useCallback, useRef, memo, Component } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useReducedMotion } from 'framer-motion'
import { useThemeContext } from '@/context/ThemeContext'
import { getWireThemeConfig } from './wireThemeConfig'
import { getSideWireData } from './generateWireGeometry'
import { useWireframeConfig } from './WireframeConfigContext'
import { WirePaths } from './WirePaths'
import { BeadedStreams } from './BeadedStreams'
import { NeuralNetworkField } from './NeuralNetworkField'
import { NetworkParticles } from './NetworkParticles'
import { FlowTimeContext, FLOW_PERIOD } from './animationContract'

// The uniform is an imperative GPU value; updating it does not change React state.
function setFlowTime(uniform, value) {
  uniform.value = value
}

/**
 * Resilient error boundary for 3D canvas rendering
 */
class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('SideWireNetwork Canvas error caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}

/**
 * A single ribbon group with responsive layout, transform & positioning.
 */
function RibbonGroup({ ribbon, layout, children }) {
  const isLeft = ribbon.side === 'left'

  const posX = isLeft
    ? -layout.xStart - (ribbon.xOffset ?? 0)
    : layout.xStart + (ribbon.xOffset ?? 0)

  return (
    <group
      position={[
        posX,
        ribbon.yOffset ?? 0,
        ribbon.zOffset ?? 0,
      ]}
      scale={[layout.scaleX, layout.scaleY, layout.scaleZ]}
      rotation={[
        ((ribbon.pitchX ?? 0) * Math.PI) / 180,
        isLeft
          ? ((ribbon.yawY ?? 0) * Math.PI) / 180
          : -((ribbon.yawY ?? 0) * Math.PI) / 180,
        isLeft
          ? -((ribbon.tiltZ ?? 0) * Math.PI) / 180
          : ((ribbon.tiltZ ?? 0) * Math.PI) / 180,
      ]}
    >
      {children}
    </group>
  )
}

/**
 * Responsive 3D scene containing 4 independent ribbon groups.
 */
function NeuralScene({ themeKey, isInView, reducedMotion }) {
  const { viewport, invalidate } = useThree()
  const timeUniform = useMemo(() => ({ value: 0 }), [])
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    if (!isInView || reducedMotion) return
    elapsed.current = (elapsed.current + Math.min(delta, 0.05)) % FLOW_PERIOD
    setFlowTime(timeUniform, elapsed.current)
  })

  useEffect(() => {
    if (reducedMotion) {
      elapsed.current = 0
      setFlowTime(timeUniform, 0)
    }
    invalidate()
  }, [reducedMotion, timeUniform, invalidate])
  const baseThemeConfig = useMemo(() => getWireThemeConfig(themeKey), [themeKey])
  const { ribbons, leftConfig, rightConfig } = useWireframeConfig()

  // Invalidate canvas to re-render when theme, inView, viewport, or ribbon configs update
  useEffect(() => {
    invalidate()
    const r1 = requestAnimationFrame(() => invalidate())
    const t1 = setTimeout(() => invalidate(), 100)
    return () => {
      cancelAnimationFrame(r1)
      clearTimeout(t1)
    }
  }, [baseThemeConfig, isInView, viewport.width, viewport.height, leftConfig, rightConfig, ribbons, invalidate])

  // Responsive layout calculation per ribbon config
  const calculateLayout = useCallback((ribbonConfig) => {
    const halfWidth = viewport.width / 2

    let baseStart
    if (viewport.width >= 8.5) {
      baseStart = 2.30
    } else if (viewport.width <= 5.5) {
      baseStart = 1.65
    } else {
      baseStart = 1.65 + ((viewport.width - 5.5) / 3.0) * 0.65
    }

    const innerExt = (ribbonConfig.innerExtension ?? 0.0) - (ribbonConfig.innerGap ?? 0.0)
    const xInner = Math.max(0.05, baseStart - innerExt)

    const baseEnd = Math.max(halfWidth * 1.28, 7.2)
    const outerExt = (ribbonConfig.outerExtension ?? 1.5) * 1.2 + (ribbonConfig.outerXOffset ?? 0.0)
    const xOuter = Math.max(xInner + 2.0, baseEnd + outerExt)

    const span = (xOuter - xInner) * (ribbonConfig.lengthMultiplier ?? 1.0)
    const scaleX = span / 10.0
    const scaleY = Math.max(0.60, Math.min(1.35, span * 0.18)) * (ribbonConfig.breadthMultiplier ?? 1.0)
    const scaleZ = ribbonConfig.depthMultiplier ?? 1.0
    const nodeScale = Math.max(0.65, Math.min(1.35, scaleY)) * (ribbonConfig.nodeScale ?? 1.0)

    return { xStart: xInner, xEnd: xOuter, span, scaleX, scaleY, scaleZ, nodeScale }
  }, [viewport.width])

  // Per-ribbon geometry & layout (memoized per ribbon's shape params)
  const ribbonData = useMemo(() => {
    return ribbons.map(ribbon => {
      const wireData = getSideWireData(ribbon.side, ribbon)
      const layout = calculateLayout(ribbon)
      const themeConfig = {
        ...baseThemeConfig,
        glowIntensity: (baseThemeConfig.glowIntensity || 1.0) * (ribbon.glowIntensity ?? 1.0),
        wireOpacity: (baseThemeConfig.wireOpacity || 0.94) * (ribbon.wireOpacity ?? 1.0),
      }
      return { ribbon, wireData, layout, themeConfig }
    })
  }, [
    baseThemeConfig,
    calculateLayout,
    ribbons,
  ])

  return (
    <FlowTimeContext.Provider value={timeUniform}>
      <group>
        {ribbonData.map(({ ribbon, wireData, layout, themeConfig }) => (
          <RibbonGroup key={ribbon.id} ribbon={ribbon} layout={layout}>
            <WirePaths
              primaryCoreGeo={wireData.primaryCoreGeo}
              primaryHaloGeo={wireData.primaryHaloGeo}
              secondaryGeo={wireData.secondaryGeo}
              depthGeo={wireData.depthGeo}
              subFilamentsGeo={wireData.subFilamentsGeo}
              themeConfig={themeConfig}
              innerFade={ribbon.innerFade ?? 0.04}
            />
            <BeadedStreams
              beadedStreamsGeo={wireData.beadedStreamsGeo}
              themeConfig={themeConfig}
              nodeScale={layout.nodeScale}
            />
            <NeuralNetworkField
              linesGeo={wireData.neuralLinesGeo}
              pointsGeo={wireData.neuralPointsGeo}
              hazeGeo={wireData.neuralHazeGeo}
              focalFlaresGeo={wireData.focalFlaresGeo}
              themeConfig={themeConfig}
              nodeScale={layout.nodeScale}
              innerFade={ribbon.innerFade ?? 0.04}
              side={ribbon.side}
            />
            <NetworkParticles
              stardustGeo={wireData.stardustGeo}
              bokehGeo={wireData.bokehGeo}
              themeConfig={themeConfig}
            />
          </RibbonGroup>
        ))}
      </group>
    </FlowTimeContext.Provider>
  )
}

/**
 * Top-level SideWireNetwork component.
 * Renders a full-width React Three Fiber canvas spanning behind/flanking the globe.
 */
export default memo(function SideWireNetwork({ isInView = true }) {
  const [webglSupported, setWebglSupported] = useState(true)
  const reducedMotion = useReducedMotion()
  const themeCtx = useThemeContext()

  const [domTheme, setDomTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') || null
    }
    return null
  })

  // Listen to <html> data-theme attribute mutations
  useEffect(() => {
    if (typeof document === 'undefined') return
    const observer = new MutationObserver(() => {
      const docTheme = document.documentElement.getAttribute('data-theme')
      if (docTheme) {
        setDomTheme(docTheme)
      }
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  const activeTheme = domTheme || themeCtx?.theme || 'obsidian'

  if (!webglSupported) return null

  return (
    <div className="w-full h-full pointer-events-none relative flex items-center justify-center">
      <CanvasErrorBoundary>
        <Canvas
          frameloop={isInView ? (reducedMotion ? 'demand' : 'always') : 'never'}
          dpr={[1, 1.5]}
          gl={{
            powerPreference: 'high-performance',
            antialias: true,
            alpha: true,
          }}
          camera={{ position: [0, 0, 8], fov: 45 }}
          onCreated={({ gl }) => {
            const canvasEl = gl.domElement
            const handleContextLost = (e) => {
              e.preventDefault()
              setWebglSupported(false)
            }
            canvasEl.addEventListener('webglcontextlost', handleContextLost)
            return () => {
              canvasEl.removeEventListener('webglcontextlost', handleContextLost)
            }
          }}
          style={{ pointerEvents: 'none', width: '100%', height: '100%' }}
        >
          <NeuralScene themeKey={activeTheme} isInView={isInView} reducedMotion={reducedMotion} />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  )
})
