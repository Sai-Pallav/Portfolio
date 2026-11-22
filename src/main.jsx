import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/themes.css'
import './styles/animations.css'
import App from './App.jsx'
import { ThemeProvider } from '@/context/ThemeContext'

// Filter out upstream deprecation warnings (e.g. Three.js r183+ Clock deprecation from @react-three/fiber)
if (typeof window !== 'undefined') {
  const originalWarn = console.warn
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('THREE.Clock: This module has been deprecated') ||
       args[0].includes('Clock: This module has been deprecated'))
    ) {
      return
    }
    originalWarn.apply(console, args)
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
