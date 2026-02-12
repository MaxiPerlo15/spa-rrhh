'use client'
import { useState, FormEvent } from 'react'
import { UploadButton } from '@/lib/uploadthing'
import { useToast } from '@/contexts/ToastContext'
import { createApplication } from '@/lib/api/applications'
import * as Sentry from '@sentry/nextjs'
import TurnstileWidget from '@/components/TurnstileWidget'
import { getEmailValidationMessage, validateInternationalPhone } from '@/lib/formValidationPolicy'
import {
  RESUME_ALLOWED_CONTENT_TEXT,
  getResumeUploadErrorMessage
} from '@/lib/uploadPolicy'

interface PostularFormProps {
  vacancyId: string
  vacancyTitle: string
  onClose: () => void
}

export default function PostularForm({ vacancyId, vacancyTitle, onClose }: PostularFormProps) {
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState({
    candidateName: '',
    email: '',
    phone: '',
    coverLetter: ''
  })
  const [resumeInfo, setResumeInfo] = useState<{
    url: string
    name: string
    key: string
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)

  const validateField = (name: string, value: string) => {
    if (name === 'candidateName' && !value.trim()) return 'El nombre es obligatorio.'
    if (name === 'email') {
      if (!value.trim()) return 'El email es obligatorio.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Ingresa un email válido.'
      const message = getEmailValidationMessage(value)
      if (message) return message
    }
    if (name === 'phone') {
      const result = validateInternationalPhone(value, { required: true })
      if (!result.isValid) return result.message || 'El teléfono es inválido.'
    }
    return ''
  }

  const closeWithAnimation = () => {
    if (isClosing) return
    setIsClosing(true)
    setTimeout(onClose, 220)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const nextErrors = {
      candidateName: validateField('candidateName', formData.candidateName),
      email: validateField('email', formData.email),
      phone: validateField('phone', formData.phone)
    }
    setFieldErrors(nextErrors)
    setTouched({ candidateName: true, email: true, phone: true })

    if (nextErrors.candidateName || nextErrors.email || nextErrors.phone) {
      showError('Revisa los campos marcados para continuar.')
      return
    }

    if (!resumeInfo) {
      showError('Debes subir tu CV')
      return
    }

    if (captchaEnabled && !captchaToken) {
      showError('Completa la verificación captcha para continuar.')
      return
    }

    setIsSubmitting(true)

    try {
      await createApplication({
        vacancyId,
        candidateName: formData.candidateName,
        email: formData.email,
        phone: formData.phone,
        resumeUrl: resumeInfo.url,
        resumeFileName: resumeInfo.name,
        resumeKey: resumeInfo.key,
        coverLetter: formData.coverLetter,
        captchaToken
      })

      showSuccess(`✅ Postulación enviada exitosamente para ${vacancyTitle}`)
      setTimeout(() => {
        closeWithAnimation()
      }, 2000)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Error al enviar la postulación. Por favor, intenta nuevamente.'
      showError(message)

      Sentry.captureException(error,{
        tags: {
          component: 'PostularForm',
          vacancy_id: vacancyId
        },
        extra: {
          vacancyTitle,
          candidateDomain: formData.email.includes('@') ? formData.email.split('@')[1] : 'invalid_email'
        }
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))

    if (touched[e.target.name]) {
      setFieldErrors(prev => ({
        ...prev,
        [e.target.name]: validateField(e.target.name, e.target.value)
      }))
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }))
    setFieldErrors(prev => ({
      ...prev,
      [e.target.name]: validateField(e.target.name, e.target.value)
    }))
  }

  return (
    <div
      className={`modal-shell fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 ${isClosing ? 'is-closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeWithAnimation()
        }
      }}
    >
      <div className={`modal-panel bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isClosing ? 'is-closing' : ''}`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Postularme</h2>
            <p className="text-gray-600 mt-1">{vacancyTitle}</p>
          </div>
          <button
            onClick={closeWithAnimation}
            className="btn-motion text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre */}
          <div>
            <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              id="candidateName"
              name="candidateName"
              value={formData.candidateName}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 transition-colors ${
                fieldErrors.candidateName ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {touched.candidateName && fieldErrors.candidateName && (
              <p className="field-feedback-enter mt-2 text-sm text-red-600">{fieldErrors.candidateName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 transition-colors ${
                fieldErrors.email ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {touched.email && fieldErrors.email && (
              <p className="field-feedback-enter mt-2 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 transition-colors ${
                fieldErrors.phone ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {touched.phone && fieldErrors.phone && (
              <p className="field-feedback-enter mt-2 text-sm text-red-600">{fieldErrors.phone}</p>
            )}
          </div>

          {/* Upload CV */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currículum Vitae (PDF) *
            </label>
            {!resumeInfo ? (
              <UploadButton
                endpoint="resumeUploader"
                appearance={{
                  container: 'w-full',
                  button: 'w-full rounded-lg bg-primary-500 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:bg-gray-300 disabled:text-gray-600',
                  allowedContent: 'mt-2 text-xs text-gray-500'
                }}
                content={{
                  button({ isUploading }) {
                    return isUploading ? 'Subiendo CV...' : 'Seleccionar CV (PDF)'
                  },
                  allowedContent() {
                    return RESUME_ALLOWED_CONTENT_TEXT
                  }
                }}
                onClientUploadComplete={(res) => {
                  if (res && res[0]) {
                    setResumeInfo({
                      url: res[0].url,
                      name: res[0].name,
                      key: res[0].key
                    })
                    showSuccess('CV subido exitosamente')
                  }
                }}
                onUploadError={(error: Error) => {
                  showError(getResumeUploadErrorMessage(error.message))
                }}
              />
            ) : (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-900">{resumeInfo.name}</p>
                    <p className="text-xs text-green-700">CV subido correctamente</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResumeInfo(null)}
                  className="btn-motion text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {/* Carta de Presentación */}
          <div>
            <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-2">
              Carta de Presentación (Opcional)
            </label>
            <textarea
              id="coverLetter"
              name="coverLetter"
              value={formData.coverLetter}
              onChange={handleChange}
              rows={4}
              placeholder="Cuéntanos por qué eres el candidato ideal para esta posición..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-gray-900"
            />
          </div>

          {/* Botones */}
          <TurnstileWidget action="application_form" onTokenChange={setCaptchaToken} />
          <p className="text-xs leading-relaxed text-gray-500">
            Al enviar tu postulación, aceptas el tratamiento de tus datos para fines de selección y contacto
            profesional. Puedes consultar más detalles en nuestra{' '}
            <a href="/privacy" className="text-primary-500 hover:text-primary-600">
              Política de Privacidad
            </a>
            .
          </p>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={closeWithAnimation}
              className="btn-motion flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !resumeInfo || (captchaEnabled && !captchaToken)}
              className="btn-motion flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Postulación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
