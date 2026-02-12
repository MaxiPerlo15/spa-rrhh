export const RESUME_ALLOWED_FILE_TYPES = ['PDF'] as const
export const RESUME_MAX_FILE_SIZE_MB = 4
export const RESUME_MAX_FILE_COUNT = 1
export const RESUME_ALLOWED_CONTENT_TEXT = `${RESUME_ALLOWED_FILE_TYPES.join(', ')} hasta ${RESUME_MAX_FILE_SIZE_MB}MB (máximo ${RESUME_MAX_FILE_COUNT} archivo)`

function normalizeErrorMessage(message: string): string {
  return message.toLowerCase()
}

export function getResumeUploadErrorMessage(errorMessage: string): string {
  const normalized = normalizeErrorMessage(errorMessage)

  if (normalized.includes('file') && normalized.includes('too large')) {
    return `El archivo supera el límite de ${RESUME_MAX_FILE_SIZE_MB}MB. Comprime el CV e intenta nuevamente.`
  }

  if (
    normalized.includes('file type') ||
    normalized.includes('invalid file') ||
    normalized.includes('not allowed')
  ) {
    return `Formato inválido. Solo se permiten archivos ${RESUME_ALLOWED_FILE_TYPES.join(', ')}.`
  }

  return `No se pudo subir el CV. Verifica que sea ${RESUME_ALLOWED_FILE_TYPES.join(', ')} y no supere ${RESUME_MAX_FILE_SIZE_MB}MB.`
}
