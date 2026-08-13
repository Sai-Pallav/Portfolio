import { useState, useCallback, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import emailjs from '@emailjs/browser'
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  User,
  Mail,
  PenTool,
  MessageSquare,
  HelpCircle
} from 'lucide-react'
import { personal } from '@/data/personal'

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const isConfigured = !!(serviceId && templateId && publicKey &&
  !serviceId.includes('your_') &&
  !templateId.includes('your_') &&
  !publicKey.includes('your_')
)

const FloatingInput = memo(function FloatingInput({ id, label, type, value, onChange, onBlur, error, touched, icon: Icon, onFocus }) {
  const [focused, setFocused] = useState(false)
  const hasValue = value && value.length > 0

  return (
    <div className="relative w-full group">
      <div className={`absolute left-4 top-[24px] -translate-y-1/2 pointer-events-none transition-all duration-300 z-10 ${focused ? 'text-[var(--accent)] scale-110' : hasValue ? 'text-[var(--text-secondary)]' : 'text-white/55'
        }`}>
        {Icon && <Icon className="h-4 w-4" strokeWidth={1.75} />}
      </div>
      <input
        type={type}
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        onFocus={(e) => {
          setFocused(true)
          if (onFocus) onFocus(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          if (onBlur) onBlur(e)
        }}
        placeholder=" "
        aria-required="true"
        className={`peer w-full rounded-[8px] border border-white/[0.12] bg-black/45 pl-10 pr-4 pt-[24px] pb-[10px] text-xs md:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop-blur-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.02)] hover:border-[var(--accent)]/30 focus:border-[var(--accent)]/70 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.65),0_0_12px_var(--accent-dim)] focus:bg-black/60 ${touched && error
          ? 'border-amber-500/40 focus:border-amber-500/70 shadow-[0_0_0_1px_rgba(245,158,11,0.3)] focus:shadow-[inset_0_2px_4px_rgba(245,158,11,0.12),0_0_10px_rgba(245,158,11,0.3)] focus:bg-amber-500/[0.02]'
          : ''
          }`}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        className={`absolute left-10 top-3 origin-[0] duration-300 transform pointer-events-none transition-all ease-[cubic-bezier(0.16,1,0.3,1)] font-medium ${touched && error ? 'peer-focus:text-amber-500/90' : 'peer-focus:text-[var(--accent)]'
          } ${focused || hasValue
            ? '-translate-y-[14px] scale-75 text-[9px] uppercase tracking-[0.15em] text-[var(--text-secondary)] bg-raised px-2 -mx-2 rounded'
            : 'translate-y-0 scale-100 text-xs md:text-sm capitalize tracking-wide text-white/65'
          }`}
      >
        {label}
      </label>

      <div className="h-4 relative mt-1 overflow-visible">
        <AnimatePresence initial={false}>
          {touched && error && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              id={`${id}-error`}
              className="absolute left-1 block text-[10px] text-amber-400 tracking-normal font-medium px-1"
              role="alert"
            >
              ⚠ {error}
            </motion.span>
          )}
          {touched && !error && hasValue && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-1 block text-[10px] tracking-normal font-medium px-1"
              style={{ color: 'var(--accent)' }}
            >
              ✓ Valid {label.replace(' *', '').replace('Your ', '').toLowerCase()}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})

const FloatingTextarea = memo(function FloatingTextarea({ id, label, value, onChange, onBlur, error, touched, rows = 5, characterCount, characterLimit, icon: Icon, onFocus }) {
  const [focused, setFocused] = useState(false)
  const hasValue = value && value.length > 0

  return (
    <div className="relative w-full group">
      <div className={`absolute left-4 top-[24px] -translate-y-1/2 pointer-events-none transition-all duration-300 z-10 ${focused ? 'text-[var(--accent)] scale-110' : hasValue ? 'text-[var(--text-secondary)]' : 'text-white/55'
        }`}>
        {Icon && <Icon className="h-4 w-4" strokeWidth={1.75} />}
      </div>
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        onFocus={(e) => {
          setFocused(true)
          if (onFocus) onFocus(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          if (onBlur) onBlur(e)
        }}
        placeholder=" "
        rows={rows}
        aria-required="true"
        className={`peer w-full rounded-[8px] border border-white/[0.12] bg-black/45 pl-10 pr-4 pt-[24px] pb-[12px] text-xs md:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop-blur-xl resize-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.02)] hover:border-[var(--accent)]/30 focus:border-[var(--accent)]/70 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.65),0_0_12px_var(--accent-dim)] focus:bg-black/60 leading-relaxed ${touched && error
          ? 'border-amber-500/40 focus:border-amber-500/70 shadow-[0_0_0_1px_rgba(245,158,11,0.3)] focus:shadow-[inset_0_2px_4px_rgba(245,158,11,0.12),0_0_10px_rgba(245,158,11,0.3)] focus:bg-amber-500/[0.02]'
          : ''
          }`}
        style={{ minHeight: '150px' }}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        className={`absolute left-10 top-3 origin-[0] duration-300 transform pointer-events-none transition-all ease-[cubic-bezier(0.16,1,0.3,1)] font-medium ${touched && error ? 'peer-focus:text-amber-500/90' : 'peer-focus:text-[var(--accent)]'
          } ${focused || hasValue
            ? '-translate-y-[14px] scale-75 text-[9px] uppercase tracking-[0.15em] text-[var(--text-secondary)] bg-raised px-2 -mx-2 rounded'
            : 'translate-y-0 scale-100 text-xs md:text-sm capitalize tracking-wide text-white/65'
          }`}
      >
        {label}
      </label>

      <span className="absolute bottom-3 right-4 text-[9px] font-mono tracking-wider transition-all duration-300 pointer-events-none opacity-80"
        style={{ color: characterCount > characterLimit ? 'rgba(245,158,11,0.95)' : 'rgba(255,255,255,0.60)' }}>
        {characterCount} / {characterLimit}
      </span>

      <div className="h-4 relative mt-1 overflow-visible">
        <AnimatePresence initial={false}>
          {touched && error && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              id={`${id}-error`}
              className="absolute left-1 block text-[10px] text-amber-400 tracking-normal font-medium px-1"
              role="alert"
            >
              ⚠ {error}
            </motion.span>
          )}
          {touched && !error && hasValue && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-1 block text-[10px] tracking-normal font-medium px-1"
              style={{ color: 'var(--accent)' }}
            >
              ✓ Valid message
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})

const INQUIRY_OPTIONS = [
  'Internship',
  'Full-Time Opportunity',
  'Freelance Project',
  'Startup Collaboration',
  'Technical Discussion',
  'Other'
]

const FORM_CARD_VARIANTS = {
  hidden: {
    opacity: 1,
    y: 0,
    scale: 1,
    boxShadow: '0 20px 40px -16px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.01), inset 0 1px 0 0 rgba(255,255,255,0.06)'
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    boxShadow: '0 20px 40px -16px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.01), inset 0 1px 0 0 rgba(255,255,255,0.06)',
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    }
  },
  interacting: {
    opacity: 1,
    y: -8,
    scale: 1,
    boxShadow: '0 32px 64px -12px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 0 rgba(255,255,255,0.12)',
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1]
    }
  }
}

const FORM_CHILD_VARIANTS = {
  hidden: { opacity: 1, y: 0, filter: 'blur(0px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  },
  interacting: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  }
}

const DOT_VARIANTS = {
  idle: () => ({
    opacity: 0.2,
    scale: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    boxShadow: "0 0 0px transparent",
    transition: { duration: 0.3 }
  }),
  focused: (i) => ({
    opacity: [0.25, 1, 0.25],
    scale: [0.95, 1.2, 0.95],
    backgroundColor: ["rgba(0,0,0,0.9)", "var(--accent)", "rgba(0,0,0,0.9)"],
    boxShadow: ["0 0 0px var(--accent)", "0 0 8px var(--accent)", "0 0 0px var(--accent)"],
    transition: {
      duration: 1.8,
      repeat: Infinity,
      ease: "easeInOut",
      delay: i * 0.32
    }
  }),
  submitting: (i) => ({
    opacity: [0.3, 1, 0.3],
    scale: [1, 1.25, 1],
    backgroundColor: ["rgba(0,0,0,0.9)", "var(--accent-hover)", "rgba(0,0,0,0.9)"],
    boxShadow: ["0 0 0px var(--accent-hover)", "0 0 10px var(--accent-hover)", "0 0 0px var(--accent-hover)"],
    transition: {
      duration: 1.6,
      repeat: Infinity,
      ease: "easeInOut",
      delay: i * 0.28
    }
  })
}

function validateField(name, value) {
  let err = ''
  if (name === 'name') {
    if (!value.trim()) err = 'Name is required'
    else if (value.trim().length < 2) err = 'Name must be at least 2 characters'
  } else if (name === 'email') {
    if (!value.trim()) err = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) err = 'Please enter a valid email address'
  } else if (name === 'subject') {
    if (!value.trim()) err = 'Subject is required'
    else if (value.trim().length < 3) err = 'Subject must be at least 3 characters'
  } else if (name === 'message') {
    if (!value.trim()) err = 'Message is required'
    else if (value.trim().length < 10) err = 'Message must be at least 10 characters'
    else if (value.trim().length > 1000) err = 'Message cannot exceed 1000 characters'
  }
  return err
}

