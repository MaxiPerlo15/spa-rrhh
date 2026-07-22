// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminAuthModeProvider } from '@/app/admin/auth-mode-provider'
import SignInPage from '@/app/admin/signin/page'

const {
  pushMock,
  refreshMock,
  signInMock,
  showSuccessMock,
  showErrorMock
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  signInMock: vi.fn(),
  showSuccessMock: vi.fn(),
  showErrorMock: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock
  })
}))

vi.mock('next-auth/react', () => ({
  signIn: signInMock,
  useSession: () => ({ data: null, status: 'unauthenticated' })
}))

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showSuccess: showSuccessMock,
    showError: showErrorMock
  })
}))

function renderLegacySignInPage() {
  return render(
    <AdminAuthModeProvider springAuthEnabled={false}>
      <SignInPage />
    </AdminAuthModeProvider>
  )
}

describe('SignInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('evita enviar el formulario cuando faltan credenciales válidas', async () => {
    renderLegacySignInPage()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@mail.com' }
    })
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: '   ' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    expect(signInMock).not.toHaveBeenCalled()
    expect(await screen.findByText('Ingresa email y contraseña para continuar.')).toBeTruthy()
    expect(showErrorMock).toHaveBeenCalledWith('Ingresa email y contraseña para continuar.')
  })

  it('normaliza email, autentica y redirige al panel admin', async () => {
    signInMock.mockResolvedValue({
      ok: true
    })

    renderLegacySignInPage()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: ' ADMIN@MAIL.COM ' }
    })
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: ' Admin123 ' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('credentials', expect.objectContaining({
        email: 'admin@mail.com',
        password: 'Admin123',
        redirect: false
      }))
    })

    expect(showSuccessMock).toHaveBeenCalledWith('Inicio de sesión exitoso. Redirigiendo al panel.')
    expect(pushMock).toHaveBeenCalledWith('/admin')
    expect(refreshMock).toHaveBeenCalled()
  })

  it('informa credenciales inválidas cuando la autenticación falla', async () => {
    signInMock.mockResolvedValue({
      error: 'CredentialsSignin'
    })

    renderLegacySignInPage()

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@mail.com' }
    })
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'mal' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }))

    expect(await screen.findByText('Credenciales inválidas')).toBeTruthy()
    expect(showErrorMock).toHaveBeenCalledWith('Credenciales inválidas. Verifica email y contraseña.')
  })
})
