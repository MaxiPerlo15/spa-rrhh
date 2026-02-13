'use client'

import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/contexts/ToastContext'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { showSuccess, showError } = useToast()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
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
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-gray-900"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>

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
