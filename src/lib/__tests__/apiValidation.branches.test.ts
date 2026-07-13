import { describe, expect, it } from 'vitest'
import {
  createVacancySchema,
  updateVacancySchema,
  createApplicationSchema,
  applicationsListQuerySchema,
  createContactSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
  updateApplicationStatusSchema,
  adminNotificationsListQuerySchema
} from '@/lib/apiValidation'

describe('apiValidation — vacancy schemas', () => {
  it('createVacancySchema accepts valid payload', () => {
    const result = createVacancySchema.safeParse({
      title: 'Analista RRHH',
      description: 'Buscamos analista',
      location: 'Córdoba',
      workday: 'FULL_TIME',
      modality: 'ON_SITE'
    })
    expect(result.success).toBe(true)
  })

  it('createVacancySchema rejects missing required fields', () => {
    const result = createVacancySchema.safeParse({
      title: '',
      description: 'Desc',
      location: 'Loc',
      workday: 'FULL_TIME',
      modality: 'ON_SITE'
    })
    expect(result.success).toBe(false)
  })

  it('createVacancySchema rejects invalid workday', () => {
    const result = createVacancySchema.safeParse({
      title: 'Title',
      description: 'Desc',
      location: 'Loc',
      workday: 'INVALID',
      modality: 'ON_SITE'
    })
    expect(result.success).toBe(false)
  })

  it('createVacancySchema rejects invalid modality', () => {
    const result = createVacancySchema.safeParse({
      title: 'Title',
      description: 'Desc',
      location: 'Loc',
      workday: 'FULL_TIME',
      modality: 'INVALID'
    })
    expect(result.success).toBe(false)
  })

  it('updateVacancySchema accepts partial update', () => {
    const result = updateVacancySchema.safeParse({ title: 'New Title' })
    expect(result.success).toBe(true)
  })

  it('updateVacancySchema rejects empty update', () => {
    const result = updateVacancySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('updateVacancySchema normalizes status to uppercase', () => {
    const result = updateVacancySchema.safeParse({ status: 'active' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('ACTIVE')
    }
  })
})

describe('apiValidation — application schema branches', () => {
  const basePayload = {
    candidateName: 'Test User',
    email: 'test@example.com',
    phone: '+54 9 11 1234-5678',
    acceptedPrivacy: true
  }

  it('rejects resumeFileName that is not PDF', () => {
    const result = createApplicationSchema.safeParse({
      ...basePayload,
      resumeUrl: 'https://utfs.io/f/cv.docx',
      resumeFileName: 'cv.docx',
      resumeKey: 'cv-key'
    })
    expect(result.success).toBe(false)
  })

  it('rejects resumeKey with spaces', () => {
    const result = createApplicationSchema.safeParse({
      ...basePayload,
      resumeUrl: 'https://utfs.io/f/cv.pdf',
      resumeFileName: 'cv.pdf',
      resumeKey: 'cv key with spaces'
    })
    expect(result.success).toBe(false)
  })

  it('rejects resumeKey with slashes', () => {
    const result = createApplicationSchema.safeParse({
      ...basePayload,
      resumeUrl: 'https://utfs.io/f/cv.pdf',
      resumeFileName: 'cv.pdf',
      resumeKey: 'cv/key'
    })
    expect(result.success).toBe(false)
  })

  it('rejects resumeUrl from non-UploadThing domain', () => {
    const result = createApplicationSchema.safeParse({
      ...basePayload,
      resumeUrl: 'https://evil.example.com/cv.pdf',
      resumeFileName: 'cv.pdf',
      resumeKey: 'cv-key'
    })
    expect(result.success).toBe(false)
  })

  it('accepts resumeUrl from ufs.sh domain', () => {
    const result = createApplicationSchema.safeParse({
      ...basePayload,
      resumeUrl: 'https://ufs.sh/f/cv.pdf',
      resumeFileName: 'cv.pdf',
      resumeKey: 'cv-key'
    })
    expect(result.success).toBe(true)
  })

  it('accepts resumeUrl from subdomain.utfs.io', () => {
    const result = createApplicationSchema.safeParse({
      ...basePayload,
      resumeUrl: 'https://files.utfs.io/f/cv.pdf',
      resumeFileName: 'cv.pdf',
      resumeKey: 'cv-key'
    })
    expect(result.success).toBe(true)
  })

  it('rejects resumeUrl with http protocol', () => {
    const result = createApplicationSchema.safeParse({
      ...basePayload,
      resumeUrl: 'http://utfs.io/f/cv.pdf',
      resumeFileName: 'cv.pdf',
      resumeKey: 'cv-key'
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-URL resumeUrl', () => {
    const result = createApplicationSchema.safeParse({
      ...basePayload,
      resumeUrl: 'not-a-url',
      resumeFileName: 'cv.pdf',
      resumeKey: 'cv-key'
    })
    expect(result.success).toBe(false)
  })

  it('rejects acceptedPrivacy false', () => {
    const result = createApplicationSchema.safeParse({
      ...basePayload,
      acceptedPrivacy: false
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid vacancyId format', () => {
    const result = createApplicationSchema.safeParse({
      ...basePayload,
      vacancyId: 'not-a-cuid'
    })
    expect(result.success).toBe(false)
  })
})

describe('apiValidation — other schemas', () => {
  it('applicationsListQuerySchema accepts valid query', () => {
    const result = applicationsListQuerySchema.safeParse({
      vacancyId: 'cmc7q8v1r0000v5r4f9k0m2n3',
      status: 'PENDING'
    })
    expect(result.success).toBe(true)
  })

  it('applicationsListQuerySchema rejects invalid status', () => {
    const result = applicationsListQuerySchema.safeParse({
      status: 'INVALID'
    })
    expect(result.success).toBe(false)
  })

  it('createContactSchema accepts valid payload', () => {
    const result = createContactSchema.safeParse({
      name: 'Test',
      email: 'test@example.com',
      acceptedPrivacy: true,
      subject: 'Hello',
      message: 'Test message'
    })
    expect(result.success).toBe(true)
  })

  it('createContactSchema rejects missing required fields', () => {
    const result = createContactSchema.safeParse({
      name: '',
      email: 'test@example.com',
      acceptedPrivacy: true,
      subject: '',
      message: ''
    })
    expect(result.success).toBe(false)
  })

  it('resetPasswordSchema rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'valid-token',
      password: 'Password1!',
      confirmPassword: 'Different1!'
    })
    expect(result.success).toBe(false)
  })

  it('resetPasswordSchema accepts matching passwords', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'valid-token',
      password: 'Password1!',
      confirmPassword: 'Password1!'
    })
    expect(result.success).toBe(true)
  })

  it('forgotPasswordSchema accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'test@example.com' })
    expect(result.success).toBe(true)
  })

  it('forgotPasswordSchema rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('updateApplicationStatusSchema accepts valid status', () => {
    const result = updateApplicationStatusSchema.safeParse({ status: 'ACCEPTED' })
    expect(result.success).toBe(true)
  })

  it('updateApplicationStatusSchema rejects invalid status', () => {
    const result = updateApplicationStatusSchema.safeParse({ status: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('adminNotificationsListQuerySchema applies defaults', () => {
    const result = adminNotificationsListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.view).toBe('all')
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
    }
  })

  it('adminNotificationsListQuerySchema validates limit range', () => {
    const result = adminNotificationsListQuerySchema.safeParse({ limit: 100 })
    expect(result.success).toBe(false)
  })
})
