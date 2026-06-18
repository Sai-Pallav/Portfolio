import { motion } from "framer-motion";
import { skills } from "@/data/skills";

const getDeviconUrl = (icon) => {
  if (icon === "framer") {
    return "https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/framermotion/framermotion-original.svg";
  }
  return `https://cdn.jsdelivr.net/gh/devicons/devicon@v2.17.0/icons/${icon}/${icon}-original.svg`;
};

const categoryLabels = {
  languages: "Languages",
  frontend: "Frontend Dev",
  backend: "Backend Dev",
  databases: "Databases",
  tools: "DevOps & Tools",
  cs_core: "CS Concepts",
};

// Animation variants for grid container stagger
const gridVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const categoryCardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const categories = Object.keys(skills);

const handleMouseMove = (e) => {
  let rect = e.currentTarget._cachedRect;
  if (!rect) {
    rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget._cachedRect = rect;
  }
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
  e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
};

const handleMouseLeave = (e) => {
  e.currentTarget._cachedRect = null;
};

export default function SkillsGrid() {
  return (
    <motion.div
      variants={gridVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl mx-auto px-4"
    >
      {categories.map((categoryKey) => {
        const categoryItems = skills[categoryKey];
        if (!categoryItems || categoryItems.length === 0) return null;

        return (
          <motion.div
            key={categoryKey}
            variants={categoryCardVariants}
            className="flex flex-col gap-5 bg-[rgba(15,15,18,0.5)] border border-white/5 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden group hover:border-white/10 hover:bg-[rgba(20,20,24,0.6)] transition-all duration-500 shadow-[0_16px_32px_rgba(0,0,0,0.4)]"
          >
            {/* Decorative background accent glow */}
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-[var(--accent)] opacity-[0.03] blur-2xl rounded-full group-hover:opacity-10 group-hover:scale-125 transition-all duration-500 pointer-events-none" />

            <h3 className="text-md font-bold text-[var(--text-heading)] border-b border-white/5 pb-3 flex items-center justify-between tracking-wide uppercase font-heading">
              <span>{categoryLabels[categoryKey] || categoryKey}</span>
              <span className="text-xs px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full font-mono font-medium text-[var(--text-secondary)]">
                {categoryItems.length}
              </span>
            </h3>

            <div className="flex flex-col gap-3">
              {categoryItems.map((item, idx) => {
                const isPrimary = item.level === "primary";
                const isDark = ["express", "nextjs"].includes(item.icon);
                const percent = Math.min((item.years / 5) * 100, 100);

                return (
                  <div
                    key={idx}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className={`flex flex-col gap-2 p-3.5 rounded-2xl bg-[rgba(20,20,22,0.45)] border border-white/[0.04] transition-all duration-300 relative group/item overflow-hidden ${
                      !isPrimary ? "opacity-70 hover:opacity-100" : "opacity-100"
                    }`}
                  >
                    {/* Spotlight glow overlay */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 pointer-events-none z-0"
                      style={{
                        background: `radial-gradient(130px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(37, 99, 235, 0.07), transparent 85%)`
                      }}
                    />

                    {/* Vercel-style illuminated border overlay */}
                    <div 
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 pointer-events-none border border-[var(--accent)] z-0"
                      style={{
                        maskImage: `radial-gradient(90px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), black, transparent)`,
                        WebkitMaskImage: `radial-gradient(90px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), black, transparent)`
                      }}
                    />

                    {/* Top Row: Icon, Name, Years */}
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="size-9 relative flex items-center justify-center bg-white/5 rounded-xl border border-white/10 p-1.5 overflow-hidden transition-colors duration-300 group-hover/item:bg-white/10 group-hover/item:border-white/20">
                        <img
                          src={getDeviconUrl(item.icon)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="size-full object-contain transition-transform duration-300 group-hover/item:scale-110"
                          style={{ filter: isDark ? "invert(1)" : "none" }}
                        />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                            {item.name}
                          </span>
                          <span
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                              isPrimary
                                ? "bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] group-hover/item:scale-125"
                                : "bg-white/20"
                            }`}
                            title={isPrimary ? "Primary Skill" : "Secondary Skill"}
                          />
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] truncate font-mono">
                          {item.tag ? `#${item.tag.split(",")[0]}` : ""}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-[var(--text-secondary)] bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                        {item.years} {item.years === 1 ? "yr" : "yrs"}
                      </div>
                    </div>

                    {/* Progress Bar with hover scale */}
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1 relative z-10">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] rounded-full transition-all duration-500 origin-left"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Bottom: Example Project */}
                    {item.project && (
                      <div className="text-[10px] text-[var(--text-secondary)] leading-tight italic truncate pl-2 border-l border-white/10 mt-1 relative z-10">
                        Focus: {item.project}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
