import React from 'react'

export default React.memo(function Lighting({ themeColor }) {
  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 4, 4]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-4, -1, -4]} intensity={1.5} color={themeColor} distance={12} decay={2.2} />
    </>
  )
})
