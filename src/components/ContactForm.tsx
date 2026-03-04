'use client'
import { useState, FormEvent } from 'react'
import { useToast } from '@/contexts/ToastContext'
import { createContact } from '@/lib/api/contacts'
import { isApiRequestError } from '@/lib/api/errors'
import * as Sentry from '@sentry/nextjs'
import TurnstileWidget from '@/components/TurnstileWidget'
import { getEmailValidationMessage, validateInternationalPhone } from '@/lib/formValidationPolicy'


export default function ContactForm() {
  const { showSuccess, showError, showInfo } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)

  const formatPhoneMask = (rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '')
    let localDigits = digitsOnly

    if (localDigits.startsWith('549')) {
      localDigits = localDigits.slice(3)
    } else if (localDigits.startsWith('54')) {
      localDigits = localDigits.slice(2)
    } else if (localDigits.startsWith('9')) {
      localDigits = localDigits.slice(1)
    }

    localDigits = localDigits.slice(0, 10)

    if (!localDigits) return ''
    if (localDigits.length <= 2) return `+54 9 ${localDigits}`
    if (localDigits.length <= 6) return `+54 9 ${localDigits.slice(0, 2)} ${localDigits.slice(2)}`
    return `+54 9 ${localDigits.slice(0, 2)} ${localDigits.slice(2, 6)}-${localDigits.slice(6)}`
  }

  const validateField = (name: string, value: string) => {
    if (['name', 'subject', 'message'].includes(name) && !value.trim()) return 'Este campo es obligatorio.'
    if (name === 'email') {
      if (!value.trim()) return 'Este campo es obligatorio.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Ingresa un email válido.'
      const message = getEmailValidationMessage(value)
      if (message) return message
    }
    if (name === 'phone' && value.trim()) {
      const result = validateInternationalPhone(value, { required: false })
      if (!result.isValid) return result.message || 'Ingresa un teléfono válido.'
    }
    return ''
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const nextValue = name === 'phone' ? formatPhoneMask(value) : value
    setFormData(prev => ({ ...prev, [name]: nextValue }))

    if (touched[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: validateField(name, nextValue) }))
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value) }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const nextErrors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      phone: validateField('phone', formData.phone),
      subject: validateField('subject', formData.subject),
      message: validateField('message', formData.message),
    }
    setFieldErrors(nextErrors)
    setTouched({ name: true, email: true, phone: true, subject: true, message: true })
    if (nextErrors.name || nextErrors.email || nextErrors.phone || nextErrors.subject || nextErrors.message) {
      showError('Revisa los campos marcados para continuar.')
      return
    }

    if (captchaEnabled && !captchaToken) {
      showError('Completa la verificación captcha para continuar.')
      return
    }

    setLoading(true)

    try {
      await createContact({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
        captchaToken
      })

      // Mostrar éxito y resetear
      setSubmitted(true)
      showSuccess('¡Mensaje enviado exitosamente! Te contactaremos pronto.')
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      })
      setCaptchaToken('')

      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => {
        setSubmitted(false)
      }, 5000)
    } catch (error) {
      if (isApiRequestError(error) && error.status === 409 && error.code === 'DUPLICATE_SUBMISSION') {
        showInfo(error.message)
        return
      }
      const message = error instanceof Error
        ? error.message
        : 'Error al enviar el mensaje. Por favor, intenta nuevamente.'
      showError(message)
      
      Sentry.captureException(error, {
        tags: {
          component: 'ContactForm'
        },
        extra: {
          contactDomain: formData.email.includes('@') ? formData.email.split('@')[1] : 'invalid_email',
          subject: formData.subject
        }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Mensaje de éxito */}
      {submitted && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-green-900">¡Mensaje enviado exitosamente!</p>
              <p className="text-sm text-green-700">
                Tu consulta ha sido recibida. Te contactaremos a la brevedad a <span className="font-semibold">{formData.email || 'tu email'}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nombre y Email */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                fieldErrors.name ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="Juan Pérez"
            />
            {touched.name && fieldErrors.name && (
              <p className="field-feedback-enter mt-2 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                fieldErrors.email ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="juan@ejemplo.com"
            />
            {touched.email && fieldErrors.email && (
              <p className="field-feedback-enter mt-2 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>
        </div>

        {/* Teléfono y Asunto */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              inputMode="numeric"
              value={formData.phone}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                fieldErrors.phone ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="+54 9 11 1234-5678"
            />
            {touched.phone && fieldErrors.phone && (
              <p className="field-feedback-enter mt-2 text-sm text-red-600">{fieldErrors.phone}</p>
            )}
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
              Asunto *
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              required
              value={formData.subject}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                fieldErrors.subject ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="Consulta sobre servicios"
            />
            {touched.subject && fieldErrors.subject && (
              <p className="field-feedback-enter mt-2 text-sm text-red-600">{fieldErrors.subject}</p>
            )}
          </div>
        </div>

        {/* Mensaje */}
        <div>
          <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
            Mensaje *
          </label>
          <textarea
            id="message"
            name="message"
            required
            value={formData.message}
            onChange={handleInputChange}
            onBlur={handleBlur}
            rows={6}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none ${
              fieldErrors.message ? 'border-red-400' : 'border-gray-300'
            }`}
            placeholder="Escribe tu consulta aquí..."
          />
          {touched.message && fieldErrors.message && (
            <p className="field-feedback-enter mt-2 text-sm text-red-600">{fieldErrors.message}</p>
          )}
        </div>

        {/* Botón submit */}
        <TurnstileWidget action="contact_form" onTokenChange={setCaptchaToken} />
        <p className="text-xs leading-relaxed text-gray-500">
          Al enviar este formulario, aceptas que tratemos tus datos para responder tu consulta.
          Más información en nuestra{' '}
          <a href="/privacy" className="text-primary-500 hover:text-primary-600">
            Política de Privacidad
          </a>
          .
        </p>

        <button
          type="submit"
          disabled={loading || (captchaEnabled && !captchaToken)}
          className="btn-motion w-full md:w-auto px-10 py-4 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? 'Enviando...' : 'Enviar Consulta'}
        </button>
      </form>
    </div>
  )
}
