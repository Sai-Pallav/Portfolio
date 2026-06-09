# Portfolio Website

A modern, responsive portfolio website built with React, Vite, Tailwind CSS, and Framer Motion. Features a multi-theme system, smooth animations, and a fully accessible design.

## ✨ Features

- **5 Custom Themes** - Obsidian Terminal, Warm Slate, Arctic Minimal, Midnight Violet, Steel & Flame
- **Smooth Animations** - Framer Motion powered transitions and scroll animations
- **Custom Cursor** - Interactive cursor with trailing rings (desktop only)
- **Responsive Design** - Mobile-first approach with breakpoints for all devices
- **Accessibility** - WCAG AA/AAA compliant with reduced-motion support
- **SEO Optimized** - Meta tags, sitemap, robots.txt, and Open Graph support
- **Performance** - Optimized bundle size (~420KB total, ~125KB gzipped)
- **EmailJS Integration** - Real email delivery from contact form (no backend needed)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
Portfolio/
├── public/
│   ├── images/projects/     # Project screenshots
│   ├── favicon.svg          # Site favicon
│   ├── robots.txt           # SEO crawler rules
│   ├── sitemap.xml          # Site structure
│   └── site.webmanifest     # PWA manifest
├── src/
│   ├── components/
│   │   ├── layout/          # Navbar
│   │   ├── sections/        # Hero, About, Skills, Projects, Experience, Contact
│   │   └── ui/              # ThemeToggle, CustomCursor
│   ├── context/             # ThemeContext
│   ├── data/                # personal, projects, skills, experience, themes
│   ├── hooks/               # useTheme, useSectionObserver, useScrollAnimation
│   ├── styles/              # themes.css
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── DEPLOYMENT.md            # Deployment guide
├── README-IMAGES.md         # Image assets guide
└── README.md                # This file
```

## 🎨 Customization

### 1. Update Personal Information
Edit `src/data/personal.js`:
```js
export const personal = {
  name: 'Your Name',
  email: 'your.email@example.com',
  // ... update all fields
}
```

### 2. Add Your Projects
Edit `src/data/projects.js`:
```js
export const projects = [
  {
    title: 'Your Project',
    description: 'Project description',
    tags: ['React', 'Node.js'],
    // ... add your projects
  }
]
```

### 3. Update Experience
Edit `src/data/experience.js` with your work history.

### 4. Modify Skills
Edit `src/data/skills.js` with your tech stack.

### 5. Add Images
- Headshot: `/public/headshot.jpg` (400x400px)
- Projects: `/public/images/projects/*.webp` (800x600px, <200KB)
- See `README-IMAGES.md` for detailed guide

### 6. Configure EmailJS (Required for Contact Form)
Follow the step-by-step guide in `EMAILJS-SETUP.md`:
1. Create free EmailJS account
2. Set up email service (Gmail, Outlook, etc.)
3. Create email template
4. Add credentials to `.env` file
5. Test the contact form

**Without EmailJS setup, the contact form will show an error message with your fallback email address.**

## 🎭 Themes

The portfolio includes 5 pre-built themes:
- **Obsidian Terminal** (default) - Dark with green accent
- **Warm Slate** - Dark with orange accent
- **Arctic Minimal** - Light with dark blue accent
- **Midnight Violet** - Dark with purple accent
- **Steel & Flame** - Dark with red accent

Add more themes in `src/data/themes.js` and `src/styles/themes.css`.

## 🔧 Tech Stack

- **Framework:** React 18
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS 4
- **Animations:** Framer Motion
- **Icons:** Devicons (via CDN)
- **Deployment:** Vercel / Netlify / GitHub Pages

## 📦 Bundle Size

```
dist/index.html                   2.62 kB │ gzip:  0.85 kB
dist/assets/index.css            43.09 kB │ gzip:  7.87 kB
dist/assets/index.js             59.28 kB │ gzip: 15.54 kB
dist/assets/motion.js           135.88 kB │ gzip: 44.52 kB
dist/assets/vendor.js           181.78 kB │ gzip: 57.19 kB
─────────────────────────────────────────────────────────
Total:                          422.65 kB │ gzip: 125.97 kB
```

## 🚢 Deployment

See `DEPLOYMENT.md` for detailed deployment instructions.

**Quick Deploy to Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Quick Deploy to Netlify:**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

## ♿ Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support (Tab, Enter, Escape)
- Focus indicators on all interactive elements
- Reduced motion support (`prefers-reduced-motion`)
- Color contrast ratios meet WCAG AA/AAA standards
- Screen reader friendly

## 🐛 Troubleshooting

### Build Fails
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Images Not Loading
- Check file paths (case-sensitive)
- Verify images are in `/public/` directory
- Check image formats (WebP, JPG, PNG)

### Theme Not Persisting
- Check localStorage is enabled
- Verify theme keys match in `themes.js` and `themes.css`

## 📝 License

MIT License - feel free to use this template for your own portfolio!

## 🙏 Credits

- Design inspiration from modern portfolio trends
- Icons from [Devicons](https://devicons.github.io/devicon/)
- Animations powered by [Framer Motion](https://www.framer.com/motion/)

## 📧 Contact

For questions or issues, please open an issue on GitHub or contact via the portfolio contact form.

---

**Built with ❤️ using React + Vite**
