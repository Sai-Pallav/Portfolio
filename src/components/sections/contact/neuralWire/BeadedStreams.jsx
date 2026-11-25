import { memo, useMemo, useEffect, useLayoutEffect, useRef, useContext } from 'react'
import * as THREE from 'three'
import { getGlowTexture } from './generateWireGeometry'
import {
  FlowTimeContext,
  FlowTrigContext,
  TRAVEL_DEFORMATION_GLSL,
  DEPTH_DIM_MIN,
  DEPTH_DIM_MAX,
} from './animationContract'

const BeadedShader = {
  vertexShader: `
    attribute float aU;
    attribute float size;
    attribute float alpha;
    uniform float uGlowIntensity;
    uniform float uPointSizeScale;
    uniform float uDepthDimMin;
    uniform float uDepthDimMax;
    varying float vAlpha;
    varying float vDepthRgbScale;
    ${TRAVEL_DEFORMATION_GLSL}

    void main() {
      float phase = 6.28318530718 * aU;
      vAlpha = alpha * uGlowIntensity * (1.0 + 0.020 * (sin(phase) * (uFlowTrig.x - 1.0) - cos(phase) * uFlowTrig.y));
      float depthFactor = flowDepthFactor(uDepthDimMin, uDepthDimMax);
      float rgbScale = min(sqrt(depthFactor), 1.0);
      float alphaScale = depthFactor / rgbScale;
      vAlpha *= alphaScale;
      vDepthRgbScale = rgbScale;
      vec4 mvPosition = flowViewPosition(position);
      gl_PointSize = clamp(size * uPointSizeScale / -mvPosition.z, 1.6, 4.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform sampler2D uTexture;
    varying float vAlpha;
    varying float vDepthRgbScale;

    void main() {
      vec4 tex = texture2D(uTexture, gl_PointCoord);
      vec3 col = uColor * vDepthRgbScale;
      gl_FragColor = vec4(col, tex.a * clamp(vAlpha, 0.0, 1.0));
    }
  `,
}

/**
 * 5 Parent-Bound Beaded Dot-Streams (75 beads per strand)
 * Fixed local offsets keep the dots inside their parent ribbon bundles.
 * Softly glowing theme-tinted dots (opacity: 0.55, fading at both ends).
 */
export const BeadedStreams = memo(function BeadedStreams({
  beadedStreamsGeo,
  themeConfig = {},
  nodeScale = 1.0,
}) {
  const timeUniform = useContext(FlowTimeContext)
  const flowTrigUniform = useContext(FlowTrigContext)
  const glow = themeConfig.glowIntensity || 1.0
  const glowTexture = useMemo(() => getGlowTexture(64), [])

  const beadColor = useMemo(() => {
    const bright = new THREE.Color(themeConfig.connectionNode || themeConfig.primaryWire || '#38d8ff')
    const base = new THREE.Color(themeConfig.primaryWire || '#0055ff')
    return bright.lerp(base, 0.35)
  }, [themeConfig.connectionNode, themeConfig.primaryWire])

  const beadedMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color() },
        uTexture: { value: glowTexture },
        uGlowIntensity: { value: 1.0 },
        uPointSizeScale: { value: 28.0 },
        uTime: timeUniform,
        uFlowTrig: flowTrigUniform,
        uDepthDimMin: { value: DEPTH_DIM_MIN },
        uDepthDimMax: { value: DEPTH_DIM_MAX },
      },
      vertexShader: BeadedShader.vertexShader,
      fragmentShader: BeadedShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  }, [glowTexture, timeUniform, flowTrigUniform])

  useLayoutEffect(() => {
    beadedMat.uniforms.uColor.value.copy(beadColor)
    beadedMat.uniforms.uTexture.value = glowTexture
    beadedMat.uniforms.uGlowIntensity.value = glow
    beadedMat.uniforms.uPointSizeScale.value = 28.0 * nodeScale * Math.min(1.25, glow)
  }, [beadedMat, beadColor, glowTexture, glow, nodeScale])

  useEffect(() => {
    return () => {
      beadedMat.dispose()
    }
  }, [beadedMat])

  const meshRef = useRef(null)
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.matrixAutoUpdate = false
      meshRef.current.updateMatrix()
    }
  }, [])

  if (!beadedStreamsGeo) return null

  return (
    <points
      ref={meshRef}
      geometry={beadedStreamsGeo}
      material={beadedMat}
      matrixAutoUpdate={false}
      frustumCulled={false}
      onUpdate={(self) => self.updateMatrix()}
    />
  )
})
