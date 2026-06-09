# Project Structure

## Directory Organization

```
Portfolio/
├── public/                      # Static assets served directly
│   ├── cosmic video/           # Background video assets
│   ├── images/                 # Image assets
│   │   └── projects/          # Project screenshots
│   ├── favicon.svg            # Site favicon
│   ├── headshot.jpg           # Profile photo
│   ├── og-image.jpg           # Open Graph preview image
│   ├── resume.pdf             # Downloadable resume
│   ├── robots.txt             # SEO crawler rules
│   ├── sitemap.xml            # Site structure for search engines
│   └── site.webmanifest       # PWA manifest
│
├── src/                        # Application source code
│   ├── components/            # React components
│   │   ├── layout/           # Navbar component
│   │   ├── sections/         # Page sections (Hero, About, Skills, etc.)
│   │   └── ui/               # Reusable UI components (ThemeToggle, CustomCursor)
│   ├── context/              # React Context providers
│   │   └── ThemeContext.jsx  # Theme state management
│   ├── data/                 # Static data and configuration
│   │   ├── experience.js     # Work history data
│   │   ├── personal.js       # Personal information
│   │   ├── projects.js       # Portfolio projects
│   │   ├── skills.js         # Technology skills
│   │   └── themes.js         # Theme definitions
│   ├── hooks/                # Custom React hooks
│   │   ├── useSectionObserver.js  # Intersection observer for scroll
│   │   └── useTheme.js       # Theme management hook
│   ├── styles/               # Global styles
│   │   ├── animations.css    # Animation definitions
│   │   └── themes.css        # Theme CSS variables
│   ├── utils/                # Utility functions
│   │   └── variants.js       # Framer Motion animation variants
│   ├── App.jsx               # Main application component
│   ├── index.css             # Global CSS and Tailwind imports
│   └── main.jsx              # Application entry point
│
├── .amazonq/rules/memory-bank/  # Project documentation
├── .env                      # Environment variables (EmailJS config)
├── .env.example              # Environment template
├── eslint.config.js          # ESLint configuration
├── index.html                # HTML entry point
├── package.json              # Dependencies and scripts
├── postcss.config.js         # PostCSS configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── vite.config.js            # Vite build configuration
```

## Core Components

### Layout Components
- **Navbar**: Fixed navigation with theme toggle, responsive mobile menu

### Section Components
- **Hero**: Landing section with animated introduction
- **About**: Personal background and summary
- **Skills**: Technology stack with categorized skill cards
- **Projects**: Portfolio grid with project cards
- **Experience**: Timeline of work history
- **Contact**: EmailJS-powered contact form

### UI Components
- **ThemeToggle**: Dropdown menu for theme selection
- **CustomCursor**: Desktop-only custom cursor with trailing effects

## Architectural Patterns

### State Management
- **Context API**: ThemeContext for global theme state
- **LocalStorage**: Theme persistence across sessions
- **Custom Hooks**: Encapsulated logic for theme management and scroll observation

### Data Architecture
- **Separation of Concerns**: Data files separate from components
- **Single Source of Truth**: Centralized data files for easy updates
- **Type Safety**: Zod validation for contact form inputs

### Styling Strategy
- **CSS Variables**: Theme colors defined as CSS custom properties
- **Tailwind Utility-First**: Component styling with Tailwind classes
- **Custom Animations**: Keyframe animations in Tailwind config
- **Framer Motion**: JavaScript-driven animations for complex interactions

### Performance Optimization
- **Code Splitting**: Manual chunks for vendor, React, and Framer Motion
- **Path Aliases**: `@/` alias for cleaner imports
- **Lazy Loading**: Optimized bundle loading strategy

## Component Relationships

```
App.jsx
├── ThemeProvider (Context)
│   ├── Navbar
│   │   └── ThemeToggle
│   ├── CustomCursor (desktop only)
│   └── Sections
│       ├── Hero
│       ├── About
│       ├── Skills
│       ├── Projects
│       ├── Experience
│       └── Contact
```

## Data Flow
1. **Theme Selection**: User selects theme → ThemeContext updates → CSS variables change → Components re-render
2. **Contact Form**: User submits → Zod validation → EmailJS API → Email sent
3. **Scroll Animations**: User scrolls → IntersectionObserver triggers → Framer Motion animates
