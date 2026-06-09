# Development Guidelines

## Code Quality Standards

### Module System
- **ES Modules**: Use `export default` for single exports, named exports for multiple exports
- **Import Style**: Use path aliases (`@/`) for cleaner imports from src directory
  ```javascript
  import { useTheme } from '@/hooks/useTheme'
  import { Hero } from '@/components/sections/Hero'
  ```

### File Naming Conventions
- **Components**: PascalCase with `.jsx` extension (e.g., `ThemeContext.jsx`, `Hero.jsx`)
- **Hooks**: camelCase with `use` prefix and `.js` extension (e.g., `useTheme.js`, `useSectionObserver.js`)
- **Data Files**: camelCase with `.js` extension (e.g., `skills.js`, `themes.js`, `personal.js`)
- **Config Files**: kebab-case or standard names (e.g., `eslint.config.js`, `postcss.config.js`)

### Code Formatting
- **Indentation**: 2 spaces (consistent across all files)
- **Object Alignment**: Align object properties for readability in data files
  ```javascript
  { name: 'React',    icon: 'react',    level: 'primary' }
  { name: 'Next.js',  icon: 'nextjs',   level: 'primary' }
  ```
- **Trailing Commas**: Use in arrays and objects for cleaner diffs
- **Single Quotes**: Prefer single quotes for strings

### Documentation
- **Inline Comments**: Use for complex logic or non-obvious decisions
  ```javascript
  // Read from localStorage on mount safely
  // Make sure the saved theme is valid in case of changes
  ```
- **JSDoc**: Not heavily used; prefer self-documenting code
- **README Files**: Comprehensive documentation in markdown format

## Structural Conventions

### Component Structure
- **Functional Components**: Use function declarations, not arrow functions for components
  ```javascript
  export function ThemeProvider({ children }) {
    // component logic
  }
  ```
- **Component Organization**: One component per file, named export matching filename

### Data Organization
- **Separation of Data**: Keep data in dedicated `/data` directory
- **Export Pattern**: Named exports for data objects
  ```javascript
  export const skills = { /* ... */ }
  export const themes = [ /* ... */ ]
  export const DEFAULT_THEME = 'obsidian'
  ```
- **Data Structure**: Use objects for categorized data, arrays for lists

### Hook Patterns
- **Custom Hooks**: Encapsulate reusable logic in custom hooks
- **Hook Naming**: Always prefix with `use` (e.g., `useTheme`, `useSectionObserver`)
- **Return Values**: Return objects for multiple values, single value for simple hooks
  ```javascript
  return { theme, setTheme, cycleTheme, currentTheme, themes }
  ```

### Context Pattern
- **Provider Component**: Separate provider component from context creation
- **Custom Hook**: Export custom hook for consuming context
- **Error Handling**: Throw error if context used outside provider
  ```javascript
  export function useThemeContext() {
    const ctx = useContext(ThemeContext)
    if (!ctx) {
      throw new Error('useThemeContext must be used within a ThemeProvider')
    }
    return ctx
  }
  ```

## React Practices

### State Management
- **useState**: For local component state
- **useEffect**: For side effects (DOM manipulation, localStorage)
- **useMemo**: For expensive computations or stable references
  ```javascript
  const sectionIds = useMemo(() => ['hero', 'about', 'skills'], [])
  ```
- **Context API**: For global state (theme management)

### Component Composition
- **Props Destructuring**: Destructure props in function parameters
  ```javascript
  export function ThemeProvider({ children }) { /* ... */ }
  ```
- **Children Pattern**: Use `children` prop for composition
- **Conditional Rendering**: Use ternary operators or logical AND

### Performance Optimization
- **Lazy Initialization**: Use function form of useState for expensive initial state
  ```javascript
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('portfolio-theme') || DEFAULT_THEME
    }
    return DEFAULT_THEME
  })
  ```
- **Dependency Arrays**: Always specify dependencies for useEffect and useMemo

## Styling Practices

### Tailwind CSS Usage
- **Utility-First**: Use Tailwind utility classes directly in JSX
- **Custom Classes**: Define custom utilities in `tailwind.config.js` for reusable patterns
- **CSS Variables**: Use CSS custom properties for theme colors
  ```javascript
  colors: {
    bg: 'var(--bg)',
    accent: 'var(--accent)',
  }
  ```

### Theme System
- **Data-Attribute Theming**: Apply themes via `data-theme` attribute on `<html>`
- **CSS Variables**: Define theme colors as CSS variables in `themes.css`
- **Theme Persistence**: Store theme preference in localStorage

### Animation Approach
- **Framer Motion**: Use for complex, JavaScript-driven animations
- **CSS Animations**: Define keyframes in Tailwind config for simple animations
- **Reduced Motion**: Respect `prefers-reduced-motion` user preference

## Configuration Patterns

### ESLint Configuration
- **Flat Config**: Use new ESLint flat config format with `defineConfig`
- **Plugin Integration**: Extend recommended configs from plugins
  ```javascript
  extends: [
    js.configs.recommended,
    reactHooks.configs.flat.recommended,
  ]
  ```
- **Global Ignores**: Ignore build directories (`dist`)

### Vite Configuration
- **Path Aliases**: Configure `@/` alias for src directory
- **Code Splitting**: Manual chunks for vendor libraries
  ```javascript
  manualChunks: (id) => {
    if (id.includes('react')) return 'vendor'
    if (id.includes('framer-motion')) return 'motion'
  }
  ```

### PostCSS Configuration
- **Plugin Object**: Use object syntax for PostCSS plugins
  ```javascript
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  }
  ```

## Accessibility Standards

### Semantic HTML
- **Skip Links**: Provide skip-to-content links for keyboard users
  ```javascript
  <a href="#main-content" className="sr-only focus:not-sr-only">
    Skip to main content
  </a>
  ```
- **Main Landmark**: Use `<main>` element with `id="main-content"`

### ARIA and Focus Management
- **Screen Reader Classes**: Use `sr-only` for screen-reader-only content
- **Focus Indicators**: Ensure visible focus states on interactive elements
- **Keyboard Navigation**: Support Tab, Enter, Escape keys

## Error Handling

### Context Validation
- **Provider Checks**: Validate context is used within provider
- **Descriptive Errors**: Throw errors with clear messages

### Safe Browser APIs
- **Window Checks**: Check `typeof window !== 'undefined'` before using browser APIs
- **Fallback Values**: Provide defaults when browser APIs unavailable

## Code Comments

### When to Comment
- **Complex Logic**: Explain non-obvious implementation decisions
- **Safety Checks**: Document why safety checks are necessary
- **Configuration**: Explain configuration options and their purpose

### ESLint Directives
- **Disable Rules**: Use inline comments to disable specific rules when necessary
  ```javascript
  // eslint-disable-next-line react-refresh/only-export-components
  export function useThemeContext() { /* ... */ }
  ```

## Import Organization

### Import Order
1. External dependencies (React, third-party libraries)
2. Internal modules with path aliases (`@/`)
3. Relative imports (if any)

### Grouping
- Group related imports together
- Separate groups with blank lines for readability

## Data Validation

### Form Validation
- **Zod Schema**: Use Zod for runtime type validation
- **Client-Side**: Validate before API calls (EmailJS)

## Performance Considerations

### Bundle Optimization
- **Code Splitting**: Separate vendor code from application code
- **Tree Shaking**: Use named imports to enable tree shaking
- **Lazy Loading**: Consider lazy loading for large components

### Asset Optimization
- **Image Formats**: Use WebP for images (<200KB per image)
- **Video Compression**: Optimize video assets for web delivery
