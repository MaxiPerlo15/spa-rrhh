// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import ContactForm from '@/components/ContactForm'
import { createContact } from '@/lib/api/contacts'

vi.mock('@/lib/api/contacts', () => ({
  createContact: vi.fn()
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

describe('ContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra un resumen antes de confirmar y mantiene visible el email enviado tras resetear el formulario', async () => {
    vi.mocked(createContact).mockResolvedValue({
      message: 'Mensaje enviado exitosamente',
      contactId: 'contact-1'
    })

    render(<ContactForm />)

    fireEvent.change(screen.getByLabelText('Nombre Completo *'), {
      target: { value: 'Ana Perez' }
    })
    fireEvent.change(screen.getByLabelText('Email *'), {
      target: { value: 'ana@mail.com' }
    })
    fireEvent.change(screen.getByLabelText('Asunto *'), {
      target: { value: 'Consulta' }
    })
    fireEvent.change(screen.getByLabelText('Mensaje *'), {
      target: { value: 'Necesito mas informacion.' }
    })
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /Acepto la Política de Privacidad y el tratamiento de mis datos personales/i
      })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Consulta' }))

    expect(screen.getByText('Revisá tu consulta antes de enviarla')).toBeTruthy()
    expect(screen.getByText('Ana Perez')).toBeTruthy()
    expect(screen.getByText('Consulta')).toBeTruthy()
    expect(createContact).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar consulta' }))

    await waitFor(() => {
      expect(createContact).toHaveBeenCalledOnce()
    })

    expect(
      await screen.findByText('Tu consulta ha sido recibida. Te contactaremos a la brevedad a', {
        exact: false
      })
    ).toBeTruthy()
    expect(screen.getByText('ana@mail.com')).toBeTruthy()
    expect((screen.getByLabelText('Email *') as HTMLInputElement).value).toBe('')
  })

  it('permite reintentar el envío cuando la API falla y vuelve a habilitar el flujo', async () => {
    let rejectFirst!: (error: Error) => void
    const firstAttempt = new Promise<unknown>((_resolve, reject) => {
      rejectFirst = reject
    })

    vi.mocked(createContact)
      .mockImplementationOnce(() => firstAttempt as never)
      .mockResolvedValueOnce({
        message: 'Mensaje enviado exitosamente',
        contactId: 'contact-2'
      })

    render(<ContactForm />)

    fireEvent.change(screen.getByLabelText('Nombre Completo *'), {
      target: { value: 'Ana Perez' }
    })
    fireEvent.change(screen.getByLabelText('Email *'), {
      target: { value: 'ana@mail.com' }
    })
    fireEvent.change(screen.getByLabelText('Asunto *'), {
      target: { value: 'Consulta' }
    })
    fireEvent.change(screen.getByLabelText('Mensaje *'), {
      target: { value: 'Necesito mas informacion.' }
    })
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /Acepto la Política de Privacidad y el tratamiento de mis datos personales/i
      })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Consulta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar consulta' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enviando...' })).toBeTruthy()
    })

    await act(async () => {
      rejectFirst(new Error('network down'))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirmar consulta' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar consulta' }))

    await waitFor(() => {
      expect(createContact).toHaveBeenCalledTimes(2)
    })

    expect(
      await screen.findByText('Tu consulta ha sido recibida. Te contactaremos a la brevedad a', {
        exact: false
      })
    ).toBeTruthy()
  })
})
