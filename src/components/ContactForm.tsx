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
    message: '',
    acceptedPrivacy: false
  })
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [captchaToken, setCaptchaToken] = useState('')
  const [isReviewingSubmission, setIsReviewingSubmission] = useState(false)
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
      acceptedPrivacy: formData.acceptedPrivacy
        ? ''
        : 'Debes aceptar la política de privacidad para continuar.',
    }
    setFieldErrors(nextErrors)
    setTouched({ name: true, email: true, phone: true, subject: true, message: true, acceptedPrivacy: true })
    if (
      nextErrors.name ||
      nextErrors.email ||
      nextErrors.phone ||
      nextErrors.subject ||
      nextErrors.message ||
      nextErrors.acceptedPrivacy
    ) {
      showError('Revisa los campos marcados para continuar.')
      return
    }

    if (captchaEnabled && !captchaToken) {
      showError('Completa la verificación captcha para continuar.')
      return
    }

    setIsReviewingSubmission(true)
  }

  const submitContact = async () => {
    setLoading(true)

    try {
      const nextSubmittedEmail = formData.email

      await createContact({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        acceptedPrivacy: formData.acceptedPrivacy,
        subject: formData.subject,
        message: formData.message,
        captchaToken
      })

      // Mostrar éxito y resetear
      setSubmittedEmail(nextSubmittedEmail)
      setSubmitted(true)
      setIsReviewingSubmission(false)
      showSuccess('¡Mensaje enviado exitosamente! Te contactaremos pronto.')
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        acceptedPrivacy: false
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
                Tu consulta ha sido recibida. Te contactaremos a la brevedad a <span className="font-semibold">{submittedEmail || 'tu email'}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {isReviewingSubmission ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-primary-100 bg-primary-50 p-5">
            <h3 className="text-lg font-semibold text-primary-950">Revisá tu consulta antes de enviarla</h3>
            <p className="mt-1 text-sm text-primary-900">
              Confirmá que los datos sean correctos. Cuando continúes, la consulta quedará registrada como contacto para su gestión posterior.
            </p>
          </div>

          <div className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nombre</p>
              <p className="mt-1 text-sm text-gray-900">{formData.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</p>
              <p className="mt-1 text-sm text-gray-900">{formData.email}</p>
            </div>
            {formData.phone.trim() && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Teléfono</p>
                <p className="mt-1 text-sm text-gray-900">{formData.phone}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Asunto</p>
              <p className="mt-1 text-sm text-gray-900">{formData.subject}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mensaje</p>
              <p className="mt-1 whitespace-pre-line text-sm text-gray-900">{formData.message}</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={() => setIsReviewingSubmission(false)}
              className="btn-motion w-full rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50 sm:flex-1"
            >
              Volver a editar
            </button>
            <button
              type="button"
              onClick={() => {
                setIsReviewingSubmission(false)
                showInfo('Se canceló el envío de la consulta.')
              }}
              className="btn-motion w-full rounded-lg border border-amber-300 bg-amber-50 px-6 py-3 font-medium text-amber-900 hover:bg-amber-100 sm:flex-1"
            >
              Cancelar envío
            </button>
            <button
              type="button"
              onClick={() => {
                void submitContact()
              }}
              disabled={loading}
              className="btn-motion w-full rounded-lg bg-primary-500 px-6 py-3 font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
            >
              {loading ? 'Enviando...' : 'Confirmar consulta'}
            </button>
          </div>
        </div>
      ) : (
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
              autoComplete="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                fieldErrors.name ? 'border-red-400' : 'border-gray-300'
              } text-gray-900 placeholder:text-gray-500`}
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
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                fieldErrors.email ? 'border-red-400' : 'border-gray-300'
              } text-gray-900 placeholder:text-gray-500`}
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
              inputMode="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                fieldErrors.phone ? 'border-red-400' : 'border-gray-300'
              } text-gray-900 placeholder:text-gray-600`}
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
              autoComplete="off"
              required
              value={formData.subject}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                fieldErrors.subject ? 'border-red-400' : 'border-gray-300'
              } text-gray-900 placeholder:text-gray-500`}
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
            autoComplete="off"
            required
            value={formData.message}
            onChange={handleInputChange}
            onBlur={handleBlur}
            rows={6}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none ${
              fieldErrors.message ? 'border-red-400' : 'border-gray-300'
            } text-gray-900 placeholder:text-gray-500`}
            placeholder="Escribe tu consulta aquí..."
          />
          {touched.message && fieldErrors.message && (
            <p className="field-feedback-enter mt-2 text-sm text-red-600">{fieldErrors.message}</p>
          )}
        </div>

        {/* Botón submit */}
        <TurnstileWidget action="contact_form" onTokenChange={setCaptchaToken} />
        <div className="space-y-2">
          <label htmlFor="contact-accepted-privacy" className="flex items-start gap-3 text-sm text-gray-700">
            <input
              id="contact-accepted-privacy"
              name="acceptedPrivacy"
              type="checkbox"
              checked={formData.acceptedPrivacy}
              onChange={(event) => {
                const acceptedPrivacy = event.target.checked
                setFormData((prev) => ({ ...prev, acceptedPrivacy }))
                setTouched((prev) => ({ ...prev, acceptedPrivacy: true }))
                setFieldErrors((prev) => ({
                  ...prev,
                  acceptedPrivacy: acceptedPrivacy
                    ? ''
                    : 'Debes aceptar la política de privacidad para continuar.'
                }))
              }}
              aria-invalid={touched.acceptedPrivacy && Boolean(fieldErrors.acceptedPrivacy)}
              className="mt-0.5 h-5 w-5 rounded border-gray-300 text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            />
            <span>
              Acepto la{' '}
              <a
                href="/privacy"
                className="font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700"
                target="_blank"
                rel="noreferrer"
              >
                Política de Privacidad
              </a>{' '}
              y el tratamiento de mis datos personales.
            </span>
          </label>
          {touched.acceptedPrivacy && fieldErrors.acceptedPrivacy && (
            <p className="field-feedback-enter text-sm text-red-600">{fieldErrors.acceptedPrivacy}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !formData.acceptedPrivacy || (captchaEnabled && !captchaToken)}
          className="btn-motion w-full md:w-auto px-10 py-4 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? 'Enviando...' : 'Enviar Consulta'}
        </button>
      </form>
      )}
    </div>
  )
}
