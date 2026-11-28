import { useMemo, useEffect, useLayoutEffect, useState, useCallback, useRef, useSyncExternalStore, memo, Component } from 'react'
import * as THREE from 'three'
import { Canvas, useThree, useFrame, useStore } from '@react-three/fiber'
import { useThemeContext } from '@/context/ThemeContext'
import { getWireThemeConfig } from './wireThemeConfig'
import { getSideWireData } from './generateWireGeometry'
import { useWireframeConfig } from './WireframeConfigContext'
import { WirePaths } from './WirePaths'
import { BeadedStreams } from './BeadedStreams'
import { NeuralNetworkField } from './NeuralNetworkField'
import { NetworkParticles } from './NetworkParticles'
import { FlowTimeContext, FlowTrigContext, FLOW_OMEGA, isWaveAnimationPaused } from './animationContract'

// Temporary visual toggle retained as a one-line rollback switch while Stage 2
// is validated in the live Contact section.
const TEMPORARILY_STATIC = false
const SHOW_NEURAL_NETWORK = true

const CANVAS_GL_CONFIG = {
  depth: false,
  stencil: false,
  powerPreference: 'high-performance',
  antialias: true,
  alpha: true,
}
const CANVAS_CAMERA_CONFIG = { position: [0, 0, 8], fov: 45 }
const CANVAS_STYLE = { pointerEvents: 'none', width: '100%', height: '100%' }

function subscribeDocumentVisibility(callback) {
  if (typeof document === 'undefined') return () => { }
  document.addEventListener('visibilitychange', callback)
  return () => document.removeEventListener('visibilitychange', callback)
}

function getDocumentHidden() {
  return typeof document !== 'undefined' ? document.hidden : false
}

function getServerDocumentHidden() {
  return false
}

function subscribeDataTheme(callback) {
  if (typeof document === 'undefined') return () => { }
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  return () => observer.disconnect()
}

function getDomTheme() {
  return typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null
}

function getServerDomTheme() {
  return null
}

// Framer Motion's installed hook snapshots this preference only at mount.
// Subscribe directly so enabling reduced motion also stops an already-live canvas.
function subscribeReducedMotion(callback) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

function getReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// The uniforms are imperative GPU values; updating them does not change React state.
function setFlowTime(timeUniform, flowTrigUniform, value) {
  timeUniform.value = value
  const angle = FLOW_OMEGA * value
  flowTrigUniform.value.set(Math.cos(angle), Math.sin(angle))
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
const RibbonGroup = memo(function RibbonGroup({ ribbon, layout, children }) {
  const isLeft = ribbon.side === 'left'

  const posX = isLeft
    ? -layout.xStart - (ribbon.xOffset ?? 0)
    : layout.xStart + (ribbon.xOffset ?? 0)
  const yOffset = ribbon.yOffset ?? 0
  const zOffset = ribbon.zOffset ?? 0
  const pitchX = ribbon.pitchX ?? 0
  const yawY = ribbon.yawY ?? 0
  const tiltZ = ribbon.tiltZ ?? 0

  const position = useMemo(() => [posX, yOffset, zOffset], [posX, yOffset, zOffset])
  const scale = useMemo(
    () => [layout.scaleX, layout.scaleY, layout.scaleZ],
    [layout.scaleX, layout.scaleY, layout.scaleZ]
  )
  const rotation = useMemo(
    () => [
      (pitchX * Math.PI) / 180,
      isLeft ? (yawY * Math.PI) / 180 : -(yawY * Math.PI) / 180,
      isLeft ? -(tiltZ * Math.PI) / 180 : (tiltZ * Math.PI) / 180,
    ],
    [pitchX, yawY, tiltZ, isLeft]
  )

  return (
    <group position={position} scale={scale} rotation={rotation}>
      {children}
    </group>
  )
})

/**
 * Responsive 3D scene containing 4 independent ribbon groups.
 */
function NeuralScene({ themeKey, isInView, isDocumentHidden, reducedMotion, onContextLost, sceneStoreRef }) {
  const { gl, viewport, invalidate } = useThree()
  const store = useStore()
  const timeUniform = useMemo(() => ({ value: 0 }), [])
  const flowTrigUniform = useMemo(() => ({ value: new THREE.Vector2(1, 0) }), [])
  const elapsed = useRef(0)
  const [isPaused, setIsPaused] = useState(() => isWaveAnimationPaused)

  useLayoutEffect(() => {
    if (sceneStoreRef) sceneStoreRef.current = store
    return () => {
      if (sceneStoreRef && sceneStoreRef.current === store) {
        sceneStoreRef.current = null
      }
    }
  }, [sceneStoreRef, store])

  useEffect(() => {
    const canvasEl = gl.domElement
    const handleContextLost = (e) => {
      e.preventDefault()
      onContextLost?.()
    }
    canvasEl.addEventListener('webglcontextlost', handleContextLost)
    return () => {
      canvasEl.removeEventListener('webglcontextlost', handleContextLost)
    }
  }, [gl, onContextLost])

  useEffect(() => {
    const handlePause = (e) => {
      setIsPaused(Boolean(e.detail?.paused))
      setFlowTime(timeUniform, flowTrigUniform, elapsed.current)
      invalidate()
    }
    const handleSeek = (e) => {
      if (typeof e.detail?.time === 'number') {
        elapsed.current = e.detail.time
        setFlowTime(timeUniform, flowTrigUniform, elapsed.current)
        invalidate()
      }
    }
    window.addEventListener('wave-animation-pause-change', handlePause)
    window.addEventListener('wave-animation-seek', handleSeek)
    return () => {
      window.removeEventListener('wave-animation-pause-change', handlePause)
      window.removeEventListener('wave-animation-seek', handleSeek)
    }
  }, [invalidate, timeUniform, flowTrigUniform])

  useFrame((_, delta) => {
    if (!isInView || isDocumentHidden || reducedMotion || isPaused) return
    // Keep one monotonically advancing phase clock. The shader owns the
    // periodic wave through sin/cos(theta); wrapping this value would reset
    // the animation clock at the cycle boundary.
    elapsed.current += Math.min(delta, 0.05)
    setFlowTime(timeUniform, flowTrigUniform, elapsed.current)
  })

  const isActive = isInView && !isDocumentHidden
  const isActiveRef = useRef(isActive)
  const inactiveAtFrameRef = useRef(gl.info.render.frame)
  const prevActiveRef = useRef(isActive)

  useLayoutEffect(() => {
    isActiveRef.current = isActive
    if (!isActive) {
      store.getState().internal.frames = 0
    }
  }, [isActive, store])

  const reducedMountedRef = useRef(false)
  useEffect(() => {
    if (reducedMotion) {
      elapsed.current = 0
      setFlowTime(timeUniform, flowTrigUniform, 0)
    }
    if (!reducedMountedRef.current) {
      reducedMountedRef.current = true
      return
    }
    if (isActiveRef.current) {
      invalidate()
    }
  }, [reducedMotion, timeUniform, flowTrigUniform, invalidate])

  // Trigger a single invalidate() when resuming from document.hidden or off-screen under demand frameloop
  // only if R3F's frameloop 'never' -> 'demand' transition has not already queued/rendered a frame.
  useEffect(() => {
    if (prevActiveRef.current && !isActive) {
      inactiveAtFrameRef.current = gl.info.render.frame
    } else if (!prevActiveRef.current && isActive) {
      if (
        gl.info.render.frame === inactiveAtFrameRef.current &&
        store.getState().internal.frames === 0
      ) {
        invalidate()
      }
    }
    prevActiveRef.current = isActive
  }, [isActive, gl, store, invalidate])

  const baseThemeConfig = useMemo(() => getWireThemeConfig(themeKey), [themeKey])
  const { ribbons } = useWireframeConfig()

  // Invalidate canvas once to re-render when theme, viewport, or ribbon configs update
  const depsMountedRef = useRef(false)
  useEffect(() => {
    if (!depsMountedRef.current) {
      depsMountedRef.current = true
      return
    }
    if (isActiveRef.current) {
      invalidate()
    }
  }, [baseThemeConfig, viewport.width, viewport.height, ribbons, invalidate])

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

  // Decoupled memoization: geometry, layout, and themeConfig update independently
  const wireEntries = useMemo(
    () => ribbons.map(ribbon => getSideWireData(ribbon.side, ribbon)),
    [ribbons]
  )

  const layouts = useMemo(
    () => ribbons.map(ribbon => calculateLayout(ribbon)),
    [ribbons, calculateLayout]
  )

  const themeConfigs = useMemo(
    () =>
      ribbons.map(ribbon => ({
        ...baseThemeConfig,
        glowIntensity: (baseThemeConfig.glowIntensity || 1.0) * (ribbon.glowIntensity ?? 1.0),
        wireOpacity: (baseThemeConfig.wireOpacity || 0.94) * (ribbon.wireOpacity ?? 1.0),
      })),
    [baseThemeConfig, ribbons]
  )

  return (
    <FlowTimeContext.Provider value={timeUniform}>
      <FlowTrigContext.Provider value={flowTrigUniform}>
        <group>
          {ribbons.map((ribbon, idx) => {
            const wireData = wireEntries[idx]
            const layout = layouts[idx]
            const themeConfig = themeConfigs[idx]
            return (
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
                {SHOW_NEURAL_NETWORK && (
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
                )}
                <NetworkParticles
                  stardustGeo={wireData.stardustGeo}
                  bokehGeo={wireData.bokehGeo}
                  themeConfig={themeConfig}
                />
              </RibbonGroup>
            )
          })}
        </group>
      </FlowTrigContext.Provider>
    </FlowTimeContext.Provider>
  )
}

/**
 * Top-level SideWireNetwork component.
 * Renders a full-width React Three Fiber canvas spanning behind/flanking the globe.
 */
export default memo(function SideWireNetwork({ isInView = true }) {
  const [webglSupported, setWebglSupported] = useState(true)
  const isDocumentHidden = useSyncExternalStore(
    subscribeDocumentVisibility,
    getDocumentHidden,
    getServerDocumentHidden
  )
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerDocumentHidden
  )
  const reducedMotion = TEMPORARILY_STATIC || prefersReducedMotion
  const themeCtx = useThemeContext()
  const sceneStoreRef = useRef(null)

  const handleContextLost = useCallback(() => {
    setWebglSupported(false)
  }, [])

  useLayoutEffect(() => {
    const st = sceneStoreRef.current?.getState()
    if (st && (!isInView || isDocumentHidden)) {
      st.internal.frames = 0
    }
  }, [isInView, isDocumentHidden])

  const domTheme = useSyncExternalStore(
    subscribeDataTheme,
    getDomTheme,
    getServerDomTheme
  )

  const activeTheme = themeCtx?.theme || domTheme || 'obsidian'

  if (!webglSupported) return null

  return (
    <div className="w-full h-full pointer-events-none relative flex items-center justify-center">
      <CanvasErrorBoundary>
        <Canvas
          frameloop={isInView && !isDocumentHidden ? (reducedMotion ? 'demand' : 'always') : 'never'}
          dpr={[1, 1.5]}
          gl={CANVAS_GL_CONFIG}
          camera={CANVAS_CAMERA_CONFIG}
          style={CANVAS_STYLE}
        >
          <NeuralScene
            themeKey={activeTheme}
            isInView={isInView}
            isDocumentHidden={isDocumentHidden}
            reducedMotion={reducedMotion}
            onContextLost={handleContextLost}
            sceneStoreRef={sceneStoreRef}
          />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  )
})
