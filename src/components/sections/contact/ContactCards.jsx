import React, { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Mail, MapPin } from 'lucide-react'
import { personal } from '@/data/personal'
import ContactCard from './ContactCard'

const GRID_VARIANTS = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.55
    }
  }
}

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
}

export default React.memo(function ContactCards() {
  const iconStatus = useMemo(() => (
    <div className="relative flex h-3 w-3 overflow-hidden">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--accent)' }}></span>
      <span className="relative inline-flex rounded-full h-3 w-3 z-10" style={{ backgroundColor: 'var(--accent)' }}></span>
    </div>
  ), [])

  const iconEmail = useMemo(() => <Mail className="h-6 w-6" strokeWidth={1.75} />, [])

  const iconLinkedIn = useMemo(() => (
    <svg className="h-6 w-6 fill-current text-[#0A66C2]" viewBox="0 0 24 24">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  ), [])

  const iconLocation = useCallback((effectiveHovered) => (
    <motion.div
      animate={effectiveHovered ? { y: [0, -3, 0] } : { y: 0 }}
      transition={{ repeat: effectiveHovered ? Infinity : 0, duration: 0.8, ease: "easeInOut" }}
      className="flex items-center justify-center"
    >
      <MapPin className="h-6 w-6" strokeWidth={1.75} />
    </motion.div>
  ), [])

  return (
    <motion.div
      variants={GRID_VARIANTS}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      className="w-full relative z-20"
    >
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--accent)]/55 to-transparent w-full" aria-hidden="true" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-10">
        {/* Availability Status Card */}
        <motion.div variants={CARD_VARIANTS}>
          <ContactCard
            index={0}
            label="STATUS"
            title="Open for Internships"
            description="Actively seeking internship opportunities, engineering collaborations, and challenging backend projects."
            footer="Usually responds within 24 hours."
            platformKey={['github', 'leetcode']}
            icon={iconStatus}
          />
        </motion.div>

        {/* Email Address Card */}
        <motion.div variants={CARD_VARIANTS}>
          <ContactCard
            index={1}
            label="EMAIL"
            title="Preferred Contact"
            description="The fastest way to reach me for technical discussions, opportunities, and collaborations."
            footer="Copy Email →"
            copyText={personal.email}
            platformKey={['email', 'instagram']}
            icon={iconEmail}
            actionType="copy"
          />
        </motion.div>

        {/* LinkedIn Contact Card */}
        <motion.div variants={CARD_VARIANTS}>
          <ContactCard
            index={2}
            label="LINKEDIN"
            title="Professional Network"
            description="Explore my experience, projects, achievements, and professional journey."
            footer="Visit Profile →"
            href={personal.socials.linkedin}
            platformKey="linkedin"
            icon={iconLinkedIn}
            actionType="navigate"
          />
        </motion.div>

        {/* Location Card */}
        <motion.div variants={CARD_VARIANTS}>
          <ContactCard
            index={3}
            label="LOCATION"
            title="Based in Hyderabad"
            description="Open to relocation, hybrid roles, and remote opportunities worldwide."
            footer="View Location →"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(personal.location)}`}
            platformKey=""
            icon={iconLocation}
            actionType="navigate"
          />
        </motion.div>
      </div>
    </motion.div>
  )
})
