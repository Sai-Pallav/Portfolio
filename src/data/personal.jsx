import SocialIcon from '@/components/ui/SocialIcon'

export const personal = {
  name:         'Sai Pallav',
  firstName:    'Sai',
  role:         'Full-Stack Developer & CSE Student',
  tagline:      'I build high-performance distributed systems and responsive web applications.',
  bio:          `I'm a third-year Computer Science & Engineering student at BITS Pilani, Hyderabad Campus, specializing in full-stack web development, language-agnostic applications, and distributed architectures. I've designed and shipped production applications used by 300+ campus users and actively contribute to open-source systems. Currently seeking full-stack or backend engineering summer internships.`,
  university:   'BITS Pilani, Hyderabad Campus',
  year:         '3rd Year',
  cgpa:         '9.1',             // Show high CGPA
  location:     'Hyderabad, India',
  availability: 'Open to Internships · June 2026',
  availableNow: true,              // Controls the green pulse badge
  email:        'sai.pallav@bits-pilani.ac.in',
  resume:       '/resume.pdf',     // Will resolve to public/resume.pdf
  socials: {
    github:    'https://github.com/Sai-Pallav',
    linkedin:  'https://linkedin.com/in/sai-pallav',
    twitter:   'https://twitter.com/sai_pallav',
    leetcode:  'https://leetcode.com/sai_pallav',
    devto:     'https://dev.to/sai_pallav',
  },
  typewriterRoles: [
    'Full-Stack Developer',
    'CSE Student',
    'Open Source Contributor',
    'Problem Solver',
  ],
}

export const contactMethods = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    label: 'Email',
    value: personal.email,
    href: `mailto:${personal.email}`,
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: 'Location',
    value: personal.location,
    href: null,
  },
  {
    icon: <SocialIcon platform="linkedin" className="w-6 h-6" />,
    label: 'LinkedIn',
    value: 'Connect on LinkedIn',
    href: personal.socials.linkedin,
  },
]
