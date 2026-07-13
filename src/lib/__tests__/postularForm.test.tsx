// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import PostularForm from '@/components/PostularForm'

const { createApplicationMock } = vi.hoisted(() => ({
  createApplicationMock: vi.fn()
}))

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn()
  })
}))

vi.mock('@/components/TurnstileWidget', () => ({
  default: () => null
}))

vi.mock('@/lib/api/applications', () => ({
  createApplication: createApplicationMock
}))

vi.mock('@/lib/uploadthing', () => ({
  UploadButton: ({ onClientUploadComplete }: { onClientUploadComplete: (files: Array<{ url: string; name: string; key: string }>) => void }) => (
    <button
      type="button"
      onClick={() =>
        onClientUploadComplete([
          {
            url: 'https://utfs.io/f/cv.pdf',
            name: 'cv.pdf',
            key: 'cv-key'
          }
        ])
      }
    >
      Subir CV mock
    </button>
  )
}))

describe('PostularForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra la vacante seleccionada en modo postulación a vacante', () => {
    render(
      <PostularForm
        vacancyId="cmc7q8v1r0000v5r4f9k0m2n3"
        vacancyTitle="Backend Engineer"
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Vacante seleccionada')).toBeTruthy()
    expect(screen.getByText('Backend Engineer')).toBeTruthy()
  })

  it('pide confirmación previa en candidatura espontánea antes de enviar', async () => {
    createApplicationMock.mockResolvedValue({
      message: 'Postulación enviada exitosamente',
      applicationId: 'app_123'
    })

    render(<PostularForm mode="spontaneous" onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Nombre Completo *'), {
      target: { value: 'Ana Perez' }
    })
    fireEvent.change(screen.getByLabelText('Email *'), {
      target: { value: 'ana@example.com' }
    })
    fireEvent.change(screen.getByLabelText('Teléfono *'), {
      target: { value: '+54 9 11 1234-5678' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Subir CV mock' }))
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /Acepto la Política de Privacidad y el tratamiento de mis datos personales/i
      })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Enviar CV' }))

    expect(screen.getByText('Revisá tu candidatura antes de enviarla')).toBeTruthy()
    expect(screen.getByText('Ana Perez')).toBeTruthy()
    expect(createApplicationMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar candidatura' }))

    await waitFor(() => {
      expect(createApplicationMock).toHaveBeenCalledOnce()
    })
    expect(createApplicationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateName: 'Ana Perez',
        email: 'ana@example.com'
      })
    )
  })

  it('permite reintentar el envío cuando la API falla y completa el cierre exitoso', async () => {
    let rejectFirst!: (error: Error) => void
    const firstAttempt = new Promise<unknown>((_resolve, reject) => {
      rejectFirst = reject
    })

    createApplicationMock
      .mockImplementationOnce(() => firstAttempt as never)
      .mockResolvedValueOnce({
        message: 'Postulación enviada exitosamente',
        applicationId: 'app_123'
      })

    const onClose = vi.fn()
    render(<PostularForm mode="spontaneous" onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Nombre Completo *'), {
      target: { value: 'Ana Perez' }
    })
    fireEvent.change(screen.getByLabelText('Email *'), {
      target: { value: 'ana@example.com' }
    })
    fireEvent.change(screen.getByLabelText('Teléfono *'), {
      target: { value: '+54 9 11 1234-5678' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Subir CV mock' }))
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /Acepto la Política de Privacidad y el tratamiento de mis datos personales/i
      })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Enviar CV' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar candidatura' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enviando...' })).toBeTruthy()
    })

    await act(async () => {
      rejectFirst(new Error('server down'))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirmar candidatura' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar candidatura' }))

    await waitFor(() => {
      expect(createApplicationMock).toHaveBeenCalledTimes(2)
    })

    await waitFor(
      () => {
        expect(onClose).toHaveBeenCalledOnce()
      },
      { timeout: 5000 }
    )
  })
})
