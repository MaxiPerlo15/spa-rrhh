import { describe, it, expect } from 'vitest'
import { toApplicationAdminDto, ApplicationAdminDto } from '../dto/application'

describe('toApplicationAdminDto', () => {
  it('maps an application with vacancy to ApplicationAdminDto', () => {
    const input = {
      id: 'app1',
      candidateId: 'cand1',
      candidateName: 'Maria Lopez',
      email: 'maria@test.com',
      phone: '555-0000',
      resumeUrl: 'https://example.com/cv.pdf',
      resumeFileName: 'cv.pdf',
      coverLetter: 'Me interesa',
      status: 'PENDING' as const,
      submittedAt: new Date('2026-02-10T09:00:00.000Z'),
      vacancy: { id: 'v1', title: 'Dev Frontend', location: 'Buenos Aires' }
    }

    const result = toApplicationAdminDto(input)

    expect(result.id).toBe('app1')
    expect(result.candidateId).toBe('cand1')
    expect(result.candidateName).toBe('Maria Lopez')
    expect(result.status).toBe('PENDING')
    expect(result.submittedAt).toBe('2026-02-10T09:00:00.000Z')
    expect(result.vacancy).toEqual({ id: 'v1', title: 'Dev Frontend', location: 'Buenos Aires' })
  })

  it('maps an application with string submittedAt', () => {
    const input = {
      id: 'app2',
      candidateId: 'cand2',
      candidateName: 'John Doe',
      email: 'john@test.com',
      phone: '555-1111',
      resumeUrl: null,
      resumeFileName: null,
      coverLetter: null,
      status: 'REVIEWING' as const,
      submittedAt: '2026-04-01T12:00:00.000Z',
      vacancy: null
    }

    const result = toApplicationAdminDto(input)

    expect(result.status).toBe('REVIEWING')
    expect(result.submittedAt).toBe('2026-04-01T12:00:00.000Z')
    expect(result.vacancy).toBeUndefined()
    expect(result.resumeUrl).toBeUndefined()
    expect(result.coverLetter).toBeUndefined()
  })

  it('returns correct ApplicationAdminDto type shape', () => {
    const input = {
      id: 'app3',
      candidateId: 'cand3',
      candidateName: 'Test',
      email: 'test@test.com',
      phone: '123',
      resumeUrl: null,
      resumeFileName: null,
      coverLetter: null,
      status: 'ACCEPTED' as const,
      submittedAt: new Date(),
      vacancy: undefined
    }

    const result: ApplicationAdminDto = toApplicationAdminDto(input)

    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('candidateId')
    expect(result).toHaveProperty('candidateName')
    expect(result).toHaveProperty('status')
    expect(result).toHaveProperty('submittedAt')
  })
})
