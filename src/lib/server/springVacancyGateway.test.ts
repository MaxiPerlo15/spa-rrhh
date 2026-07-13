import { describe, expect, it } from 'vitest'
import {
  mapSpringToDto,
  buildCreatePayload,
  buildUpdatePayload,
  parseSpringError,
  getUnsupportedSpringVacancyFields,
  rejectUnsupportedSpringVacancyFields,
  SpringVacancyWriteError
} from './springVacancyGateway'

describe('springVacancyGateway', () => {
  describe('mapSpringToDto', () => {
    it('maps a full Spring vacancy response to a VacancyDto', () => {
      const spring = {
        id: 'vac-1',
        titulo: 'Backend Engineer',
        descripcion: 'Build APIs',
        requisitos: 'TypeScript',
        ubicacionNombre: 'Córdoba',
        ubicacionDescripcion: 'Córdoba, Argentina',
        jornada: 'FULL_TIME',
        modalidad: 'REMOTE',
        estadoActual: 'ACTIVE',
        fechaCreacion: '2026-01-15T10:00:00.000Z',
        fechaPublicacion: '2026-01-16T08:00:00.000Z'
      }

      const dto = mapSpringToDto(spring)

      expect(dto.id).toBe('vac-1')
      expect(dto.title).toBe('Backend Engineer')
      expect(dto.description).toBe('Build APIs')
      expect(dto.location).toBe('Córdoba')
      expect(dto.workday).toBe('FULL_TIME')
      expect(dto.modality).toBe('REMOTE')
      expect(dto.status).toBe('active')
      expect(dto.createdAt).toBe('2026-01-15T10:00:00.000Z')
      expect(dto.salary).toBeUndefined()
      expect(dto.benefits).toBeUndefined()
    })

    it('normalizes CREATED estadoActual to draft status', () => {
      const spring = {
        id: 'vac-2',
        titulo: 'Frontend Dev',
        descripcion: 'React apps',
        requisitos: null,
        ubicacionNombre: null,
        ubicacionDescripcion: null,
        jornada: 'PART_TIME',
        modalidad: 'ONSITE',
        estadoActual: 'CREATED',
        fechaCreacion: '2026-02-01T00:00:00.000Z'
      }

      const dto = mapSpringToDto(spring)

      expect(dto.status).toBe('draft')
    })

    it('maps null requisitos to undefined', () => {
      const spring = {
        id: 'vac-3',
        titulo: 'Designer',
        descripcion: 'UI/UX',
        requisitos: null,
        ubicacionNombre: 'Remote',
        ubicacionDescripcion: null,
        jornada: 'FULL_TIME',
        modalidad: 'REMOTE',
        estadoActual: 'ACTIVE',
        fechaCreacion: '2026-03-01T00:00:00.000Z'
      }

      const dto = mapSpringToDto(spring)

      expect(dto.requirements).toBeUndefined()
    })

    it('maps empty ubicacionNombre to empty string', () => {
      const spring = {
        id: 'vac-4',
        titulo: 'QA',
        descripcion: 'Testing',
        requisitos: null,
        ubicacionNombre: null,
        ubicacionDescripcion: null,
        jornada: 'FULL_TIME',
        modalidad: 'REMOTE',
        estadoActual: 'INACTIVE',
        fechaCreacion: '2026-04-01T00:00:00.000Z'
      }

      const dto = mapSpringToDto(spring)

      expect(dto.location).toBe('')
    })
  })

  describe('buildCreatePayload', () => {
    it('transforms frontend fields to Spring Spanish keys', () => {
      const payload = buildCreatePayload({
        title: 'DevOps Engineer',
        description: 'CI/CD pipelines',
        location: 'Buenos Aires',
        workday: 'FULL_TIME',
        modality: 'HYBRID',
        requirements: 'Docker, K8s'
      })

      expect(payload.titulo).toBe('DevOps Engineer')
      expect(payload.descripcion).toBe('CI/CD pipelines')
      expect(payload.ubicacionNombre).toBe('Buenos Aires')
      expect(payload.ubicacionDescripcion).toBe('Buenos Aires')
      expect(payload.jornada).toBe('FULL_TIME')
      expect(payload.modalidad).toBe('HYBRID')
      expect(payload.requisitos).toBe('Docker, K8s')
    })

    it('includes optional requirements when provided', () => {
      const payload = buildCreatePayload({
        title: 'PM',
        description: 'Manage projects',
        location: 'Remote',
        workday: 'FULL_TIME',
        modality: 'REMOTE'
      })

      expect(payload.requisitos).toBeUndefined()
    })
  })

  describe('buildUpdatePayload', () => {
    it('transforms only provided fields', () => {
      const payload = buildUpdatePayload({
        title: 'Updated Title'
      })

      expect(payload.titulo).toBe('Updated Title')
      expect(payload).not.toHaveProperty('descripcion')
      expect(payload).not.toHaveProperty('jornada')
    })

    it('transforms location with normalizeLocation', () => {
      const payload = buildUpdatePayload({
        location: '  Buenos  Aires  '
      })

      expect(payload.ubicacionNombre).toBe('Buenos Aires')
      expect(payload.ubicacionDescripcion).toBe('  Buenos  Aires  ')
    })

    it('returns empty object when no fields provided', () => {
      const payload = buildUpdatePayload({})

      expect(Object.keys(payload)).toHaveLength(0)
    })
  })

  describe('parseSpringError', () => {
    it('extracts message from error field', () => {
      const body = JSON.stringify({ error: 'Invalid request' })
      expect(parseSpringError(body)).toBe('Invalid request')
    })

    it('extracts message from detail field', () => {
      const body = JSON.stringify({ detail: 'Title already exists' })
      expect(parseSpringError(body)).toBe('Title already exists')
    })

    it('falls back to raw body when JSON is invalid', () => {
      expect(parseSpringError('raw error text')).toBe('raw error text')
    })

    it('falls back to raw body when all fields are empty', () => {
      const body = JSON.stringify({ error: '', message: '', detail: '' })
      expect(parseSpringError(body)).toBe(body)
    })

    it('prefers error over message when both present', () => {
      const body = JSON.stringify({ error: 'First', message: 'Second' })
      expect(parseSpringError(body)).toBe('First')
    })
  })

  describe('getUnsupportedSpringVacancyFields', () => {
    it('returns salary and benefits when both present', () => {
      const fields = getUnsupportedSpringVacancyFields({ salary: '50000', benefits: 'Health' })
      expect(fields).toEqual(['salary', 'benefits'])
    })

    it('returns only salary when only salary is present', () => {
      const fields = getUnsupportedSpringVacancyFields({ salary: '50000' })
      expect(fields).toEqual(['salary'])
    })

    it('returns empty array when no unsupported fields', () => {
      const fields = getUnsupportedSpringVacancyFields({})
      expect(fields).toEqual([])
    })

    it('returns empty array when both are undefined', () => {
      const fields = getUnsupportedSpringVacancyFields({ salary: undefined, benefits: undefined })
      expect(fields).toEqual([])
    })
  })

  describe('rejectUnsupportedSpringVacancyFields', () => {
    it('returns 400 response with field names', async () => {
      const response = rejectUnsupportedSpringVacancyFields(['salary', 'benefits'])
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toContain('salary')
      expect(body.error).toContain('benefits')
      expect(body.error).toContain('Spring-backed vacancies do not support')
    })
  })

  describe('SpringVacancyWriteError', () => {
    it('stores status and message', () => {
      const error = new SpringVacancyWriteError(409, 'Conflict')
      expect(error.status).toBe(409)
      expect(error.message).toBe('Conflict')
      expect(error.name).toBe('SpringVacancyWriteError')
    })
  })
})
