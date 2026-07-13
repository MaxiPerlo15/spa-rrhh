import { expect, test } from '@playwright/test'

test.describe('Duplicate submission protection', () => {
  test('rejects a repeated public contact submission', async ({ request }) => {
    const uniqueSuffix = `${Date.now()}`
    const payload = {
      name: 'QA Contact',
      email: `qa-contact-${uniqueSuffix}@example.com`,
      phone: '+54 9 11 1234-5678',
      subject: 'Consulta duplicada',
      message: 'Quiero probar el bloqueo de duplicados.',
      acceptedPrivacy: true
    }

    const first = await request.post('/api/contacts', { data: payload })
    expect(first.status()).toBe(201)

    const second = await request.post('/api/contacts', { data: payload })
    expect(second.status()).toBe(409)

    const body = (await second.json()) as { code?: string; error?: string }
    expect(body.code).toBe('DUPLICATE_SUBMISSION')
    expect(body.error).toMatch(/contacto reciente/i)
  })

  test('rejects a repeated public application submission', async ({ request }) => {
    const uniqueSuffix = `${Date.now()}`
    const payload = {
      candidateName: 'QA Candidate',
      email: `qa-candidate-${uniqueSuffix}@example.com`,
      phone: '+54 9 11 1234-5678',
      acceptedPrivacy: true,
      resumeUrl: 'https://utfs.io/f/resume.pdf',
      resumeFileName: 'resume.pdf',
      resumeKey: `resume-${uniqueSuffix}`,
      coverLetter: 'Postulación duplicada de prueba.'
    }

    const first = await request.post('/api/applications', { data: payload })
    expect(first.status()).toBe(201)

    const second = await request.post('/api/applications', { data: payload })
    expect(second.status()).toBe(409)

    const body = (await second.json()) as { code?: string; error?: string }
    expect(body.code).toBe('DUPLICATE_SUBMISSION')
    expect(body.error).toMatch(/postulación reciente/i)
  })
})
