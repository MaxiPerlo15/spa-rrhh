// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

// Set env vars BEFORE importing the component

const {
  pushMock,
  refreshMock,
  showSuccessMock,
  showErrorMock
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  showSuccessMock: vi.fn(),
  showErrorMock: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock
  })
}))

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showSuccess: showSuccessMock,
    showError: showErrorMock
  })
}))

import { AdminAuthModeProvider } from '@/app/admin/auth-mode-provider'
import SignInPage from '@/app/admin/signin/page'

function renderSpringSignInPage() {
  return render(
    <AdminAuthModeProvider springAuthEnabled>
      <SignInPage />
    </AdminAuthModeProvider>
  )
}

describe('SignInPage — Spring relay mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POSTs to the same-origin Spring login relay instead of exposing the Spring backend', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ userId: 'u1', email: 'admin@test.com' })
    })

    renderSpringSignInPage()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@test.com' }
    })
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'Password123!' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/spring/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@test.com', password: 'Password123!' })
        })
      )
    })
  })

  it('redirects to /admin on successful Spring login', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ userId: 'u1', email: 'admin@test.com' })
    })

    renderSpringSignInPage()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@test.com' }
    })
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'Password123!' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    await waitFor(() => {
      expect(showSuccessMock).toHaveBeenCalledWith('Inicio de sesión exitoso. Redirigiendo al panel.')
      expect(pushMock).toHaveBeenCalledWith('/admin')
      expect(refreshMock).toHaveBeenCalled()
    })
  })

  it('shows error when Spring login returns 401', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' })
    })

    renderSpringSignInPage()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@test.com' }
    })
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'wrong' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeTruthy()
      expect(showErrorMock).toHaveBeenCalledWith('Credenciales inválidas. Verifica email y contraseña.')
    })
  })

  it('normalizes email before sending to Spring', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ userId: 'u1', email: 'admin@test.com' })
    })

    renderSpringSignInPage()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: ' ADMIN@TEST.COM ' }
    })
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: ' Password123! ' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/spring/login',
        expect.objectContaining({
          body: JSON.stringify({ email: 'admin@test.com', password: 'Password123!' })
        })
      )
    })
  })
})
