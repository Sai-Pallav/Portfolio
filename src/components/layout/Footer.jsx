import { personal } from '@/data/personal'

function Footer() {
  const currentYear = new Date().getFullYear()

  const handleScrollToTop = (e) => {
    e.preventDefault()
    if (window.lenis) {
      window.lenis.scrollTo(0, { duration: 1.2 })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="bg-bg border-t border-border py-8 px-6 text-sm text-secondary">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left */}
        <div>
          © {currentYear} {personal.name}. Built with React + Tailwind.
        </div>

        {/* Center */}
        <div>
          <a
            href="#"
            onClick={handleScrollToTop}
            className="hover:text-accent font-mono text-xs transition-colors duration-300"
          >
            ↑ back_to_top.sh
          </a>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <a
            href={personal.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors duration-300"
          >
            GitHub
          </a>
          <a
            href={personal.socials.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors duration-300"
          >
            LinkedIn
          </a>
          {personal.socials.twitter && (
            <a
              href={personal.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors duration-300"
            >
              Twitter
            </a>
          )}
        </div>
      </div>
    </footer>
  )
}

export default Footer
