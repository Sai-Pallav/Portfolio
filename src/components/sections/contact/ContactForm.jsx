import React, { useState, useCallback, useEffect, useRef, memo } from 'react'
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

const FloatingInput = memo(function FloatingInput({ id, label, type, value, onChange, onBlur, error, touched, icon: Icon }) {
  const [focused, setFocused] = useState(false)
  const hasValue = value && value.length > 0

  return (
    <div className="relative w-full group">
      <div className={`absolute left-4 top-[24px] -translate-y-1/2 pointer-events-none transition-all duration-300 z-10 ${
        focused ? 'text-[var(--accent)] scale-110' : hasValue ? 'text-[var(--text-secondary)]' : 'text-white/35'
      }`}>
        {Icon && <Icon className="h-4 w-4" strokeWidth={1.75} />}
      </div>
      <input
        type={type}
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false)
          if (onBlur) onBlur(e)
        }}
        placeholder=" "
        aria-required="true"
        className={`peer w-full rounded-[12px] border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent pl-10 pr-4 pt-[24px] pb-[10px] text-xs md:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop-blur-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),inset_0_0_0_1px_rgba(255,255,255,0.02)] hover:border-white/[0.12] hover:bg-white/[0.04] focus:border-[var(--accent)]/50 focus:shadow-[0_0_0_3px_var(--accent-dim),0_0_20px_var(--accent-dim),inset_0_1px_2px_rgba(0,0,0,0.3)] focus:bg-white/[0.05] ${
          touched && error
            ? 'border-red-500/30 focus:border-red-500/50 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1),0_0_20px_rgba(239,68,68,0.05),inset_0_1px_2px_rgba(0,0,0,0.3)] focus:bg-red-500/5'
            : ''
        }`}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        className={`absolute left-10 top-3 origin-[0] duration-300 transform pointer-events-none transition-all ease-[cubic-bezier(0.16,1,0.3,1)] font-medium ${
          touched && error ? 'peer-focus:text-red-400' : 'peer-focus:text-[var(--accent)]'
        } ${
          focused || hasValue
            ? '-translate-y-[14px] scale-75 text-[9px] uppercase tracking-[0.15em] text-[var(--text-secondary)] bg-[rgba(10,12,16,0.95)] px-2 -mx-2 rounded'
            : 'translate-y-0 scale-100 text-xs md:text-sm capitalize tracking-wide text-white/50'
        }`}
      >
        {label}
      </label>
      
      {touched && error && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          id={`${id}-error`}
          className="mt-1.5 block text-[10px] text-red-400 tracking-normal font-normal px-1"
          role="alert"
        >
          ⚠ {error}
        </motion.span>
      )}
      {touched && !error && hasValue && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-1.5 block text-[10px] tracking-normal font-normal px-1"
          style={{ color: 'var(--accent)' }}
        >
          ✓ Valid {label.replace(' *', '').replace('Your ', '').toLowerCase()}
        </motion.span>
      )}
    </div>
  )
})

const FloatingTextarea = memo(function FloatingTextarea({ id, label, value, onChange, onBlur, error, touched, rows = 5, characterCount, characterLimit, icon: Icon }) {
  const [focused, setFocused] = useState(false)
  const hasValue = value && value.length > 0

  return (
    <div className="relative w-full group">
      <div className={`absolute left-4 top-[24px] -translate-y-1/2 pointer-events-none transition-all duration-300 z-10 ${
        focused ? 'text-[var(--accent)] scale-110' : hasValue ? 'text-[var(--text-secondary)]' : 'text-white/35'
      }`}>
        {Icon && <Icon className="h-4 w-4" strokeWidth={1.75} />}
      </div>
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false)
          if (onBlur) onBlur(e)
        }}
        placeholder=" "
        rows={rows}
        aria-required="true"
        className={`peer w-full rounded-[12px] border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent pl-10 pr-4 pt-[24px] pb-[12px] text-xs md:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop-blur-xl resize-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),inset_0_0_0_1px_rgba(255,255,255,0.02)] hover:border-white/[0.12] hover:bg-white/[0.04] focus:border-[var(--accent)]/50 focus:shadow-[0_0_0_3px_var(--accent-dim),0_0_20px_var(--accent-dim),inset_0_1px_2px_rgba(0,0,0,0.3)] focus:bg-white/[0.05] leading-relaxed ${
          touched && error
            ? 'border-red-500/30 focus:border-red-500/50 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1),0_0_20px_rgba(239,68,68,0.05),inset_0_1px_2px_rgba(0,0,0,0.3)] focus:bg-red-500/5'
            : ''
        }`}
        style={{ minHeight: '150px' }}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        className={`absolute left-10 top-3 origin-[0] duration-300 transform pointer-events-none transition-all ease-[cubic-bezier(0.16,1,0.3,1)] font-medium ${
          touched && error ? 'peer-focus:text-red-400' : 'peer-focus:text-[var(--accent)]'
        } ${
          focused || hasValue
            ? '-translate-y-[14px] scale-75 text-[9px] uppercase tracking-[0.15em] text-[var(--text-secondary)] bg-[rgba(10,12,16,0.95)] px-2 -mx-2 rounded'
            : 'translate-y-0 scale-100 text-xs md:text-sm capitalize tracking-wide text-white/50'
        }`}
      >
        {label}
      </label>
      
      <span className="absolute bottom-3 right-4 text-[10px] font-mono tracking-wider transition-all duration-300 pointer-events-none opacity-60"
        style={{ color: characterCount > characterLimit ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.4)' }}>
        {characterCount} / {characterLimit}
      </span>

      {touched && error && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          id={`${id}-error`}
          className="mt-1.5 block text-[10px] text-red-400 tracking-normal font-normal px-1"
          role="alert"
        >
          ⚠ {error}
        </motion.span>
      )}
      {touched && !error && hasValue && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-1.5 block text-[10px] tracking-normal font-normal px-1"
          style={{ color: 'var(--accent)' }}
        >
          ✓ Valid message
        </motion.span>
      )}
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
  hidden: { opacity: 0, y: 25, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.08,
      delayChildren: 0.1,
    }
  }
}

