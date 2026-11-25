import { memo, useMemo, useEffect, useLayoutEffect, useRef, useContext } from 'react'
import * as THREE from 'three'
import {
  FlowTimeContext,
  FlowTrigContext,
  TRAVEL_DEFORMATION_GLSL,
  DEPTH_DIM_MIN,
  DEPTH_DIM_MAX,
  DEPTH_NORM_EPS,
} from './animationContract'

const LineFeatherShader = {
  vertexShader: `
    attribute float aU;
    attribute float aAlpha;
    attribute vec3 color;
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uDepthDimMin;
    uniform float uDepthDimMax;
    varying float vAlpha;
    varying float vU;
    varying vec3 vColor;
    ${TRAVEL_DEFORMATION_GLSL}

    void main() {
      float depthFactor = flowDepthFactor(uDepthDimMin, uDepthDimMax);
      float rgbScale = min(sqrt(depthFactor), 1.0);
      float alphaScale = depthFactor / rgbScale;
      vAlpha = (aAlpha * uOpacity) * alphaScale;
      vU = aU;
      vColor = (dot(color, color) > 0.0001 ? color : uColor) * rgbScale;
      gl_Position = flowClipPosition(position);
    }
  `,
  fragmentShader: `
    uniform float uInvFadeDist;
    uniform float uInvEDist;
    uniform float uInvTipEnergy;
    varying float vAlpha;
    varying float vU;
    varying vec3 vColor;

    void main() {
      float uRatio = clamp(vU * uInvFadeDist, 0.0, 1.0);
      // C1 smooth fade from 0 at u = 0 without over-extending the pinched inner tail
      float feather = uRatio * uRatio * (3.0 - 2.0 * uRatio);
      float esRaw = clamp(vU * uInvEDist, 0.0, 1.0);
      float es = esRaw * esRaw * (3.0 - 2.0 * esRaw);
      float invEnergy = mix(uInvTipEnergy, 1.0, es * es * mix(1.0, es, 0.35));
      gl_FragColor = vec4(vColor, clamp(vAlpha * feather * invEnergy, 0.0, 1.0));
    }
  `,
}

/**
 * Merges multiple line buffer geometries into a single indexed LineSegments BufferGeometry
 * with baked per-vertex color and alpha multiplier attributes.
 * Under AdditiveBlending and depthWrite: false, rendering in a single draw call
 * is mathematically identical to rendering separate LineSegments draw calls.
 */
