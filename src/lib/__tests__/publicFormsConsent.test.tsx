// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ContactForm from '@/components/ContactForm'
import PostularForm from '@/components/PostularForm'

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

vi.mock('@/lib/uploadthing', () => ({
  UploadButton: ({ onClientUploadComplete }: { onClientUploadComplete: (files: Array<{ url: string; name: string; key: string }>) => void }) => (
    <button
      type="button"
      onClick={() =>
        onClientUploadComplete([
          {
            url: 'https://files.example/cv.pdf',
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

describe('Public forms consent compliance', () => {
  it('ContactForm requiere consentimiento para habilitar submit', () => {
    render(<ContactForm />)

    const submitButton = screen.getByRole('button', { name: 'Enviar Consulta' })
    expect(submitButton).toHaveProperty('disabled', true)

    const checkbox = screen.getByRole('checkbox', {
      name: /Acepto la Política de Privacidad y el tratamiento de mis datos personales/i
    })
    fireEvent.click(checkbox)

    expect(submitButton).toHaveProperty('disabled', false)
  })

  it('PostularForm requiere consentimiento además del CV para habilitar submit', () => {
    render(
      <PostularForm vacancyId="cmc7q8v1r0000v5r4f9k0m2n3" vacancyTitle="Vacante Test" onClose={vi.fn()} />
    )

    const submitButton = screen.getByRole('button', { name: 'Enviar CV' })
    expect(submitButton).toHaveProperty('disabled', true)

    fireEvent.click(screen.getByRole('button', { name: 'Subir CV mock' }))
    expect(submitButton).toHaveProperty('disabled', true)

    const checkbox = screen.getByRole('checkbox', {
      name: /Acepto la Política de Privacidad y el tratamiento de mis datos personales/i
    })
    fireEvent.click(checkbox)

    expect(submitButton).toHaveProperty('disabled', false)
  })
})
