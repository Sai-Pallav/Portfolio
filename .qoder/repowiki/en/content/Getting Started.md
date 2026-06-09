# Getting Started

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [QUICK-START.md](file://QUICK-START.md)
- [package.json](file://package.json)
- [vite.config.js](file://vite.config.js)
- [tailwind.config.js](file://tailwind.config.js)
- [eslint.config.js](file://eslint.config.js)
- [index.html](file://index.html)
- [src/main.jsx](file://src/main.jsx)
- [src/App.jsx](file://src/App.jsx)
- [src/context/ThemeContext.jsx](file://src/context/ThemeContext.jsx)
- [src/hooks/useTheme.js](file://src/hooks/useTheme.js)
- [src/data/personal.js](file://src/data/personal.js)
- [src/data/themes.js](file://src/data/themes.js)
- [HOW-TO-ADD-IMAGES.md](file://HOW-TO-ADD-IMAGES.md)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Development Environment Setup](#development-environment-setup)
5. [Initial Project Configuration](#initial-project-configuration)
6. [Build Process](#build-process)
7. [Development Server](#development-server)
8. [Production Deployment](#production-deployment)
9. [Verification Checklist](#verification-checklist)
10. [Command-Line vs GUI Workflows](#command-line-vs-gui-workflows)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Performance Considerations](#performance-considerations)
13. [Conclusion](#conclusion)

## Introduction
This guide helps you set up and run the portfolio website locally, customize it for your needs, and deploy it to production. The project is a modern React application built with Vite, styled with Tailwind CSS, and enhanced with animations and accessibility features. It includes a theme system, responsive design, and optional EmailJS integration for the contact form.

## Prerequisites
Before installing the project, ensure your system meets the following requirements:
- Node.js: Version 18 or higher (recommended: LTS)
- npm: Latest stable version
- Git: Optional, for cloning the repository
- Text editor or IDE: VS Code recommended

These requirements align with the project's build tooling and runtime dependencies.

**Section sources**
- [package.json:12-24](file://package.json#L12-L24)
- [package.json:25-39](file://package.json#L25-L39)

## Installation
Follow these steps to install the project locally:

1. Clone or download the repository to your machine.
2. Open a terminal in the project root directory.
3. Install dependencies using npm:
   - Command: `npm install`

This installs both runtime and development dependencies defined in the project configuration.

**Section sources**
- [README.md:18-30](file://README.md#L18-L30)
- [QUICK-START.md:5-16](file://QUICK-START.md#L5-L16)
- [package.json:6-11](file://package.json#L6-L11)

## Development Environment Setup
After installation, configure your local development environment:

- Start the development server:
  - Command: `npm run dev`
  - The server starts on port 5173 by default.

- Preview the production build locally:
  - Build the project: `npm run build`
  - Preview the build: `npm run preview`
  - The preview server runs on port 4173 by default.

- Run ESLint for code quality:
  - Command: `npm run lint`

These commands are defined in the project scripts and correspond to the configured build tool and linter.

**Section sources**
- [README.md:18-30](file://README.md#L18-L30)
- [QUICK-START.md:5-16](file://QUICK-START.md#L5-L16)
- [package.json:6-11](file://package.json#L6-L11)
- [eslint.config.js:1-22](file://eslint.config.js#L1-L22)

## Initial Project Configuration
Configure the portfolio with your personal information and assets:

1. Update personal details:
   - Edit `src/data/personal.js` to reflect your name, role, bio, and social links.

2. Add projects:
   - Edit `src/data/projects.js` to include your projects with titles, descriptions, and tags.

3. Update experience and skills:
   - Edit `src/data/experience.js` and `src/data/skills.js` with your work history and technical skills.

4. Add images:
   - Headshot: Place a 400x400px image at `/public/headshot.jpg`.
   - Projects: Place WebP images at `/public/images/projects/*.webp`.
   - Optional: Replace SVG placeholders in the About section with your PNG images as described in the images guide.

5. Configure EmailJS (required for the contact form):
   - Create a `.env` file with your EmailJS credentials:
     - `VITE_EMAILJS_SERVICE_ID`
     - `VITE_EMAILJS_TEMPLATE_ID`
     - `VITE_EMAILJS_PUBLIC_KEY`
   - Follow the step-by-step setup guide referenced in the main README.

6. Customize themes:
   - Choose a theme in `src/data/themes.js` or add new ones.
   - The theme system applies a `data-theme` attribute to the `<html>` element via the theme hook.

7. Configure typography and fonts:
   - Update font links in `index.html` if you want to change fonts.
   - Adjust font variables in `src/styles/themes.css` to match your chosen fonts.

8. Set up aliases and build optimization:
   - The project uses a Vite alias `@` pointing to the `src` directory.
   - Code splitting is configured to separate vendor and motion bundles.

**Section sources**
- [README.md:61-103](file://README.md#L61-L103)
- [src/data/personal.js:1-29](file://src/data/personal.js#L1-L29)
- [src/data/themes.js:1-30](file://src/data/themes.js#L1-L30)
- [src/context/ThemeContext.jsx:1-23](file://src/context/ThemeContext.jsx#L1-L23)
- [src/hooks/useTheme.js:1-33](file://src/hooks/useTheme.js#L1-L33)
- [index.html:1-78](file://index.html#L1-L78)
- [vite.config.js:10-34](file://vite.config.js#L10-L34)
- [HOW-TO-ADD-IMAGES.md:1-82](file://HOW-TO-ADD-IMAGES.md#L1-L82)

## Build Process
The project uses Vite for building the application:

- Build for production:
  - Command: `npm run build`
  - Output: A static site generated in the `dist` directory.

- Preview the production build locally:
  - Command: `npm run preview`
  - Opens a local server to preview the built assets.

- Code splitting:
  - Vendor libraries (React and ReactDOM) are grouped into a dedicated chunk.
  - Animation library chunks are separated for better caching and load performance.

- CSS and JavaScript optimization:
  - Tailwind CSS processes only the files specified in the content configuration.
  - PostCSS and autoprefixer are included in the devDependencies.

**Section sources**
- [README.md:18-30](file://README.md#L18-L30)
- [QUICK-START.md:11-16](file://QUICK-START.md#L11-L16)
- [vite.config.js:17-32](file://vite.config.js#L17-L32)
- [tailwind.config.js:1-54](file://tailwind.config.js#L1-L54)
- [package.json:25-39](file://package.json#L25-L39)

## Development Server
Start the development server to work on the project:

- Launch the dev server:
  - Command: `npm run dev`
  - Default URL: http://localhost:5173

- Hot module replacement:
  - Changes to components and styles are reflected immediately in the browser.

- Entry point and provider setup:
  - The application mounts in `src/main.jsx` and wraps the app with a theme provider.
  - The main component (`src/App.jsx`) orchestrates layout sections and accessibility features.

- Aliasing:
  - The `@` alias resolves to the `src` directory, enabling clean imports across the project.

**Section sources**
- [README.md:18-30](file://README.md#L18-L30)
- [QUICK-START.md:5-9](file://QUICK-START.md#L5-L9)
- [src/main.jsx:1-16](file://src/main.jsx#L1-L16)
- [src/App.jsx:1-47](file://src/App.jsx#L1-L47)
- [vite.config.js:12-16](file://vite.config.js#L12-L16)

## Production Deployment
Deploy the built application to your preferred platform:

- Build the project:
  - Command: `npm run build`
  - Upload the contents of the `dist` directory to your hosting provider.

- Recommended platforms:
  - Vercel: Install the Vercel CLI globally and run the deploy command.
  - Netlify: Build locally and drag-and-drop the `dist` folder.
  - GitHub Pages: Push the `dist` folder to a `gh-pages` branch.

- Static hosting:
  - The project generates a fully static site suitable for any static host.

**Section sources**
- [README.md:137-157](file://README.md#L137-L157)
- [QUICK-START.md:213-232](file://QUICK-START.md#L213-L232)

## Verification Checklist
Ensure the installation and configuration are correct:

- Local development:
  - Confirm the dev server starts and opens http://localhost:5173.
  - Verify that the page renders without console errors.

- Build verification:
  - Run `npm run build` and confirm the `dist` directory is created.
  - Run `npm run preview` and verify the production-like build loads correctly.

- Personalization:
  - Check that your name, bio, and social links appear in the About section.
  - Confirm project cards and experience entries reflect your data.

- Assets:
  - Verify headshot and project images are visible.
  - If replacing SVG placeholders, ensure image paths match the updated filenames.

- Theme persistence:
  - Switch themes using the theme toggle and confirm persistence after refresh.

- Accessibility:
  - Use keyboard navigation to verify focus indicators and skip links.
  - Check reduced-motion support by adjusting system preferences.

- Linting:
  - Run `npm run lint` and fix any reported issues.

**Section sources**
- [README.md:169-186](file://README.md#L169-L186)
- [QUICK-START.md:235-264](file://QUICK-START.md#L235-L264)
- [src/hooks/useTheme.js:17-21](file://src/hooks/useTheme.js#L17-L21)
- [HOW-TO-ADD-IMAGES.md:38-49](file://HOW-TO-ADD-IMAGES.md#L38-L49)

## Command-Line vs GUI Workflows
Choose the workflow that fits your development style:

- Command-line workflow:
  - Install dependencies: `npm install`
  - Start dev server: `npm run dev`
  - Build for production: `npm run build`
  - Preview build: `npm run preview`
  - Run linter: `npm run lint`

- GUI-based workflow:
  - Use your IDE’s integrated terminal to run the same commands.
  - Many editors provide built-in preview servers or extensions for Vite and React.
  - Use the IDE’s file explorer to edit configuration files and source code.

Both approaches are supported by the project’s scripts and configuration.

**Section sources**
- [package.json:6-11](file://package.json#L6-L11)
- [README.md:18-30](file://README.md#L18-L30)
- [QUICK-START.md:5-16](file://QUICK-START.md#L5-L16)

## Troubleshooting Guide
Common issues and their solutions:

- Build fails:
  - Clear caches and reinstall dependencies, then rebuild:
    - Remove `node_modules` and `package-lock.json`, then run `npm install` and `npm run build`.

- Images not loading:
  - Verify file paths are correct and case-sensitive.
  - Ensure images are placed in the `/public` directory.
  - Confirm image formats are supported (WebP, JPG, PNG).

- Theme not persisting:
  - Ensure browser supports localStorage.
  - Verify theme keys in `src/data/themes.js` match the applied theme.

- Fonts not loading:
  - Confirm the Google Fonts link in `index.html` is correct.
  - Check network connectivity and ad blockers that might block external resources.

- EmailJS contact form errors:
  - Ensure `.env` contains the correct service ID, template ID, and public key.
  - Test the form after restarting the development server.

- Lint errors:
  - Run `npm run lint` and fix any reported issues according to ESLint rules.

**Section sources**
- [README.md:169-186](file://README.md#L169-L186)
- [QUICK-START.md:235-264](file://QUICK-START.md#L235-L264)
- [eslint.config.js:1-22](file://eslint.config.js#L1-L22)

## Performance Considerations
- Bundle size and optimization:
  - The project is optimized for performance with code splitting and minimal dependencies.
  - Review the bundle composition to understand vendor and motion chunk sizes.

- CSS processing:
  - Tailwind processes only the files specified in the content configuration, reducing unnecessary CSS.

- Animations:
  - Framer Motion and GSAP are used for smooth animations; adjust durations and easing as needed for your preferences.

- Accessibility:
  - The project follows WCAG guidelines with reduced-motion support and semantic markup.

[No sources needed since this section provides general guidance]

## Conclusion
You now have everything needed to install, customize, build, and deploy the portfolio website. Start with the development server, personalize your content, and deploy to your preferred platform. Use the troubleshooting guide for common issues and the verification checklist to ensure everything is working as expected.

[No sources needed since this section summarizes without analyzing specific files]