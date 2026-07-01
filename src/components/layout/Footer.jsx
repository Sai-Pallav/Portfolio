

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full py-8 px-6 md:px-12 bg-[#0e0e10] border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 relative z-20">
      <div className="font-sans text-lg font-bold tracking-tighter text-white uppercase">
        SAIPALLAV.CORE
      </div>
      
      <ul className="flex flex-wrap justify-center gap-6 font-mono text-[10px] tracking-wider uppercase text-slate-500">
        <li>
          <a href="#" className="hover:text-white transition-colors duration-300">Privacy</a>
        </li>
        <li>
          <a href="#" className="hover:text-white transition-colors duration-300">Terms</a>
        </li>
        <li>
          <a href="#" className="hover:text-white transition-colors duration-300">Changelog</a>
        </li>
        <li>
          <a href="#" className="hover:text-white transition-colors duration-300">Documentation</a>
        </li>
      </ul>

      <div className="font-mono text-[10px] tracking-wider text-slate-500 uppercase opacity-60">
        © {currentYear} SAIPALLAV.CORE. BUILT WITH PRECISION.
      </div>
    </footer>
  )
}

export default Footer
