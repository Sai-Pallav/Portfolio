import React, { useState, useCallback, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import emailjs from '@emailjs/browser'
import { Send, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react'
import { personal } from '@/data/personal'

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const isConfigured = !!(serviceId && templateId && publicKey && 
  !serviceId.includes('your_') && 
  !templateId.includes('your_') && 
  !publicKey.includes('your_')
)

const FloatingInput = memo(function FloatingInput({ id, label, type, value, onChange, onBlur, error, touched }) {
  const [focused, setFocused] = useState(false)
  const hasValue = value && value.length > 0

  return (
    <div className="relative w-full group">
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
        className={`peer w-full rounded-xl border bg-black/30 px-4 pt-[26px] pb-[8px] text-sm md:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-150 ease-out backdrop-blur-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
          touched && error
            ? 'border-red-500/30 focus:border-red-500/50 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)] focus:bg-black/40'
            : 'border-white/12 hover:border-white/20 focus:border-[var(--accent)]/60 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_15%,transparent)] focus:bg-black/40'
        }`}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        className={`absolute left-4 top-3.5 origin-[0] duration-300 transform pointer-events-none transition-all ease-[cubic-bezier(0.16,1,0.3,1)] font-medium ${
          touched && error ? 'peer-focus:text-red-400' : 'peer-focus:text-[var(--accent)]'
        } ${
          focused || hasValue
            ? '-translate-y-[15px] scale-75 text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] bg-[rgba(10,12,16,0.9)] px-1.5 -mx-1.5 rounded'
            : 'translate-y-0 scale-100 text-sm md:text-base capitalize tracking-wide text-white/60'
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

const FloatingTextarea = memo(function FloatingTextarea({ id, label, value, onChange, onBlur, error, touched, rows = 5, characterCount, characterLimit }) {
  const [focused, setFocused] = useState(false)
  const hasValue = value && value.length > 0

  return (
    <div className="relative w-full group">
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
        className={`peer w-full rounded-xl border bg-black/30 px-4 pt-[26px] pb-8 text-sm md:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-150 ease-out backdrop-blur-sm resize-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] leading-relaxed focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
          touched && error
            ? 'border-red-500/30 focus:border-red-500/50 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)] focus:bg-black/40'
            : 'border-white/12 hover:border-white/20 focus:border-[var(--accent)]/60 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_15%,transparent)] focus:bg-black/40'
        }`}
        style={{ minHeight: '160px' }}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        className={`absolute left-4 top-3.5 origin-[0] duration-300 transform pointer-events-none transition-all ease-[cubic-bezier(0.16,1,0.3,1)] font-medium ${
          touched && error ? 'peer-focus:text-red-400' : 'peer-focus:text-[var(--accent)]'
        } ${
          focused || hasValue
            ? '-translate-y-[15px] scale-75 text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] bg-[rgba(10,12,16,0.9)] px-1.5 -mx-1.5 rounded'
            : 'translate-y-0 scale-100 text-sm md:text-base capitalize tracking-wide text-white/60'
        }`}
      >
        {label}
      </label>
      
      <span className={`absolute bottom-2.5 right-3.5 text-[9px] font-mono tracking-wider transition-opacity duration-300 pointer-events-none ${
        focused ? 'opacity-100' : 'opacity-70'
      } ${characterCount > characterLimit ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.08,
      delayChildren: 0.1,
    }
  }
}

const FORM_CHILD_VARIANTS = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
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
    
    // Only validate on blur if:
    // 1. Field has a value (user started typing), OR
    // 2. Field had an error before (re-validate to clear error)
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
      }, 3000)
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
      }, 3000)
    } catch (error) {
      console.error('EmailJS Error:', error)
      setStatus({
        type: 'error',
        message: 'Unable to process submission. Please retry, or email me directly.'
      })
      setSubState('error')
    }
  }

  return (
    <motion.div
      variants={FORM_CARD_VARIANTS}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-surface/80 via-raised/60 to-surface/80 backdrop-blur-2xl p-8 md:p-10 w-full shadow-2xl shadow-black/40 overflow-hidden"
    >
      {/* Subtle accent gradient border glow (top edge only) */}
      <div 
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-60"
        style={{
          background: `linear-gradient(to bottom, var(--accent) 0%, transparent 30%)`,
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 8%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 8%)',
          opacity: 0.12,
        }}
      />
      
      {/* Optional: Subtle corner accent glow */}
      <div 
        className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, var(--accent) 0%, transparent 70%)`,
          opacity: 0.08,
        }}
      />
      
      <motion.div variants={FORM_CHILD_VARIANTS} className="mb-6 relative z-10">
        <h3 className="text-2xl font-bold text-[var(--text-heading)] font-heading tracking-tight mb-2">Send a Project Inquiry</h3>
        <p className="text-xs text-[var(--text-secondary)] opacity-80 mb-4">Fill out the form below and I'll get back to you within 24 hours.</p>
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent w-full" aria-hidden="true" />
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <motion.div variants={FORM_CHILD_VARIANTS} className="space-y-2.5" ref={dropdownRef}>
          <label className="text-[11px] font-mono tracking-[0.08em] font-medium text-[var(--text-muted)] uppercase">
            What brings you here?
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(prev => !prev)}
              className="w-full rounded-xl border border-white/12 bg-black/30 hover:border-white/20 focus:border-[var(--accent)]/60 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_15%,transparent)] px-4 py-3.5 text-sm md:text-base text-[var(--text-primary)] outline-none transition-all duration-150 ease-out backdrop-blur-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] flex items-center justify-between focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
            >
              <span>{inquiryType}</span>
              <ChevronDown 
                className={`h-4 w-4 text-[var(--text-secondary)] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} 
              />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.ul
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute z-50 left-0 right-0 mt-2 rounded-xl border border-white/10 bg-gradient-to-b from-surface via-raised to-surface backdrop-blur-2xl py-1.5 shadow-2xl max-h-60 overflow-y-auto"
                  role="listbox"
                >
                  {INQUIRY_OPTIONS.map((option) => {
                    const isSelected = inquiryType === option
                    return (
                      <li
                        key={option}
                        onClick={() => {
                          setInquiryType(option)
                          setIsDropdownOpen(false)
                        }}
                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors duration-150 flex items-center justify-between ${
                          isSelected 
                            ? 'text-[var(--accent)] font-semibold bg-white/5' 
                            : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
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

        <motion.div variants={FORM_CHILD_VARIANTS} className="grid gap-6 sm:grid-cols-2">
          <FloatingInput
            id="name"
            label="Your Name *"
            type="text"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.name}
            touched={touched.name}
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
          />
        </motion.div>

        {status.message && (
          <motion.div
            variants={FORM_CHILD_VARIANTS}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-4 text-xs ${
              status.type === 'success'
                ? 'border-green-500/20 bg-green-500/5 text-green-400'
                : 'border-red-500/20 bg-red-500/5 text-red-400'
            }`}
          >
            {status.message}
          </motion.div>
        )}

        <motion.div variants={FORM_CHILD_VARIANTS} className="w-full">
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
            className={`group/btn relative overflow-hidden w-full rounded-xl py-3.5 px-6 text-sm font-medium tracking-wide flex items-center justify-center gap-2 select-none outline-none border transition-all duration-[250ms] ease-out will-change-transform focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none ${
              subState === 'success'
                ? 'border-[var(--accent)]/20 text-white scale-100'
                : subState === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_4px_12px_rgba(239,68,68,0.06)] scale-100'
                : 'text-white border-white/[0.04] hover:scale-[1.02] active:scale-[0.98]'
            }`}
            style={{
              background: subState === 'idle' || subState === 'success' ? 'var(--gradient-primary)' : undefined,
              boxShadow: subState === 'success' 
                ? '0 4px 20px var(--accent-glow)' 
                : subState === 'idle'
                ? (isBtnHovered ? '0 12px 32px -8px color-mix(in srgb, var(--accent) 65%, transparent)' : '0 8px 24px -8px color-mix(in srgb, var(--accent) 50%, transparent)')
                : undefined
            }}
          >
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
                  <Send className={`h-4 w-4 transition-transform duration-300 translate-y-[0.5px] ${isBtnHovered ? 'translate-x-1 -translate-y-0.5' : ''}`} strokeWidth={1.75} />
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
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
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
                  <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
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
                  <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
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
