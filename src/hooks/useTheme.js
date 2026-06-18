import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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

  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('portfolio-theme', theme)
      isInitialMount.current = false
      return
    }

    document.documentElement.classList.add('theme-transitioning')
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('portfolio-theme', theme)

    const timer = setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning')
    }, 550)

    return () => clearTimeout(timer)
  }, [theme])

  const cycleTheme = useCallback(() => {
    setTheme(prevTheme => {
      const idx = themes.findIndex(t => t.key === prevTheme)
      const next = themes[(idx + 1) % themes.length]
      return next.key
    })
  }, [])

  const currentTheme = useMemo(() => {
    return themes.find(t => t.key === theme) || themes[0]
  }, [theme])

  const contextValue = useMemo(() => ({
    theme,
    setTheme,
    cycleTheme,
    currentTheme,
    themes
  }), [theme, cycleTheme, currentTheme])

  return contextValue
}
