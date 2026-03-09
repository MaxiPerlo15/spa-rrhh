'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import { getPasswordStrength } from '@/lib/passwordReset'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { showSuccess, showError } = useToast()
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const canSubmit = Boolean(token) && !isLoading
  const hasMinLength = password.trim().length >= 10
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)

  const strengthColorMap = {
    'very-weak': 'bg-red-500',
    weak: 'bg-orange-500',
    medium: 'bg-yellow-500',
    strong: 'bg-blue-500',
    'very-strong': 'bg-green-500'
  } as const

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setToken(params.get('token') || '')
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError('El enlace de recuperación es inválido')
      showError('El enlace de recuperación es inválido')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          confirmPassword
        })
      })

      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'No se pudo actualizar la contraseña')
        showError(payload.error || 'No se pudo actualizar la contraseña')
        return
      }

      const successMessage = payload.message || 'Contraseña actualizada exitosamente'
      setMessage(successMessage)
      showSuccess(successMessage)
      setTimeout(() => {
        router.push('/admin/signin')
      }, 1800)
    } catch {
      setError('No se pudo actualizar la contraseña')
      showError('No se pudo actualizar la contraseña')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary-500 to-[#003875] px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear nueva contraseña</h1>
            <p className="text-gray-600">
              Define una nueva contraseña para volver a ingresar al panel administrativo.
            </p>
          </div>

          {!token ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              El enlace de recuperación es inválido o no contiene token.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-gray-900"
                  placeholder="Al menos 10 caracteres"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Debe incluir mayúsculas, minúsculas y números.
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Seguridad</span>
                    <span className="font-semibold">{passwordStrength.label}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full transition-all duration-300 ${strengthColorMap[passwordStrength.level]}`}
                      style={{ width: `${Math.max((passwordStrength.score / 5) * 100, 5)}%` }}
                    />
                  </div>
                  <ul className="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-600">
                    <li className={hasMinLength ? 'text-green-700' : ''}>• Al menos 10 caracteres</li>
                    <li className={hasUpper ? 'text-green-700' : ''}>• Al menos una mayúscula</li>
                    <li className={hasLower ? 'text-green-700' : ''}>• Al menos una minúscula</li>
                    <li className={hasNumber ? 'text-green-700' : ''}>• Al menos un número</li>
                    <li className={hasSpecial ? 'text-green-700' : ''}>• Símbolo especial recomendado</li>
                  </ul>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-gray-900"
                  placeholder="Repite la contraseña"
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
                disabled={!canSubmit}
                className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Actualizando contraseña...' : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}

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
