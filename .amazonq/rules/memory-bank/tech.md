# Technology Stack

## Core Technologies

### Frontend Framework
- **React 19.2.6**: UI library with latest features
- **React DOM 19.2.6**: DOM rendering for React

### Build System
- **Vite 8.0.12**: Fast build tool and dev server
- **@vitejs/plugin-react 6.0.1**: React support for Vite

### Styling
- **Tailwind CSS 4.3.0**: Utility-first CSS framework
- **@tailwindcss/postcss 4.3.0**: PostCSS integration
- **PostCSS 8.5.15**: CSS transformation tool
- **Autoprefixer 10.5.0**: Automatic vendor prefixing

### Animation
- **Framer Motion 12.40.0**: Production-ready animation library
- **Custom CSS Animations**: Keyframe animations in Tailwind config

### Utilities
- **clsx 2.1.1**: Conditional className utility
- **tailwind-merge 3.6.0**: Merge Tailwind classes intelligently
- **zod 4.4.3**: TypeScript-first schema validation

### External Services
- **@emailjs/browser 4.4.1**: Email service integration (no backend required)
- **three 0.184.0**: 3D graphics library (if used for effects)

## Development Tools

### Code Quality
- **ESLint 10.3.0**: JavaScript/React linting
- **@eslint/js 10.0.1**: ESLint JavaScript config
- **eslint-plugin-react-hooks 7.1.1**: React Hooks linting rules
- **eslint-plugin-react-refresh 0.5.2**: React Fast Refresh linting
- **globals 17.6.0**: Global variables for ESLint

### Type Support
- **@types/react 19.2.14**: TypeScript definitions for React
- **@types/react-dom 19.2.3**: TypeScript definitions for React DOM

## Configuration Files

### Build Configuration
- **vite.config.js**: Vite build settings with code splitting
  - Path aliases: `@/` → `./src`
  - Manual chunks: vendor (React), motion (Framer Motion)
  
### Styling Configuration
- **tailwind.config.js**: Tailwind customization
  - CSS variable-based color system
  - Custom animations and keyframes
  - Font family definitions
  
- **postcss.config.js**: PostCSS plugins
  - Tailwind CSS processing
  - Autoprefixer for browser compatibility

### Linting Configuration
- **eslint.config.js**: ESLint rules and settings
  - React-specific rules
  - React Hooks rules
  - React Refresh rules

### Environment Configuration
- **.env**: Environment variables (EmailJS credentials)
- **.env.example**: Template for environment setup

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

## Build Output

### Production Bundle (~125KB gzipped)
- **index.html**: 2.62 KB (0.85 KB gzipped)
- **index.css**: 43.09 KB (7.87 KB gzipped)
- **index.js**: 59.28 KB (15.54 KB gzipped)
- **motion.js**: 135.88 KB (44.52 KB gzipped) - Framer Motion chunk
- **vendor.js**: 181.78 KB (57.19 KB gzipped) - React/React DOM chunk

### Code Splitting Strategy
- **vendor**: React and React DOM
- **motion**: Framer Motion library
- **index**: Application code

## Browser Support
- Modern browsers with ES6+ support
- CSS Grid and Flexbox support
- CSS Custom Properties (variables) support
- IntersectionObserver API support

## External Dependencies (CDN)
- **Devicons**: Icon library loaded via CDN for technology logos
