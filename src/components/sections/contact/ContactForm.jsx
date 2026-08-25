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

/* ============================================================================
   REFINED CONTROL INPUT SURFACE
   ============================================================================ */
const ControlInput = memo(function ControlInput({ id, label, type, value, onChange, onBlur, error, touched, icon: Icon, onFocus }) {
  const [focused, setFocused] = useState(false)
  const hasValue = value && value.length > 0
  const isRequired = label.includes('*')
  const displayLabel = label.replace(' *', '').toUpperCase()

  return (
    <div className="relative w-full group">
      {/* Icon — pinned at bottom-half of the 48px input so it aligns with the text cursor when focused */}
      <div
        className={`absolute left-3.5 pointer-events-none transition-colors duration-150 z-10 ${
          focused ? 'text-[#a78bfa]' : hasValue ? 'text-[#a78bfa]/80' : 'text-[#6b647e] group-hover:text-[#8b83a0]'
        }`}
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />}
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
        className={`peer w-full h-[48px] rounded-[12px] border pl-10 pr-3.5 text-xs sm:text-[13px] text-white font-medium placeholder-transparent outline-none transition-all duration-150 bg-[#0c0a18] ${
          touched && error
            ? 'border-red-500/50 focus:border-red-500/80 focus:shadow-[0_0_8px_rgba(239,68,68,0.12)]'
            : focused
            ? 'border-[#a78bfa] shadow-[0_0_8px_rgba(167,139,250,0.12)] bg-[#0e0c1b]'
            : 'border-[#1c182e] hover:border-[#30284a]'
        }`}
        aria-describedby={error ? `${id}-error` : undefined}
      />

      {/* Floating Monospace Label */}
      <label
        htmlFor={id}
        className={`absolute transition-all duration-150 pointer-events-none select-none flex items-center ease-out ${
          focused || hasValue
            ? 'top-0 -translate-y-1/2 left-8 text-[9px] font-mono tracking-[0.1em] font-semibold text-[#a78bfa] uppercase px-1.5 rounded-[2px] z-10'
            : 'top-0 h-full left-10 text-xs sm:text-[13px] font-medium text-[#8b859e] group-hover:text-[#a29bbb]'
        }`}
        style={focused || hasValue ? { backgroundColor: focused ? '#0e0c1b' : '#0c0a18' } : {}}
      >
        <span>{focused || hasValue ? displayLabel : label}</span>
        {(focused || hasValue) && isRequired && <span className="text-[#a78bfa]/60 text-[9px] ml-0.5 font-normal">*</span>}
      </label>

      {/* Error State */}
      <div className="min-h-[16px] relative mt-1">
        <AnimatePresence initial={false}>
          {touched && error && (
            <motion.div
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.15 }}
              id={`${id}-error`}
              className="flex items-center gap-1.5 text-[11px] text-[#ef4444] font-medium px-0.5"
              role="alert"
            >
              <span className="text-[10px] leading-none">⚠</span>
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})

/* ============================================================================
   REFINED WORKSPACE TEXTAREA SURFACE
   ============================================================================ */