const FORM_CHILD_VARIANTS = {
  hidden: { opacity: 0, y: 15, filter: 'blur(3px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
}

const DOT_VARIANTS = {
  idle: (i) => ({
    scale: 1,
    y: 0,
    opacity: i === 0 ? 0.4 : i === 1 ? 0.3 : 0.2,
    transition: { duration: 0.3 }
  }),
  focused: (i) => ({
    opacity: [0.3, 0.9, 0.3],
    scale: [1, 1.25, 1],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut",
      delay: i * 0.15
    }
  }),
  submitting: (i) => ({
    y: [0, -3.5, 0],
    opacity: [0.3, 1, 0.3],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: "easeInOut",
      delay: i * 0.08
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

export default memo(function ContactForm() {
  const shouldReduceMotion = useReducedMotion()
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })
  const [isFocused, setIsFocused] = useState(false)
  const [inquiryType, setInquiryType] = useState('Internship')
  const [touched, setTouched] = useState({ name: false, email: false, subject: false, message: false })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

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
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ type: '', message: '' })
  const [subState, setSubState] = useState('idle') 
  const [isBtnHovered, setIsBtnHovered] = useState(false)
  const [ripples, setRipples] = useState([])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setSubState(prev => prev === 'error' ? 'idle' : prev)
    setErrors(prev => {
      if (prev[name]) {
        const err = validateField(name, value)
        return { ...prev, [name]: err }
      }
      return prev
    })
  }, [])

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    
    if (value.trim() || errors[name]) {
      const err = validateField(name, value)
      setErrors(prev => ({ ...prev, [name]: err }))
    }
  }, [errors])

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

  const handleSubmit = async (e) => {
    e.preventDefault()

    const allTouched = { name: true, email: true, subject: true, message: true }
    setTouched(allTouched)

    if (subState === 'error') {
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
      setStatus({ type: 'error', message: 'Please resolve the highlighted validation issues.' })
      return
    }

    setSubState('submitting')
    setStatus({ type: '', message: '' })

    if (!isConfigured) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      setSubState('success')
      setFormData({ name: '', email: '', subject: '', message: '' })
      setTouched({ name: false, email: false, subject: false, message: false })
      setTimeout(() => {
        setSubState('idle')
        setStatus({ type: '', message: '' })
      }, 5000)
      return
    }

    try {
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
      setSubState('success')
      setFormData({ name: '', email: '', subject: '', message: '' })
      setTouched({ name: false, email: false, subject: false, message: false })
      setTimeout(() => {
        setSubState('idle')
        setStatus({ type: '', message: '' })
      }, 5000)
    } catch (error) {
      console.error('EmailJS Error:', error)
      setStatus({
        type: 'error',
        message: 'Unable to process submission. Please retry, or email me directly.'
      })
      setSubState('error')
    }
  }

  const activeDotState = subState === 'submitting' ? 'submitting' : isFocused ? 'focused' : 'idle'

  return (
    <motion.div
      variants={FORM_CARD_VARIANTS}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocused(false)
        }
      }}
      className="relative rounded-[20px] border border-white/[0.08] bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-3xl p-6 sm:p-8 md:p-8 w-full shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6),0_2px_8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-1px_1px_rgba(0,0,0,0.2)] overflow-hidden"
    >
      {/* Ambient theme-based glow */}
      <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] pointer-events-none"
        style={{ background: 'var(--accent)', opacity: 0.15 }} />
      
      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none rounded-[20px]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
      
      {/* Corner accent dots with interactive loading animations */}
      <div className="absolute top-4 right-4 flex gap-1 z-20">
        <motion.div 
          custom={0}
          variants={DOT_VARIANTS}
          animate={activeDotState}
          className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" 
        />
        <motion.div 
          custom={1}
          variants={DOT_VARIANTS}
          animate={activeDotState}
          className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" 
        />
        <motion.div 
          custom={2}
          variants={DOT_VARIANTS}
          animate={activeDotState}
          className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" 
        />
      </div>
      
      {/* Animated light sweep */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[20px]">
        <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-[sweep_8s_ease-in-out_infinite]" />
      </div>
      
      <motion.div variants={FORM_CHILD_VARIANTS} className="mb-6 relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-6 h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
          <span className="text-[10px] font-mono tracking-[0.2em] font-semibold text-[var(--accent)] uppercase">
            Contact
          </span>
          <div className="w-6 h-[1px] bg-gradient-to-r from-[var(--accent)] to-transparent" />
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

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <motion.div variants={FORM_CHILD_VARIANTS} className="space-y-2 relative z-30" ref={dropdownRef}>
          <label htmlFor="inquiry-type" className="sr-only text-[10px] font-mono tracking-[0.08em] font-medium text-[var(--text-muted)] uppercase">
            What brings you here?
          </label>
          <label className="text-[10px] font-mono tracking-[0.08em] font-medium text-[var(--text-muted)] uppercase">
            What brings you here?
          </label>
          <div className="relative">
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 z-10 ${
              isDropdownOpen ? 'text-[var(--accent)] scale-110' : 'text-white/35'
            }`}>
              <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <button
              type="button"
              id="inquiry-type"
              onClick={() => setIsDropdownOpen(prev => !prev)}
              className="w-full rounded-[12px] border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent pl-10 pr-4 py-3 text-xs md:text-sm text-[var(--text-primary)] outline-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] backdrop-blur-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),inset_0_0_0_1px_rgba(255,255,255,0.02)] hover:border-white/[0.12] hover:bg-white/[0.04] focus:border-[var(--accent)]/50 focus:shadow-[0_0_0_3px_var(--accent-dim),0_0_20px_var(--accent-dim),inset_0_1px_2px_rgba(0,0,0,0.3)] focus:bg-white/[0.04] flex items-center justify-between focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
                  className="absolute z-50 left-0 right-0 mt-2 rounded-[12px] border border-white/[0.08] bg-[#121316] backdrop-blur-3xl py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden"
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
                        className={`px-4 py-2.5 text-xs cursor-pointer transition-all duration-200 flex items-center justify-between ${
                          isSelected 
                            ? 'text-[var(--accent)] font-semibold bg-white/[0.05]'
                            : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.03]'
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
            error={errors.message}
            touched={touched.message}
            rows={4}
            characterCount={formData.message.length}
            characterLimit={1000}
            icon={MessageSquare}
          />
        </motion.div>

        {status.message && (
          <motion.div
            variants={FORM_CHILD_VARIANTS}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[10px] border p-3 text-xs flex items-center gap-2.5 ${
              status.type === 'success'
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
            type={subState === 'error' ? 'button' : 'submit'}
            onClick={(e) => {
              handleRipple(e)
              if (subState === 'error') {
                setSubState('idle')
              }
            }}
            disabled={subState === 'submitting' || subState === 'success'}
            onMouseEnter={() => setIsBtnHovered(true)}
            onMouseLeave={() => setIsBtnHovered(false)}
            className="group/btn relative overflow-hidden w-full rounded-[12px] py-3.5 px-6 text-xs font-semibold tracking-wide flex items-center justify-center gap-2.5 select-none outline-none border border-white/[0.1] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
            style={{ 
              background: subState === 'idle' || subState === 'success' ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)' : undefined,
              boxShadow: (subState === 'idle' || subState === 'success') ? '0 4px 15px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)' : undefined
            }}
          >
            {/* Glass reflection overlay */}
            {subState === 'idle' && (
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none" />
            )}
            
            {/* Animated Sheen/Shine Effect (Only on Hover, Idle State) */}
            {subState === 'idle' && (
              <span 
                className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: 'linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.15) 50%, transparent 80%)',
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
