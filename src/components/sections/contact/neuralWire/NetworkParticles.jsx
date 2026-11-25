import { memo, useMemo, useEffect, useLayoutEffect, useRef, useContext } from 'react'
import * as THREE from 'three'
import { getGlowTexture } from './generateWireGeometry'
import { FlowTimeContext, FlowTrigContext, TRAVEL_DEFORMATION_GLSL } from './animationContract'

const StardustShader = {
  vertexShader: `
    attribute float size;
    attribute float alpha;
    attribute vec3 color;
    uniform float uGlowIntensity;
    uniform float uPointSizeScale;
    uniform vec3 uPrimaryColor;
    uniform vec3 uSecondaryColor;
    uniform vec3 uParticleColor;
    uniform vec3 uHighlightColor;
    varying float vAlpha;
    varying vec3 vColor;
    ${TRAVEL_DEFORMATION_GLSL}

    void main() {
      vAlpha = alpha * uGlowIntensity;
      if (color.r > 0.8 && color.g > 0.8 && color.b > 0.8) {
        vColor = uHighlightColor;
      } else if (color.r > 0.35 && color.g < 0.6) {
        vColor = uSecondaryColor;
      } else if (color.g > 0.65) {
        vColor = uParticleColor;
      } else {
        vColor = uPrimaryColor;
      }
      vec4 mvPosition = flowViewPosition(position);
      // Crisp 1.0px - 2.2px pinpoint stardust
      gl_PointSize = clamp(size * uPointSizeScale / -mvPosition.z, 1.0, 2.2);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vec4 tex = texture2D(uTexture, gl_PointCoord);
      gl_FragColor = vec4(vColor, tex.a * clamp(vAlpha * 0.90, 0.0, 1.0));
    }
  `,
}

/**
 * 900 Tiny Pinpoint Stardust Specks (1.0px–2.2px).
 */
export const NetworkParticles = memo(function NetworkParticles({
  stardustGeo,
  particlesGeo,
  themeConfig = {},
}) {
  const timeUniform = useContext(FlowTimeContext)
  const flowTrigUniform = useContext(FlowTrigContext)
  const glowTexture = useMemo(() => getGlowTexture(32), [])
  const glow = themeConfig.glowIntensity || 1.0

  const primaryColor = useMemo(
    () => new THREE.Color(themeConfig.primaryWire || '#1068ff'),
    [themeConfig.primaryWire]
  )
  const particleColor = useMemo(
    () => new THREE.Color(themeConfig.particle || themeConfig.connectionNode || '#30d5ff'),
    [themeConfig.particle, themeConfig.connectionNode]
  )
  const secondaryColor = particleColor
  const highlightColor = useMemo(
    () => new THREE.Color(themeConfig.highlightNode || '#e0ffff'),
    [themeConfig.highlightNode]
  )

  const sGeo = stardustGeo || particlesGeo

  // 900 Tiny Pinpoint Stardust Specks (1.0px - 2.2px) (uniforms updated in-place)
  const stardustMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: glowTexture },
        uGlowIntensity: { value: 1.0 },
        uPointSizeScale: { value: 20.0 },
        uPrimaryColor: { value: new THREE.Color() },
        uSecondaryColor: { value: new THREE.Color() },
        uParticleColor: { value: new THREE.Color() },
        uHighlightColor: { value: new THREE.Color() },
        uTime: timeUniform,
        uFlowTrig: flowTrigUniform,
      },
      vertexShader: StardustShader.vertexShader,
      fragmentShader: StardustShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  }, [glowTexture, timeUniform, flowTrigUniform])

  useLayoutEffect(() => {
    stardustMat.uniforms.uTexture.value = glowTexture
    stardustMat.uniforms.uGlowIntensity.value = glow
    stardustMat.uniforms.uPointSizeScale.value = 20.0 * Math.min(1.25, glow)
    stardustMat.uniforms.uPrimaryColor.value.copy(primaryColor)
    stardustMat.uniforms.uSecondaryColor.value.copy(secondaryColor)
    stardustMat.uniforms.uParticleColor.value.copy(particleColor)
    stardustMat.uniforms.uHighlightColor.value.copy(highlightColor)
  }, [stardustMat, glow, glowTexture, primaryColor, secondaryColor, particleColor, highlightColor])

  useEffect(() => {
    return () => {
      stardustMat.dispose()
    }
  }, [stardustMat])

  const stardustMeshRef = useRef(null)

  useEffect(() => {
    if (stardustMeshRef.current) {
      stardustMeshRef.current.matrixAutoUpdate = false
      stardustMeshRef.current.updateMatrix()
    }
  }, [])

  if (!sGeo) return null

  return (
    <group matrixAutoUpdate={false}>
      {/* 900 Tiny Pinpoint Stardust Specks */}
      <points
        ref={stardustMeshRef}
        geometry={sGeo}
        material={stardustMat}
        matrixAutoUpdate={false}
        frustumCulled={false}
        onUpdate={(self) => self.updateMatrix()}
      />
    </group>
  )
})
