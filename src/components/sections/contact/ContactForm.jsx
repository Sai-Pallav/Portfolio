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
  const isRequired = label.includes('*')
  const displayLabel = label.replace(' *', '').replace('Your ', '')

  return (
    <div className="relative w-full group">
      <div className={`absolute left-3.5 top-[23px] -translate-y-1/2 pointer-events-none transition-colors duration-150 z-10 ${
        focused ? 'text-[var(--accent)]/90' : hasValue ? 'text-white/60' : 'text-white/40 group-hover:text-white/60'
      }`}>
        {Icon && <Icon className="h-4 w-4" strokeWidth={1.5} />}
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
        aria-required={isRequired ? "true" : "false"}
        className={`peer w-full h-[46px] rounded-[8px] border border-white/[0.07] border-t-white/[0.12] border-b-white/[0.03] bg-gradient-to-b from-[#0a0b15]/95 via-[#06070c]/98 to-[#030306]/98 pl-10 pr-3.5 pt-3.5 pb-1 text-xs sm:text-[13px] text-white/95 font-medium placeholder-transparent outline-none transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.015)] hover:border-white/[0.14] hover:border-t-white/[0.18] hover:from-[#0d0e19]/95 hover:via-[#07080e]/98 hover:to-[#030306]/98 focus:border-[var(--accent)]/70 focus:border-t-[var(--accent)]/85 focus:shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.92),inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_22%,transparent),0_0_8px_color-mix(in_srgb,var(--accent)_14%,transparent)] focus:bg-[#040509] ${
          touched && error
            ? 'border-amber-500/40 focus:border-amber-500/70 focus:shadow-[0_0_8px_rgba(245,158,11,0.2)]'
            : hasValue ? 'border-white/[0.10] border-t-white/[0.14] border-b-white/[0.04]' : ''
        }`}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        className={`absolute transition-all duration-150 pointer-events-none ease-[cubic-bezier(0.16,1,0.3,1)] select-none uppercase flex items-center ${
          focused || hasValue
            ? `top-0 -translate-y-1/2 left-7 text-[9px] font-medium tracking-[0.08em] px-1.5 rounded-[2px] shadow-[0_1px_2px_rgba(0,0,0,0.8)] bg-[#080912] ${
                focused
                  ? 'text-[var(--accent)]/90 border border-[var(--accent)]/30'
                  : 'text-white/60 border border-white/[0.08]'
              }`
            : 'top-1/2 -translate-y-1/2 left-10 text-[11px] tracking-[0.06em] font-medium text-white/40 group-hover:text-white/55'
        }`}
      >
        <span>{displayLabel}</span>
        {isRequired && <span className="text-white/25 text-[9px] ml-1 font-normal select-none">*</span>}
      </label>

      <div className="h-3.5 relative mt-0.5 overflow-visible">
        <AnimatePresence initial={false}>
          {touched && error && (
            <motion.span
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              id={`${id}-error`}
              className="absolute left-0.5 block text-[10px] font-mono text-amber-400/90 tracking-tight font-medium px-0.5"
              role="alert"
            >
              ⚠ {error}
            </motion.span>
          )}
          {touched && !error && hasValue && (
            <motion.span
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0.5 block text-[10px] font-mono text-[var(--accent)]/80 tracking-tight font-medium px-0.5"
            >
              ✓ Valid {displayLabel.toLowerCase()}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})

const FloatingTextarea = memo(function FloatingTextarea({ id, label, value, onChange, onBlur, error, touched, rows = 4, characterCount, characterLimit, icon: Icon, onFocus }) {
  const [focused, setFocused] = useState(false)
  const hasValue = value && value.length > 0
  const isRequired = label.includes('*')
  const displayLabel = label.replace(' *', '')

  return (
    <div className="relative w-full group">
      <div className={`absolute left-3.5 top-4 pointer-events-none transition-colors duration-150 z-10 ${
        focused ? 'text-[var(--accent)]/90' : hasValue ? 'text-white/60' : 'text-white/40 group-hover:text-white/60'
      }`}>
        {Icon && <Icon className="h-4 w-4" strokeWidth={1.5} />}
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
        aria-required={isRequired ? "true" : "false"}
        className={`peer w-full rounded-[8px] border border-white/[0.07] border-t-white/[0.12] border-b-white/[0.03] bg-gradient-to-b from-[#0a0b15]/95 via-[#06070c]/98 to-[#030306]/98 pl-10 pr-4 pt-4 pb-8 text-xs sm:text-[13px] text-white/95 font-medium placeholder-transparent outline-none transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] resize-none shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.015)] hover:border-white/[0.14] hover:border-t-white/[0.18] hover:from-[#0d0e19]/95 hover:via-[#07080e]/98 hover:to-[#030306]/98 focus:border-[var(--accent)]/70 focus:border-t-[var(--accent)]/85 focus:shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.92),inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_22%,transparent),0_0_8px_color-mix(in_srgb,var(--accent)_14%,transparent)] focus:bg-[#040509] leading-relaxed ${
          touched && error
            ? 'border-amber-500/40 focus:border-amber-500/70 focus:shadow-[0_0_8px_rgba(245,158,11,0.2)]'
            : hasValue ? 'border-white/[0.10] border-t-white/[0.14] border-b-white/[0.04]' : ''
        }`}
        style={{ minHeight: '140px' }}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        className={`absolute transition-all duration-150 pointer-events-none ease-[cubic-bezier(0.16,1,0.3,1)] select-none uppercase flex items-center ${
          focused || hasValue
            ? `top-0 -translate-y-1/2 left-7 text-[9px] font-medium tracking-[0.08em] px-1.5 rounded-[2px] shadow-[0_1px_2px_rgba(0,0,0,0.8)] bg-[#080912] ${
                focused
                  ? 'text-[var(--accent)]/90 border border-[var(--accent)]/30'
                  : 'text-white/60 border border-white/[0.08]'
              }`
            : 'top-4 left-10 text-[11px] tracking-[0.06em] font-medium text-white/40 group-hover:text-white/55'
        }`}
      >
        <span>{displayLabel}</span>
        {isRequired && <span className="text-white/25 text-[9px] ml-1 font-normal select-none">*</span>}
      </label>

      <span
        className={`absolute bottom-2.5 right-3 text-[10px] font-mono tracking-widest transition-colors duration-150 pointer-events-none select-none ${
          characterCount > characterLimit
            ? 'text-amber-400/90 font-medium'
            : hasValue
            ? 'text-white/45'
            : 'text-white/30'
        }`}
      >
        {characterCount} / {characterLimit}
      </span>

      <div className="h-3.5 relative mt-0.5 overflow-visible">
        <AnimatePresence initial={false}>
          {touched && error && (
            <motion.span
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              id={`${id}-error`}
              className="absolute left-0.5 block text-[10px] font-mono text-amber-400/90 tracking-tight font-medium px-0.5"
              role="alert"
            >
              ⚠ {error}
            </motion.span>
          )}
          {touched && !error && hasValue && (
            <motion.span
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0.5 block text-[10px] font-mono text-[var(--accent)]/80 tracking-tight font-medium px-0.5"
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
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    }
  },
  interacting: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
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
    opacity: 0.85,
    scale: 1,
    backgroundColor: "#04050a",
    boxShadow: "inset 0 1px 1px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.9)",
    transition: { duration: 0.3 }
  }),
  focused: (i) => ({
    opacity: [0.75, 1, 0.75],
    scale: [0.95, 1.1, 0.95],
    backgroundColor: ["#04050a", "var(--accent)", "#04050a"],
    boxShadow: [
      "inset 0 1px 1px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.9)",
      "0 0 6px var(--accent)",
      "inset 0 1px 1px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.9)"
    ],
    transition: {
      duration: 1.8,
      repeat: Infinity,
      ease: "easeInOut",
      delay: i * 0.25
    }
  }),
  submitting: (i) => ({
    opacity: [0.8, 1, 0.8],
    scale: [1, 1.15, 1],
    backgroundColor: ["#04050a", "var(--accent)", "#04050a"],
    boxShadow: [
      "inset 0 1px 1px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.9)",
      "0 0 8px var(--accent)",
      "inset 0 1px 1px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.9)"
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
      delay: i * 0.22
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
      className="relative rounded-[14px] border-t border-t-white/[0.14] border-x border-x-white/[0.07] border-b border-b-white/[0.03] bg-[radial-gradient(ellipse_130%_90%_at_50%_0%,color-mix(in_srgb,var(--accent)_4%,#0d0f19)_0%,#07080d_55%,#030407_100%)] p-6 sm:p-7 md:p-8 w-full overflow-hidden shadow-[0_28px_56px_-14px_rgba(0,0,0,0.96),0_10px_20px_-5px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.08),inset_0_0_0_1px_rgba(255,255,255,0.025),inset_0_-1px_3px_rgba(0,0,0,0.92)]"
    >
      {/* Top Edge Specular Rim Highlight (Directional Ambient Light Chamfer) */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.14] to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)]/12 to-transparent pointer-events-none z-10" />

      {/* Internal Upper Illumination Wash (Subtle Theme-Aware Reflected Device Light) */}
      <div
        className="absolute -top-16 left-1/2 -translate-x-1/2 w-4/5 h-32 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top, var(--accent-dim) 0%, transparent 75%)',
          opacity: 'calc(0.35 * var(--ambient-intensity, 1))'
        }}
      />

      {/* Subtle micro-texture */}
      <div
        className="absolute inset-0 opacity-[0.012] pointer-events-none rounded-[14px]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}
      />

      {/* 3 Machined Status LEDs (Top Right) */}
      <div className="absolute top-6 right-7 flex gap-1.5 items-center z-20 pointer-events-none">
        <motion.div custom={0} variants={DOT_VARIANTS} animate={activeDotState} className="w-1.5 h-1.5 rounded-full bg-[#030408] border border-white/[0.14] shadow-[inset_0_1px_1px_rgba(255,255,255,0.20),0_1px_2px_rgba(0,0,0,0.9)]" />
        <motion.div custom={1} variants={DOT_VARIANTS} animate={activeDotState} className="w-1.5 h-1.5 rounded-full bg-[#030408] border border-white/[0.14] shadow-[inset_0_1px_1px_rgba(255,255,255,0.20),0_1px_2px_rgba(0,0,0,0.9)]" />
        <motion.div custom={2} variants={DOT_VARIANTS} animate={activeDotState} className="w-1.5 h-1.5 rounded-full bg-[#030408] border border-white/[0.14] shadow-[inset_0_1px_1px_rgba(255,255,255,0.20),0_1px_2px_rgba(0,0,0,0.9)]" />
      </div>

      <motion.div variants={FORM_CHILD_VARIANTS} className="mb-5 relative z-10">
        <span className="text-[10px] font-mono tracking-[0.20em] font-semibold text-[var(--accent)]/70 uppercase block mb-1.5">
          CONTACT
        </span>
        <h2 className="text-2xl sm:text-[28px] font-bold text-white font-heading tracking-tight mb-1.5 leading-[1.15]">
          Let's Build Something
          <span className="block bg-gradient-to-r from-primary via-accent to-accent-hover bg-clip-text text-transparent">
            Exceptional
          </span>
        </h2>
        <p className="text-xs sm:text-[13px] text-white/65 leading-relaxed max-w-sm font-normal">
          I usually respond within 24 hours. Let's discuss your project and create something remarkable together.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} onKeyDown={handleTypingEvent} onInput={handleTypingEvent} className="space-y-3.5 relative z-10">
        <div
          style={{
            filter: isTransmit ? 'blur(1.5px)' : 'blur(0px)',
            transition: contactSystemState === 'dormant'
              ? 'filter 800ms cubic-bezier(0.4, 0, 0.2, 1)'
              : 'filter 150ms cubic-bezier(0.22, 1, 0.36, 1)'
          }}
          className="space-y-3.5"
        >
          <motion.div
            variants={FORM_CHILD_VARIANTS}
            className="space-y-1.5 relative z-30"
            ref={dropdownRef}
            onBlur={handleDropdownBlur}
          >
            <label htmlFor="inquiry-type" className="block text-[9px] font-mono tracking-[0.14em] font-medium text-white/50 uppercase mb-1.5">
              WHAT BRINGS YOU HERE?
            </label>
            <div className="relative group/dd">
              <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-150 z-10 ${
                isDropdownOpen ? 'text-[var(--accent)]/90' : 'text-white/40 group-hover/dd:text-white/60'
              }`}>
                <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <button
                type="button"
                id="inquiry-type"
                onClick={() => setIsDropdownOpen(prev => !prev)}
                onKeyDown={handleDropdownKeyDown}
                className="w-full h-[46px] rounded-[8px] border border-white/[0.07] border-t-white/[0.12] border-b-white/[0.03] bg-gradient-to-b from-[#0a0b15]/95 via-[#06070c]/98 to-[#030306]/98 pl-10 pr-3.5 text-xs sm:text-[13px] text-white/95 outline-none transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.015)] hover:border-white/[0.14] hover:border-t-white/[0.18] hover:from-[#0d0e19]/95 hover:via-[#07080e]/98 hover:to-[#030306]/98 focus:border-[var(--accent)]/70 focus:border-t-[var(--accent)]/85 focus:shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.92),inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_22%,transparent),0_0_8px_color-mix(in_srgb,var(--accent)_14%,transparent)] focus:bg-[#040509] flex items-center justify-between focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
                aria-activedescendant={isDropdownOpen ? `option-${INQUIRY_OPTIONS.indexOf(inquiryType)}` : undefined}
              >
                <span className="font-medium text-white/95 tracking-wide">{inquiryType}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-white/40 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[var(--accent)]' : 'group-hover/dd:text-white/60'}`}
                />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.ul
                    initial={{ opacity: 0, y: -6, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.99 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute z-50 left-0 right-0 mt-1.5 rounded-[8px] border border-white/[0.08] bg-[#070810]/98 backdrop-blur-2xl py-1 shadow-[0_20px_40px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.03)] overflow-hidden"
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
                          className={`px-3.5 py-2 text-xs cursor-pointer transition-colors duration-150 flex items-center justify-between border-l-2 ${isSelected
                            ? 'text-[var(--accent)] font-medium bg-white/[0.03] border-[var(--accent)]/80'
                            : 'text-white/70 hover:text-white hover:bg-white/[0.02] border-transparent'
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

          <motion.div variants={FORM_CHILD_VARIANTS} className="grid gap-3.5 sm:grid-cols-2">
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
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[6px] border p-2.5 text-xs flex items-center gap-2 font-mono ${status.type === 'success'
              ? 'border-green-500/20 bg-green-500/5 text-green-400'
              : 'border-red-500/20 bg-red-500/5 text-red-400 animate-shake'
              }`}
          >
            {status.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />}
            {status.type === 'error' && <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />}
            <span>{status.message}</span>
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
            className="group/btn relative overflow-hidden w-full h-[46px] rounded-[6px] py-0 px-6 text-xs font-semibold tracking-[0.04em] flex items-center justify-center gap-2 select-none outline-none border transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform active:translate-y-[0.5px] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
            style={{
              background: ['idle', 'success', 'validation_error', 'api_error'].includes(subState)
                ? 'linear-gradient(to bottom, color-mix(in srgb, var(--accent) 18%, #0f1015), color-mix(in srgb, var(--accent) 10%, #08090d), #040508)'
                : undefined,
              borderColor: ['idle', 'success', 'validation_error', 'api_error'].includes(subState)
                ? 'color-mix(in srgb, var(--accent) 26%, transparent)'
                : 'rgba(255, 255, 255, 0.08)',
              boxShadow: ['idle', 'success', 'validation_error', 'api_error'].includes(subState)
                ? 'inset 0 1px 0 0 color-mix(in srgb, var(--accent) 22%, rgba(255,255,255,0.12)), inset 0 -1px 0 0 rgba(0, 0, 0, 0.50), 0 4px 14px rgba(0, 0, 0, 0.55)'
                : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05), inset 0 -1px 0 0 rgba(0, 0, 0, 0.30)'
            }}
          >
            {/* Specular glass reflection overlay */}
            {['idle', 'validation_error', 'api_error'].includes(subState) && (
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none" />
            )}

            {/* Precision Sheen Effect */}
            {['idle', 'validation_error', 'api_error'].includes(subState) && (
              <span
                className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{
                  background: 'linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.08) 50%, transparent 80%)',
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
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-white/95 font-medium">Send Inquiry</span>
                  <Send className={`h-3.5 w-3.5 text-white/80 transition-transform duration-200 ${isBtnHovered ? 'translate-x-0.5 -translate-y-0.5 text-white' : ''}`} strokeWidth={1.75} />
                </motion.span>
              )}
              {subState === 'validation_error' && (
                <motion.span
                  key="validation_error"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 text-white font-medium"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-white" strokeWidth={1.75} />
                  <span>Please complete required fields</span>
                </motion.span>
              )}
              {subState === 'api_error' && (
                <motion.span
                  key="api_error"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 text-white font-medium"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-white" strokeWidth={1.75} />
                  <span>Something went wrong — try again</span>
                </motion.span>
              )}
              {subState === 'submitting' && (
                <motion.span
                  key="submitting"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 text-white/90"
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
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 text-white font-semibold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={1.75} />
                  <span>Message Sent</span>
                </motion.span>
              )}
              {subState === 'error' && (
                <motion.span
                  key="error"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 text-white font-medium"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-white" strokeWidth={1.75} />
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
