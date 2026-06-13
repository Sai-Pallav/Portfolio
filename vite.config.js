import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom)/,
              priority: 30,
            },
            {
              name: 'motion-vendor',
              test: /node_modules[\\/](framer-motion|motion)/,
              priority: 25,
            },
            {
              name: 'three-bundle',
              test: /node_modules[\\/](three|@react-three|@dimforge|meshline|three-stdlib|hls\.js|stats-gl|fflate)/,
              priority: 20,
            },
            {
              name: 'vendor',
              test: /node_modules/,
              priority: 10,
            }
          ]
        }
      }
    },
  },
})