function mergeWirePathLayers(layers) {
  let totalVerts = 0
  let totalIndices = 0
  for (let i = 0; i < layers.length; i++) {
    const g = layers[i].geo
    if (g && g.attributes.position) {
      const count = g.attributes.position.count
      totalVerts += count
      totalIndices += g.index ? g.index.count : count
    }
  }
  if (totalVerts === 0) return null

  const posArr = new Float32Array(totalVerts * 3)
  const uArr = new Float32Array(totalVerts)
  const alphaArr = new Float32Array(totalVerts)
  const colArr = new Float32Array(totalVerts * 3)
  const flowCosArr = new Float32Array(totalVerts * 3)
  const flowSinArr = new Float32Array(totalVerts * 3)
  const flowInvRzArr = new Float32Array(totalVerts)
  const IndexArray = totalVerts > 65535 ? Uint32Array : Uint16Array
  const indexArr = new IndexArray(totalIndices)

  let tipEnergy = 0
  let offset = 0
  let indexOffset = 0

  for (let l = 0; l < layers.length; l++) {
    const { geo, defaultColor, alphaMultiplier, silkPalette } = layers[l]
    if (!geo || !geo.attributes.position) continue

    const count = geo.attributes.position.count
    const pos = geo.attributes.position.array
    const flowCos = geo.attributes.aFlowCos.array
    const flowSin = geo.attributes.aFlowSin.array
    const invRz = geo.attributes.aFlowInvRadiusZ ? geo.attributes.aFlowInvRadiusZ.array : null
    const u = geo.attributes.aU ? geo.attributes.aU.array : null
    const alpha = geo.attributes.aAlpha ? geo.attributes.aAlpha.array : null
    const col = geo.attributes.color ? geo.attributes.color.array : null
    const isIndexed = Boolean(geo.index)

    posArr.set(pos, offset * 3)
    flowCosArr.set(flowCos, offset * 3)
    flowSinArr.set(flowSin, offset * 3)
    if (u) uArr.set(u, offset)
    if (invRz) {
      flowInvRzArr.set(invRz, offset)
    } else {
      const eps2 = DEPTH_NORM_EPS * DEPTH_NORM_EPS
      for (let i = 0; i < count; i++) {
        const cz = flowCos[i * 3 + 2]
        const sz = flowSin[i * 3 + 2]
        flowInvRzArr[offset + i] = 1.0 / Math.sqrt(cz * cz + sz * sz + eps2)
      }
    }

    const cr = defaultColor.r, cg = defaultColor.g, cb = defaultColor.b

    for (let i = 0; i < count; i++) {
      const idx = offset + i
      const i3 = i * 3
      const idx3 = idx * 3

      const aVal = (alpha ? alpha[i] : 1) * alphaMultiplier
      alphaArr[idx] = aVal

      let outR = cr
      let outG = cg
      let outB = cb
      if (col) {
        if (silkPalette) {
          const r = col[i3]
          const g = col[i3 + 1]
          const mapped = (r > 0.35 && g < 0.35)
            ? silkPalette.secondary
            : (g > 0.6 ? silkPalette.bright : silkPalette.primary)
          outR = mapped.r
          outG = mapped.g
          outB = mapped.b
        } else {
          outR = col[i3]
          outG = col[i3 + 1]
          outB = col[i3 + 2]
        }
      }
      colArr[idx3] = outR
      colArr[idx3 + 1] = outG
      colArr[idx3 + 2] = outB

      if (u && u[i] === 0 && (isIndexed || i % 2 === 0)) {
        tipEnergy += aVal * Math.max(outR, outG, outB)
      }
    }

    if (isIndexed) {
      const srcIdx = geo.index.array
      for (let k = 0; k < srcIdx.length; k++) {
        indexArr[indexOffset + k] = offset + srcIdx[k]
      }
      indexOffset += srcIdx.length
    } else {
      for (let k = 0; k < count; k++) {
        indexArr[indexOffset + k] = offset + k
      }
      indexOffset += count
    }

    offset += count
  }

  const merged = new THREE.BufferGeometry()
  merged.userData.tipEnergy = tipEnergy
  merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  merged.setAttribute('aU', new THREE.BufferAttribute(uArr, 1))
  merged.setAttribute('aAlpha', new THREE.BufferAttribute(alphaArr, 1))
  merged.setAttribute('color', new THREE.BufferAttribute(colArr, 3))
  merged.setAttribute('aFlowCos', new THREE.BufferAttribute(flowCosArr, 3))
  merged.setAttribute('aFlowSin', new THREE.BufferAttribute(flowSinArr, 3))
  merged.setAttribute('aFlowInvRadiusZ', new THREE.BufferAttribute(flowInvRzArr, 1))
  merged.setIndex(new THREE.BufferAttribute(indexArr, 1))
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
  const flowTrigUniform = useContext(FlowTrigContext)
  const glow = themeConfig.glowIntensity || 1.0
  const opacity = themeConfig.wireOpacity || 0.94

  const pCoreGeo = primaryCoreGeo || primaryFgGeo
  const pHaloGeo = primaryHaloGeo
  const sGeo = secondaryGeo || secondaryFgGeo
  const dGeo = depthGeo || primaryBgGeo
  const sfGeo = subFilamentsGeo || tertiaryGeo

  // Theme-derived palette colors for all 5 wire layers
  const primaryColor = useMemo(
    () => new THREE.Color(themeConfig.primaryWire || '#0048ff'),
    [themeConfig.primaryWire]
  )
  const connectionColor = useMemo(
    () => new THREE.Color(themeConfig.connectionNode || themeConfig.primaryWire || '#30d5ff'),
    [themeConfig.connectionNode, themeConfig.primaryWire]
  )
  const highlightColor = useMemo(
    () => new THREE.Color(themeConfig.highlightNode || '#e0ffff'),
    [themeConfig.highlightNode]
  )

  const sfColor = useMemo(() => primaryColor.clone().multiplyScalar(0.82), [primaryColor])
  const haloColor = useMemo(() => primaryColor.clone().multiplyScalar(0.55), [primaryColor])
  const coreColor = useMemo(
    () => highlightColor.clone().lerp(primaryColor, 0.35),
    [highlightColor, primaryColor]
  )
  const silkPalette = useMemo(
    () => ({
      primary: sfColor,
      bright: connectionColor.clone().multiplyScalar(0.88),
      secondary: sfColor,
    }),
    [sfColor, connectionColor]
  )

  // Merge the 5 static additive line layers into 1 single LineSegments BufferGeometry per wing
  const mergedLineGeo = useMemo(() => {
    return mergeWirePathLayers([
      // 1. 44 Companion Silk Strands (alpha mult: 1.0 * glow)
      { geo: sfGeo, defaultColor: sfColor, alphaMultiplier: 1.0 * glow, silkPalette },
      // 2. Hero 0, 1, 3: 6-Pass Primary Aura (alpha mult: 0.32 * glow)
      { geo: pHaloGeo, defaultColor: haloColor, alphaMultiplier: 0.32 * glow },
      // 3. Hero 2: 6-Pass Primary Aura (alpha mult: 0.42 * glow)
      { geo: dGeo, defaultColor: haloColor, alphaMultiplier: 0.42 * glow },
      // 4. Hero 2: Primary Energy Core (alpha mult: 0.95)
      { geo: sGeo, defaultColor: coreColor, alphaMultiplier: 0.95 },
      // 5. Hero 0, 1, 3: Crisp Energy Core (alpha mult: 0.95)
      { geo: pCoreGeo, defaultColor: coreColor, alphaMultiplier: 0.95 },
    ])
  }, [sfGeo, pHaloGeo, dGeo, sGeo, pCoreGeo, glow, sfColor, haloColor, coreColor, silkPalette])

  // Single unified ShaderMaterial for all 5 line layers (uniforms updated in-place)
  const mergedMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color() },
        uOpacity: { value: 1.0 },
        uInvFadeDist: { value: 1.0 / 0.06 },
        uInvEDist: { value: 1.0 / 0.17 },
        uInvTipEnergy: { value: 1.0 },
        uTime: timeUniform,
        uFlowTrig: flowTrigUniform,
        uDepthDimMin: { value: DEPTH_DIM_MIN },
        uDepthDimMax: { value: DEPTH_DIM_MAX },
      },
      vertexShader: LineFeatherShader.vertexShader,
      fragmentShader: LineFeatherShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  }, [timeUniform, flowTrigUniform])

  useLayoutEffect(() => {
    const clampedOpacity = Math.min(1.0, opacity)
    const fadeDist = Math.max(0.06, innerFade)
    const eDist = Math.min(0.22, Math.max(0.17, fadeDist * 0.78))
    const tipEnergy = (mergedLineGeo?.userData.tipEnergy ?? 1) * clampedOpacity
    mergedMat.uniforms.uColor.value.copy(haloColor)
    mergedMat.uniforms.uOpacity.value = clampedOpacity
    mergedMat.uniforms.uInvFadeDist.value = 1.0 / fadeDist
    mergedMat.uniforms.uInvEDist.value = 1.0 / eDist
    mergedMat.uniforms.uInvTipEnergy.value = 1.0 / Math.max(1.0, tipEnergy)
  }, [mergedMat, opacity, innerFade, mergedLineGeo, haloColor])

  useEffect(() => {
    return () => {
      mergedLineGeo?.dispose()
    }
  }, [mergedLineGeo])

  useEffect(() => {
    return () => {
      mergedMat.dispose()
    }
  }, [mergedMat])

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
