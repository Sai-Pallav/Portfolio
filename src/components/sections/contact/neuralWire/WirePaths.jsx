import { memo, useMemo, useEffect, useRef, useContext } from 'react'
import * as THREE from 'three'
import { FlowTimeContext, TRAVEL_DEFORMATION_GLSL } from './animationContract'

const LineFeatherShader = {
  vertexShader: `
    attribute float aU;
    attribute float aAlpha;
    attribute vec3 color;
    uniform float uOpacity;
    uniform float uInnerFade;
    varying float vAlpha;
    varying vec3 vColor;
    ${TRAVEL_DEFORMATION_GLSL}

    void main() {
      // Dynamic inner tip fade near the globe: smoothstep(0.0, max(0.005, uInnerFade), aU)
      float fadeDist = max(0.005, uInnerFade);
      float feather = smoothstep(0.0, fadeDist, aU);
      vAlpha = aAlpha * feather * uOpacity;
      vColor = color;
      gl_Position = flowClipPosition(position);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      // Optimized: dot product check eliminates hardware square root (length)
      vec3 col = dot(vColor, vColor) > 0.0001 ? vColor : uColor;
      gl_FragColor = vec4(col, clamp(vAlpha, 0.0, 1.0));
    }
  `,
}

/**
 * Merges multiple line buffer geometries into a single LineSegments BufferGeometry
 * with baked per-vertex color and alpha multiplier attributes.
 * Under AdditiveBlending and depthWrite: false, rendering in a single draw call
 * is mathematically identical to rendering separate LineSegments draw calls.
 */
function mergeWirePathLayers(layers) {
  let totalVerts = 0
  for (let i = 0; i < layers.length; i++) {
    const g = layers[i].geo
    if (g && g.attributes.position) {
      totalVerts += g.attributes.position.count
    }
  }
  if (totalVerts === 0) return null

  const posArr = new Float32Array(totalVerts * 3)
  const basePosArr = new Float32Array(totalVerts * 3)
  const uArr = new Float32Array(totalVerts)
  const wireIdArr = new Float32Array(totalVerts)
  const weightArr = new Float32Array(totalVerts)
  const alphaArr = new Float32Array(totalVerts)
  const layerArr = new Float32Array(totalVerts)
  const relArr = new Float32Array(totalVerts * 4)
  const flowArr = new Float32Array(totalVerts * 4)
  const flowMetaArr = new Float32Array(totalVerts * 2)
  const flowAxisArr = new Float32Array(totalVerts * 3)
  const colArr = new Float32Array(totalVerts * 3)

  let offset = 0
  for (let l = 0; l < layers.length; l++) {
    const { geo, defaultColor, alphaMultiplier } = layers[l]
    if (!geo || !geo.attributes.position) continue

    const count = geo.attributes.position.count
    const pos = geo.attributes.position.array
    const basePos = geo.attributes.aBasePos ? geo.attributes.aBasePos.array : pos
    const u = geo.attributes.aU ? geo.attributes.aU.array : null
    const wireId = geo.attributes.aWireId ? geo.attributes.aWireId.array : null
    const weight = geo.attributes.aWeight ? geo.attributes.aWeight.array : null
    const alpha = geo.attributes.aAlpha ? geo.attributes.aAlpha.array : null
    const layer = geo.attributes.aLayer ? geo.attributes.aLayer.array : null
    const rel = geo.attributes.aRelativeCoord ? geo.attributes.aRelativeCoord.array : null
    const flow = geo.attributes.aFlowPair?.array
    const col = geo.attributes.color ? geo.attributes.color.array : null

    const cr = defaultColor.r, cg = defaultColor.g, cb = defaultColor.b

    for (let i = 0; i < count; i++) {
      const idx = offset + i
      const i3 = i * 3
      const idx3 = idx * 3

      posArr[idx3] = pos[i3]
      posArr[idx3 + 1] = pos[i3 + 1]
      posArr[idx3 + 2] = pos[i3 + 2]

      basePosArr[idx3] = basePos[i3]
      basePosArr[idx3 + 1] = basePos[i3 + 1]
      basePosArr[idx3 + 2] = basePos[i3 + 2]

      uArr[idx] = u ? u[i] : 0
      wireIdArr[idx] = wireId ? wireId[i] : 0
      weightArr[idx] = weight ? weight[i] : 1
      alphaArr[idx] = (alpha ? alpha[i] : 1) * alphaMultiplier
      layerArr[idx] = layer ? layer[i] : 0

      if (rel) {
        const i4 = i * 4
        const idx4 = idx * 4
        relArr[idx4] = rel[i4]
        relArr[idx4 + 1] = rel[i4 + 1]
        relArr[idx4 + 2] = rel[i4 + 2]
        relArr[idx4 + 3] = rel[i4 + 3]
      }
      if (flow) {
        const source = 4 * i
        const target = 4 * idx
        flowArr[target] = flow[source]
        flowArr[target + 1] = flow[source + 1]
        flowArr[target + 2] = flow[source + 2]
        flowArr[target + 3] = flow[source + 3]
      }
      flowAxisArr[idx3 + 1] = 1

      if (col) {
        colArr[idx3] = col[i3]
        colArr[idx3 + 1] = col[i3 + 1]
        colArr[idx3 + 2] = col[i3 + 2]
      } else {
        colArr[idx3] = cr
        colArr[idx3 + 1] = cg
        colArr[idx3 + 2] = cb
      }
    }

    offset += count
  }

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  merged.setAttribute('aBasePos', new THREE.BufferAttribute(basePosArr, 3))
  merged.setAttribute('aU', new THREE.BufferAttribute(uArr, 1))
  merged.setAttribute('aWireId', new THREE.BufferAttribute(wireIdArr, 1))
  merged.setAttribute('aWeight', new THREE.BufferAttribute(weightArr, 1))
  merged.setAttribute('aAlpha', new THREE.BufferAttribute(alphaArr, 1))
  merged.setAttribute('aLayer', new THREE.BufferAttribute(layerArr, 1))
  merged.setAttribute('aRelativeCoord', new THREE.BufferAttribute(relArr, 4))
  merged.setAttribute('aFlowPair', new THREE.BufferAttribute(flowArr, 4))
  merged.setAttribute('aFlowMeta', new THREE.BufferAttribute(flowMetaArr, 2))
  merged.setAttribute('aFlowAxis', new THREE.BufferAttribute(flowAxisArr, 3))
  merged.setAttribute('color', new THREE.BufferAttribute(colArr, 3))
  merged.computeBoundingSphere()
  return merged
}