const ControlTextarea = memo(function ControlTextarea({ id, label, value, onChange, onBlur, error, touched, rows = 4, characterCount, characterLimit, icon: Icon, onFocus }) {
  const [focused, setFocused] = useState(false)
  const hasValue = value && value.length > 0
  const isRequired = label.includes('*')
  const displayLabel = label.replace(' *', '').toUpperCase()

  return (
    <div className="relative w-full group">
      {/* Icon pinned at pt-3.5 to align with first line of text */}
      <div
        className={`absolute left-3.5 pointer-events-none transition-colors duration-150 z-10 flex items-center ${
          focused ? 'text-[#a78bfa]' : hasValue ? 'text-[#a78bfa]/80' : 'text-[#6b647e] group-hover:text-[#8b83a0]'
        }`}
        style={{ top: '14px' }}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />}
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
        className={`peer w-full rounded-[12px] border pl-10 pr-3.5 pt-3.5 pb-6 text-xs sm:text-[13px] text-white font-medium placeholder-transparent outline-none transition-all duration-150 resize-none bg-[#0c0a18] ${
          touched && error
            ? 'border-red-500/50 focus:border-red-500/80 focus:shadow-[0_0_8px_rgba(239,68,68,0.12)]'
            : focused
            ? 'border-[#a78bfa] shadow-[0_0_8px_rgba(167,139,250,0.12)] bg-[#0e0c1b]'
            : 'border-[#1c182e] hover:border-[#30284a]'
        }`}
        style={{ minHeight: '115px' }}
        aria-describedby={error ? `${id}-error` : undefined}
      />

      <label
        htmlFor={id}
        className={`absolute transition-all duration-150 pointer-events-none select-none flex items-center ease-out ${
          focused || hasValue
            ? 'top-0 -translate-y-1/2 left-8 text-[9px] font-mono tracking-[0.1em] font-semibold text-[#a78bfa] uppercase px-1.5 rounded-[2px] z-10'
            : 'left-10 text-xs sm:text-[13px] font-medium text-[#8b859e] group-hover:text-[#a29bbb]'
        }`}
        style={{
          ...(focused || hasValue ? { backgroundColor: focused ? '#0e0c1b' : '#0c0a18' } : { top: '14px' })
        }}
      >
        <span>{focused || hasValue ? displayLabel : label}</span>
        {(focused || hasValue) && isRequired && <span className="text-[#a78bfa]/60 text-[9px] ml-0.5 font-normal">*</span>}
      </label>

      {/* Integrated Monospace Counter */}
      <span
        className={`absolute bottom-2.5 right-3 text-[10px] font-mono tracking-wider pointer-events-none select-none ${
          characterCount > characterLimit
            ? 'text-red-400 font-medium'
            : 'text-[#5b5470]'
        }`}
      >
        {characterCount} / {characterLimit}
      </span>

      <div className="min-h-[16px] relative mt-1">
        <AnimatePresence initial={false}>
          {touched && error && (
            <motion.div
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.15 }}
              id={`${id}-error`}
              className="flex items-center gap-1.5 text-[11px] text-[#ef4444] font-medium px-0.5"
              role="alert"
            >
              <span className="text-[10px] leading-none">⚠</span>
              <span>{error}</span>
            </motion.div>
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

/* Continuous Smooth Animated Status Indicator Dots */
const StatusDots = memo(function StatusDots({ isFormActive = true, subState = 'idle', isTyping = false }) {
  const isSubmitting = subState === 'submitting'
  const isActive = isSubmitting || isTyping

  return (
    <div className="absolute top-6 right-6 flex gap-2 items-center z-20 pointer-events-none">
      {[0, 1, 2].map((idx) => {
        const delayClass = idx === 1 ? 'status-dot-delay-1' : idx === 2 ? 'status-dot-delay-2' : ''
        return (
          <span
            key={idx}
            className={`w-2 h-2 rounded-full border transition-colors duration-300 ease-out ${
              isActive ? `status-dot-anim ${delayClass}` : ''
            } ${
              isActive
                ? 'bg-[#a78bfa] border-[#c4b5fd] shadow-[0_0_5px_rgba(167,139,250,0.5)]'
                : 'bg-[#141022] border-[#2d2547] opacity-40'
            }`}
          />
        )
      })}
    </div>
  )
})

/* Editorial Header Component */
const FormHeader = memo(function FormHeader() {
  return (
    <div className="mb-4 relative z-10">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-4 h-[1px] bg-gradient-to-r from-transparent via-[#2b2447] to-transparent"></span>
        <span className="text-[10px] font-mono tracking-[0.2em] font-semibold text-[#8b859e] uppercase">
          CONTACT SYSTEM
        </span>
        <span className="w-4 h-[1px] bg-gradient-to-r from-[#2b2447] via-[#2b2447] to-transparent"></span>
      </div>

      <h2 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight leading-tight mb-1.5 font-sans">
        Let’s Build Something
        <span className="block text-[#a78bfa] font-bold mt-0.5">
          Exceptional
        </span>
      </h2>

      <p className="text-xs sm:text-[13px] text-[#8b859e] leading-relaxed max-w-sm font-normal">
        I usually respond within 24 hours. Let’s discuss your project and create something remarkable together.
      </p>
    </div>
  )
})

/* HERO SELECTOR: PRIMARY DECISION CONTROL */
const InquiryDropdown = memo(function InquiryDropdown({ inquiryType, onSelectInquiry }) {
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

  return (
    <div className="space-y-1 relative z-30 mb-3" ref={dropdownRef}>
      <label htmlFor="inquiry-type" className="block text-[10px] font-mono tracking-[0.15em] font-semibold text-[#8b859e] uppercase">
        WHAT BRINGS YOU HERE?
      </label>

      <div className="relative group/dd">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-150 z-10 text-[#6b647e] group-hover/dd:text-[#a78bfa]">
          <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
        </div>

        <button
          type="button"
          id="inquiry-type"
          onClick={() => setIsDropdownOpen(prev => !prev)}
          className={`w-full h-[50px] rounded-[12px] border pl-10 pr-3.5 text-xs sm:text-[13px] font-semibold text-white outline-none transition-all duration-150 bg-[#0e0c1b] flex items-center justify-between ${
            isDropdownOpen
              ? 'border-[#a78bfa] shadow-[0_0_8px_rgba(167,139,250,0.12)]'
              : 'border-[#221c38] hover:border-[#332b50]'
          }`}
          aria-haspopup="listbox"
          aria-expanded={isDropdownOpen}
        >
          <span className="font-semibold text-white tracking-wide">{inquiryType}</span>
          <ChevronDown
            className={`h-4 w-4 text-[#6b647e] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#a78bfa]' : ''}`}
          />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.ul
              initial={{ opacity: 0, y: -6, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 left-0 right-0 mt-1.5 rounded-[12px] border border-[#221c38] bg-[#0c0a18] py-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.95)] overflow-hidden"
              role="listbox"
            >
              {INQUIRY_OPTIONS.map((option, index) => {
                const isSelected = inquiryType === option
                return (
                  <li
                    key={option}
                    id={`option-${index}`}
                    onClick={() => {
                      onSelectInquiry(option)
                      setIsDropdownOpen(false)
                    }}
                    className={`px-3.5 py-2.5 text-xs sm:text-[13px] cursor-pointer transition-colors duration-150 flex items-center justify-between ${
                      isSelected
                        ? 'text-[#a78bfa] font-semibold bg-white/[0.04]'
                        : 'text-white/80 hover:text-white hover:bg-white/[0.03]'
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
    </div>
  )
})

export default memo(function ContactForm({ contactSystemState, onTransmit, setContactSystemState, setTransmissionFailed, onTypingChange, isFormActive = true }) {
  const shouldReduceMotion = useReducedMotion()
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })
  const [inquiryType, setInquiryType] = useState('Full-Time Opportunity')
  const [touched, setTouched] = useState({ name: false, email: false, subject: false, message: false })
  const clearFieldsTimeoutRef = useRef(null)
  const typingTimerRef = useRef(null)
  const apiErrorTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (clearFieldsTimeoutRef.current) clearTimeout(clearFieldsTimeoutRef.current)
      if (apiErrorTimeoutRef.current) clearTimeout(apiErrorTimeoutRef.current)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [])

  const [isTyping, setIsTyping] = useState(false)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ type: '', message: '' })
  const [subState, setSubState] = useState('idle')

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
    setIsTyping(true)

    if (onTypingChange) {
      onTypingChange(true)
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false)
      if (onTypingChange) onTypingChange(false)
    }, 1000)

    setErrors(prev => {
      if (prev[name]) {
        const err = validateField(name, value)
        if (err !== prev[name]) {
          return { ...prev, [name]: err }
        }
      }
      return prev
    })
  }, [resetErrorState, onTypingChange])

  const handleFocus = useCallback(() => {
    resetErrorState()
  }, [resetErrorState])

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    resetErrorState()

    setErrors(prev => {
      const err = validateField(name, value)
      if (err !== prev[name]) {
        return { ...prev, [name]: err }
      }
      return prev
    })
  }, [resetErrorState])

  const handleSelectInquiry = useCallback((opt) => {
    setInquiryType(opt)
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
      if (setSubState) setSubState('api_error')
      setStatus({ type: '', message: '' })
      if (setTransmissionFailed) setTransmissionFailed(true)
      setTimeout(() => {
        if (setTransmissionFailed) setTransmissionFailed(false)
      }, 400)
    }
  }

  useEffect(() => {
    if (contactSystemState === 'transmit') {
      const tSuccess = setTimeout(() => {
        setSubState(curr => (curr === 'submitting' ? 'success' : curr))
      }, 900)

      clearFieldsTimeoutRef.current = setTimeout(() => {
        setFormData({ name: '', email: '', subject: '', message: '' })
        setTouched({ name: false, email: false, subject: false, message: false })
      }, 3000)

      return () => clearTimeout(tSuccess)
    } else if (contactSystemState === 'dormant') {
      setSubState('idle')
      setStatus({ type: '', message: '' })
    }
  }, [contactSystemState])

  const isTransmit = contactSystemState === 'transmit'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-[20px] border p-6 sm:p-7 md:p-7.5 w-full overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
        isFormActive
          ? 'border-[#2d254a] bg-[#090812] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_30px_rgba(167,139,250,0.10)]'
          : 'border-[#191528] bg-[#07060e] shadow-none opacity-65'
      }`}
    >
      <StatusDots isFormActive={isFormActive} subState={subState} isTyping={isTyping} />
      <FormHeader />

      <form onSubmit={handleSubmit} className="relative z-10 space-y-3">
        <InquiryDropdown inquiryType={inquiryType} onSelectInquiry={handleSelectInquiry} />

        <div className="grid gap-3 sm:grid-cols-2">
          <ControlInput
            id="name"
            label="Your Name *"
            type="text"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            error={errors.name}
            touched={touched.name}
            icon={User}
          />
          <ControlInput
            id="email"
            label="Your Email *"
            type="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            error={errors.email}
            touched={touched.email}
            icon={Mail}
          />
        </div>

        <div>
          <ControlInput
            id="subject"
            label="Subject *"
            type="text"
            value={formData.subject}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            error={errors.subject}
            touched={touched.subject}
            icon={PenTool}
          />
        </div>

        <div>
          <ControlTextarea
            id="message"
            label="Message *"
            value={formData.message}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            error={errors.message}
            touched={touched.message}
            rows={4}
            characterCount={formData.message.length}
            characterLimit={1000}
            icon={MessageSquare}
          />
        </div>

        {status.message && (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[8px] border p-2 text-xs flex items-center gap-2 font-mono ${
              status.type === 'success'
                ? 'border-[#a78bfa]/30 bg-[#a78bfa]/10 text-white'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {status.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-[#a78bfa]" strokeWidth={2} />}
            {status.type === 'error' && <AlertCircle className="h-3.5 w-3.5 text-red-400" strokeWidth={2} />}
            <span>{status.message}</span>
          </motion.div>
        )}

        {/* HERO CTA BUTTON */}
        <div className="w-full pt-1">
          <button
            type={['error', 'api_error', 'validation_error'].includes(subState) ? 'button' : 'submit'}
            onClick={() => {
              if (['error', 'api_error', 'validation_error'].includes(subState)) {
                resetErrorState()
              }
            }}
            disabled={subState === 'submitting' || subState === 'success'}
            className="group relative overflow-hidden w-full h-[48px] rounded-[12px] bg-[#a78bfa] hover:bg-[#b498ff] active:scale-[0.995] text-white font-semibold text-xs sm:text-[13px] tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(167,139,250,0.2)] transition-all duration-150 cursor-pointer outline-none focus:ring-2 focus:ring-[#a78bfa]/50 disabled:opacity-75"
          >
            <AnimatePresence mode="wait">
              {subState === 'idle' && (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  className="flex items-center gap-2 relative z-10"
                >
                  <span className="font-semibold">Send Inquiry</span>
                  <Send className="h-3.5 w-3.5 text-white transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
                </motion.span>
              )}
              {subState === 'validation_error' && (
                <motion.span
                  key="validation_error"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  className="flex items-center gap-2 text-white font-medium relative z-10"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                  <span>Please complete required fields</span>
                </motion.span>
              )}
              {subState === 'api_error' && (
                <motion.span
                  key="api_error"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  className="flex items-center gap-2 text-white font-medium relative z-10"
                >
                  <AlertCircle className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                  <span>Something went wrong — try again</span>
                </motion.span>
              )}
              {subState === 'submitting' && (
                <motion.span
                  key="submitting"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  className="flex items-center gap-2 text-white relative z-10"
                >
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" strokeWidth={2} />
                  <span>Sending...</span>
                </motion.span>
              )}
              {subState === 'success' && (
                <motion.span
                  key="success"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  className="flex items-center gap-2 text-white font-semibold relative z-10"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                  <span>Message Sent</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </form>
    </motion.div>
  )
})
