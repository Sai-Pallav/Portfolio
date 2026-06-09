/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme]'],   // Enables CSS variable theme switching
  theme: {
    extend: {
      colors: {
        bg:        'var(--bg)',
        surface:   'var(--bg-surface)',
        raised:    'var(--bg-raised)',
        border:    'var(--border)',
        primary:   'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted:     'var(--text-muted)',
        accent:    'var(--accent)',
        'accent-dim': 'var(--accent-dim)',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'serif'],
        body:    ['var(--font-body)', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-up':    'fadeUp 0.6s ease forwards',
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-left': 'slideLeft 0.5s ease forwards',
        'pop-in':     'popIn 0.4s var(--ease-spring) forwards',
        'blob-float': 'blobFloat 6s ease-in-out infinite',
        'draw-line':  'drawLine 1.5s ease forwards',
        'spin-slow':  'spin 4s linear infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:    { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideLeft: { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        popIn:     { from: { opacity: '0', transform: 'scale(0.8)' }, to: { opacity: '1', transform: 'scale(1)' } },
        blobFloat: { '0%, 100%': { transform: 'translateY(0) scale(1)' }, '50%': { transform: 'translateY(-20px) scale(1.03)' } },
        drawLine:  { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } },
        'gradient-x': {
          '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
          '50%': { 'background-size': '200% 200%', 'background-position': 'right center' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
