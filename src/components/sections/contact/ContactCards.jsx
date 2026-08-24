import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Mail, MapPin } from 'lucide-react'
import { personal } from '@/data/personal'
import ContactCard from './ContactCard'

const GRID_VARIANTS = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.2
    }
  }
}

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
}

export default React.memo(function ContactCards() {
  const iconStatus = useMemo(() => (
    <div className="relative flex h-3 w-3 items-center justify-center">
      <span className="h-3 w-3 rounded-full bg-[#d8b4fe] shadow-[0_0_12px_rgba(216,180,254,0.9)]" />
    </div>
  ), [])

  const iconEmail = useMemo(() => <Mail className="h-5 w-5 text-[#d8b4fe]" strokeWidth={1.8} />, [])

  const iconLinkedIn = useMemo(() => (
    <svg className="h-5 w-5 fill-[#d8b4fe]" viewBox="0 0 24 24">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  ), [])

  const iconLocation = useMemo(() => <MapPin className="h-5 w-5 text-[#d8b4fe]" strokeWidth={1.8} />, [])

  return (
    <motion.div
      variants={GRID_VARIANTS}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.05 }}
      className="w-full relative z-20"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 pt-6">
        {/* Availability Status Card */}
        <motion.div variants={CARD_VARIANTS} className="h-full">
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
        <motion.div variants={CARD_VARIANTS} className="h-full">
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
        <motion.div variants={CARD_VARIANTS} className="h-full">
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
        <motion.div variants={CARD_VARIANTS} className="h-full">
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

