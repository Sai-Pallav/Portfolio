export const EASE_OUT = [0.16, 1, 0.3, 1]

export const staggerContainer = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.13,
      delayChildren: 0.08,
    },
  },
}

export const staggerFast = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.05,
    },
  },
}

export const fadeUp = {
  hidden: { opacity: 0, y: 48 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_OUT },
  },
}

export const fadeUpSoft = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT },
  },
}

export const fadeLeft = {
  hidden: { opacity: 0, x: -56 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.85, ease: EASE_OUT },
  },
}

export const fadeRight = {
  hidden: { opacity: 0, x: 56 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.85, ease: EASE_OUT },
  },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.65, ease: EASE_OUT },
  },
}

export const drawLineX = {
  hidden: { scaleX: 0, opacity: 0 },
  show: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.9, ease: EASE_OUT },
  },
}

export const drawLineY = {
  hidden: { scaleY: 0, opacity: 0 },
  show: {
    scaleY: 1,
    opacity: 1,
    transition: { duration: 0.85, ease: EASE_OUT },
  },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.65, ease: EASE_OUT },
  },
}

export const slideMaskUp = {
  hidden: { opacity: 0, y: 24, clipPath: 'inset(100% 0 0 0 round 16px)' },
  show: {
    opacity: 1,
    y: 0,
    clipPath: 'inset(0% 0 0 0 round 16px)',
    transition: { duration: 0.9, ease: EASE_OUT },
  },
}

/** Profile card: slide in from left + stagger children */
export const profileReveal = {
  hidden: { opacity: 0, x: -56 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.85,
      ease: EASE_OUT,
      staggerChildren: 0.09,
      delayChildren: 0.14,
    },
  },
}

/** Bio column: slide in from right + stagger children */
export const bioReveal = {
  hidden: { opacity: 0, x: 56 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.85,
      ease: EASE_OUT,
      staggerChildren: 0.1,
      delayChildren: 0.12,
    },
  },
}
