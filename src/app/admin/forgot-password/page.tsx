'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

const SUCCESS_MESSAGE =
  'Si existe una cuenta con ese email, enviamos un enlace para restablecer la contraseña.'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'No se pudo procesar la solicitud')
        return
      }

      setMessage(payload.message || SUCCESS_MESSAGE)
    } catch {
      setError('No se pudo procesar la solicitud')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary-500 to-[#003875] px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Recuperar contraseña</h1>
            <p className="text-gray-600">
              Ingresa tu email de administrador para recibir un enlace de recuperación.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-gray-900"
                placeholder="admin@sparrhh.com"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/admin/signin" className="text-sm text-gray-600 hover:text-primary-500 transition-colors">
              ← Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
