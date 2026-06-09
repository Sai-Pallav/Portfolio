import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { useThemeContext } from '@/context/ThemeContext'

function ThreeBackground() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const { theme } = useThemeContext()

  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const scrollRef = useRef({ y: 0, targetY: 0 })
  const targetColorRef = useRef(new THREE.Color('#00e5a0'))

  const readAccentColor = useCallback(() => {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    if (color) targetColorRef.current.set(color)
  }, [])

  useEffect(() => {
    const isMobile = window.innerWidth < 768 || window.matchMedia('(any-pointer: coarse)').matches
    if (isMobile) return

    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    readAccentColor()

    const width = container.clientWidth
    const height = container.clientHeight
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2('#030303', 0.015)

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
    camera.position.z = 30

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const createGlowTexture = () => {
      const size = 64
      const pCanvas = document.createElement('canvas')
      pCanvas.width = size
      pCanvas.height = size
      const ctx = pCanvas.getContext('2d')
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)')
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
      const tex = new THREE.CanvasTexture(pCanvas)
      tex.flipY = false
      return tex
    }

    const particleTexture = createGlowTexture()
    const particleCount = 450
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const randomSpeeds = new Float32Array(particleCount)
    const originalPositions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * 2.0 * Math.PI
      const phi = Math.acos(2.0 * Math.random() - 1.0)
      const r = 12 + Math.random() * 8
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)
      positions[i * 3] = originalPositions[i * 3] = x
      positions[i * 3 + 1] = originalPositions[i * 3 + 1] = y
      positions[i * 3 + 2] = originalPositions[i * 3 + 2] = z
      randomSpeeds[i] = 0.2 + Math.random() * 0.8
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      size: 0.85,
      map: particleTexture,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: targetColorRef.current.clone(),
    })

    const particleSystem = new THREE.Points(geometry, material)
    scene.add(particleSystem)

    const handleMouseMove = (e) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth - 0.5) * 4
      mouseRef.current.targetY = -(e.clientY / window.innerHeight - 0.5) * 4
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    const handleResize = () => {
      if (!container || !canvas) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    let animationFrameId
    const startTime = performance.now()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const time = (performance.now() - startTime) * 0.001

      const mouse = mouseRef.current
      mouse.x += (mouse.targetX - mouse.x) * 0.05
      mouse.y += (mouse.targetY - mouse.y) * 0.05

      const scroll = scrollRef.current
      scroll.targetY = (window.lenis?.scroll ?? window.scrollY) * 0.03
      scroll.y += (scroll.targetY - scroll.y) * 0.08

      particleSystem.rotation.y = time * 0.03 + mouse.x * 0.3
      particleSystem.rotation.x = time * 0.02 + mouse.y * 0.2
      particleSystem.position.y = -scroll.y * 0.2

      const posAttr = geometry.attributes.position
      const pArray = posAttr.array
      for (let i = 0; i < particleCount; i++) {
        const offset = i * 3
        const speed = randomSpeeds[i]
        pArray[offset] = originalPositions[offset] + Math.sin(time * speed * 0.5) * 0.2
        pArray[offset + 1] = originalPositions[offset + 1] + Math.cos(time * speed * 0.6) * 0.2
      }
      posAttr.needsUpdate = true

      material.color.lerp(targetColorRef.current, 0.03)
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('mousemove', handleMouseMove)
      resizeObserver.disconnect()
      geometry.dispose()
      material.dispose()
      particleTexture.dispose()
      renderer.dispose()
    }
  }, [readAccentColor])

  useEffect(() => {
    const id = setTimeout(readAccentColor, 50)
    return () => clearTimeout(id)
  }, [theme, readAccentColor])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full -z-10 pointer-events-none overflow-hidden bg-bg"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  )
}

export default ThreeBackground