/**
 * Merged 1-Draw-Call Additive Ribbon Rendering for all Hero Waves
 * + 44 Companion Silk Strands:
 * 1. 6-pass micro-offset Royal-Blue (#0048ff) aura bundle for Hero Waves 0, 1, 3
 * 2. Crisp White-Cyan (#e0ffff) core filaments
 * 3. Violet/Magenta (#b83dff) Hero 2 core & aura
 * 4. 44 Companion Silk Strands in Royal-Blue (#0a52ff), Cyan (#30d5ff), and Violet (#9d30ff)
 */
export const WirePaths = memo(function WirePaths({
  primaryCoreGeo,
  primaryHaloGeo,
  primaryFgGeo,
  secondaryGeo,
  secondaryFgGeo,
  depthGeo,
  primaryBgGeo,
  subFilamentsGeo,
  tertiaryGeo,
  themeConfig = {},
  innerFade = 0.04,
}) {
  const timeUniform = useContext(FlowTimeContext)
  const glow = themeConfig.glowIntensity || 1.0
  const opacity = themeConfig.wireOpacity || 0.94

  const pCoreGeo = primaryCoreGeo || primaryFgGeo
  const pHaloGeo = primaryHaloGeo
  const sGeo = secondaryGeo || secondaryFgGeo
  const dGeo = depthGeo || primaryBgGeo
  const sfGeo = subFilamentsGeo || tertiaryGeo

  // Palette colors matching the original 5 materials
  const sfColor = useMemo(() => new THREE.Color('#0a52ff'), [])
  const haloColor = useMemo(() => new THREE.Color('#0048ff'), [])
  const violetHaloColor = useMemo(() => new THREE.Color('#b83dff'), [])
  const violetCoreColor = useMemo(() => new THREE.Color('#f0abfc'), [])
  const coreColor = useMemo(() => new THREE.Color('#e0ffff'), [])

  // Merge the 5 static additive line layers into 1 single LineSegments BufferGeometry per wing
  const mergedLineGeo = useMemo(() => {
    return mergeWirePathLayers([
      // 1. 44 Companion Silk Strands (alpha mult: 1.0 * glow)
      { geo: sfGeo, defaultColor: sfColor, alphaMultiplier: 1.0 * glow },
      // 2. Hero 0, 1, 3: 6-Pass Royal-Blue Aura (alpha mult: 0.32 * glow)
      { geo: pHaloGeo, defaultColor: haloColor, alphaMultiplier: 0.32 * glow },
      // 3. Hero 2: 6-Pass Neon Violet Aura (alpha mult: 0.42 * glow)
      { geo: dGeo, defaultColor: violetHaloColor, alphaMultiplier: 0.42 * glow },
      // 4. Hero 2: Violet/Magenta Core Wave (alpha mult: 0.95)
      { geo: sGeo, defaultColor: violetCoreColor, alphaMultiplier: 0.95 },
      // 5. Hero 0, 1, 3: Crisp White-Cyan Energy Core (alpha mult: 0.95)
      { geo: pCoreGeo, defaultColor: coreColor, alphaMultiplier: 0.95 },
    ])
  }, [sfGeo, pHaloGeo, dGeo, sGeo, pCoreGeo, glow, sfColor, haloColor, violetHaloColor, violetCoreColor, coreColor])

  // Single unified ShaderMaterial for all 5 line layers
  const mergedMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#0048ff') },
        uOpacity: { value: Math.min(1.0, opacity) },
        uInnerFade: { value: innerFade },
        uTime: timeUniform,
      },
      vertexShader: LineFeatherShader.vertexShader,
      fragmentShader: LineFeatherShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [opacity, innerFade, timeUniform])

  const prevGeoRef = useRef(mergedLineGeo)
  useEffect(() => {
    if (prevGeoRef.current && prevGeoRef.current !== mergedLineGeo) {
      prevGeoRef.current.dispose()
    }
    prevGeoRef.current = mergedLineGeo
  }, [mergedLineGeo])

  const prevMatRef = useRef(mergedMat)
  useEffect(() => {
    if (prevMatRef.current && prevMatRef.current !== mergedMat) {
      prevMatRef.current.dispose()
    }
    prevMatRef.current = mergedMat
  }, [mergedMat])

  useEffect(() => {
    return () => {
      if (prevGeoRef.current) prevGeoRef.current.dispose()
      if (prevMatRef.current) prevMatRef.current.dispose()
    }
  }, [])

  const lineMeshRef = useRef(null)
  useEffect(() => {
    if (lineMeshRef.current) {
      lineMeshRef.current.matrixAutoUpdate = false
      lineMeshRef.current.updateMatrix()
    }
  }, [])

  if (!mergedLineGeo) return null

  return (
    <lineSegments
      ref={lineMeshRef}
      geometry={mergedLineGeo}
      material={mergedMat}
      matrixAutoUpdate={false}
      frustumCulled={false}
      onUpdate={(self) => self.updateMatrix()}
    />
  )
})
