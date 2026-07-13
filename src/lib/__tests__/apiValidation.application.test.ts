import { describe, expect, it } from 'vitest'
import { createApplicationSchema } from '@/lib/apiValidation'

describe('createApplicationSchema', () => {
  const basePayload = {
    candidateName: 'Maxi Perlo',
    email: 'maxi@example.com',
    phone: '+5493533418702',
    acceptedPrivacy: true
  }

  it('acepta postulación con vacancyId', () => {
    const parsed = createApplicationSchema.safeParse({
      ...basePayload,
      vacancyId: 'cmc7q8v1r0000v5r4f9k0m2n3'
    })

    expect(parsed.success).toBe(true)
  })

  it('acepta postulación espontánea sin vacancyId', () => {
    const parsed = createApplicationSchema.safeParse(basePayload)
    expect(parsed.success).toBe(true)
  })

  it('rechaza metadata de CV incompleta', () => {
    const parsed = createApplicationSchema.safeParse({
      ...basePayload,
      resumeUrl: 'https://utfs.io/f/cv.pdf'
    })

    expect(parsed.success).toBe(false)
  })

  it('rechaza resumeUrl fuera de UploadThing', () => {
    const parsed = createApplicationSchema.safeParse({
      ...basePayload,
      resumeUrl: 'https://evil.example/cv.pdf',
      resumeFileName: 'cv.pdf',
      resumeKey: 'cv-key'
    })

    expect(parsed.success).toBe(false)
  })

  it('acepta metadata de CV válida desde UploadThing', () => {
    const parsed = createApplicationSchema.safeParse({
      ...basePayload,
      resumeUrl: 'https://utfs.io/f/cv.pdf',
      resumeFileName: 'cv.pdf',
      resumeKey: 'cv-key'
    })

    expect(parsed.success).toBe(true)
  })
})
