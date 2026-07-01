import { motion, useReducedMotion, AnimatePresence, useMotionValue, useSpring, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { personal, contactMethods } from '@/data/personal'
import emailjs from '@emailjs/browser'
import Contact3DObject from './Contact3DObject'
import {
  Send,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react'

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const isConfigured = !!(serviceId && templateId && publicKey && 
  !serviceId.includes('your_') && 
  !templateId.includes('your_') && 
  !publicKey.includes('your_')
)

// Custom Floating Input Component for Premium Feel
function FloatingInput({ id, label, type, value, onChange, onBlur, error }) {
  const [focused, setFocused] = useState(false)
  const hasValue = value && value.length > 0

  return (
    <div className="relative w-full group">
      {/* Premium sub-pixel glow outline on focus */}
      <div
        className={`absolute -inset-[1.5px] rounded-2xl transition-all duration-500 opacity-0 group-focus-within:opacity-100 blur-[2px] pointer-events-none -z-10 ${
          error ? 'bg-gradient-to-r from-red-500/30 to-rose-600/30' : 'bg-gradient-to-r from-accent/30 to-indigo-500/30'
        }`}
      />
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
        className={`peer w-full rounded-2xl border bg-bg-surface/30 px-4 pt-6 pb-2 text-sm text-[var(--text-heading)] outline-none transition-all duration-300 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.02)] ${
          error
            ? 'border-red-500/30 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.08)]'
            : 'border-white/[0.06] focus:border-accent/50 focus:shadow-[0_0_20px_var(--accent-dim)]'
        } focus:bg-bg-surface/50`}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        className={`absolute left-4 top-4 origin-[0] -translate-y-3.5 scale-75 text-xs text-muted duration-300 transform pointer-events-none peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:text-sm peer-focus:-translate-y-3.5 peer-focus:scale-75 ${
          error ? 'peer-focus:text-red-500' : 'peer-focus:text-accent'
        } ${focused || hasValue ? '-translate-y-3.5 scale-75' : ''} font-semibold tracking-wide`}
      >
        {label}
      </label>
      {error && (
        <motion.span
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          id={`${id}-error`}
          className="mt-1 block text-xs text-red-400 font-medium tracking-wide px-1"
          role="alert"
        >
          {error}
        </motion.span>
      )}
    </div>
  )
}

// Custom Floating Textarea Component
function FloatingTextarea({ id, label, value, onChange, onBlur, error, rows = 5, characterCount, characterLimit }) {
  const [focused, setFocused] = useState(false)
  const hasValue = value && value.length > 0

  return (
    <div className="relative w-full group">
      {/* Premium sub-pixel glow outline on focus */}
      <div
        className={`absolute -inset-[1.5px] rounded-2xl transition-all duration-500 opacity-0 group-focus-within:opacity-100 blur-[2px] pointer-events-none -z-10 ${
          error ? 'bg-gradient-to-r from-red-500/30 to-rose-600/30' : 'bg-gradient-to-r from-accent/30 to-indigo-500/30'
        }`}
      />
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
        className={`peer w-full rounded-2xl border bg-bg-surface/30 px-4 pt-6 pb-2 text-sm text-[var(--text-heading)] outline-none transition-all duration-300 backdrop-blur-md resize-none shadow-[inset_0_1px_2px_rgba(255,255,255,0.02)] ${
          error
            ? 'border-red-500/30 focus:border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.08)]'
            : 'border-white/[0.06] focus:border-accent/50 focus:shadow-[0_0_20px_var(--accent-dim)]'
        } focus:bg-bg-surface/50`}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <label
        htmlFor={id}
        className={`absolute left-4 top-4 origin-[0] -translate-y-3.5 scale-75 text-xs text-muted duration-300 transform pointer-events-none peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:text-sm peer-focus:-translate-y-3.5 peer-focus:scale-75 ${
          error ? 'peer-focus:text-red-500' : 'peer-focus:text-accent'
        } ${focused || hasValue ? '-translate-y-3.5 scale-75' : ''} font-semibold tracking-wide`}
      >
        {label}
      </label>
      <div className="mt-1 flex items-center justify-between min-h-[16px] px-1">
        {error ? (
          <motion.span
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            id={`${id}-error`}
            className="block text-xs text-red-400 font-medium tracking-wide"
            role="alert"
          >
            {error}
          </motion.span>
        ) : (
          <div />
        )}
        <span className={`text-[10px] font-mono tracking-widest ${characterCount > characterLimit ? 'text-red-400' : 'text-muted'}`}>
          {characterCount} / {characterLimit}
        </span>
      </div>
    </div>
  )
}

// Magnetic Button Wrapper for High-End Interaction Feel
function MagneticButton({ children, disabled, className, type = 'submit' }) {
  const ref = useRef(null)
  const rectRef = useRef(null)
  const shouldReduceMotion = useReducedMotion()

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 })
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 })

  const handleMouseMove = (e) => {
    if (disabled || shouldReduceMotion) return
    if (!rectRef.current && ref.current) {
      rectRef.current = ref.current.getBoundingClientRect()
    }
    const rect = rectRef.current
    if (!rect) return
    const { clientX, clientY } = e
    const offsetX = clientX - (rect.left + rect.width / 2)
    const offsetY = clientY - (rect.top + rect.height / 2)
    x.set(offsetX / 4)
    y.set(offsetY / 4)
  }

  const handleMouseLeave = () => {
    rectRef.current = null
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: shouldReduceMotion ? 0 : springX, y: shouldReduceMotion ? 0 : springY }}
      whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
      className={`${className} relative overflow-hidden`}
    >
      {/* Shimmer sweep animation overlay */}
      {!disabled && !shouldReduceMotion && (
        <motion.div
          className="absolute inset-0 w-[50%] h-full skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
          animate={{
            left: ['-100%', '200%'],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  )
}

function Contact() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px 0px' })
  const shouldReduceMotion = useReducedMotion()

  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Spotlight border mouse position ref and handlers (Zero React re-renders on mousemove!)
  const formCardRef = useRef(null)
  const formCardRectRef = useRef(null)

  const handleMouseMoveCard = (e) => {
    if (!formCardRef.current || shouldReduceMotion) return
    if (!formCardRectRef.current) {
      formCardRectRef.current = formCardRef.current.getBoundingClientRect()
    }
    const rect = formCardRectRef.current
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    formCardRef.current.style.setProperty('--mouse-x', `${x}px`)
    formCardRef.current.style.setProperty('--mouse-y', `${y}px`)
  }

  const handleMouseEnterCard = () => {
    if (formCardRef.current) {
      formCardRectRef.current = formCardRef.current.getBoundingClientRect()
    }
  }

  const handleMouseLeaveCard = () => {
    formCardRectRef.current = null
  }

  useEffect(() => {
    if (!isConfigured) {
      console.log('EmailJS parameters not fully configured. Form will execute in Demo simulation mode.')
    }
  }, [])

  const validateField = (name, value) => {
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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // If an error already exists, validate in real time as they type
    if (errors[name]) {
      const err = validateField(name, value)
      setErrors(prev => ({ ...prev, [name]: err }))
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    const err = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: err }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate all fields
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

    setIsSubmitting(true)
    setStatus({ type: '', message: '' })

    if (!isConfigured) {
      // Demo Sim Mode for local/recruiters
      await new Promise(resolve => setTimeout(resolve, 1500))
      setIsSubmitting(false)
      setShowSuccess(true)
      console.log('Form submission simulated successfully (Demo mode):', formData)
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
          message: formData.message,
          to_email: personal.email,
        },
        publicKey
      )
      setIsSubmitting(false)
      setShowSuccess(true)
    } catch (error) {
      console.error('EmailJS Error:', error)
      setStatus({
        type: 'error',
        message: 'Unable to process submission. Please retry, or email me directly.'
      })
      setIsSubmitting(false)
    }
  }

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
        delayChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
    },
  }

  return (
    <section id="contact" ref={sectionRef} className="relative min-h-screen overflow-hidden px-6 py-24 md:py-32">
      {/* Background Layer with Glow Mesh and Noise */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-bg transition-colors duration-500" />

        {/* Animated Gradient Mesh Orbs */}
        {!shouldReduceMotion && (
          <>
            <motion.div
              animate={{
                x: [0, 60, -30, 0],
                y: [0, -80, 40, 0],
                scale: [1, 1.1, 0.95, 1],
              }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute -top-[10%] left-[10%] h-[450px] w-[450px] rounded-full bg-accent/10 blur-[130px] pointer-events-none transform-gpu will-change-transform"
            />
            <motion.div
              animate={{
                x: [0, -50, 60, 0],
                y: [0, 60, -50, 0],
                scale: [1, 0.95, 1.05, 1],
              }}
              transition={{
                duration: 28,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute top-[35%] -right-[10%] h-[500px] w-[500px] rounded-full bg-indigo-500/8 blur-[140px] pointer-events-none transform-gpu will-change-transform"
            />
            <motion.div
              animate={{
                x: [0, 30, -40, 0],
                y: [0, 40, -60, 0],
                scale: [1, 1.05, 0.95, 1],
              }}
              transition={{
                duration: 35,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="absolute -bottom-[10%] left-[15%] h-[480px] w-[480px] rounded-full bg-purple-500/8 blur-[130px] pointer-events-none transform-gpu will-change-transform"
            />
          </>
        )}

        {/* Ambient Grid Structure */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)] pointer-events-none" />

        {/* Fine Grain SVG Noise Overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.015] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <filter id="noiseFilterContact">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilterContact)" />
        </svg>

        {/* Linear divider highlights */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 lg:grid-cols-10 gap-16 lg:gap-20 items-center"
        >
          {/* LEFT SIDE: Information & Form Card (50% split on LG) */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 w-full relative z-20"
          >
            {/* Badge & Heading text */}
            <div className="mb-6 self-start inline-flex items-center gap-2.5 rounded-full border border-accent/20 bg-accent-dim/30 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-accent shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              <span>Get in touch</span>
            </div>

            <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.15] tracking-tight text-[var(--text-heading)]">
              Let's craft the <span className="bg-gradient-to-r from-accent via-indigo-400 to-accent-hover bg-clip-text text-transparent filter drop-shadow-[0_0_20px_var(--accent-dim)]">next thing</span> together.
            </h2>

            <p className="mt-6 text-base leading-relaxed text-secondary/80 md:text-lg font-medium mb-8">
              Have an engineering brief, a system architecture hurdle, or an open engineering role? Pitch it to me. I bring clear engineering judgment, swift responses, and a passion for crafting robust code.
            </p>

            {/* Interactive Spotlight Glow Border Wrapper containing Form Card */}
            <div
              ref={formCardRef}
              onMouseMove={handleMouseMoveCard}
              onMouseEnter={handleMouseEnterCard}
              onMouseLeave={handleMouseLeaveCard}
              className="relative p-[1px] overflow-hidden rounded-3xl bg-white/[0.06] shadow-[0_30px_90px_rgba(0,0,0,0.6)] transition-all duration-500 group/card w-full"
            >
              {/* Spotlight Glow Shader */}
              {!shouldReduceMotion && (
                <div
                  className="pointer-events-none absolute inset-0 transition duration-300 opacity-0 group-hover/card:opacity-100"
                  style={{
                    background: `radial-gradient(350px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), var(--accent), transparent 80%)`,
                  }}
                />
              )}

              {/* Inner Card Glass Container */}
              <div className="relative rounded-[23px] bg-bg-surface/35 backdrop-blur-3xl p-6 md:p-8 w-full h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">

                <AnimatePresence mode="wait">
                  {!showSuccess ? (
                    <motion.div
                      key="form-view"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Header Inside Card */}
                      <div className="mb-8 flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent/80 font-bold">Project Brief</p>
                          <h3 className="mt-2 text-2xl font-bold text-[var(--text-heading)] font-heading tracking-tight">Start the conversation.</h3>
                        </div>
                        <div className="inline-flex self-start sm:self-auto items-center gap-2 rounded-full border border-success/20 bg-success/5 px-3 py-1.5 text-xs font-semibold text-success/90 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          <span>Quick response guaranteed</span>
                        </div>
                      </div>

                      {/* Contact Form */}
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FloatingInput
                            id="name"
                            label="Your Name *"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.name}
                          />
                          <FloatingInput
                            id="email"
                            label="Your Email *"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.email}
                          />
                        </div>

                        <FloatingInput
                          id="subject"
                          label="Subject *"
                          type="text"
                          value={formData.subject}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={errors.subject}
                        />

                        <FloatingTextarea
                          id="message"
                          label="Message *"
                          value={formData.message}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={errors.message}
                          rows={6}
                          characterCount={formData.message.length}
                          characterLimit={1000}
                        />

                        {/* Status notification */}
                        {status.message && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-xl border p-4 text-xs ${status.type === 'success'
                                ? 'border-green-500/20 bg-green-500/5 text-green-400'
                                : 'border-red-500/20 bg-red-500/5 text-red-400'
                              }`}
                          >
                            {status.message}
                          </motion.div>
                        )}

                        {/* Magnetic CTA Submit Button */}
                        <MagneticButton
                          type="submit"
                          disabled={isSubmitting}
                          className={`mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl py-4 px-6 text-sm font-semibold transition-all duration-300 ${isSubmitting
                              ? 'cursor-not-allowed bg-accent/50 text-accent-contrast'
                              : 'bg-accent text-accent-contrast shadow-[0_15px_35px_var(--accent-dim)] hover:bg-accent-hover hover:shadow-[0_20px_50px_var(--border-glow)]'
                            }`}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4.5 w-4.5 animate-spin" />
                              <span>Transmitting message...</span>
                            </>
                          ) : (
                            <>
                              <span>Send Inquiry</span>
                              <Send className="h-4 w-4" />
                            </>
                          )}
                        </MagneticButton>
                      </form>
                    </motion.div>
                  ) : (
                    /* SUCCESS STATE VIEW */
                    <motion.div
                      key="success-view"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col items-center justify-center text-center py-10 px-4 min-h-[420px]"
                    >
                      {/* Animated Checkmark Circle */}
                      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success">
                        {!shouldReduceMotion && (
                          <div className="absolute inset-0 rounded-full bg-success/20 blur-md animate-pulse opacity-60" />
                        )}
                        <svg
                          className="h-10 w-10 text-success"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="3.5"
                        >
                          <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>

                      {/* Header */}
                      <h3 className="text-2xl font-bold text-[var(--text-heading)] font-heading mb-3">
                        Message Sent Successfully!
                      </h3>

                      {/* Body */}
                      <p className="text-secondary max-w-sm mb-8 leading-relaxed text-sm">
                        Thank you for reaching out, <span className="font-semibold text-primary">{formData.name}</span>. I've received your brief and will review it carefully. You can expect a responsive follow-up within 24 hours.
                      </p>

                      {/* Reset Button */}
                      <motion.button
                        onClick={() => {
                          setStatus({ type: '', message: '' })
                          setFormData({ name: '', email: '', subject: '', message: '' })
                          setShowSuccess(false)
                        }}
                        whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                        className="px-6 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-primary hover:bg-white/10 transition-colors"
                      >
                        Send another message
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </motion.div>

          {/* RIGHT SIDE: 3D Globe & Supporting Cards (50% split on LG) */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-5 flex flex-col justify-center w-full relative z-20"
          >
            {/* 3D Globe Projection nested at the top of the Right Column */}
            <div className="relative w-full h-[260px] md:h-[320px] overflow-visible mb-8 flex items-center justify-center pointer-events-none z-10">
              <Contact3DObject />
            </div>

            {/* Availability Indicator Badge */}
            <div className="mt-4 flex items-start gap-3.5 rounded-2xl border border-white/[0.04] bg-bg-surface/30 backdrop-blur-xl p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] hover:border-white/10 hover:bg-bg-surface/50 transition-all duration-300">
              <span className="relative mt-1.5 flex h-2.5 w-2.5 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--text-heading)] tracking-wide">{personal.availability}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-secondary/70">
                  Open to full-stack, systems development, developer toolings, or backend roles.
                </p>
              </div>
            </div>

            {/* Contact Methods Stack - Balanced 2-Column Grid Layout */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contactMethods.map((method, index) => (
                <motion.div
                  key={method.label}
                  variants={itemVariants}
                  whileHover={shouldReduceMotion ? {} : { y: -3, scale: 1.01 }}
                  className={`group relative overflow-hidden rounded-2xl border border-white/[0.04] bg-bg-surface/30 backdrop-blur-xl p-5 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) hover:border-accent/30 hover:bg-bg-surface/50 hover:shadow-[0_20px_50px_var(--border-glow)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] ${
                    index === 0 ? 'sm:col-span-2' : 'col-span-1'
                  }`}
                >
                  {/* Premium top border light sweep on hover */}
                  <div className="absolute inset-x-0 top-0 h-[1px] translate-x-[-100%] bg-gradient-to-r from-transparent via-accent/50 to-transparent transition-transform duration-1000 cubic-bezier(0.16, 1, 0.3, 1) group-hover:translate-x-[100%]" />
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-secondary transition-all duration-500 group-hover:border-accent/40 group-hover:bg-accent-dim/50 group-hover:text-accent shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                      {method.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary/50">{method.label}</p>
                        <span className="font-mono text-[9px] text-secondary/30">0{index + 1}</span>
                      </div>
                      {method.href ? (
                        <a
                          href={method.href}
                          target={method.href.startsWith('http') ? '_blank' : undefined}
                          rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                          className="flex items-center justify-between gap-1 text-sm font-bold text-[var(--text-heading)] transition-colors duration-300 hover:text-accent mt-1"
                        >
                          <span className="truncate">{method.value}</span>
                          <ArrowUpRight className="h-4 w-4 flex-shrink-0 opacity-0 transition-all duration-300 -translate-x-1 translate-y-1 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100 text-accent" />
                        </a>
                      ) : (
                        <p className="text-sm font-bold text-[var(--text-heading)] mt-1">{method.value}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Promise Banner */}
            <div className="mt-6 flex items-center gap-2.5 text-xs text-secondary/65 font-medium">
              <ShieldCheck className="h-4.5 w-4.5 text-accent/80" />
              <span>Response promise: I typically reply within 24 hours.</span>
            </div>

          </motion.div>

        </motion.div>
      </div>
    </section>
  )
}

export default Contact
