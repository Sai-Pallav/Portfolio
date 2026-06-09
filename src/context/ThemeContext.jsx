import { createContext, useContext } from 'react'
import { useTheme } from '@/hooks/useTheme'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const themeValues = useTheme()
  return (
    <ThemeContext.Provider value={themeValues}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useThemeContext() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return ctx
}
