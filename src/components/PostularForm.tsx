'use client'
import { useState, FormEvent } from 'react'
import { UploadButton } from '@/lib/uploadthing'
import { useToast } from '@/contexts/ToastContext'
import { createApplication } from '@/lib/api/applications'
import * as Sentry from '@sentry/nextjs'
import TurnstileWidget from '@/components/TurnstileWidget'

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
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
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
        onClose()
      }, 2000)
    } catch (error) {
      showError('Error al enviar la postulación. Por favor, intenta nuevamente.')

      Sentry.captureException(error,{
        tags: {
          component: 'PostularForm',
          vacancy_id: vacancyId
        },
        extra: {
          vacancyTitle,
          candidateEmail: formData.email
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
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Postularme</h2>
            <p className="text-gray-600 mt-1">{vacancyTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            />
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
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            />
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
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            />
          </div>

          {/* Upload CV */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currículum Vitae (PDF) *
            </label>
            {!resumeInfo ? (
              <UploadButton
                endpoint="resumeUploader"
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
                  showError(`Error al subir CV: ${error.message}`)
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
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
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

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !resumeInfo || (captchaEnabled && !captchaToken)}
              className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Postulación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
