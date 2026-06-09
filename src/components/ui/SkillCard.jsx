import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef, useCallback, memo } from 'react'

const SkillCard = memo(function SkillCard({ skill, index, accentColor }) {
  const ref = useRef(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 180, damping: 18 })
  const sy = useSpring(my, { stiffness: 180, damping: 18 })
  const rotateX = useTransform(sy, [-0.5, 0.5], [12, -12])
  const rotateY = useTransform(sx, [-0.5, 0.5], [-12, 12])
  const glowX = useTransform(sx, [-0.5, 0.5], ['0%', '100%'])
  const glowY = useTransform(sy, [-0.5, 0.5], ['0%', '100%'])

  const onMove = useCallback((e) => {
    const r = ref.current.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }, [mx, my])
  const onLeave = useCallback(() => { mx.set(0); my.set(0) }, [mx, my])

  const isPrimary = skill.level === 'primary'

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 600 }}
      initial={{ opacity: 0, y: 32, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group relative cursor-default"
    >
      {/* Card body */}
      <div
        className="relative rounded-2xl p-3 border overflow-hidden transition-all duration-300"
        style={{
          background: isPrimary
            ? `linear-gradient(135deg, ${accentColor}12 0%, var(--bg-raised) 60%)`
            : 'var(--bg-raised)',
          borderColor: isPrimary ? `${accentColor}40` : 'var(--border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Dynamic cursor glow */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glowX} ${glowY}, ${accentColor}20 0%, transparent 65%)`,
          }}
        />

        {/* Primary indicator line */}
        {isPrimary && (
          <motion.div
            className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full"
            style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: index * 0.06 + 0.3 }}
          />
        )}

        {/* Icon */}
        <div className="relative mb-2 w-9 h-9">
          <motion.div
            className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: `${accentColor}18`, boxShadow: `0 0 20px ${accentColor}30` }}
          />
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}25` }}>
            <motion.img
              src={`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${skill.icon}/${skill.icon}-original.svg`}
              alt={skill.name}
              className="w-5 h-5 object-contain"
              style={{ transform: 'translateZ(8px)' }}
              whileHover={{ scale: 1.15 }}
              transition={{ type: 'spring', stiffness: 300 }}
              onError={(e) => {
                e.target.src = `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${skill.icon}/${skill.icon}-plain.svg`
              }}
            />
          </div>
        </div>

        {/* Name */}
        <p className="font-semibold text-sm text-[var(--text-heading)] group-hover:text-[var(--accent)] transition-colors duration-200 leading-tight">
          {skill.name}
        </p>

        {/* Level pill */}
        <div className="mt-2 flex items-center gap-1.5">
          {[1, 2, 3].map((dot) => (
            <motion.div
              key={dot}
              className="h-1 rounded-full"
              style={{
                width: dot <= (isPrimary ? 3 : 2) ? '100%' : '40%',
                background: dot <= (isPrimary ? 3 : 2) ? accentColor : 'var(--border)',
                flex: 1,
              }}
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, delay: index * 0.06 + 0.2 + dot * 0.05 }}
            />
          ))}
        </div>

        {/* Shine sweep */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent rounded-2xl"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.55 }}
        />
      </div>
    </motion.div>
  )
})

export default SkillCard
