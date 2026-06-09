import { useMemo } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ThemeToggle from '@/components/ui/ThemeToggle'
import BackToTop from '@/components/ui/BackToTop'
import CustomCursor from '@/components/ui/CustomCursor'
import SmoothScroll from '@/components/layout/SmoothScroll'
import Hero from '@/components/sections/Hero'
import About from '@/components/sections/about/About'
import Skills from '@/components/sections/Skills'
import Projects from '@/components/sections/Projects'
import Experience from '@/components/sections/Experience'
import Contact from '@/components/sections/Contact'
import { useScrollTrigger } from '@/hooks/useScrollTrigger'

function App() {
  const sectionIds = useMemo(() => ['hero', 'about', 'skills', 'projects', 'experience', 'contact'], [])
  const activeSection = useScrollTrigger(sectionIds)

  return (
    <div className="relative">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 bg-accent text-accent-contrast px-4 py-2 rounded-lg z-[9999] font-mono text-sm"
      >
        Skip to main content
      </a>

      <Navbar activeSection={activeSection} />
      <ThemeToggle />
      <BackToTop />
      <CustomCursor />

      <SmoothScroll>
        <main id="main-content" className="relative">
          <Hero />
          <About />
          <Skills />
          <Projects />
          <Experience />
          <Contact />
          <Footer />
        </main>
      </SmoothScroll>
    </div>
  )
}

export default App
