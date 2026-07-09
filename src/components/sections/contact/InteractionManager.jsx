import React, { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

export default React.memo(function InteractionManager({ setWebglSupported }) {
  const { gl } = useThree()
  useEffect(() => {
    const canvasEl = gl.domElement
    const handleContextLost = (e) => {
      e.preventDefault()
      setWebglSupported(false)
    }
    canvasEl.addEventListener('webglcontextlost', handleContextLost)
    return () => {
      canvasEl.removeEventListener('webglcontextlost', handleContextLost)
    }
  }, [gl, setWebglSupported])
  return null
})
