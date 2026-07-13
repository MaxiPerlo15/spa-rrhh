import { expect, test } from '@playwright/test'

const BACKEND_CONFIGURED = Boolean(process.env.BACKEND_URL)

test.describe('Application intake via Spring backend', () => {
  test('successful spontaneous application returns 201 with correct shape', async ({
    request
  }) => {
    const uniqueSuffix = `${Date.now()}`
    const payload = {
      candidateName: 'E2E Spontaneous Candidate',
      email: `e2e-spontaneous-${uniqueSuffix}@example.com`,
      phone: '+54 9 11 9876-5432',
      acceptedPrivacy: true,
      coverLetter: 'Postulación espontánea de prueba E2E.'
    }

    const response = await request.post('/api/applications', { data: payload })

    // If Spring backend is not running, the adapter returns 503 — skip gracefully
    if (response.status() === 503) {
      test.skip(true, 'Spring backend not available (BACKEND_URL not configured or not running)')
      return
    }

    expect(response.status()).toBe(201)

    const body = (await response.json()) as {
      id?: string
      submittedAt?: string
      status?: string
    }
    expect(typeof body.id).toBe('string')
    expect(body.id!.length).toBeGreaterThan(0)
    expect(typeof body.submittedAt).toBe('string')
    expect(body.status).toBe('PENDING')
  })

  test('successful vacancy-backed application returns 201', async ({ request }) => {
    if (!BACKEND_CONFIGURED) {
      test.skip(true, 'Spring backend not configured')
      return
    }

    // Fetch active vacancies from Spring-backed endpoint
    const vacanciesRes = await request.get('/api/vacancies')
    if (!vacanciesRes.ok()) {
      test.skip(true, `GET /api/vacancies returned ${vacanciesRes.status()} — backend may not be running`)
      return
    }

    const vacancies = (await vacanciesRes.json()) as Array<{ id: string; estadoActual: string }>
    const activeVacancy = vacancies.find((v) => v.estadoActual === 'ACTIVE')

    if (!activeVacancy) {
      test.skip(true, 'No active vacancy available for E2E test')
      return
    }

    const uniqueSuffix = `${Date.now()}`
    const payload = {
      vacancyId: activeVacancy.id,
      candidateName: 'E2E Vacancy Candidate',
      email: `e2e-vacancy-${uniqueSuffix}@example.com`,
      phone: '+54 9 11 5555-1234',
      acceptedPrivacy: true,
      resumeUrl: 'https://utfs.io/f/e2e-resume.pdf',
      resumeFileName: 'e2e-resume.pdf',
      resumeKey: `e2e-resume-${uniqueSuffix}`,
      coverLetter: 'Postulación a vacante activa de prueba E2E.'
    }

    const response = await request.post('/api/applications', { data: payload })

    if (response.status() === 503) {
      test.skip(true, 'Spring backend not available for application submission')
      return
    }

    expect(response.status()).toBe(201)

    const body = (await response.json()) as {
      id?: string
      submittedAt?: string
      status?: string
    }
    expect(typeof body.id).toBe('string')
    expect(body.status).toBe('PENDING')
  })

  test('duplicate spontaneous submission returns 409 with DUPLICATE_SUBMISSION code', async ({
    request
  }) => {
    const uniqueSuffix = `${Date.now()}`
    const payload = {
      candidateName: 'E2E Duplicate Candidate',
      email: `e2e-dup-${uniqueSuffix}@example.com`,
      phone: '+54 9 11 7777-8888',
      acceptedPrivacy: true,
      coverLetter: 'Primera postulación.'
    }

    const first = await request.post('/api/applications', { data: payload })

    if (first.status() === 503) {
      test.skip(true, 'Spring backend not available')
      return
    }

    expect(first.status()).toBe(201)

    const second = await request.post('/api/applications', {
      data: { ...payload, coverLetter: 'Segunda postulación duplicada.' }
    })
    expect(second.status()).toBe(409)

    const body = (await second.json()) as { code?: string; error?: string }
    expect(body.code).toBe('DUPLICATE_SUBMISSION')
  })

  test('admin listing requires authentication', async ({ request }) => {
    const response = await request.get('/api/applications')
    // Without admin session, should return 401
    expect([401, 403]).toContain(response.status())
  })
})
