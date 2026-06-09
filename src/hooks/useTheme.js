import { useState, useEffect } from 'react'
import { themes, DEFAULT_THEME } from '@/data/themes'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Read from localStorage on mount safely
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolio-theme')
      // Make sure the saved theme is valid in case of changes
      if (saved && themes.some(t => t.key === saved)) {
        return saved
      }
    }
    return DEFAULT_THEME
  })

  useEffect(() => {
    // Apply theme attribute on <html> element
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('portfolio-theme', theme)
  }, [theme])

  const cycleTheme = () => {
    const idx = themes.findIndex(t => t.key === theme)
    const next = themes[(idx + 1) % themes.length]
    setTheme(next.key)
  }

  const currentTheme = themes.find(t => t.key === theme) || themes[0]

  return { theme, setTheme, cycleTheme, currentTheme, themes }
}
