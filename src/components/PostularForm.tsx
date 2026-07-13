'use client'
import { useEffect, useMemo, useState, FormEvent } from 'react'
import { UploadButton } from '@/lib/uploadthing'
import { useToast } from '@/contexts/ToastContext'
import { createApplication } from '@/lib/api/applications'
import { isApiRequestError } from '@/lib/api/errors'
import * as Sentry from '@sentry/nextjs'
import TurnstileWidget from '@/components/TurnstileWidget'
import { getEmailValidationMessage, validateInternationalPhone } from '@/lib/formValidationPolicy'
import {
  getResumeUploadErrorMessage
} from '@/lib/uploadPolicy'

type PostularFormProps =
  | {
      vacancyId: string
      vacancyTitle?: string
      mode?: 'vacancy'
      onClose: () => void
    }
  | {
      vacancyId?: null
      vacancyTitle?: string
      mode: 'spontaneous'
      onClose: () => void
    }

const DRAFT_TTL_MS = 30 * 60 * 1000

export default function PostularForm({ vacancyId, vacancyTitle, mode, onClose }: PostularFormProps) {
  const resolvedMode = mode ?? (vacancyId ? 'vacancy' : 'spontaneous')
  const effectiveVacancyTitle = vacancyTitle ?? 'Vacante'
  const resolvedSubtitle =
    resolvedMode === 'vacancy'
      ? 'Completa el formulario para postularte a este puesto.\nNuestro equipo revisará tu perfil y se contactará si tu experiencia coincide con el puesto.'
      : 'Envíanos tu CV y lo tendremos en cuenta para futuras oportunidades laborales que se adapten a tu experiencia y habilidades.'
  const resolvedHeading =
    resolvedMode === 'vacancy'
      ? `Postulación para ${effectiveVacancyTitle}`
      : '¿No encontrás una vacante que se ajuste a tu perfil?'
  const { showSuccess, showError, showInfo } = useToast()
  const [formData, setFormData] = useState({
    candidateName: '',
    email: '',
    phone: '',
    coverLetter: '',
    acceptedPrivacy: false
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
  const [isReviewingSubmission, setIsReviewingSubmission] = useState(false)
  const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  const draftStorageKey = useMemo(
    () => `postular_form_draft:${vacancyId ?? 'spontaneous'}`,
    [vacancyId]
  )

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

  const closeWithAnimation = () => {
    if (isClosing) return
    setIsClosing(true)
    setTimeout(onClose, 220)
  }

  useEffect(() => {
    try {
      const serializedDraft = window.localStorage.getItem(draftStorageKey)
      if (!serializedDraft) return

      const parsedDraft = JSON.parse(serializedDraft) as {
        savedAt?: number
        data?: Partial<typeof formData>
      }
      if (
        typeof parsedDraft.savedAt !== 'number' ||
        !parsedDraft.data ||
        Date.now() - parsedDraft.savedAt > DRAFT_TTL_MS
      ) {
        window.localStorage.removeItem(draftStorageKey)
        return
      }

      const draftData = parsedDraft.data
      setFormData((prev) => ({
        candidateName: typeof draftData.candidateName === 'string' ? draftData.candidateName : prev.candidateName,
        email: typeof draftData.email === 'string' ? draftData.email : prev.email,
        phone: typeof draftData.phone === 'string' ? draftData.phone : prev.phone,
        coverLetter: typeof draftData.coverLetter === 'string' ? draftData.coverLetter : prev.coverLetter,
        acceptedPrivacy:
          typeof draftData.acceptedPrivacy === 'boolean' ? draftData.acceptedPrivacy : prev.acceptedPrivacy
      }))
    } catch {
      window.localStorage.removeItem(draftStorageKey)
    }
  }, [draftStorageKey])

  useEffect(() => {
    const hasPersistableData = Object.entries(formData).some(([key, value]) => {
      if (key === 'acceptedPrivacy') return value === true
      return typeof value === 'string' && value.trim().length > 0
    })

    if (!hasPersistableData) {
      window.localStorage.removeItem(draftStorageKey)
      return
    }

    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        savedAt: Date.now(),
        data: formData
      })
    )
  }, [draftStorageKey, formData])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        setIsClosing((prev) => {
          if (prev) return prev
          setTimeout(onClose, 220)
          return true
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isSubmitting, onClose])

  const validateBeforeSubmit = () => {
    const nextErrors = {
      candidateName: validateField('candidateName', formData.candidateName),
      email: validateField('email', formData.email),
      phone: validateField('phone', formData.phone),
      acceptedPrivacy: formData.acceptedPrivacy
        ? ''
        : 'Debes aceptar la política de privacidad para continuar.'
    }
    setFieldErrors(nextErrors)
    setTouched({ candidateName: true, email: true, phone: true, acceptedPrivacy: true })

    if (nextErrors.candidateName || nextErrors.email || nextErrors.phone) {
      showError('Revisa los campos marcados para continuar.')
      return false
    }

    if (!resumeInfo) {
      showError('Debes subir tu CV')
      return false
    }

    if (captchaEnabled && !captchaToken) {
      showError('Completa la verificación captcha para continuar.')
      return false
    }

    return true
  }

  const submitApplication = async () => {
    if (!resumeInfo) {
      showError('Debes subir tu CV')
      return
    }

    const currentResumeInfo = resumeInfo
    setIsSubmitting(true)

    try {
      await createApplication({
        ...(vacancyId ? { vacancyId } : {}),
        candidateName: formData.candidateName,
        email: formData.email,
        phone: formData.phone,
        acceptedPrivacy: formData.acceptedPrivacy,
        resumeUrl: currentResumeInfo.url,
        resumeFileName: currentResumeInfo.name,
        resumeKey: currentResumeInfo.key,
        coverLetter: formData.coverLetter,
        captchaToken
      })

      showSuccess(
        resolvedMode === 'vacancy'
          ? `✅ Postulación enviada exitosamente para ${effectiveVacancyTitle}`
          : '✅ Candidatura espontánea enviada exitosamente'
      )
      window.localStorage.removeItem(draftStorageKey)
      setTimeout(() => {
        closeWithAnimation()
      }, 2000)
    } catch (error) {
      if (isApiRequestError(error) && error.status === 409 && error.code === 'DUPLICATE_SUBMISSION') {
        showInfo(error.message)
        return
      }
      const message = error instanceof Error
        ? error.message
        : 'Error al enviar la postulación. Por favor, intenta nuevamente.'
      showError(message)

      Sentry.captureException(error,{
        tags: {
          component: 'PostularForm',
          vacancy_id: vacancyId ?? 'spontaneous'
        },
        extra: {
          vacancyTitle: effectiveVacancyTitle,
          candidateDomain: formData.email.includes('@') ? formData.email.split('@')[1] : 'invalid_email'
        }
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateBeforeSubmit()) {
      return
    }

    if (resolvedMode === 'spontaneous') {
      setIsReviewingSubmission(true)
      return
    }

    await submitApplication()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const nextValue = e.target.name === 'phone' ? formatPhoneMask(e.target.value) : e.target.value

    setFormData(prev => ({
      ...prev,
      [e.target.name]: nextValue
    }))

    if (touched[e.target.name]) {
      setFieldErrors(prev => ({
        ...prev,
        [e.target.name]: validateField(e.target.name, nextValue)
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

  const handlePrivacyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const acceptedPrivacy = event.target.checked
    setFormData((prev) => ({
      ...prev,
      acceptedPrivacy
    }))
    setTouched((prev) => ({ ...prev, acceptedPrivacy: true }))
    setFieldErrors((prev) => ({
      ...prev,
      acceptedPrivacy: acceptedPrivacy ? '' : 'Debes aceptar la política de privacidad para continuar.'
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
      <div className={`modal-panel bg-white rounded-2xl p-5 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isClosing ? 'is-closing' : ''}`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{resolvedHeading}</h2>
            <p className="text-gray-600 mt-1 whitespace-pre-line">{resolvedSubtitle}</p>
            {resolvedMode === 'vacancy' && vacancyId && (
              <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-900">
                <p className="font-semibold">Vacante seleccionada</p>
                <p className="mt-1">{effectiveVacancyTitle}</p>
              </div>
            )}
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

        {isReviewingSubmission ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-primary-100 bg-primary-50 p-5">
              <h3 className="text-lg font-semibold text-primary-950">Revisá tu candidatura antes de enviarla</h3>
              <p className="mt-1 text-sm text-primary-900">
                Confirmá que los datos sean correctos. Cuando continúes, la candidatura quedará registrada sin asociarse a una vacante específica.
              </p>
            </div>

            <div className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nombre</p>
                <p className="mt-1 text-sm text-gray-900">{formData.candidateName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</p>
                <p className="mt-1 text-sm text-gray-900">{formData.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Teléfono</p>
                <p className="mt-1 text-sm text-gray-900">{formData.phone}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">CV adjunto</p>
                <p className="mt-1 text-sm text-gray-900">{resumeInfo?.name}</p>
              </div>
              {formData.coverLetter.trim() && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mensaje</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-900">{formData.coverLetter}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-2">
              <button
                type="button"
                onClick={() => setIsReviewingSubmission(false)}
                className="btn-motion w-full sm:flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Volver a editar
              </button>
              <button
                type="button"
                onClick={() => {
                  void submitApplication()
                }}
                disabled={isSubmitting}
                className="btn-motion w-full sm:flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enviando...' : 'Confirmar candidatura'}
              </button>
            </div>
          </div>
        ) : (
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
              autoComplete="name"
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
              autoComplete="email"
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
              inputMode="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              placeholder="+54 9 11 1234-5678"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 transition-colors ${
                fieldErrors.phone ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {touched.phone && fieldErrors.phone && (
              <p className="field-feedback-enter mt-2 text-sm text-red-600">{fieldErrors.phone}</p>
            )}
          </div>

          <TurnstileWidget action="application_form" onTokenChange={setCaptchaToken} />

          {/* Upload CV */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">
              Currículum Vitae (PDF) *
            </p>
            {!resumeInfo ? (
              <UploadButton
                endpoint="resumeUploader"
                input={{ captchaToken }}
                disabled={isSubmitting || (captchaEnabled && !captchaToken)}
                appearance={{
                  container: 'w-full',
                  button: 'w-full rounded-lg bg-primary-500 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:bg-gray-300 disabled:text-gray-600',
                  allowedContent: 'mt-2 text-xs text-gray-500'
                }}
                content={{
                  button({ isUploading }) {
                    return isUploading ? 'Subiendo CV...' : 'Subir CV'
                  },
                  allowedContent() {
                    return 'Formato PDF • Máximo 4MB'
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
            {captchaEnabled && !captchaToken && !resumeInfo && (
              <p className="mt-2 text-xs text-amber-700">
                Completa el captcha antes de subir el CV.
              </p>
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
              autoComplete={resolvedMode === 'vacancy' ? 'off' : 'on'}
              value={formData.coverLetter}
              onChange={handleChange}
              rows={4}
              placeholder={
                resolvedMode === 'vacancy'
                  ? 'Cuéntanos por qué eres el candidato ideal para esta posición...'
                  : 'Cuéntanos brevemente tu experiencia o el tipo de puesto que buscas...'
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-gray-900"
            />
          </div>

          {/* Botones */}
          <div className="space-y-2">
            <label htmlFor="application-accepted-privacy" className="flex items-start gap-3 text-sm text-gray-700">
              <input
                id="application-accepted-privacy"
                name="acceptedPrivacy"
                type="checkbox"
                checked={formData.acceptedPrivacy}
                onChange={handlePrivacyChange}
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

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-4">
            <button
              type="button"
              onClick={closeWithAnimation}
              className="btn-motion w-full sm:flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting || !resumeInfo || !formData.acceptedPrivacy || (captchaEnabled && !captchaToken)
              }
              className="btn-motion w-full sm:flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar CV'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
