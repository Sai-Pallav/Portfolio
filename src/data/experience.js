export const experience = [
  {
    id:          1,
    role:        'Full-Stack Developer Intern',
    company:     'Fission AI',
    badge:       'Current',
    duration:    'May 2025 - July 2025',
    icon:        '🚀',
    bullets: [
      'Engineered multi-tenant onboarding portals using React and Tailwind CSS, increasing new user signups by 18%.',
      'Developed a Redis caching architecture for core API configurations, reducing query processing latencies by 35%.',
      'Collaborated with a team of 5 backend engineers to audit and restructure obsolete database indices under PostgreSQL.',
    ],
    tech:        ['React', 'PostgreSQL', 'Redis', 'Tailwind CSS'],
    projects: [
      { name: 'Multi-tenant Portal', impact: '+18% signups' },
      { name: 'Redis Caching', impact: '-35% latency' }
    ]
  },
  {
    id:          2,
    role:        'Open Source Developer',
    company:     'Mozilla (Campus Contributions)',
    badge:       'Active',
    duration:    'Jan 2025 - Present',
    icon:        '🌐',
    bullets: [
      'Refactored DOM rendering bottlenecks inside local browser developer extensions, preventing memory leaks on tab close.',
      'Identified and resolved 4 critical type safety warnings inside high-frequency asynchronous event streams.',
      'Authored comprehensive configuration specs, helping reduce onboarding times for new campus contributors by 50%.',
    ],
    tech:        ['TypeScript', 'JavaScript', 'Git', 'Webpack'],
    projects: [
      { name: 'DOM Optimization', impact: 'Fixed memory leaks' },
      { name: 'Type Safety Audit', impact: '4 critical fixes' }
    ]
  },
  {
    id:          3,
    role:        'Technical Head',
    company:     'BITS Computer Science Society',
    badge:       'Leadership',
    duration:    'Aug 2024 - Present',
    icon:        '👥',
    bullets: [
      'Spearheaded the technical build for BITS Annual Hackathon, scaling event portal architectures to support 800+ concurrent requests.',
      'Organized weekly mentorship circles covering Advanced Data Structures, System Design, and Competitive Programming.',
      'Led a team of 4 junior developers to build an in-house lab attendance monitor app using Node.js and MongoDB.',
    ],
    tech:        ['C++', 'Node.js', 'MongoDB', 'System Design'],
    projects: [
      { name: 'Hackathon Portal', impact: '800+ requests' },
      { name: 'Attendance App', impact: 'Team of 4 devs' }
    ]
  }
]
export default experience;
