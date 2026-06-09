import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { personal, contactMethods } from '@/data/personal'
import SocialIcon from '@/components/ui/SocialIcon'
import emailjs from '@emailjs/browser'
import {
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const isConfigured = !!(serviceId && templateId && publicKey)

const fields = [
  { id: 'name', label: 'Name', type: 'text', placeholder: 'Your name' },
  { id: 'email', label: 'Email', type: 'email', placeholder: 'your.email@example.com' },
  { id: 'subject', label: 'Subject', type: 'text', placeholder: "What's this about?" },
]

function Contact() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const shouldReduceMotion = useReducedMotion()

  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(() =>
    isConfigured
      ? { type: '', message: '' }
      : { type: 'error', message: `Contact form is not configured. Please email me directly at ${personal.email}` }
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isConfigured) {
      console.warn('EmailJS is not configured. Please add VITE_EMAILJS_* environment variables.')
    }
  }, [])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    else if (formData.name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters'

    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Please enter a valid email'

    if (!formData.subject.trim()) newErrors.subject = 'Subject is required'
    else if (formData.subject.trim().length < 3) newErrors.subject = 'Subject must be at least 3 characters'

    if (!formData.message.trim()) newErrors.message = 'Message is required'
    else if (formData.message.trim().length < 10) newErrors.message = 'Message must be at least 10 characters'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      setStatus({ type: 'error', message: 'Please fix the errors above' })
      return
    }
    if (!isConfigured) {
      setStatus({ type: 'error', message: `Contact form is not configured. Please email me directly at ${personal.email}` })
      return
    }

    setIsSubmitting(true)
    setStatus({ type: '', message: '' })

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
      setStatus({ type: 'success', message: "Message sent successfully! I'll get back to you soon." })
      setFormData({ name: '', email: '', subject: '', message: '' })
      setTimeout(() => setIsSubmitting(false), 3000)
    } catch (error) {
      console.error('EmailJS Error:', error)
      setStatus({ type: 'error', message: `Failed to send message. Please try again or email me directly at ${personal.email}` })
      setIsSubmitting(false)
    }
  }

  const inputClass = (field) =>
    `w-full rounded-lg border bg-bg/70 px-4 py-3 text-sm text-[var(--text-heading)] placeholder:text-muted outline-none transition-all duration-300 focus:-translate-y-0.5 focus:bg-bg-surface focus:shadow-[0_16px_45px_rgba(0,0,0,0.22)] ${
      errors[field]
        ? 'border-red-500/70 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
        : 'border-border focus:border-accent/80 focus:ring-2 focus:ring-accent/20'
    }`

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.12,
        delayChildren: shouldReduceMotion ? 0 : 0.12,
      },
    },
  }

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, filter: 'blur(10px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  }

  return (
    <section id="contact" ref={sectionRef} className="relative min-h-screen overflow-hidden px-6 py-24 md:py-32">
      <div className="absolute inset-0 -z-10">
        <div style={{ background: 'var(--bg-hover-contact)' }} className="absolute inset-0 opacity-80" />
        <div className="contact-grid absolute inset-0 opacity-[0.22]" />
        <div className="contact-signal absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-accent/50 to-transparent opacity-60" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl">
        <motion.div variants={containerVariants} initial="hidden" animate={isInView ? 'visible' : 'hidden'}>
          <motion.div variants={itemVariants} className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-dim px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Get in touch
            </div>
            <h2 className="font-heading text-4xl font-bold leading-tight text-[var(--text-heading)] md:text-5xl lg:text-6xl">
              Let us build the next thing with precision.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-secondary md:text-lg">
              Tell me what you are shaping. I will bring clear engineering judgment, responsive communication, and a bias toward shipping work that holds up.
            </p>
          </motion.div>

          <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
            <motion.aside variants={itemVariants} className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-surface/70 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">Direct channels</p>
                    <h3 className="mt-2 text-xl font-semibold text-[var(--text-heading)]">Fast, focused, human.</h3>
                  </div>
                  <motion.div
                    animate={shouldReduceMotion ? {} : { rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    className="hidden h-12 w-12 items-center justify-center rounded-xl border border-accent/25 bg-accent-dim text-accent sm:flex"
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </motion.div>
                </div>

                <div className="space-y-3">
                  {contactMethods.map((method, index) => (
                    <motion.div
                      key={method.label}
                      variants={itemVariants}
                      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                      className="group relative overflow-hidden rounded-xl border border-border bg-bg/70 p-4 transition-all duration-300 hover:border-accent/45 hover:bg-bg-raised/60 hover:shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
                    >
                      <div className="absolute inset-x-0 top-0 h-px translate-x-[-110%] bg-gradient-to-r from-transparent via-accent/70 to-transparent transition-transform duration-700 group-hover:translate-x-[110%]" />
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent-dim text-accent transition-all duration-300 group-hover:border-accent/55 group-hover:bg-accent group-hover:text-accent-contrast">
                          {method.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{method.label}</p>
                            <span className="font-mono text-[10px] text-muted">0{index + 1}</span>
                          </div>
                          {method.href ? (
                            <a
                              href={method.href}
                              target={method.href.startsWith('http') ? '_blank' : undefined}
                              rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                              className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--text-heading)] transition-colors duration-300 hover:text-accent md:text-base"
                            >
                              <span className="truncate">{method.value}</span>
                              <ArrowUpRight className="h-4 w-4 flex-shrink-0 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                            </a>
                          ) : (
                            <p className="text-sm font-semibold text-[var(--text-heading)] md:text-base">{method.value}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div variants={itemVariants} className="mt-6 rounded-xl border border-border bg-bg/60 p-4">
                  <div className="flex items-start gap-3">
                    <span className="relative mt-1 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-heading)]">{personal.availability}</p>
                      <p className="mt-1 text-sm leading-6 text-secondary">
                        Best fit: full-stack, backend, developer tooling, or systems-facing internship work.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="mt-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Social proof</p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(personal.socials).map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-bg/70 text-secondary transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:bg-accent-dim hover:text-accent hover:shadow-[0_14px_35px_rgba(0,0,0,0.28)]"
                        aria-label={`Visit ${platform} profile`}
                      >
                        <SocialIcon platform={platform} />
                      </a>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.aside>

            <motion.div variants={itemVariants} className="lg:col-span-7">
              <form onSubmit={handleSubmit} className="relative overflow-hidden rounded-2xl border border-border bg-bg-surface/80 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl md:p-7">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
                <div className="mb-6 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">Project brief</p>
                    <h3 className="mt-2 text-2xl font-semibold text-[var(--text-heading)]">Start the conversation.</h3>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg/70 px-3 py-2 text-xs text-secondary">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Replies within 24-48h
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map(({ id, label, type, placeholder }) => (
                    <div key={id} className={id === 'subject' ? 'sm:col-span-2' : undefined}>
                      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-[var(--text-heading)]">{label} *</label>
                      <input
                        type={type}
                        id={id}
                        name={id}
                        value={formData[id]}
                        onChange={handleChange}
                        className={inputClass(id)}
                        placeholder={placeholder}
                        aria-describedby={errors[id] ? `${id}-error` : undefined}
                      />
                      {errors[id] && <span id={`${id}-error`} className="mt-1 text-xs text-red-500" role="alert">{errors[id]}</span>}
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <label htmlFor="message" className="mb-2 block text-sm font-semibold text-[var(--text-heading)]">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className={`${inputClass('message')} resize-none`}
                    placeholder="Tell me about your project or inquiry..."
                    aria-describedby={errors.message ? 'message-error' : undefined}
                  />
                  {errors.message && <span id="message-error" className="mt-1 text-xs text-red-500" role="alert">{errors.message}</span>}
                </div>

                {status.message && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 rounded-lg border p-4 text-sm ${
                      status.type === 'success'
                        ? 'border-green-500/30 bg-green-500/10 text-green-500'
                        : 'border-red-500/30 bg-red-500/10 text-red-500'
                    }`}
                  >
                    {status.message}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  className={`mt-5 flex w-full items-center justify-center gap-3 rounded-lg px-6 py-4 text-sm font-semibold transition-all duration-300 ${
                    isSubmitting
                      ? 'cursor-not-allowed bg-accent/50 text-accent-contrast'
                      : 'bg-accent text-accent-contrast shadow-[0_18px_45px_rgba(37,99,235,0.25)] hover:bg-accent-hover hover:shadow-[0_24px_60px_rgba(37,99,235,0.35)]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send className="h-5 w-5" />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Contact