export default memo(function ContactForm({ contactSystemState, onTransmit, setContactSystemState, setTransmissionFailed, setFormProgress, onTypingChange }) {
  const shouldReduceMotion = useReducedMotion()
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })
  const [isFocused, setIsFocused] = useState(false)
  const [isTypingState, setIsTypingState] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [inquiryType, setInquiryType] = useState('Internship')
  const [touched, setTouched] = useState({ name: false, email: false, subject: false, message: false })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const clearFieldsTimeoutRef = useRef(null)
  const typingTimerRef = useRef(null)

  const apiErrorTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (clearFieldsTimeoutRef.current) {
        clearTimeout(clearFieldsTimeoutRef.current)
      }
      if (apiErrorTimeoutRef.current) {
        clearTimeout(apiErrorTimeoutRef.current)
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleDropdownKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isDropdownOpen) {
        setIsDropdownOpen(true)
      } else {
        const currIdx = INQUIRY_OPTIONS.indexOf(inquiryType)
        const nextIdx = (currIdx + 1) % INQUIRY_OPTIONS.length
        setInquiryType(INQUIRY_OPTIONS[nextIdx])
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isDropdownOpen) {
        setIsDropdownOpen(true)
      } else {
        const currIdx = INQUIRY_OPTIONS.indexOf(inquiryType)
        const prevIdx = (currIdx - 1 + INQUIRY_OPTIONS.length) % INQUIRY_OPTIONS.length
        setInquiryType(INQUIRY_OPTIONS[prevIdx])
      }
    } else if (e.key === 'Escape') {
      if (isDropdownOpen) {
        e.preventDefault()
        setIsDropdownOpen(false)
      }
    } else if (e.key === 'Home') {
      if (isDropdownOpen) {
        e.preventDefault()
        setInquiryType(INQUIRY_OPTIONS[0])
      }
    } else if (e.key === 'End') {
      if (isDropdownOpen) {
        e.preventDefault()
        setInquiryType(INQUIRY_OPTIONS[INQUIRY_OPTIONS.length - 1])
      }
    }
  }, [isDropdownOpen, inquiryType])

  const handleDropdownBlur = useCallback((e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.relatedTarget)) {
      setIsDropdownOpen(false)
    }
  }, [])
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ type: '', message: '' })
  const [subState, setSubState] = useState('idle')
  const [isBtnHovered, setIsBtnHovered] = useState(false)
  const [ripples, setRipples] = useState([])

  // Compute form fill progress (0–100) based on valid non-empty fields
  const lastProgressRef = useRef(0)
  useEffect(() => {
    const fields = ['name', 'email', 'subject', 'message']
    const filledCount = fields.filter(f => {
      const val = formData[f]
      return val && val.trim().length > 0 && !validateField(f, val)
    }).length
    const progress = Math.round((filledCount / fields.length) * 100)
    if (progress !== lastProgressRef.current) {
      lastProgressRef.current = progress
      if (setFormProgress) setFormProgress(progress)
    }
  }, [formData, setFormProgress])

  const resetErrorState = useCallback(() => {
    setSubState(prev => (prev === 'api_error' || prev === 'validation_error' || prev === 'error') ? 'idle' : prev)
    if (apiErrorTimeoutRef.current) {
      clearTimeout(apiErrorTimeoutRef.current)
      apiErrorTimeoutRef.current = null
    }
  }, [])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    resetErrorState()

    if (onTypingChange) {
      onTypingChange(true)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        onTypingChange(false)
      }, 2500)
    }

    setErrors(prev => {
      if (prev[name]) {
        const err = validateField(name, value)
        return { ...prev, [name]: err }
      }
      return prev
    })
  }, [resetErrorState, onTypingChange])

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    resetErrorState()

    if (value.trim() || errors[name]) {
      const err = validateField(name, value)
      setErrors(prev => ({ ...prev, [name]: err }))
    }
  }, [errors, resetErrorState])

  const handleRipple = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    const newRipple = { x, y, size, id: Date.now() }
    setRipples(prev => [...prev, newRipple])
  }, [])

  useEffect(() => {
    if (ripples.length > 0) {
      const timer = setTimeout(() => setRipples([]), 600)
      return () => clearTimeout(timer)
    }
  }, [ripples])

  const typingTimeoutRef = useRef(null)
  const handleTypingEvent = useCallback(() => {
    setIsTypingState(true)
    const sectionEl = document.getElementById('contact')
    if (sectionEl) {
      sectionEl.dispatchEvent(new CustomEvent('contact-typing', { detail: { isTyping: true }, bubbles: true }))
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        setIsTypingState(false)
        sectionEl.dispatchEvent(new CustomEvent('contact-typing', { detail: { isTyping: false }, bubbles: true }))
      }, 600)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    resetErrorState()

    const allTouched = { name: true, email: true, subject: true, message: true }
    setTouched(allTouched)

    if (subState === 'error' || subState === 'api_error') {
      setSubState('idle')
      return
    }

    const newErrors = {}
    Object.keys(formData).forEach(key => {
      const err = validateField(key, formData[key])
      if (err) newErrors[key] = err
    })
    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      setSubState('validation_error')
      setStatus({ type: '', message: '' })

      const timer = setTimeout(() => {
        setSubState(curr => curr === 'validation_error' ? 'idle' : curr)
      }, 2500)
      apiErrorTimeoutRef.current = timer
      return
    }

    if (onTransmit) {
      onTransmit()
    }

    setSubState('submitting')
    setStatus({ type: '', message: '' })

    try {
      if (!isConfigured) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        if (formData.subject.toLowerCase() === 'fail') {
          throw new Error('Simulated API Failure')
        }
      } else {
        if (formData.subject.toLowerCase() === 'fail') {
          throw new Error('Simulated API Failure')
        }
        await emailjs.send(
          serviceId,
          templateId,
          {
            from_name: formData.name,
            from_email: formData.email,
            subject: formData.subject,
            message: `[Inquiry Type: ${inquiryType}]\n\n${formData.message}`,
            to_email: personal.email,
          },
          publicKey
        )
      }
    } catch (error) {
      console.error('EmailJS Error:', error)

      if (setSubState) {
        setSubState('api_error')
      }
      setStatus({ type: '', message: '' })

      if (setTransmissionFailed) {
        setTransmissionFailed(true)
      }

      setTimeout(() => {
        if (setTransmissionFailed) {
          setTransmissionFailed(false)
        }
      }, 400)

      const errorTimer = setTimeout(() => {
        setSubState(curr => curr === 'api_error' ? 'idle' : curr)
      }, 3000)

      apiErrorTimeoutRef.current = errorTimer
    }
  }

  useEffect(() => {
    if (contactSystemState === 'transmit') {
      const tSuccess = setTimeout(() => {
        setSubState(curr => (curr === 'submitting' ? 'success' : curr))
      }, 900)

      // Start the clear fields timeout - preserved across state transitions
      clearFieldsTimeoutRef.current = setTimeout(() => {
        setFormData({ name: '', email: '', subject: '', message: '' })
        setTouched({ name: false, email: false, subject: false, message: false })
      }, 3000)

      return () => {
        clearTimeout(tSuccess)
      }
    } else if (contactSystemState === 'dormant') {
      setSubState('idle')
      setStatus({ type: '', message: '' })
    }
  }, [contactSystemState])

  const isInteracting = isFocused || isHovered
  const isTransmit = contactSystemState === 'transmit'
  const activeDotState = subState === 'submitting' ? 'submitting' : isTypingState ? 'focused' : 'idle'

  return (
    <motion.div
      variants={FORM_CARD_VARIANTS}
      initial="visible"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      animate={
        isTransmit
          ? {
            scale: 0.975,
            opacity: 1,
            y: -8,
            transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] }
          }
          : {
            scale: 1.0,
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
          }
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocused(false)
        }
      }}
      className="relative rounded-[16px] border border-white/[0.12] bg-gradient-to-br from-surface/90 via-raised/75 to-surface/90 backdrop-blur-2xl p-6 sm:p-8 md:p-8 w-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
    >
      {/* Interactive Border Beam */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-[16px] z-10">
        <defs>
          <linearGradient id="borderBeamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--accent-hover)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect
          x="0.5"
          y="0.5"
          width="calc(100% - 1px)"
          height="calc(100% - 1px)"
          rx="16"
          fill="none"
          stroke="url(#borderBeamGradient)"
          strokeWidth="1.25"
          pathLength="100"
          className="stroke-dasharray-[25_75] animate-border-beam"
          style={{
            transition: 'stroke-width 0.3s ease, stroke-opacity 0.3s ease',
            animationDuration: '6s'
          }}
        />
        {/* Idle Breathing Border */}
        {contactSystemState === 'dormant' && !shouldReduceMotion && (
          <rect
            x="1" y="1"
            width="calc(100% - 2px)" height="calc(100% - 2px)"
            rx="15"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            style={{
              animation: 'panelIdleBreathe 4s ease-in-out infinite'
            }}
          />
        )}
      </svg>

      {/* Cyber Corner Brackets */}
      <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 transition-all duration-500 pointer-events-none border-[var(--accent)]/45" />
      <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 transition-all duration-500 pointer-events-none border-[var(--accent)]/45" />
      <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 transition-all duration-500 pointer-events-none border-[var(--accent)]/45" />
      <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 transition-all duration-500 pointer-events-none border-[var(--accent)]/45" />

      {/* Ambient theme-based glow */}
      <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] pointer-events-none"
        style={{ background: 'var(--accent)', opacity: 0.18 }} />

      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none rounded-[16px]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />

      {/* Animated light sweep */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[16px]">
        <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-[sweep_8s_ease-in-out_infinite]" />
      </div>

      {/* 3 Loading Dots (Top Right) */}
      <div className="absolute top-5 right-7 flex gap-2.5 items-center z-20 pointer-events-none">
        <motion.div custom={0} variants={DOT_VARIANTS} animate={activeDotState} className="w-2 h-2 rounded-full border-[1.5px] border-[var(--accent)] bg-black/90" />
        <motion.div custom={1} variants={DOT_VARIANTS} animate={activeDotState} className="w-2 h-2 rounded-full border-[1.5px] border-[var(--accent)] bg-black/90" />
        <motion.div custom={2} variants={DOT_VARIANTS} animate={activeDotState} className="w-2 h-2 rounded-full border-[1.5px] border-[var(--accent)] bg-black/90" />
      </div>

      <motion.div variants={FORM_CHILD_VARIANTS} className="mb-6 relative z-10">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-mono tracking-[0.2em] font-semibold text-[var(--accent)] uppercase">
            CONTACT
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-heading)] font-heading tracking-tight mb-2 leading-tight">
          Let's Build Something
          <span className="block bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] bg-clip-text text-transparent">
            Exceptional
          </span>
        </h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-sm">
          I usually respond within 24 hours. Let's discuss your project and create something remarkable together.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} onKeyDown={handleTypingEvent} onInput={handleTypingEvent} className="space-y-4 relative z-10">
        <div
          style={{
            filter: isTransmit ? 'blur(1.5px)' : 'blur(0px)',
            transition: contactSystemState === 'dormant'
              ? 'filter 800ms cubic-bezier(0.4, 0, 0.2, 1)'
              : 'filter 150ms cubic-bezier(0.22, 1, 0.36, 1)'
          }}
          className="space-y-4"
        >
          <motion.div
            variants={FORM_CHILD_VARIANTS}
            className="space-y-2 relative z-30"
            ref={dropdownRef}
            onBlur={handleDropdownBlur}
          >
            <label htmlFor="inquiry-type" className="sr-only text-[10px] font-mono tracking-[0.08em] font-medium text-[var(--text-muted)] uppercase">
              What brings you here?
            </label>
            <label className="text-[10px] font-mono tracking-[0.08em] font-medium text-[var(--text-muted)] uppercase">
              What brings you here?
            </label>
            <div className="relative">
              <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 z-10 ${isDropdownOpen ? 'text-[var(--accent)] scale-110' : 'text-white/55'
                }`}>
                <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <button
                type="button"
                id="inquiry-type"
                onClick={() => setIsDropdownOpen(prev => !prev)}
                onKeyDown={handleDropdownKeyDown}
                className="w-full rounded-[6px] border border-white/[0.12] bg-black/45 pl-10 pr-4 py-3 text-xs md:text-sm text-[var(--text-primary)] outline-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop-blur-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.02)] hover:border-[var(--accent)]/30 focus:border-[var(--accent)]/70 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.65),0_0_12px_var(--accent-dim)] focus:bg-black/60 flex items-center justify-between focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
                aria-activedescendant={isDropdownOpen ? `option-${INQUIRY_OPTIONS.indexOf(inquiryType)}` : undefined}
              >
                <span>{inquiryType}</span>
                <ChevronDown
                  className={`h-4 w-4 text-[var(--text-secondary)] transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.ul
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute z-50 left-0 right-0 mt-2 rounded-[6px] border border-white/[0.15] bg-surface/98 backdrop-blur-3xl py-1.5 shadow-[0_20px_45px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden"
                    role="listbox"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsDropdownOpen(false)
                      }
                    }}
                  >
                    {INQUIRY_OPTIONS.map((option, index) => {
                      const isSelected = inquiryType === option
                      return (
                        <li
                          key={option}
                          id={`option-${index}`}
                          onClick={() => {
                            setInquiryType(option)
                            setIsDropdownOpen(false)
                          }}
                          className={`px-4 py-2 text-xs cursor-pointer transition-all duration-200 flex items-center justify-between border-l-2 ${isSelected
                            ? 'text-[var(--accent)] font-semibold bg-white/[0.05] border-[var(--accent)]'
                            : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.025] border-transparent'
                            }`}
                          role="option"
                          aria-selected={isSelected}
                        >
                          {option}
                        </li>
                      )
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div variants={FORM_CHILD_VARIANTS} className="grid gap-4 sm:grid-cols-2">
            <FloatingInput
              id="name"
              label="Your Name *"
              type="text"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={resetErrorState}
              error={errors.name}
              touched={touched.name}
              icon={User}
            />
            <FloatingInput
              id="email"
              label="Your Email *"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={resetErrorState}
              error={errors.email}
              touched={touched.email}
              icon={Mail}
            />
          </motion.div>

          <motion.div variants={FORM_CHILD_VARIANTS}>
            <FloatingInput
              id="subject"
              label="Subject *"
              type="text"
              value={formData.subject}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={resetErrorState}
              error={errors.subject}
              touched={touched.subject}
              icon={PenTool}
            />
          </motion.div>

          <motion.div variants={FORM_CHILD_VARIANTS}>
            <FloatingTextarea
              id="message"
              label="Message *"
              value={formData.message}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={resetErrorState}
              error={errors.message}
              touched={touched.message}
              rows={4}
              characterCount={formData.message.length}
              characterLimit={1000}
              icon={MessageSquare}
            />
          </motion.div>

        </div>

        {status.message && (
          <motion.div
            variants={FORM_CHILD_VARIANTS}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[6px] border p-3 text-xs flex items-center gap-2.5 ${status.type === 'success'
              ? 'border-green-500/20 bg-green-500/5 text-green-400'
              : 'border-red-500/20 bg-red-500/5 text-red-400 animate-shake'
              }`}
          >
            {status.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />}
            {status.type === 'error' && <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />}
            {status.message}
          </motion.div>
        )}

        <motion.div variants={FORM_CHILD_VARIANTS} className="w-full pt-1">
          <button
            type={['error', 'api_error', 'validation_error'].includes(subState) ? 'button' : 'submit'}
            onClick={(e) => {
              handleRipple(e)
              if (['error', 'api_error', 'validation_error'].includes(subState)) {
                resetErrorState()
              }
            }}
            disabled={subState === 'submitting' || subState === 'success'}
            onMouseEnter={() => setIsBtnHovered(true)}
            onMouseLeave={() => setIsBtnHovered(false)}
            className="group/btn relative overflow-hidden w-full rounded-[6px] py-3.5 px-6 text-xs font-semibold tracking-wide flex items-center justify-center gap-2.5 select-none outline-none border border-white/[0.22] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform active:translate-y-[1px] active:shadow-inner focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
            style={{
              background: ['idle', 'success', 'validation_error', 'api_error'].includes(subState) ? 'linear-gradient(to bottom, var(--accent) 0%, var(--accent-hover) 100%)' : undefined,
              boxShadow: ['idle', 'success', 'validation_error', 'api_error'].includes(subState)
                ? '0 1px 0 rgba(255,255,255,0.30) inset, 0 -1px 0 rgba(0,0,0,0.3) inset, 0 4px 16px var(--accent-dim)'
                : '0 1px 0 rgba(255,255,255,0.05) inset, 0 -1px 0 rgba(0,0,0,0.25) inset'
            }}
          >
            {/* Glass reflection overlay */}
            {['idle', 'validation_error', 'api_error'].includes(subState) && (
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none" />
            )}

            {/* Animated Sheen/Shine Effect (Only on Hover, Idle/Error States) */}
            {['idle', 'validation_error', 'api_error'].includes(subState) && (
              <span
                className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: 'linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.10) 50%, transparent 80%)',
                  backgroundSize: '200% 100%',
                  animation: 'sheen 0.6s ease-out forwards',
                  animationPlayState: isBtnHovered ? 'running' : 'paused'
                }}
              />
            )}

            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="animate-ripple"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  width: ripple.size,
                  height: ripple.size,
                }}
              />
            ))}
            <AnimatePresence mode="wait">
              {subState === 'idle' && (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <span>Send Inquiry</span>
                  <Send className={`h-3.5 w-3.5 transition-transform duration-300 translate-y-[0.5px] ${isBtnHovered ? 'translate-x-1 -translate-y-0.5' : ''}`} strokeWidth={2} />
                </motion.span>
              )}
              {subState === 'validation_error' && (
                <motion.span
                  key="validation_error"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 text-white font-semibold"
                >
                  <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>Please complete required fields</span>
                </motion.span>
              )}
              {subState === 'api_error' && (
                <motion.span
                  key="api_error"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 text-white font-medium"
                >
                  <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>Something went wrong — try again</span>
                </motion.span>
              )}
              {subState === 'submitting' && (
                <motion.span
                  key="submitting"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 text-white/80"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                  <span>Sending...</span>
                </motion.span>
              )}
              {subState === 'success' && (
                <motion.span
                  key="success"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 text-white font-semibold animate-pulse"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>✓ Message Sent</span>
                </motion.span>
              )}
              {subState === 'error' && (
                <motion.span
                  key="error"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 text-red-400 font-semibold"
                >
                  <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>Failed to Send. Click to Retry</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
      </form>
    </motion.div>
  )
})
