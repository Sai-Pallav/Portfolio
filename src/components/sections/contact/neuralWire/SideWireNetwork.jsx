import { useMemo, useEffect, useState, memo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useThemeContext } from '@/context/ThemeContext'
import { getWireThemeConfig } from './wireThemeConfig'
import { getSideWireData } from './generateWireGeometry'
import { WirePaths } from './WirePaths'
import { BeadedStreams } from './BeadedStreams'
import { NetworkConnections } from './NetworkConnections'
import { NetworkNodes } from './NetworkNodes'
import { NetworkParticles } from './NetworkParticles'

/**
 * Responsive 3D scene containing both Left and Right neural wave networks.
 */
function NeuralScene({ themeKey, isInView }) {
  const { viewport, invalidate } = useThree()
  const themeConfig = useMemo(() => getWireThemeConfig(themeKey), [themeKey])

  // Invalidate canvas to re-render when theme, inView, or viewport updates
  useEffect(() => {
    invalidate()
    const r1 = requestAnimationFrame(() => invalidate())
    const t1 = setTimeout(() => invalidate(), 150)
    const t2 = setTimeout(() => invalidate(), 550)
    return () => {
      cancelAnimationFrame(r1)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [themeConfig, isInView, viewport.width, viewport.height, invalidate])

  // Retrieve cached static geometry once per side
  const leftData = useMemo(() => getSideWireData('left'), [])
  const rightData = useMemo(() => getSideWireData('right'), [])

  // Responsive layout calculation:
  // Maps the canonical 10.0-unit wide wire geometry to fit cleanly between
  // the globe's orbital rings and extend smoothly past outer viewport edges.
  const layout = useMemo(() => {
    const halfWidth = viewport.width / 2

    // Responsive xStart (gap from globe center):
    // Starts closer to the globe ring (matching wider horizontal proportion)
    let xStart
    if (viewport.width >= 8.5) {
      xStart = 2.30 // Desktop & wide tablet
    } else if (viewport.width <= 5.5) {
      xStart = 1.65 // Mobile
    } else {
      xStart = 1.65 + ((viewport.width - 5.5) / 3.0) * 0.65
    }

    // Outer edge: extend past the screen edge so wires sweep smoothly off-screen
    const targetXEnd = halfWidth * 1.06
    const xEnd = Math.max(xStart + 3.0, targetXEnd)
    const span = xEnd - xStart

    // Canonical span is 10.0 units
    const scaleX = span / 10.0

    // Scale Y: Bounded vertical scale keeping wave stream at ~34% of canvas half-height
    const scaleY = Math.max(0.92, Math.min(1.05, span * 0.18))

    // Node scale factor to keep stars and glow points in proportion with the volumetric height
    const nodeScale = Math.max(0.85, Math.min(1.10, scaleY))

    return {
      xStart,
      xEnd,
      span,
      scaleX,
      scaleY,
      nodeScale,
    }
  }, [viewport.width])

  return (
    <group>
      {/* ── LEFT SIDE NEURAL WAVE NETWORK (x < 0) ── */}
      <group
        position={[-layout.xStart, 0, 0]}
        scale={[layout.scaleX, layout.scaleY, 1]}
      >
        <WirePaths
          primaryCoreGeo={leftData.primaryCoreGeo}
          primaryHaloGeo={leftData.primaryHaloGeo}
          secondaryGeo={leftData.secondaryGeo}
          depthGeo={leftData.depthGeo}
          subFilamentsGeo={leftData.subFilamentsGeo}
          themeConfig={themeConfig}
        />
        <BeadedStreams
          beadedStreamsGeo={leftData.beadedStreamsGeo}
          themeConfig={themeConfig}
          nodeScale={layout.nodeScale}
        />
        <NetworkConnections
          constellationGeo={leftData.constellationGeo}
          themeConfig={themeConfig}
        />
        <NetworkNodes
          focalFlaresGeo={leftData.focalFlaresGeo}
          intersectionNodesGeo={leftData.intersectionNodesGeo}
          themeConfig={themeConfig}
          nodeScale={layout.nodeScale}
        />
        <NetworkParticles
          stardustGeo={leftData.stardustGeo}
          bokehGeo={leftData.bokehGeo}
          themeConfig={themeConfig}
        />
      </group>

      {/* ── RIGHT SIDE NEURAL WAVE NETWORK (x > 0) ── */}
      <group
        position={[layout.xStart, 0, 0]}
        scale={[layout.scaleX, layout.scaleY, 1]}
      >
        <WirePaths
          primaryCoreGeo={rightData.primaryCoreGeo}
          primaryHaloGeo={rightData.primaryHaloGeo}
          secondaryGeo={rightData.secondaryGeo}
          depthGeo={rightData.depthGeo}
          subFilamentsGeo={rightData.subFilamentsGeo}
          themeConfig={themeConfig}
        />
        <BeadedStreams
          beadedStreamsGeo={rightData.beadedStreamsGeo}
          themeConfig={themeConfig}
          nodeScale={layout.nodeScale}
        />
        <NetworkConnections
          constellationGeo={rightData.constellationGeo}
          themeConfig={themeConfig}
        />
        <NetworkNodes
          focalFlaresGeo={rightData.focalFlaresGeo}
          intersectionNodesGeo={rightData.intersectionNodesGeo}
          themeConfig={themeConfig}
          nodeScale={layout.nodeScale}
        />
        <NetworkParticles
          stardustGeo={rightData.stardustGeo}
          bokehGeo={rightData.bokehGeo}
          themeConfig={themeConfig}
        />
      </group>
    </group>
  )
}

/**
 * Top-level SideWireNetwork component.
 * Renders a full-width React Three Fiber canvas spanning behind/flanking the globe.
 */
export default memo(function SideWireNetwork({ isInView = true }) {
  const [webglSupported, setWebglSupported] = useState(true)
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
      <Canvas
        frameloop={isInView ? 'demand' : 'never'}
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
        <NeuralScene themeKey={activeTheme} isInView={isInView} />
      </Canvas>
    </div>
  )
})
