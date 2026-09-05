'use client'

import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/contexts/ToastContext'
import { useAdminAuth } from '../auth-mode-provider'

export default function SignInPage() {
  const { springAuthEnabled } = useAdminAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { showSuccess, showError } = useToast()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const trimmedPassword = password.trim()

      if (!normalizedEmail || !trimmedPassword) {
        const message = 'Ingresa email y contraseña para continuar.'
        setError(message)
        showError(message)
        return
      }

      setIsLoading(true)

      if (springAuthEnabled) {
        const response = await fetch('/api/auth/spring/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password: trimmedPassword })
        })

        if (!response.ok) {
          setError('Credenciales inválidas')
          showError('Credenciales inválidas. Verifica email y contraseña.')
          return
        }

        showSuccess('Inicio de sesión exitoso. Redirigiendo al panel.')
        router.push('/admin')
        return
      }

      // Legacy NextAuth mode
      const callbackUrl = `${window.location.origin}/admin`
      const result = await signIn('credentials', {
        email: normalizedEmail,
        password: trimmedPassword,
        redirect: false,
        callbackUrl
      })

      if (result?.error) {
        if (result.error.startsWith('AUTH_THROTTLED:')) {
          const retryAfter = Number(result.error.split(':')[1] || '0')
          const retryAfterMinutes = Math.max(1, Math.ceil(retryAfter / 60))
          const message = `Demasiados intentos fallidos. Intenta nuevamente en ${retryAfterMinutes} minuto(s).`
          setError(message)
          showError(message)
          return
        }

        setError('Credenciales inválidas')
        showError('Credenciales inválidas. Verifica email y contraseña.')
      } else if (result?.ok) {
        showSuccess('Inicio de sesión exitoso. Redirigiendo al panel.')
        router.push('/admin')
        router.refresh()
      }
    } catch (error) {
      setError('Error al iniciar sesión')
      showError('Error al iniciar sesión. Intenta nuevamente.')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary-500 to-[#003875] px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel Administrativo</h1>
            <p className="text-gray-600">Ingresa tus credenciales para continuar</p>
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
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-gray-900"
                placeholder="admin@sparrhh.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-gray-900"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary-700 transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 10.7a3 3 0 0 0 2.7 2.7" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5 0 8.8 3 10 7-.4 1.2-1 2.3-1.8 3.2" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.2 6.3C4.3 7.6 2.8 9.5 2 12c1.2 4 5 7 10 7 1.8 0 3.4-.4 4.9-1.1" />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="w-full rounded-lg border border-gray-300 py-3 px-4 text-center font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto sm:flex-1"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-primary-500 py-3 px-4 font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </div>

            <div className="text-center">
              <Link href="/admin/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-primary-500 transition-colors">
              ← Volver al sitio principal
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
