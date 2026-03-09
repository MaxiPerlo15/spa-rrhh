import { describe, expect, it } from 'vitest'
import { getResumeUploadErrorMessage, RESUME_ALLOWED_CONTENT_TEXT } from '../uploadPolicy'

describe('uploadPolicy', () => {
  it('expone texto de contenido permitido para el usuario', () => {
    expect(RESUME_ALLOWED_CONTENT_TEXT).toContain('PDF')
    expect(RESUME_ALLOWED_CONTENT_TEXT).toContain('4MB')
  })

  it('mapea error por archivo demasiado grande', () => {
    expect(getResumeUploadErrorMessage('File too large')).toContain('4MB')
  })

  it('mapea error por tipo de archivo inválido', () => {
    expect(getResumeUploadErrorMessage('Invalid file type')).toContain('Solo se permiten archivos PDF')
  })

  it('retorna mensaje genérico para errores desconocidos', () => {
    expect(getResumeUploadErrorMessage('Network error')).toContain('No se pudo subir el CV')
  })
})
